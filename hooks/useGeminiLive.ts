'use client';
import { useRef, useState, useCallback } from 'react';

// ── Gemini Live API constants ────────────────────────────────────────────────
const WS_ENDPOINT =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const MODEL          = 'models/gemini-2.5-flash-native-audio-preview-12-2025';  // Live API v1beta
const INPUT_RATE     = 16_000;  // Hz we downsample to
const OUTPUT_RATE    = 24_000;  // Hz Gemini returns PCM at
const WORKLET_PATH   = '/worklets/aegis-pcm-processor.js';

const SYSTEM_PROMPT =
  "You are Aegis, an autonomous AI safety guardian. " +
  "You monitor ambient audio for distress, danger, or threats. " +
  "When you detect something concerning, respond calmly and clearly with immediate guidance. " +
  "Keep responses under 20 words. The user's safety is paramount.";

// ── Types ────────────────────────────────────────────────────────────────────
export type GeminiLiveState = 'idle' | 'connecting' | 'live' | 'error';

export interface UseGeminiLiveOptions {
  onSetupComplete?: () => void;
  onSpeakStart?:    () => void;
  onSpeakEnd?:      () => void;
  onError?:         (msg: string) => void;
  onChunksSent?:    (count: number) => void;
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
  optsRef.current = opts; // keep option callbacks fresh without re-creating connect

  const [state,      setState]      = useState<GeminiLiveState>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [chunksSent, setChunksSent] = useState(0);

  // Internal refs so closures always see latest values
  const wsRef          = useRef<WebSocket | null>(null);
  const ctxRef         = useRef<AudioContext | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const workletRef     = useRef<AudioWorkletNode | null>(null);
  const sourceRef      = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainRef        = useRef<GainNode | null>(null);
  const playheadRef    = useRef(0);                // scheduled playback cursor (ctx.currentTime)
  const speakTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunkCountRef  = useRef(0);
  const logThrottleRef = useRef(0);

  // ── Playback: decode Gemini's 24 kHz Int16 PCM and schedule it ────────────
  const scheduleAudio = useCallback((i16: Int16Array) => {
    const ctx = ctxRef.current;
    if (!ctx || !i16.length) return;

    const f32     = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;

    const buf = ctx.createBuffer(1, f32.length, OUTPUT_RATE);
    buf.copyToChannel(f32, 0);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);

    // Tight scheduling: 5 ms lookahead (was 30 ms), chain chunks back-to-back
    const now     = ctx.currentTime;
    const startAt = Math.max(now + 0.005, playheadRef.current);
    src.start(startAt);
    playheadRef.current = startAt + buf.duration;

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
      playheadRef.current = ctx.currentTime;
      slog('audio_ctx', { nativeRate: ctx.sampleRate });

      // ── 2. Load AudioWorklet module ───────────────────────────────────────
      await ctx.audioWorklet.addModule(WORKLET_PATH);
      slog('worklet_loaded');

      // ── 3. Microphone stream ─────────────────────────────────────────────
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount:     1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
        },
      });
      streamRef.current = stream;
      slog('microphone_acquired');

      // ── 4. WebSocket ─────────────────────────────────────────────────────
      const ws = new WebSocket(`${WS_ENDPOINT}?key=${apiKey}`);
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error('WebSocket failed to open'));
        const t = setTimeout(() => reject(new Error('WebSocket timeout (8 s)')), 8_000);
        ws.addEventListener('open', () => clearTimeout(t), { once: true });
      });
      // Gemini sends binary frames — receive as ArrayBuffer so we can decode to text
      ws.binaryType = 'arraybuffer';
      slog('ws_open');

      // ── 5. Setup message ─────────────────────────────────────────────────
      slog('setup_sent', { model: MODEL });
      ws.send(JSON.stringify({
        setup: {
          model: MODEL,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Aoede' },
              },
            },
          },
          // Tune VAD for faster turn detection: low silence threshold, tight end-of-speech
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled:              false,
              startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
              endOfSpeechSensitivity:   'END_SENSITIVITY_HIGH',
              prefixPaddingMs:          20,
              silenceDurationMs:        300,
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
        const turn  = msg.serverContent?.modelTurn ?? msg.server_content?.model_turn;
        const parts: Array<Record<string, unknown>> = turn?.parts ?? [];
        for (const part of parts) {
          const data =
            (part.inlineData as Record<string,string> | undefined)?.data ??
            (part.inline_data as Record<string,string> | undefined)?.data;
          if (data) scheduleAudio(b642i16(data));

          const txt = part.text as string | undefined;
          if (txt) slog('server_text', txt.slice(0, 120));
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
        ws.send(JSON.stringify({
          realtimeInput: {
            audio: {
              mimeType: `audio/pcm;rate=${INPUT_RATE}`,
              data: ab2b64(e.data),
            },
          },
        }));
        chunkCountRef.current++;
        setChunksSent(chunkCountRef.current);
        optsRef.current.onChunksSent?.(chunkCountRef.current);
        // Heartbeat every 50 chunks ≈ every 5 s to confirm streaming without spam
        logThrottleRef.current++;
        if (logThrottleRef.current >= 50) {
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
  }, [disconnect, scheduleAudio]);

  return { state, isSpeaking, error, chunksSent, connect, disconnect };
}
