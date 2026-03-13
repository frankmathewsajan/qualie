'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Mic, Home, PhoneCall, Droplets, Wind,
  MapPin, AlertTriangle, Navigation, Thermometer, ChevronRight, Settings, EyeOff, BellRing
} from 'lucide-react';
import { useAudioMeter } from '@/hooks/useAudioMeter';
import { useWeather, decodeWeather } from '@/hooks/useWeather';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import { useAgencyMessages, AgencyMessage } from '@/hooks/useAgencyMessages';
import { getUserId } from '@/lib/userId';
import Link from 'next/link';

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
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Persistent 5-digit random ID — defer to useEffect to avoid hydration mismatch
  const [currentUserId, setCurrentUserId] = useState('');
  useEffect(() => { setCurrentUserId(getUserId()); }, []);
  const { messages, unreadCount, acknowledgeMessage } = useAgencyMessages(currentUserId);
  const [showMessageAlert, setShowMessageAlert] = useState<AgencyMessage | null>(null);

  const sendAlertRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (wx?.lat != null && wx?.lon != null) {
      setLocation({ lat: wx.lat, lon: wx.lon });
      setLocationError(null);
    }
  }, [wx?.lat, wx?.lon]);

  const ensureLocation = useCallback(async () => {
    if (location) return location;
    if (!navigator?.geolocation) {
      setLocationError('Geolocation is not supported in this browser.');
      return null;
    }

    return new Promise<{ lat: number; lon: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setLocation(coords);
          setLocationError(null);
          resolve(coords);
        },
        (err) => {
          const msgs: Record<number, string> = {
            1: 'Location access denied. Enable it in browser settings.',
            2: 'Location signal unavailable. Try moving to a window.',
            3: 'Location request timed out. Try again.',
          };
          setLocationError(msgs[err.code] ?? 'Unable to get location.');
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 12_000 }
      );
    });
  }, [location]);

  /**
   * Build a wa.me deep link pre-filled with an emergency message.
   * Works on any device — no Twilio / API key needed.
   *
   * How to use:  Go to Settings → add an emergency contact phone number
   *              (with country code, e.g. +91...).  When the SOS fires,
   *              we open WhatsApp with a pre-typed emergency message
   *              including a Google Maps link.
   */
  const triggerWhatsAppSOS = useCallback(async () => {
    try {
      // 1. Try to read the user's emergency contact from localStorage/settings
      let phone = localStorage.getItem('aegis_emergency_phone') || '';

      // 2. If not in localStorage, try fetching from Firestore via settings
      if (!phone && currentUserId) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          const userDoc = await getDoc(doc(db, 'users', currentUserId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            phone = data.emergencyContacts?.[0]?.phone || data.emergencyContact || '';
            if (phone) localStorage.setItem('aegis_emergency_phone', phone);
          }
        } catch { /* ignore */ }
      }

      if (!phone) {
        alert('No emergency contact set!\n\nGo to Settings → add an emergency contact phone number first.');
        return;
      }

      // 3. Use cached location to avoid async delay (which causes popup blockers)
      const loc = location;
      const mapsLink = loc
        ? `https://maps.google.com/?q=${loc.lat},${loc.lon}`
        : '(location unavailable)';

      // 4. Build message
      const msg = encodeURIComponent(
        `🚨 AEGIS EMERGENCY ALERT\n\n` +
        `User ID: ${currentUserId}\n` +
        `Time: ${new Date().toLocaleTimeString()}\n` +
        `Location: ${mapsLink}\n\n` +
        `I may be in danger. Please check on me immediately.`
      );

      // 5. Open WhatsApp using invisible anchor-click trick
      //    This bypasses popup blockers AND ERR_BLOCKED_BY_RESPONSE on all browsers
      const cleanPhone = phone.replace(/[\s\-()]/g, '');
      const waUrl = `https://wa.me/${cleanPhone}?text=${msg}`;
      
      const a = document.createElement('a');
      a.href = waUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 100);

      console.log('[listen] WhatsApp SOS triggered');
    } catch (error) {
      console.error('Error triggering WhatsApp SOS:', error);
    }
  }, [currentUserId, location]);

  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const lastTranscriptRef = useRef<string | null>(null);
  const transcriptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const audioCtxRef = useRef<any>(null);  const { state: geminiState, isSpeaking, chunksSent,
          connect: geminiConnect, disconnect: geminiDisconnect } = useGeminiLive({
    onInputTranscript: (text) => {
      // Show transcript as subtle subtext (auto-clears after 4s)
      setLastTranscript(text);
      lastTranscriptRef.current = text;
      if (transcriptTimer.current) clearTimeout(transcriptTimer.current);
      transcriptTimer.current = setTimeout(() => setLastTranscript(null), 4000);

      const lower = text.toLowerCase();
      const hit = DISTRESS_KEYWORDS.some(kw => lower.includes(kw));
      if (hit) {
        console.log('[listen] keyword match in transcript:', text);
        sendAlertRef.current?.();
      }

      if (lower.includes('send emergency message') || lower.includes('send sos')) {
        console.log('[listen] emergency command detected — triggering WhatsApp SOS');
        triggerWhatsAppSOS();
      }
    },
  });

  const [breached, setBreached]             = useState(false);
  const [dismissed, setDismissed]           = useState(false);
  const [peakVol, setPeakVol]               = useState(0);
  const [sessionTime, setSessionTime]       = useState(0);
  const contextStrRef = useRef('');
  const [sending, setSending]               = useState(false);
  const [sent, setSent]                     = useState(false);
  const [geminiAnalysis, setGeminiAnalysis] = useState<string | null>(null);
  const [backendStep, setBackendStep]       = useState<'compressing'|'uploading'|'analysing'|'done'|null>(null);
  const [analysisMs, setAnalysisMs]         = useState<number | null>(null);
  const [audioPlaybackUrl, setAudioPlaybackUrl] = useState<string | null>(null);
  const [stealthMode, setStealthMode]           = useState(false);
  
  const videoRef          = useRef<HTMLVideoElement | null>(null);

  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentRef           = useRef(false);
  const gsapRef           = useRef<Gsap | null>(null);
  const playbackUrlRef    = useRef<string | null>(null);
  const shownMessageIdsRef = useRef<Set<string>>(new Set());

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
      const loc = await ensureLocation();
      if (!loc) {
        setSending(false);
        return;
      }

      setBackendStep('compressing');
      
      // Wait 3.5 seconds to capture post-trigger context so the audio clip isn't too short
      await new Promise(r => setTimeout(r, 3500));
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
      fd.append('userId', currentUserId);
      fd.append('location', JSON.stringify(loc));
      fd.append('city', wx?.city ?? '');

      setBackendStep('analysing');
      const t0  = Date.now();
      const res  = await fetch('/api/alert', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({})) as { analysis?: string };
      setAnalysisMs(Date.now() - t0);
      if (json.analysis) {
        setGeminiAnalysis(json.analysis);
        contextStrRef.current = json.analysis;
      }
      setSent(true);
      setBackendStep('done');
    } catch (e) {
      console.error('[listen] alert failed', e);
      setBackendStep(null);
    } finally {
      setSending(false);
    }
  }, [ensureLocation, getBlob, peakVol, wx]);

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

  // ── message alerts & Voice of God ──────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[0];
      if (!latestMessage.acknowledged) {
        if (!shownMessageIdsRef.current.has(latestMessage.id)) {
          shownMessageIdsRef.current.add(latestMessage.id);
          setShowMessageAlert(latestMessage);
          
          // Try to autoplay, but don't strictly require it (since mobile blocks it). 
          // The UI will also show an explicit Play button.
          if (latestMessage.audioBase64) {
            const audio = new Audio(latestMessage.audioBase64);
            audio.volume = 1;
            audio.play().catch(e => console.warn('Audio autoplay blocked by browser', e));
          }
        }
      }
    }
  }, [messages, showMessageAlert]);

  // ── dead man switch heartbeat ──────────────────────────────────────────────
  useEffect(() => {
    if (!isRecording || !currentUserId || !location) return;
    let interval: ReturnType<typeof setInterval>;
    
    Promise.all([
      import('firebase/firestore'),
      import('@/lib/firebase')
    ]).then(([{ doc, setDoc, Timestamp }, { db }]) => {
      interval = setInterval(() => {
        setDoc(doc(db, 'users', currentUserId), {
          lastHeartbeat: Timestamp.now(),
          lastLocation: { lat: location.lat, lng: location.lon },
          isRecording: true
        }, { merge: true }).catch(() => {});
      }, 5000);
    });

    return () => {
      if (interval) clearInterval(interval);
      import('firebase/firestore').then(({ doc, setDoc }) => {
        import('@/lib/firebase').then(({ db }) => {
           setDoc(doc(db, 'users', currentUserId), { isRecording: false }, { merge: true }).catch(()=>{});
        });
      });
    };
  }, [isRecording, currentUserId, location]);

  // ── silent camera burst (only activates on breach) ─────────────────────────────
  useEffect(() => {
    if (!breached || !isRecording || !currentUserId) return;
    
    let isCancelled = false;

    const captureSequence = async () => {
      // We explicitly want just ONE front and ONE back photo
      for (const face of ['user', 'environment']) {
        if (isCancelled) break;
        
        let camStream: MediaStream | null = null;
        try {
          camStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: face, width: 640, height: 480 } 
          });

          if (!videoRef.current || isCancelled) {
            if (camStream) camStream.getTracks().forEach(t => t.stop());
            break;
          }

          videoRef.current.srcObject = camStream;
          await videoRef.current.play().catch(() => {});
          
          // Wait 1.5s for hardware auto-focus/exposure to settle perfectly
          await new Promise(resolve => setTimeout(resolve, 1500));
          if (isCancelled) {
            camStream.getTracks().forEach(t => t.stop());
            break;
          }

          const vw = videoRef.current.videoWidth;
          const vh = videoRef.current.videoHeight;
          if (vw && vh) {
            const canvas = document.createElement('canvas');
            canvas.width = vw;
            canvas.height = vh;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0, vw, vh);
              const base64 = canvas.toDataURL('image/jpeg', 0.5);
              console.log(`[camera] captured ${face} photo`, vw, 'x', vh, 'size:', Math.round(base64.length / 1024), 'KB');
              
              fetch('/api/alert/images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: currentUserId,
                  imageBase64: base64,
                  lat: location?.lat || 0,
                  lng: location?.lon || 0,
                  context: contextStrRef.current || (lastTranscriptRef.current ? `Transcript: "${lastTranscriptRef.current}"` : 'Emergency Breach Triggered')
                })
              }).catch(e => console.error('[camera] upload failed:', e));
            }
          }
        } catch (err: any) {
          console.warn(`[camera] failed to capture ${face}:`, err.message);
        } finally {
          if (camStream) camStream.getTracks().forEach(t => t.stop());
        }
      }
      
      if (videoRef.current) videoRef.current.srcObject = null;
      console.log('[camera] burst sequence complete - both cameras captured');
    };

    captureSequence();

    return () => {
      isCancelled = true;
      if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(t => t.stop());
         videoRef.current.srcObject = null;
      }
    };
  }, [breached, isRecording, currentUserId, location]);

  const dismissMessageAlert = () => {
    if (showMessageAlert) {
      acknowledgeMessage(showMessageAlert.id);
      setShowMessageAlert(null);
    }
  };

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
      const doStart = () => { 
        // Force-initialize AudioContext ON CLICK to bypass mobile browser silent/autoplay blocking
        if (!audioCtxRef.current) {
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const ctx = new AudioContextClass();
              // Unlock iOS audio instantly by playing an empty 1-frame sound
              const buffer = ctx.createBuffer(1, 1, 22050);
              const src = ctx.createBufferSource();
              src.buffer = buffer;
              src.connect(ctx.destination);
              src.start(0);
              audioCtxRef.current = ctx;
            }
          } catch (e) {
            console.error('[audio] failed to initialize AudioContext:', e);
          }
        } else if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }

        start(); 
        geminiConnect(); 
      };
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

  const playAlarm = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) {
      console.warn('[alarm] AudioContext not initialized yet.');
      return;
    }

    try {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      
      osc.type = 'square';
      mod.type = 'sine';
      mod.frequency.value = 6; // siren sweep speed
      
      modGain.gain.value = 400; // frequency swing amount
      osc.frequency.value = 800; // base frequency
      
      mod.connect(modGain);
      modGain.connect(osc.frequency);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      mod.start();
      
      setTimeout(() => {
        osc.stop();
        mod.stop();
      }, 10000); // Blast for 10 seconds
    } catch (err) {
      console.error('[alarm] failed to play siren:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans select-none overflow-x-hidden transition-colors duration-1000"
         style={{ background: bg, transition: 'background 1.2s ease' }}>
      
      <video ref={videoRef} autoPlay playsInline muted className="absolute w-[1px] h-[1px] opacity-0 pointer-events-none" />

      {/* ── Stealth Mode Overlay ────────────────────────────────────────── */}
      {stealthMode && (
        <div 
          onDoubleClick={() => setStealthMode(false)}
          className="fixed inset-0 z-[99999] bg-black text-white flex flex-col items-center justify-start pt-32 cursor-pointer select-none"
        >
          {/* Fake Lock Screen */}
          <div className="text-center opacity-80">
            <h1 className="text-6xl font-extralight tracking-tight mb-2">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </h1>
            <p className="text-xl font-light text-gray-400">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="absolute bottom-8 left-0 right-0 text-center opacity-50">
            <div className="w-32 h-1 bg-white mx-auto rounded-full" />
            <p className="text-[10px] uppercase font-bold mt-2 tracking-widest text-[#111]">Double tap to exit</p>
          </div>
        </div>
      )}

      {/* ── Message Alert ────────────────────────────────────────────────── */}
      {showMessageAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Agency Message</h3>
                <p className="text-sm text-gray-600">From emergency operator</p>
              </div>
            </div>
            <p className="text-gray-800 mb-6">{showMessageAlert.message}</p>
            
            {showMessageAlert.audioBase64 && (
              <div className="mb-6 w-full">
                <audio 
                  controls 
                  src={showMessageAlert.audioBase64} 
                  className="w-full" 
                  autoPlay={false}
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  acknowledgeMessage(showMessageAlert.id);
                  dismissMessageAlert();
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

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
                          ? 'Analysing with Aegis AI…'
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
          {/* User ID badge */}
          <div className="flex items-center gap-1.5 bg-white/60 rounded-full px-2.5 py-1 border border-white/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold text-slate-600 tracking-wider font-mono">{currentUserId}</span>
          </div>
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
          <Link href="/settings"
            className="w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm shadow-sm flex items-center justify-center hover:shadow-md transition-shadow">
            <Settings className="w-3.5 h-3.5 text-slate-500" />
          </Link>
          <a href="/"
            className="w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm shadow-sm flex items-center justify-center hover:shadow-md transition-shadow">
            <Home className="w-3.5 h-3.5 text-slate-500" />
          </a>
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

        {locationError && (
          <div className="px-5 pt-2">
            <div className="bg-amber-50/80 border border-amber-100 rounded-2xl px-4 py-3 text-sm text-amber-700">
              {locationError}
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
              {backendStep === 'analysing'   && '⟳ aegis ai analysing…'}
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
          <div ref={livePillRef} className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-4">
              {/* Ghost Button */}
              <button onClick={() => setStealthMode(true)}
                className="group flex flex-col items-center gap-1 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-[#0f1011] hover:bg-black active:scale-95 flex items-center justify-center shadow-lg border border-slate-700 transition-all">
                  <EyeOff className="w-5 h-5 text-slate-300" />
                </div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ghost</span>
              </button>

              {/* SOS Button */}
              <button onClick={triggerWhatsAppSOS}
                className="group flex flex-col items-center gap-1 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-[#0f1011] hover:bg-black active:scale-95 flex items-center justify-center shadow-lg border border-slate-700 transition-all">
                  <PhoneCall className="w-5 h-5 text-slate-300" />
                </div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">SOS</span>
              </button>

              {/* Alarm Button */}
              <button onClick={playAlarm}
                className="group flex flex-col items-center gap-1 transition-all z-10">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 flex items-center justify-center shadow-lg shadow-amber-200/50 border border-amber-400 transition-all">
                  <BellRing className="w-5 h-5 text-white" />
                </div>
                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest z-10">Alarm</span>
              </button>
              {/* Listen pill */}
              <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-sm border border-white/80">
                <span className="relative flex h-2.5 w-2.5">
                  <span ref={dotRef} className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"/>
                </span>
                <p className="text-slate-600 text-sm font-medium">Listening</p>
                <span className="text-slate-200">·</span>
                <span className="text-slate-400 text-xs font-mono">{fmtTime(sessionTime)}</span>
              </div>
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
