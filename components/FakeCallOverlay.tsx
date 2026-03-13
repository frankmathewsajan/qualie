'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Phone, PhoneOff, X } from 'lucide-react';

interface FakeCallProps {
  callerName: string;
  callerLabel?: string;
  onDismiss: () => void;
  audioCtx?: AudioContext | null;
}

export default function FakeCallOverlay({ callerName, callerLabel, onDismiss, audioCtx }: FakeCallProps) {
  const [phase, setPhase] = useState<'ringing' | 'connected' | 'ending'>('ringing');
  const [callDuration, setCallDuration] = useState(0);
  const durationRef = useRef<NodeJS.Timeout | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // Ringtone generator using Web Audio API
  const startRingtone = useCallback(() => {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const gain = audioCtx.createGain();
      gain.gain.value = 0.3;
      gain.connect(audioCtx.destination);
      gainRef.current = gain;

      // Ring pattern: beep-beep, pause, beep-beep
      const playRing = () => {
        if (oscRef.current) return; // already playing
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 440;
        osc.connect(gain);
        osc.start();
        oscRef.current = osc;

        // Two-pulse ring
        setTimeout(() => {
          osc.frequency.value = 520;
        }, 150);
        setTimeout(() => {
          osc.frequency.value = 0;
        }, 300);
        setTimeout(() => {
          osc.frequency.value = 440;
        }, 400);
        setTimeout(() => {
          osc.frequency.value = 520;
        }, 550);
        setTimeout(() => {
          osc.frequency.value = 0;
        }, 700);
      };

      playRing();
      const ringInterval = setInterval(playRing, 2500);

      return () => {
        clearInterval(ringInterval);
        if (oscRef.current) {
          try { oscRef.current.stop(); } catch {}
          oscRef.current = null;
        }
      };
    } catch (e) {
      console.error('[fake-call] ringtone error:', e);
    }
  }, [audioCtx]);

  useEffect(() => {
    if (phase !== 'ringing') return;
    const cleanup = startRingtone();
    // Vibrate pattern if supported
    if (navigator.vibrate) {
      const vibrateInterval = setInterval(() => navigator.vibrate([200, 100, 200, 1500]), 2500);
      return () => {
        cleanup?.();
        clearInterval(vibrateInterval);
        navigator.vibrate(0);
      };
    }
    return cleanup;
  }, [phase, startRingtone]);

  // Stop ringtone when answering
  const answer = () => {
    if (oscRef.current) {
      try { oscRef.current.stop(); } catch {}
      oscRef.current = null;
    }
    navigator.vibrate?.(0);
    setPhase('connected');
    durationRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  };

  const hangup = () => {
    if (oscRef.current) {
      try { oscRef.current.stop(); } catch {}
      oscRef.current = null;
    }
    navigator.vibrate?.(0);
    if (durationRef.current) clearInterval(durationRef.current);
    setPhase('ending');
    setTimeout(onDismiss, 800);
  };

  const fmtDuration = (s: number) =>
    String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[999999] select-none"
      style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 40%, #000000 100%)' }}>

      {/* Decorative blur circles */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full opacity-20"
        style={{
          background: phase === 'ringing'
            ? 'radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 70%)'
            : phase === 'connected'
              ? 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)',
          animation: 'pulse 2s ease-in-out infinite',
        }} />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between py-16 px-8">

        {/* Top Section - Caller info */}
        <div className="flex flex-col items-center gap-3 pt-8">
          {phase === 'ringing' && (
            <p className="text-emerald-400/80 text-xs font-semibold uppercase tracking-[0.25em] animate-pulse">
              Incoming Call
            </p>
          )}
          {phase === 'connected' && (
            <p className="text-blue-400/80 text-xs font-semibold uppercase tracking-[0.25em]">
              Connected · {fmtDuration(callDuration)}
            </p>
          )}
          {phase === 'ending' && (
            <p className="text-red-400/80 text-xs font-semibold uppercase tracking-[0.25em]">
              Call Ended
            </p>
          )}

          {/* Avatar */}
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mt-6 ${
            phase === 'ringing' ? 'ring-4 ring-emerald-500/30 animate-pulse' : ''
          }`}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
              boxShadow: '0 0 40px rgba(99,102,241,0.3)',
            }}>
            <span className="text-3xl font-black text-white">
              {callerName.charAt(0).toUpperCase()}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-white mt-4 tracking-tight">{callerName}</h1>
          <p className="text-white/40 text-sm">{callerLabel || 'Mobile'}</p>
        </div>

        {/* Bottom Section - Call actions */}
        <div className="w-full max-w-xs">
          {phase === 'ringing' ? (
            <div className="flex items-center justify-between px-6">
              {/* Decline */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={hangup}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-90 flex items-center justify-center shadow-lg shadow-red-500/30 transition-all"
                >
                  <PhoneOff className="w-6 h-6 text-white" />
                </button>
                <span className="text-[11px] text-white/40 font-medium">Decline</span>
              </div>

              {/* Accept */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={answer}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-90 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all"
                  style={{ animation: 'ring-bounce 1.5s ease-in-out infinite' }}
                >
                  <Phone className="w-6 h-6 text-white" />
                </button>
                <span className="text-[11px] text-white/40 font-medium">Accept</span>
              </div>
            </div>
          ) : phase === 'connected' ? (
            <div className="flex flex-col items-center gap-4">
              {/* Fake call connected UI */}
              <div className="flex items-center gap-3 text-white/20 text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Encrypted call · HD Audio
              </div>
              <button
                onClick={hangup}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-90 flex items-center justify-center shadow-lg shadow-red-500/30 transition-all"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
              <span className="text-[11px] text-white/40 font-medium">End Call</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-50">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <PhoneOff className="w-6 h-6 text-white/50" />
              </div>
              <span className="text-[11px] text-white/30 font-medium">Disconnected</span>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.1); opacity: 0.35; }
        }
        @keyframes ring-bounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          10% { transform: scale(1.05) rotate(-5deg); }
          20% { transform: scale(1.05) rotate(5deg); }
          30% { transform: scale(1.05) rotate(-5deg); }
          40% { transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
