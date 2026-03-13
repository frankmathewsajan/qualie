'use client';
import { useRef, useState, useCallback, useLayoutEffect } from 'react';

// ── Gemini Live API constants ────────────────────────────────────────────────
const WS_ENDPOINT =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const MODEL          = 'models/gemini-2.5-flash-native-audio-preview-12-2025';  // Live API v1beta
const INPUT_RATE     = 16_000;  // Hz we downsample to
const OUTPUT_RATE    = 24_000;  // Hz Gemini returns PCM at
const WORKLET_PATH   = '/worklets/aegis-pcm-processor.js';

const SYSTEM_PROMPT =
  "You are Aegis — a real-time AI safety guardian. " +
  "The user launched you because they feel unsafe. Every session is high-stakes. Stay fully alert.\n\n" +

  "WHEN TO SPEAK — respond only when one of these is true:\n\n" +

  "① DANGER DETECTED\n" +
  "You hear signs of threat in the environment: raised voices, aggression, fear, struggle, screaming, " +
  "or words like 'stop', 'help', 'no', 'get away', 'fire', 'run'. " +
  "Use context and tone — not just keywords. 'Isn't that a wrong turn, STOP STOP' = threat. " +
  "'Stop being dramatic' between friends = not a threat. " +
  "When you detect danger, respond immediately with short commanding guidance. Under 15 words.\n\n" +

  "② CALLED UPON\n" +
  "The user says your name 'Aegis', or is clearly speaking to you directly. " +
  "Respond naturally to exactly what they said. Be brief.\n\n" +

  "③ WANTS TO BE HEARD\n" +
  "Even without your name — if the user sounds scared, confused, or uncertain and seems to want " +
  "a response: 'I don't know what to do', 'should I call someone?', 'this feels wrong', " +
  "'what do I do?', 'I'm scared' — respond. Calm, present, brief.\n\n" +

  "NEVER initiate unprompted. NEVER say 'no threats detected', 'all clear', or 'I'm monitoring'. " +
  "Silence is correct whenever none of the above apply. " +
  "Speak like someone who has the user's back — calm, direct, human. Not like an assistant.";



// ── Types ────────────────────────────────────────────────────────────────────
export type GeminiLiveState = 'idle' | 'connecting' | 'live' | 'error';

export interface UseGeminiLiveOptions {
  onSetupComplete?:   () => void;
  onSpeakStart?:      () => void;
  onSpeakEnd?:        () => void;
  onError?:           (msg: string) => void;
  onChunksSent?:      (count: number) => void;
  onInputTranscript?: (text: string) => void;
}

export interface UseGeminiLiveReturn {
  state:      GeminiLiveState;
  isSpeaking: boolean;
  error:      string | null;
  chunksSent: number;
  connect:    () => Promise<void>;
  disconnect: () => void;
}

// ── Server log relay (fire-and-forget, never throws) ─────────────────────────
function slog(event: string, detail?: unknown) {
  fetch('/api/gemini-log', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ event, detail }),
  }).catch(() => {});
}

// ── Tiny helpers ─────────────────────────────────────────────────────────────
function ab2b64(buf: ArrayBuffer): string {
  // Chunk to avoid stack overflow on large buffers
  const u8    = new Uint8Array(buf);
  let s       = '';
  const CHUNK = 8192;
  for (let i = 0; i < u8.length; i += CHUNK) {
    s += String.fromCharCode(...Array.from(u8.subarray(i, i + CHUNK)));
  }
  return btoa(s);
}

