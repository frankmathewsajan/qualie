'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  Shield, MapPin, Clock, AlertTriangle, Camera,
  Navigation, Signal, User, Phone
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';

interface SOSSession {
  userId: string;
  userName: string;
  lat: number;
  lng: number;
  createdAt: string;
  active: boolean;
}

interface LatestAlert {
  lat: number;
  lng: number;
  timestamp: string;
  analysis: string | null;
  volume: number | null;
  city: string | null;
}

interface SOSImage {
  id: string;
  image: string;      // base64 data URL
  context: string;
  timestamp: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function SOSPage() {
  const params = useParams();
  const sessionId = params?.id as string;

  const [session, setSession] = useState<SOSSession | null>(null);
  const [alert, setAlert] = useState<LatestAlert | null>(null);
  const [images, setImages] = useState<SOSImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [expandedImg, setExpandedImg] = useState<SOSImage | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get viewer's location
  useEffect(() => {
    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* silently fail */ },
      { enableHighAccuracy: true, timeout: 10000 }
    );
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Fetch session + alert data from the lightweight API (no images)
  const fetchData = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/sos?sessionId=${sessionId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Session not found or has expired.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setSession(data.session);
      setAlert(data.latestAlert);
      setLastRefresh(new Date());
      setError(null);

      // Now fetch images directly from Firestore client-side
      // This avoids sending massive base64 payloads through the API response
      if (data.session?.userId) {
        try {
          const imagesQ = query(
            collection(db, 'alert_images'),
            where('userId', '==', data.session.userId),
            limit(20)
          );
          const imagesSnap = await getDocs(imagesQ);
          const imgs = imagesSnap.docs
            .map(d => ({
              id: d.id,
              image: d.data().image || '',
              context: d.data().context || '',
              timestamp: d.data().timestamp?.toDate?.()?.toISOString() ?? '',
              _ms: d.data().timestamp?.toMillis?.() ?? (d.data().timestamp?.seconds ?? 0) * 1000,
            }))
            .sort((a, b) => b._ms - a._ms)
            .slice(0, 6)
            .map(({ _ms, ...rest }) => rest);
          setImages(imgs);
        } catch (imgErr) {
          console.warn('[sos] could not load images from Firestore:', imgErr);
        }
      }
    } catch {
      setError('Failed to connect. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Initial fetch + polling every 8s
  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  const victimLat = alert?.lat ?? session?.lat ?? 0;
  const victimLng = alert?.lng ?? session?.lng ?? 0;
  const distanceKm = myLocation ? haversineKm(myLocation.lat, myLocation.lng, victimLat, victimLng) : null;

  // ── Loading State ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #020617 50%, #0c0a1a 100%)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-red-500/30 animate-spin mx-auto mb-4"
            style={{ borderTopColor: '#ef4444' }} />
          <p className="text-white/60 text-sm font-medium">Loading crisis data…</p>
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #020617 50%, #0c0a1a 100%)' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-lg font-bold text-white mb-2">Session Unavailable</h1>
          <p className="text-white/50 text-sm leading-relaxed">{error || 'This SOS link has expired or does not exist.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans select-none"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #020617 50%, #0c0a1a 100%)' }}>

      {/* ── Red pulse overlay ── */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.08) 0%, transparent 60%)',
          animation: 'pulse 3s ease-in-out infinite'
        }} />

      {/* ── Header ── */}
      <header className="relative z-10 px-5 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <Shield className="w-5 h-5 text-red-400" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-[#0f172a] animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">AEGIS SOS</h1>
              <p className="text-[10px] font-mono text-red-400/60 mt-px">LIVE CRISIS · MONITORING ACTIVE</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Signal className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-white/30">
              Updated {timeAgo(lastRefresh.toISOString())}
            </span>
          </div>
        </div>
      </header>

      <div className="relative z-10 px-5 pb-8 max-w-lg mx-auto space-y-4 pt-4">

        {/* ── Victim Card ── */}
        <div className="bg-white/[0.04] backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{session.userName}</p>
                <p className="text-[10px] font-mono text-white/30">ID: {session.userId}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Active SOS</span>
              </span>
            </div>
          </div>

          {/* Location + Distance */}
          <div className="px-5 py-4 grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <MapPin className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Location</span>
              </div>
              <p className="text-xs text-white/80 font-mono">
                {victimLat.toFixed(4)}, {victimLng.toFixed(4)}
              </p>
              {alert?.city && (
                <p className="text-[10px] text-white/30 mt-0.5">{alert.city}</p>
              )}
            </div>

            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Navigation className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Distance</span>
              </div>
              {distanceKm !== null ? (
                <>
                  <p className="text-lg font-black text-white tabular-nums">
                    {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
                  </p>
                  <p className="text-[10px] text-white/30 mt-0.5">from your location</p>
                </>
              ) : (
                <p className="text-xs text-white/30">Enable location</p>
              )}
            </div>
          </div>

          {/* Timing */}
          <div className="px-5 pb-4">
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">SOS Triggered</span>
              </div>
              <span className="text-xs text-white/70 font-mono">
                {session.createdAt ? timeAgo(session.createdAt) : 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Open in Maps ── */}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${victimLat},${victimLng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-blue-500 hover:bg-blue-600 active:scale-[0.98] text-white font-semibold text-sm py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-500/20"
        >
          <span className="flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4" />
            Open in Google Maps
          </span>
        </a>

        {/* ── AI Analysis ── */}
        {alert?.analysis && (
          <div className="bg-white/[0.04] backdrop-blur-md rounded-2xl border border-white/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-indigo-500/10">
                <AlertTriangle className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Aegis AI Analysis</p>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">{alert.analysis}</p>
            {alert.volume && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, alert.volume)}%`,
                      background: alert.volume > 80
                        ? 'linear-gradient(90deg, #ef4444, #f97316)'
                        : alert.volume > 50
                          ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                          : 'linear-gradient(90deg, #22c55e, #84cc16)',
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-white/30">{alert.volume}dB</span>
              </div>
            )}
          </div>
        )}

        {/* ── Captured Photos ── */}
        {images.length > 0 && (
          <div className="bg-white/[0.04] backdrop-blur-md rounded-2xl border border-white/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Captured Photos</p>
              <span className="ml-auto text-[10px] text-white/20 font-mono">{images.length} images</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setExpandedImg(img)}
                  className="relative group rounded-xl overflow-hidden border border-white/5 aspect-[4/3] bg-black/30"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.image}
                    alt="Captured"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  {img.context && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[9px] text-white/90 line-clamp-2 leading-snug">{img.context}</p>
                    </div>
                  )}
                  <span className="absolute top-2 right-2 text-[8px] font-mono text-white/40 bg-black/40 rounded px-1.5 py-0.5">
                    {img.timestamp ? timeAgo(img.timestamp) : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Call Emergency ── */}
        <a
          href="tel:112"
          className="block w-full text-center bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-bold text-sm py-3.5 rounded-2xl transition-all shadow-lg shadow-red-500/20"
        >
          <span className="flex items-center justify-center gap-2">
            <Phone className="w-4 h-4" />
            Call Emergency Services (112)
          </span>
        </a>

        {/* ── Footer ── */}
        <p className="text-[10px] text-white/15 text-center pt-2 pb-6">
          AEGIS Crisis Link · Data auto-refreshes every 8 seconds · Encrypted
        </p>
      </div>

      {/* ── Expanded Image Modal ── */}
      {expandedImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setExpandedImg(null)}
        >
          <div
            className="max-w-lg w-full bg-[#111318] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={expandedImg.image}
              alt="Captured"
              className="w-full max-h-[50vh] object-contain bg-black"
            />
            {expandedImg.context && (
              <div className="p-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">AI Context</span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{expandedImg.context}</p>
              </div>
            )}
            <div className="px-4 pb-4">
              <button
                onClick={() => setExpandedImg(null)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white/60 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
