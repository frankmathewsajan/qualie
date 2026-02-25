'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Mic, Home, PhoneCall, Droplets, Wind,
  MapPin, AlertTriangle, Navigation, Thermometer, ChevronRight,
} from 'lucide-react';
import { useAudioMeter } from '@/hooks/useAudioMeter';
import { useWeather, decodeWeather } from '@/hooks/useWeather';
import { useGeminiLive } from '@/hooks/useGeminiLive';

const THRESHOLD = 65;

// Words that auto-trigger the alert even below the volume threshold.
// Case-insensitive substring match on Gemini's live input transcript.
const DISTRESS_KEYWORDS = ['stop', 'help', 'danger', 'fire', 'attack', 'threat', 'emergency', 'run', 'scared'];

// ─── Inline weather SVG icons (no external dep) ──────────────────────────────
function WIcon({ emoji, size = 64 }: { emoji: string; size?: number }) {
  const d = size;
  const map: Record<string, React.ReactNode> = {
    sun: (
      <svg width={d} height={d} viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="9" fill="#fbbf24"/>
        {[0,45,90,135,180,225,270,315].map((a,i) => {
          const rad = a * Math.PI / 180;
          return <line key={i}
            x1={(24+13*Math.cos(rad)).toFixed(1)} y1={(24+13*Math.sin(rad)).toFixed(1)}
            x2={(24+17*Math.cos(rad)).toFixed(1)} y2={(24+17*Math.sin(rad)).toFixed(1)}
            stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>;
        })}
      </svg>
    ),
    'cloud-sun': (
      <svg width={d} height={d} viewBox="0 0 48 48" fill="none">
        <circle cx="19" cy="19" r="7" fill="#fde68a"/>
        {[315,0,45].map((a,i) => {
          const rad = a * Math.PI / 180;
          return <line key={i}
            x1={(19+10*Math.cos(rad)).toFixed(1)} y1={(19+10*Math.sin(rad)).toFixed(1)}
            x2={(19+13*Math.cos(rad)).toFixed(1)} y2={(19+13*Math.sin(rad)).toFixed(1)}
            stroke="#fde68a" strokeWidth="2" strokeLinecap="round"/>;
        })}
        <path d="M10 36 a8 8 0 0 1 0-16 a7 7 0 0 1 13-3A6 6 0 1 1 34 36Z" fill="#bae6fd"/>
      </svg>
    ),
    cloud: (
      <svg width={d} height={d} viewBox="0 0 48 48" fill="none">
        <path d="M10 36 a8 8 0 0 1 0-16 a7 7 0 0 1 13.5-2.5A7 7 0 1 1 34 36Z" fill="#94a3b8"/>
      </svg>
    ),
    fog: (
      <svg width={d} height={d} viewBox="0 0 48 48" fill="none">
        <path d="M10 22 a8 8 0 0 1 0-16 a7 7 0 0 1 13.5-2.5A7 7 0 1 1 34 22Z" fill="#cbd5e1"/>
        <line x1="6" y1="30" x2="42" y2="30" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round"/>
        <line x1="10" y1="38" x2="38" y2="38" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    ),
    drizzle: (
      <svg width={d} height={d} viewBox="0 0 48 48" fill="none">
        <path d="M10 26 a8 8 0 0 1 0-16 a7 7 0 0 1 13.5-2.5A7 7 0 1 1 34 26Z" fill="#bae6fd"/>
        {[[14,34],[24,30],[34,34]].map(([x,y],i) =>
          <line key={i} x1={x} y1={y} x2={x-2} y2={y+8} stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round"/>)}
      </svg>
    ),
    rain: (
      <svg width={d} height={d} viewBox="0 0 48 48" fill="none">
        <path d="M10 24 a8 8 0 0 1 0-16 a7 7 0 0 1 13.5-2.5A7 7 0 1 1 34 24Z" fill="#60a5fa"/>
        {[[12,32],[20,28],[28,32],[16,40],[28,40]].map(([x,y],i) =>
          <line key={i} x1={x} y1={y} x2={x-3} y2={y+9} stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"/>)}
      </svg>
    ),
    snow: (
      <svg width={d} height={d} viewBox="0 0 48 48" fill="none">
        <path d="M10 24 a8 8 0 0 1 0-16 a7 7 0 0 1 13.5-2.5A7 7 0 1 1 34 24Z" fill="#e2e8f0"/>
        {[[14,34],[24,30],[34,34],[18,42],[30,42]].map(([x,y],i) =>
          <circle key={i} cx={x} cy={y} r="2.5" fill="#94a3b8"/>)}
      </svg>
    ),
    showers: (
      <svg width={d} height={d} viewBox="0 0 48 48" fill="none">
        <path d="M10 24 a8 8 0 0 1 0-16 a7 7 0 0 1 13.5-2.5A7 7 0 1 1 34 24Z" fill="#93c5fd"/>
        {[[14,32],[24,28],[34,32]].map(([x,y],i) =>
          <line key={i} x1={x} y1={y} x2={x-2} y2={y+9} stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"/>)}
      </svg>
    ),
    storm: (
      <svg width={d} height={d} viewBox="0 0 48 48" fill="none">
        <path d="M10 24 a8 8 0 0 1 0-16 a7 7 0 0 1 13.5-2.5A7 7 0 1 1 34 24Z" fill="#475569"/>
        <path d="M26 28 L20 38 L26 38 L20 48" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
  };
  return <span className="shrink-0">{map[emoji] ?? map.cloud}</span>;
}

const fmtTime = (s: number) =>
  String(Math.floor(s / 60)).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0');

const todayStr = () =>
  new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

function uvLabel(uv: number) {
  if (uv <= 2)  return { label:'Low',       color:'#22c55e' };
  if (uv <= 5)  return { label:'Moderate',  color:'#f59e0b' };
  if (uv <= 7)  return { label:'High',      color:'#f97316' };
  if (uv <= 10) return { label:'Very High', color:'#ef4444' };
  return              { label:'Extreme',    color:'#8b5cf6' };
}

// ─── gsap type (lazy imported) ───────────────────────────────────────────────
type Gsap = typeof import('gsap')['gsap'];

export default function ListenPage() {
  const { state, volume, error: micError, start, stop, getBlob } = useAudioMeter();
  const { weatherState, data: wx, weatherError, requestWeather } = useWeather();

  const sendAlertRef = useRef<(() => void) | null>(null);

  const { state: geminiState, isSpeaking, chunksSent,
          connect: geminiConnect, disconnect: geminiDisconnect } = useGeminiLive({
    onInputTranscript: (text) => {
      // Show transcript as subtle subtext (auto-clears after 4s)
      setLastTranscript(text);
      if (transcriptTimer.current) clearTimeout(transcriptTimer.current);
      transcriptTimer.current = setTimeout(() => setLastTranscript(null), 4000);

      const lower = text.toLowerCase();
      const hit   = DISTRESS_KEYWORDS.some(kw => lower.includes(kw));
      if (hit) {
        console.log('[listen] keyword match in transcript:', text);
        sendAlertRef.current?.();
      }
    },
  });

  const [breached, setBreached]             = useState(false);
  const [dismissed, setDismissed]           = useState(false);
  const [peakVol, setPeakVol]               = useState(0);
  const [sessionTime, setSessionTime]       = useState(0);
  const [sending, setSending]               = useState(false);
  const [sent, setSent]                     = useState(false);
  const [geminiAnalysis, setGeminiAnalysis] = useState<string | null>(null);
  const [backendStep, setBackendStep]       = useState<'compressing'|'uploading'|'analysing'|'done'|null>(null);
  const [analysisMs, setAnalysisMs]         = useState<number | null>(null);
  const [audioPlaybackUrl, setAudioPlaybackUrl] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript]       = useState<string | null>(null);

  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentRef           = useRef(false);
  const gsapRef           = useRef<Gsap | null>(null);
  const playbackUrlRef    = useRef<string | null>(null);
  const transcriptTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // element refs for GSAP
  const headerRef    = useRef<HTMLElement>(null);
  const weatherRef   = useRef<HTMLDivElement>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const beginBtnRef  = useRef<HTMLButtonElement>(null);
  const livePillRef  = useRef<HTMLDivElement>(null);
  const dotRef       = useRef<HTMLSpanElement>(null);
  const dotTweenRef  = useRef<ReturnType<Gsap['to']> | null>(null);

  const isRecording = state === 'recording';
  const wx_d  = wx ? decodeWeather(wx.code) : null;
  const bg    = wx_d
    ? 'linear-gradient(160deg,' + wx_d.bg[0] + ' 0%,' + wx_d.bg[1] + ' 100%)'
    : 'linear-gradient(160deg,#f8fafc 0%,#e2e8f0 100%)';
  const accent = wx_d?.accent ?? '#0ea5e9';

  // ── lazy-load GSAP + entrance animation ────────────────────────────────────
  useEffect(() => {
    import('gsap').then(({ gsap }) => {
      gsapRef.current = gsap;
      gsap.set([headerRef.current, weatherRef.current, bottomRef.current], {
        opacity: 0, y: 18,
      });
      gsap.to(headerRef.current, {
        opacity: 1, y: 0, duration: 0.55, ease: 'power3.out',
      });
      gsap.to(weatherRef.current, {
        opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', delay: 0.08,
      });
      gsap.to(bottomRef.current, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.16,
      });
    });
  }, []);

  // ── weather-card entrance when data arrives ─────────────────────────────────
  useEffect(() => {
    if (weatherState !== 'ready' || !gsapRef.current) return;
    gsapRef.current.from(weatherRef.current, {
      scale: 0.96, opacity: 0, duration: 0.5, ease: 'back.out(1.4)',
    });
  }, [weatherState]);

  // ── recording state animations ─────────────────────────────────────────────
  useEffect(() => {
    const gsap = gsapRef.current;
    if (!gsap) return;

    if (isRecording) {
      // pill slides up
      gsap.from(livePillRef.current, {
        y: 12, opacity: 0, duration: 0.45, ease: 'power2.out',
      });
      // dot breathe loop
      dotTweenRef.current = gsap.to(dotRef.current, {
        scale: 1.6, opacity: 0.5, repeat: -1, yoyo: true,
        duration: 0.9, ease: 'sine.inOut',
      });
    } else {
      dotTweenRef.current?.kill();
      if (beginBtnRef.current) {
        gsap.from(beginBtnRef.current, {
          opacity: 0, y: 6, duration: 0.4, ease: 'power2.out',
        });
      }
    }
    return () => { dotTweenRef.current?.kill(); };
  }, [isRecording]);

  // ── alert send ──────────────────────────────────────────────────────────────
  const sendAlert = useCallback(async () => {
    if (sentRef.current) return;
    sentRef.current = true;
    setSending(true);
    setBreached(true);  // ensure breach sheet opens even on keyword-only trigger
    setDismissed(false);
    setBackendStep('compressing');
    try {
      setBackendStep('compressing');
      const blob = await getBlob();
      // Save a local copy so the user can play it back
      if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
      const objUrl = URL.createObjectURL(blob);
      playbackUrlRef.current = objUrl;
      setAudioPlaybackUrl(objUrl);
      setBackendStep('uploading');
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');
      fd.append('volume', String(peakVol));
      fd.append('location', JSON.stringify({ lat: wx?.lat, lon: wx?.lon }));
      fd.append('city', wx?.city ?? '');
      setBackendStep('analysing');
      const t0  = Date.now();
      const res  = await fetch('/api/alert', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({})) as { analysis?: string };
      setAnalysisMs(Date.now() - t0);
      if (json.analysis) setGeminiAnalysis(json.analysis);
      setSent(true);
      setBackendStep('done');
    } catch (e) {
      console.error('[listen] alert failed', e);
      setBackendStep(null);
    } finally {
      setSending(false);
    }
  }, [getBlob, peakVol, wx]);

  // Keep a ref so the keyword callback (which is closed over at render time) can always call the latest sendAlert
  useEffect(() => { sendAlertRef.current = sendAlert; }, [sendAlert]);

  // Revoke the blob URL when the component unmounts to avoid memory leaks
  useEffect(() => () => {
    if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
  }, []);

  // ── breach detect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRecording) return;
    if (volume > peakVol) setPeakVol(volume);
    if (volume >= THRESHOLD && !breached) {
      setBreached(true);
      setDismissed(false);
      sendAlert();
    }
  }, [volume, isRecording, breached, peakVol, sendAlert]);

  // ── session timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setSessionTime(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setSessionTime(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const handleToggle = () => {
    if (isRecording) {
      stop();
      geminiDisconnect();
      setBreached(false); setPeakVol(0); sentRef.current = false; setSent(false);
      setGeminiAnalysis(null); setBackendStep(null); setAnalysisMs(null);
      if (playbackUrlRef.current) { URL.revokeObjectURL(playbackUrlRef.current); playbackUrlRef.current = null; }
      setAudioPlaybackUrl(null);
    } else {
      setBreached(false); setPeakVol(0); sentRef.current = false; setSent(false);
      setGeminiAnalysis(null); setBackendStep(null); setAnalysisMs(null);
      const gsap = gsapRef.current;
      const doStart = () => { start(); geminiConnect(); };
      if (gsap && beginBtnRef.current) {
        gsap.to(beginBtnRef.current, {
          scale: 0.94, duration: 0.12, ease: 'power2.in',
          onComplete: () => {
            gsap.to(beginBtnRef.current, { scale: 1, duration: 0.2, ease: 'back.out(2)' });
            doStart();
          },
        });
      } else {
        doStart();
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans select-none"
         style={{ background: bg, transition: 'background 1.2s ease' }}>

      {/* ── Breach sheet ─────────────────────────────────────────────────── */}
      {breached && !dismissed && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 pb-8"
             onClick={(e) => { if (e.target === e.currentTarget) setDismissed(true); }}>
          <div className="w-full max-w-sm rounded-2xl bg-white overflow-hidden"
               style={{ boxShadow: '0 16px 60px rgba(239,68,68,0.15), 0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="h-1 w-full bg-red-100 overflow-hidden">
              <div className={'h-full bg-red-500 transition-all duration-700 ' +
                (sending ? 'w-2/3 animate-pulse' : sent ? 'w-full' : 'w-1/4')} />
            </div>
            <div className="px-4 py-3">
              <div className="flex gap-2.5 items-start">
                <div className="p-2 rounded-xl shrink-0" style={{ background: '#fff1f2' }}>
                  <PhoneCall className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-800 text-[13px] leading-snug">
                      {sent ? 'Alert delivered' : sending ? 'Sending alert…' : 'Threshold exceeded'}
                    </p>
                    <button onClick={() => setDismissed(true)}
                      className="text-slate-300 hover:text-slate-600 transition-colors shrink-0 -mt-0.5 -mr-1 p-1">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                    {sent && geminiAnalysis
                      ? geminiAnalysis
                      : sent
                        ? 'Audio and location sent. Notification dispatched.'
                        : sending
                          ? 'Analysing with Gemini AI…'
                          : 'Acoustic stress above limit. Preparing alert.'}
                  </p>
                  {audioPlaybackUrl && (
                    <div className="mt-2">
                      <p className="text-[9px] font-mono text-slate-400 tracking-wider uppercase mb-1">Captured audio</p>
                      <audio controls src={audioPlaybackUrl} className="w-full" style={{ height: 28, accentColor: '#ef4444' }} />
                    </div>
                  )}
                  {wx && (
                    <p className="flex items-center gap-1 text-slate-400 text-[10px] mt-1.5">
                      <MapPin className="w-2.5 h-2.5" />
                      {wx.city}{wx.country ? ', ' + wx.country : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2.5">
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  <span className={'w-1.5 h-1.5 rounded-full ' +
                    (sending ? 'bg-amber-400 animate-pulse' : sent ? 'bg-emerald-400' : 'bg-red-400')}/>
                  {sending ? 'TRANSMITTING' : sent ? 'DELIVERED' : peakVol + '/100'}
                </span>
                <button onClick={() => setDismissed(true)}
                  className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors px-2 py-0.5 rounded-md">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header ref={headerRef} className="px-5 pt-6 pb-3 flex items-center justify-between shrink-0" style={{ opacity: 0 }}>
        <div>
          <p className="text-[11px] font-medium tracking-widest text-slate-400 uppercase">{todayStr()}</p>
          <p className="text-[10px] font-mono text-slate-300 mt-px">Acoustic Monitor</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Gemini Live status badge */}
          {geminiState === 'connecting' && (
            <div className="flex items-center gap-1.5 bg-white/60 rounded-full px-2.5 py-1 border border-white/80">
              <div className="w-3 h-3 rounded-full border-[1.5px] border-slate-200 animate-spin" style={{ borderTopColor: accent }} />
              <span className="text-[10px] font-semibold text-slate-400 tracking-wide">AI</span>
            </div>
          )}
          {geminiState === 'live' && (
            <div className="flex items-center gap-1.5 bg-white/60 rounded-full px-2.5 py-1 border border-indigo-100">
              <span className={`w-1.5 h-1.5 rounded-full ${
                isSpeaking ? 'bg-indigo-500 animate-ping' : 'bg-indigo-400'
              }`} />
              <span className="text-[10px] font-semibold tracking-wide" style={{ color: '#6366f1' }}>
                {isSpeaking ? 'AEGIS' : `AI · ${chunksSent}`}
              </span>
            </div>
          )}
          {geminiState === 'error' && (
            <div className="flex items-center gap-1.5 bg-amber-50 rounded-full px-2.5 py-1 border border-amber-100">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[10px] font-semibold text-amber-500 tracking-wide">AI ERR</span>
            </div>
          )}
          <Link href="/"
            className="w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm shadow-sm flex items-center justify-center hover:shadow-md transition-shadow">
            <Home className="w-3.5 h-3.5 text-slate-500" />
          </Link>
        </div>
      </header>

      {/* ── Weather card ─────────────────────────────────────────────────── */}
      <div ref={weatherRef} className="px-5 pb-2" style={{ opacity: 0 }}>
        {weatherState === 'idle' && (
          <button onClick={requestWeather}
            className="w-full flex items-center gap-4 bg-white/70 backdrop-blur-sm rounded-2xl px-5 py-4 shadow-sm border border-white/90 hover:bg-white/90 transition-colors group">
            <div className="p-3 rounded-xl shrink-0" style={{ background: accent + '18' }}>
              <Navigation className="w-5 h-5" style={{ color: accent }}/>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-slate-700 text-sm">See local weather</p>
              <p className="text-slate-400 text-xs mt-0.5">Tap to share your location</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors"/>
          </button>
        )}

        {(weatherState === 'locating' || weatherState === 'fetching') && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl px-5 py-5 shadow-sm border border-white/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-slate-100 animate-spin" style={{ borderTopColor: accent }}/>
            <div>
              <p className="text-slate-600 text-sm font-semibold">
                {weatherState === 'locating' ? 'Finding your location…' : 'Loading weather…'}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">Using GPS · high-accuracy mode</p>
            </div>
          </div>
        )}

        {weatherState === 'error' && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl px-5 py-4 shadow-sm border border-amber-100 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0"/>
            <div className="flex-1 min-w-0">
              <p className="text-slate-600 text-sm font-medium">Location unavailable</p>
              <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{weatherError}</p>
            </div>
            <button onClick={requestWeather} className="text-xs font-semibold shrink-0 mt-0.5 hover:opacity-70 transition-opacity"
              style={{ color: accent }}>Retry</button>
          </div>
        )}

        {weatherState === 'ready' && wx && wx_d && (
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl overflow-hidden shadow-sm border border-white/90">
            <div className="px-5 pt-4 pb-0 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-slate-400"/>
                <p className="text-slate-500 text-xs font-medium">{wx.city}{wx.country ? ', ' + wx.country : ''}</p>
              </div>
              <p className="text-slate-400 text-xs font-mono">{wx.localTime}</p>
            </div>
            <div className="px-5 pt-2 pb-3 flex items-center justify-between">
              <div>
                <div className="flex items-end gap-1 leading-none">
                  <span className="text-[72px] font-black text-slate-800 tracking-tighter leading-none">{wx.temp}</span>
                  <span className="text-3xl font-light text-slate-400 mb-3">°C</span>
                </div>
                <p className="text-slate-500 text-base font-medium mt-1">{wx_d.label}</p>
                <p className="text-slate-400 text-sm mt-0.5">Feels like {wx.feelsLike}°C</p>
              </div>
              <WIcon emoji={wx_d.emoji} size={80} />
            </div>
            <div className="h-px mx-5" style={{ background: 'linear-gradient(90deg,transparent,' + accent + '33,transparent)' }}/>
            <div className="px-5 py-3 grid grid-cols-4 gap-0 divide-x divide-slate-100">
              {[
                { icon: <Droplets className="w-3.5 h-3.5"/>, val: wx.humidity + '%',      sub: 'Humidity' },
                { icon: <Wind className="w-3.5 h-3.5"/>,     val: wx.windSpeed + ' km/h', sub: 'Wind' },
                { icon: <Thermometer className="w-3.5 h-3.5"/>, val: wx.feelsLike + '°', sub: 'Feels' },
                ...(wx.uvIndex != null
                  ? [{ icon: null as React.ReactNode, val: wx.uvIndex + '', sub: uvLabel(wx.uvIndex).label,
                       valColor: uvLabel(wx.uvIndex).color }]
                  : []),
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center px-1 gap-0.5">
                  <span className="text-slate-400" style={i === 3 ? { color: item.valColor } : undefined}>
                    {item.icon ?? <span className="text-[10px] font-bold" style={{ color: item.valColor }}>UV</span>}
                  </span>
                  <span className="font-bold text-slate-700 text-sm leading-none"
                        style={item.valColor ? { color: item.valColor } : undefined}>{item.val}</span>
                  <span className="text-[9px] text-slate-400 tracking-wide">{item.sub}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Backend process indicator ────────────────────────────────────── */}
      {backendStep && (
        <div className="px-5 pt-2 flex justify-end">
          <div className="flex items-center gap-1.5 opacity-70">
            {backendStep !== 'done' && (
              <span className="w-1 h-1 rounded-full animate-ping bg-slate-400" />
            )}
            <span className="text-[10px] font-mono text-slate-400 tracking-wider">
              {backendStep === 'compressing' && '↓ compressing audio…'}
              {backendStep === 'uploading'   && '↑ uploading to server…'}
              {backendStep === 'analysing'   && '⟳ gemini analysing…'}
              {backendStep === 'done'        && `✓ analysis done${analysisMs ? ' · ' + analysisMs + 'ms' : ''}`}
            </span>
          </div>
        </div>
      )}

      {/* ── Spacer ───────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Sent strip ───────────────────────────────────────────────────── */}
      {breached && !sending && (
        <div className="px-5 pb-2 flex justify-center">
          <div className="flex items-center gap-2 bg-white/60 border border-red-100 rounded-2xl px-4 py-2.5 shadow-sm">
            <PhoneCall className="w-3.5 h-3.5 text-red-400 shrink-0"/>
            <p className="text-[12px] font-medium text-red-500">
              {sent ? 'Alert delivered · audio logged' : 'Preparing alert…'}
            </p>
          </div>
        </div>
      )}

      {micError && (
        <div className="px-5 pb-2 flex justify-center">
          <div className="bg-amber-50/80 border border-amber-100 rounded-2xl px-4 py-2.5 flex items-start gap-2 max-w-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0"/>
            <p className="text-[12px] text-amber-700">{micError}</p>
          </div>
        </div>
      )}

      {/* ── Tactical green overlay (live) ────────────────────────────────── */}
      {geminiState === 'live' && (
        <div className="fixed inset-0 pointer-events-none z-0"
             style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(16,185,129,0.07) 0%, transparent 70%)',
                      animation: 'pulse 3s ease-in-out infinite' }} />
      )}


      {/* ── Live transcript subtext ───────────────────────────────────────── */}
      {lastTranscript && (
        <div className="fixed bottom-28 left-0 right-0 flex justify-center pointer-events-none z-10 px-8">
          <p className="text-[11px] text-slate-600/70 font-mono italic text-center leading-relaxed"
             style={{ textShadow: '0 1px 3px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.6)' }}>
            {lastTranscript}
          </p>
        </div>
      )}

      {/* ── Active intervention flag ──────────────────────────────────────── */}
      {isSpeaking && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-400/20 rounded-full px-3 py-1.5 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-semibold text-emerald-600 tracking-widest uppercase">Intervention Active</span>
          </div>
        </div>
      )}

      {/* ── Bottom control ───────────────────────────────────────────────── */}
      <div ref={bottomRef} className="flex flex-col items-center pb-16 pt-4 shrink-0" style={{ opacity: 0 }}>
        {state === 'requesting' ? (
          <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-sm border border-white/80">
            <div className="w-4 h-4 rounded-full border-2 border-slate-200 animate-spin" style={{ borderTopColor: accent }}/>
            <p className="text-slate-500 text-sm font-medium">Initialising…</p>
          </div>
        ) : isRecording ? (
          <div ref={livePillRef} className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-sm border border-white/80">
              <span className="relative flex h-2.5 w-2.5">
                <span ref={dotRef} className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"/>
              </span>
              <p className="text-slate-600 text-sm font-medium">Listening</p>
              <span className="text-slate-200">·</span>
              <span className="text-slate-400 text-xs font-mono">{fmtTime(sessionTime)}</span>
            </div>
            <button onClick={handleToggle}
              className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors font-medium underline underline-offset-2 decoration-slate-200 hover:decoration-slate-400">
              Stop
            </button>
          </div>
        ) : (
          <button ref={beginBtnRef} onClick={handleToggle}
            className="group flex items-center gap-2.5 bg-white/60 hover:bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-3.5 shadow-sm border border-white/80 transition-all">
            <Mic className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors"/>
            <span className="text-slate-500 group-hover:text-slate-700 text-sm font-semibold tracking-wide transition-colors">
              Begin
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
