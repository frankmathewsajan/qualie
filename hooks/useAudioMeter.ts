import { useState, useRef, useEffect } from 'react';

export type MeterState = 'idle' | 'requesting' | 'recording' | 'error';

export function useAudioMeter() {
  const [state, setState]   = useState<MeterState>('idle');
  const [volume, setVolume] = useState(0);
  const [error, setError]   = useState<string | null>(null);

  const ctxRef         = useRef<AudioContext | null>(null);
  const srcRef         = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const recorderRef    = useRef<MediaRecorder | null>(null);
  const chunksRef      = useRef<Blob[]>([]);
  const rafRef         = useRef<number>(0);
  const smoothRef      = useRef(0);
  const stateRef       = useRef<MeterState>('idle');

  useEffect(() => { stateRef.current = state; }, [state]);

  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    tickRef.current = () => {
      const analyser = analyserRef.current;
      if (!analyser) return;
      const buf = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(buf);
      const rms = Math.sqrt(
        buf.reduce((acc, v) => acc + ((v - 128) / 128) ** 2, 0) / buf.length
      );
      const raw = Math.min(100, Math.round(rms * 400));
      const alpha = raw > smoothRef.current ? 0.5 : 0.1;
      smoothRef.current = smoothRef.current * (1 - alpha) + raw * alpha;
      setVolume(Math.round(smoothRef.current));
      rafRef.current = requestAnimationFrame(tickRef.current);
    };
  });

  const start = async () => {
    if (stateRef.current === 'recording') return;
    setState('requesting');
    setError(null);
    chunksRef.current = [];
    try {
      // Mono 16kHz — ideal for speech AI (Whisper etc.) and very compressible
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // AudioContext honours the stream's native sample rate
      const ctx = new AudioContext({ sampleRate: 16000 });
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);

      // Opus is the best speech codec. 12kbps = tiny file, still clear for transcription.
      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')  ? 'audio/ogg;codecs=opus'  :
        'audio/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 12000, // 12kbps: good speech clarity, ~90KB/min
      });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(250); // 250ms chunks

      ctxRef.current      = ctx;
      analyserRef.current = analyser;
      srcRef.current      = src;
      streamRef.current   = stream;
      recorderRef.current = recorder;
      smoothRef.current   = 0;

      setState('recording');
      rafRef.current = requestAnimationFrame(tickRef.current);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone access denied');
      setState('error');
    }
  };

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    recorderRef.current?.stop();
    srcRef.current?.disconnect();
    ctxRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    ctxRef.current = srcRef.current = analyserRef.current = streamRef.current = recorderRef.current = null;
    smoothRef.current = 0;
    setVolume(0);
    setState('idle');
  };

  // Flush remaining audio and return compressed blob
  const getBlob = (): Promise<Blob> =>
    new Promise(resolve => {
      const recorder = recorderRef.current;
      if (!recorder || chunksRef.current.length === 0) {
        resolve(new Blob([], { type: 'audio/webm' }));
        return;
      }
      recorder.requestData();
      setTimeout(() => {
        const mime = recorder.mimeType || 'audio/webm';
        resolve(new Blob(chunksRef.current, { type: mime }));
      }, 300);
    });

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    recorderRef.current?.stop();
    ctxRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  return { state, volume, error, start, stop, getBlob };
}