function b642i16(b64: string): Int16Array {
  const binary = atob(b64);
  const u8     = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i);
  return new Int16Array(u8.buffer);
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useGeminiLive(opts: UseGeminiLiveOptions = {}): UseGeminiLiveReturn {
  const optsRef = useRef(opts);
  // Sync latest callbacks into ref after every render (useLayoutEffect = synchronous,
  // so callbacks always see the latest opts before any user interaction can fire them).
  useLayoutEffect(() => { Object.assign(optsRef.current, opts); });

  const [state,      setState]      = useState<GeminiLiveState>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [chunksSent, setChunksSent] = useState(0);

  // Internal refs so closures always see latest values
  const wsRef             = useRef<WebSocket | null>(null);
  const ctxRef            = useRef<AudioContext | null>(null);
  const streamRef         = useRef<MediaStream | null>(null);
  const workletRef        = useRef<AudioWorkletNode | null>(null);
  const sourceRef         = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainRef           = useRef<GainNode | null>(null);
  const playheadRef       = useRef(0);  // scheduled playback cursor (ctx.currentTime)
  const speakTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunkCountRef     = useRef(0);
  const logThrottleRef    = useRef(0);

  // ── DSP chain refs (created once per session) ──────────────────────────────
  const compressorRef     = useRef<DynamicsCompressorNode | null>(null);
  const filterRef         = useRef<BiquadFilterNode | null>(null);

  // ── Barge-in: track every scheduled output node so we can stop them all ───
  const scheduledNodesRef  = useRef<AudioBufferSourceNode[]>([]);
  // Consecutive-chunk counter for barge-in debounce (prevents echo/noise false triggers)
  const bargeInConsecRef   = useRef(0);

  // ── Barge-in: immediately stop all queued Gemini audio ─────────────────────
  const flushPlaybackQueue = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const nodes = scheduledNodesRef.current;
    for (const node of nodes) {
      try { node.stop(); } catch { /* already ended */ }
    }
    scheduledNodesRef.current = [];
    playheadRef.current = ctx.currentTime;  // reset cursor to now
    if (speakTimerRef.current) { clearTimeout(speakTimerRef.current); speakTimerRef.current = null; }
    setIsSpeaking(false);
  }, []);

  // ── Playback: decode Gemini's 24 kHz Int16 PCM → DSP chain → output ────────
  //
  //   BufferSource → DynamicsCompressor → BiquadFilter(bandpass) → destination
  //
  //   Compressor punches up perceived loudness and authority.
  //   Bandpass at 1500 Hz / Q 0.5 rolls off robotic high-end and gives
  //   a warm, tactical-radio earpiece presence.
  const scheduleAudio = useCallback((i16: Int16Array) => {
    const ctx        = ctxRef.current;
    const compressor = compressorRef.current;
    const filter     = filterRef.current;
    if (!ctx || !compressor || !filter || !i16.length) return;

    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;

    const buf = ctx.createBuffer(1, f32.length, OUTPUT_RATE);
    buf.copyToChannel(f32, 0);

    const src = ctx.createBufferSource();
    src.buffer = buf;

    // Route through DSP chain instead of direct to destination
    src.connect(compressor);

    // Tight scheduling: 5 ms lookahead, chain chunks back-to-back
    const now     = ctx.currentTime;
    const startAt = Math.max(now + 0.005, playheadRef.current);
    src.start(startAt);
    playheadRef.current = startAt + buf.duration;

    // Track node for barge-in flush
    scheduledNodesRef.current.push(src);
    // Clean up ended nodes from the tracking array
    src.onended = () => {
      scheduledNodesRef.current = scheduledNodesRef.current.filter(n => n !== src);
    };

    setIsSpeaking(true);
    optsRef.current.onSpeakStart?.();
    slog('speak_start', { durationMs: Math.round(buf.duration * 1000) });

    // Mark speaking=false 80 ms after last chunk ends
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    speakTimerRef.current = setTimeout(() => {
      setIsSpeaking(false);
      optsRef.current.onSpeakEnd?.();
      slog('speak_end');
      speakTimerRef.current = null;
    }, (startAt + buf.duration - ctx.currentTime) * 1000 + 80);
  }, []);

  // ── Teardown ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (speakTimerRef.current) { clearTimeout(speakTimerRef.current); speakTimerRef.current = null; }

    workletRef.current?.port.close();
    workletRef.current?.disconnect();
    workletRef.current = null;

    sourceRef.current?.disconnect();
    sourceRef.current = null;

    gainRef.current?.disconnect();
    gainRef.current = null;

    // Tear down DSP chain
    filterRef.current?.disconnect();
    filterRef.current = null;
    compressorRef.current?.disconnect();
    compressorRef.current = null;

    // Release any lingering scheduled nodes
    for (const node of scheduledNodesRef.current) {
      try { node.stop(); } catch { /* already ended */ }
    }
    scheduledNodesRef.current = [];

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    wsRef.current?.close();
    wsRef.current = null;

    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;

    playheadRef.current   = 0;
    chunkCountRef.current = 0;
    setChunksSent(0);
    setState('idle');
    setIsSpeaking(false);
    slog('disconnected');
  }, []);

  // ── Connect ──────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      const msg = 'NEXT_PUBLIC_GEMINI_API_KEY is not set. Add it to .env.local.';
      setError(msg);
      setState('error');
      optsRef.current.onError?.(msg);
      return;
    }

    setState('connecting');
    setError(null);
    chunkCountRef.current = 0;
    setChunksSent(0);
    slog('connecting', { model: MODEL });

    try {
      // ── 1. AudioContext (must be inside user-gesture call stack) ──────────
      const ctx = new AudioContext({ sampleRate: 48_000 }); // native rate; worklet downsamples
      ctxRef.current = ctx;
      // Resume immediately — context can start in 'suspended' state even inside a
      // user-gesture call stack on some browsers, silently dropping scheduled audio.
      await ctx.resume();
      playheadRef.current = ctx.currentTime;
      slog('audio_ctx', { nativeRate: ctx.sampleRate });

      // ── 1a. Tactical DSP chain ──────────────────────────────────────────
      //   BufferSource → DynamicsCompressor → BiquadFilter → destination
      //
      //   Compressor: punches up loudness/authority
      //     threshold -24 dB, knee 30, ratio 12:1, attack 3ms, release 250ms
      //
      //   Bandpass filter: 1500 Hz centre, Q 0.5
      //     rolls off robotic hiss and adds a warm tactical-radio presence
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value      = 30;
      compressor.ratio.value     = 12;
      compressor.attack.value    = 0.003;
      compressor.release.value   = 0.25;
      compressorRef.current      = compressor;

      const filter   = ctx.createBiquadFilter();
      filter.type    = 'bandpass';
      filter.frequency.value = 1500;
      filter.Q.value         = 0.5;
      filterRef.current      = filter;

      // Wire the static part of the DSP chain (sources connect to compressor dynamically)
      compressor.connect(filter);
      filter.connect(ctx.destination);

      // ── 2-4. Parallel init: worklet load + mic acquisition + WS connect ──
      //
      //   These three have ZERO dependency on each other.  Running them
      //   sequentially (old code) added ~800ms–1.5s of dead wait time before
      //   the first audio chunk could be sent.  Promise.all collapses that to
      //   the duration of the single slowest leg (usually getUserMedia ~300ms).
      //
      //   WebSocket is constructed before the await so the TLS handshake starts
      //   immediately.  binaryType and onmessage are set right after construction
      //   (not after open) so no binary frame from Gemini can arrive before the
      //   handler is in place.

      const ws = new WebSocket(`${WS_ENDPOINT}?key=${apiKey}`);
      wsRef.current = ws;
      // Set BEFORE open fires — avoids a race where setupComplete arrives as
      // a binary frame between construction and the post-open assignment.
      ws.binaryType = 'arraybuffer';

      const wsReady = new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('WebSocket timeout (8 s)')), 8_000);
        ws.addEventListener('open',  () => { clearTimeout(t); resolve(); },        { once: true });
        ws.addEventListener('error', () => { clearTimeout(t); reject(new Error('WebSocket failed to open')); }, { once: true });
      });

      const [stream] = await Promise.all([
        // Leg A: microphone acquisition
        navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount:     1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl:  true,
          },
        }).then(s => { slog('microphone_acquired'); return s; }),

        // Leg B: AudioWorklet module fetch + compile
        ctx.audioWorklet.addModule(WORKLET_PATH).then(() => slog('worklet_loaded')),

        // Leg C: WebSocket TLS + HTTP upgrade
        wsReady.then(() => slog('ws_open')),
      ]);
      streamRef.current = stream;

      // ── 5. Setup message ─────────────────────────────────────────────────
      slog('setup_sent', { model: MODEL });
      ws.send(JSON.stringify({
        setup: {
          model: MODEL,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Puck' },  // deeper, more resonant timbre
              },
            },
          },
          // Return a text transcript of what the user said — used for keyword-based alert detection
          inputAudioTranscription: {},
          // Tune VAD for faster turn detection: low silence threshold, tight end-of-speech
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled:              false,
              startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
              endOfSpeechSensitivity:   'END_SENSITIVITY_HIGH',
              prefixPaddingMs:          20,
              silenceDurationMs:        250,  // 250ms: short enough for fast turns, long enough for natural pauses between words
            },
          },
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
        },
      }));

      // ── 6. Incoming message handler ───────────────────────────────────────
      ws.onmessage = (event) => {
        // Gemini may send either text or binary (ArrayBuffer) JSON frames
        let text: string;
        if (typeof event.data === 'string') {
          text = event.data;
        } else if (event.data instanceof ArrayBuffer) {
          text = new TextDecoder().decode(event.data);
        } else {
          slog('ws_msg_unknown_type', typeof event.data);
          return;
        }

        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(text) as Record<string, unknown>;
        } catch {
          slog('ws_json_parse_error', text.slice(0, 100));
          return;
        }

        if (msg.setupComplete) {
          optsRef.current.onSetupComplete?.();
          setState('live');
          slog('setup_complete — LIVE');
        }

        // Gemini Live returns audio via serverContent.modelTurn.parts[].inlineData
        // Support both camelCase and snake_case (proto3 JSON may return either)
        type GeminiContent = { parts?: Array<Record<string,unknown>> } | undefined;
        const sc  = (msg.serverContent ?? msg.server_content) as Record<string, unknown> | undefined;
        const turn = (sc?.modelTurn ?? sc?.model_turn) as GeminiContent;
        const parts: Array<Record<string, unknown>> = turn?.parts ?? [];
        for (const part of parts) {
          const data =
            (part.inlineData as Record<string,string> | undefined)?.data ??
            (part.inline_data as Record<string,string> | undefined)?.data;
          if (data) scheduleAudio(b642i16(data));

          const txt = part.text as string | undefined;
          if (txt) slog('server_text', txt.slice(0, 120));
        }

        // ── Input transcription: what the user actually said ──────────────
        type Transcription = { text?: string; finished?: boolean } | undefined;
        const inputTx = (msg.inputTranscription ?? msg.input_transcription) as Transcription;
        if (inputTx?.text) {
          slog('input_transcript', inputTx.text.slice(0, 120));
          if (inputTx.finished !== false) {
            optsRef.current.onInputTranscript?.(inputTx.text);
          }
        }
      };

      ws.onerror = () => {
        const msg = 'Gemini Live WebSocket error';
        setError(msg);
        setState('error');
        optsRef.current.onError?.(msg);
        slog('ws_error');
      };

      ws.onclose = (ev) => {
        slog('ws_closed', { code: ev.code, reason: ev.reason || '—' });
        if (ev.code !== 1000 && ev.code !== 1001) {
          setError(`WebSocket closed unexpectedly (code ${ev.code}: ${ev.reason})`);
          setState('error');
        } else {
          setState('idle');
        }
        setIsSpeaking(false);
      };

      // ── 7. AudioWorklet pipeline: mic → worklet → silent sink ────────────
      //   We route through a GainNode(0) → destination so the worklet is
      //   scheduled by Chrome/Safari without echoing mic audio to speakers.
      const workletNode = new AudioWorkletNode(ctx, 'aegis-pcm-processor');
      workletRef.current = workletNode;

      const silent = ctx.createGain();
      silent.gain.value = 0;
      gainRef.current = silent;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      source.connect(workletNode);
      workletNode.connect(silent);
      silent.connect(ctx.destination);

      // ── 8. Stream downsampled 16 kHz PCM to Gemini ───────────────────────
      //   realtimeInput.audio is the current non-deprecated field (mediaChunks
      //   was deprecated in the v1beta API).
      workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (ws.readyState !== WebSocket.OPEN) return;

        // ── Barge-in detection: compute local mic RMS from the 16 kHz Int16 PCM ──
        //   Threshold 0.08 (normalized 0-1) with a 4-consecutive-chunk debounce.
        //   Requiring 4 consecutive chunks (~120ms) before flushing prevents:
        //     • single ambient noise spikes
        //     • echo from Gemini's own speaker output picked up by the mic
        //   Only runs when audio is actively playing to avoid unnecessary work.
        if (scheduledNodesRef.current.length > 0) {
          const i16 = new Int16Array(e.data);
          let sumSq = 0;
          for (let j = 0; j < i16.length; j++) {
            const norm = i16[j] / 32768;
            sumSq += norm * norm;
          }
          const rms = Math.sqrt(sumSq / i16.length);
          if (rms > 0.08) {
            bargeInConsecRef.current++;
            if (bargeInConsecRef.current >= 4) {
              bargeInConsecRef.current = 0;
              flushPlaybackQueue();
              slog('barge_in', { rms: rms.toFixed(4) });
            }
          } else {
            bargeInConsecRef.current = 0; // reset streak on any quiet chunk
          }
        } else {
          bargeInConsecRef.current = 0;
        }

        ws.send(JSON.stringify({
          realtimeInput: {
            audio: {
              mimeType: `audio/pcm;rate=${INPUT_RATE}`,
              data: ab2b64(e.data),
            },
          },
        }));
        chunkCountRef.current++;
        optsRef.current.onChunksSent?.(chunkCountRef.current);
        // Batch React state update every 50 chunks (~1.5 s) instead of every 30 ms.
        // 33 state updates/second → 33 re-renders/second → main-thread congestion
        // that delays WebSocket processing and audio scheduling.
        logThrottleRef.current++;
        if (logThrottleRef.current >= 50) {
          setChunksSent(chunkCountRef.current);
          slog('streaming', { chunksSent: chunkCountRef.current });
          logThrottleRef.current = 0;
        }
      };
      // state moves to 'live' when setupComplete message arrives above

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[useGeminiLive]', msg);
      setError(msg);
      setState('error');
      optsRef.current.onError?.(msg);
      slog('connect_error', msg);
      disconnect();
    }
  }, [disconnect, scheduleAudio, flushPlaybackQueue]);

  return { state, isSpeaking, error, chunksSent, connect, disconnect };
}
