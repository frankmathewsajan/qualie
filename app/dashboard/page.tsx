'use client';
import { useClusters } from '@/hooks/useClusters';
import { ClusterMap } from '@/components/dashboard/ClusterMap';
import { ClusterList } from '@/components/dashboard/ClusterList';
import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Shield, RefreshCcw, Send, X, AlertTriangle,
  Activity, Users, Flame, Mic, Search, Camera
} from 'lucide-react';
import { useAlertImages } from '@/hooks/useAlertImages';

export default function DashboardPage() {
  const { clusters: allClusters, loading, refetch } = useClusters();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const alertImages = useAlertImages(20);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Audio Recording (Voice of God)
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          setSendStatus('sending');
          try {
            const response = await fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                userId: selectedUser, 
                message: '🎙️ Live Operator Audio Broadcast', 
                audioBase64: base64data,
                operatorId: 'operator-1' 
              }),
            });
            if (response.ok) {
              setSendStatus('sent');
              setTimeout(() => { setSendStatus('idle'); setSelectedUser(null); setMessage(''); }, 2000);
            } else { setSendStatus('error'); }
          } catch { setSendStatus('error'); }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedUser || !message) return;
    setSendStatus('sending');

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser, message, operatorId: 'operator-1' }),
      });

      if (response.ok) {
        setSendStatus('sent');
        setTimeout(() => {
          setMessage('');
          setSelectedUser(null);
          setSendStatus('idle');
        }, 2000);
      } else {
        setSendStatus('error');
      }
    } catch {
      setSendStatus('error');
    }
  };

  const clusters = allClusters.filter(c => 
    (c.id && c.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.eventTypes && c.eventTypes.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))) ||
    (c.userIds && c.userIds.some(u => u.toLowerCase().includes(searchQuery.toLowerCase()))) ||
    (c.analyses && c.analyses.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalAlerts = clusters.reduce((sum, c) => sum + c.count, 0);
  const highConfidence = clusters.filter(c => c.confidence > 0.8).length;

  return (
    <div className="min-h-screen flex flex-col font-sans select-none"
         style={{ background: 'linear-gradient(160deg, #0f172a 0%, #020617 50%, #0c0a1a 100%)' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="px-6 pt-5 pb-4 flex items-center justify-between shrink-0 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">AEGIS Dashboard</h1>
            <p className="text-[10px] font-mono text-white/30 mt-px">Emergency Response Console</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search clusters, users, events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60 transition-colors rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/listen"
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 rounded-xl px-3 py-2 border border-white/10 text-white/50 hover:text-white/80 transition-all text-xs font-medium">
            <Activity className="w-3 h-3" />
            Listen
          </Link>
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl px-3 py-2 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-all text-xs font-medium disabled:opacity-50"
          >
            <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Syncing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* ── Message Panel (slide down) ─────────────────────────────── */}
      {selectedUser && (
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="max-w-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10">
                  <Send className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Message User</p>
                  <p className="text-[10px] text-white/30 font-mono">{selectedUser}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedUser(null); setSendStatus('idle'); }}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/60 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message to this user…"
              className="w-full p-3 bg-white/5 border border-white/10 text-white text-sm rounded-xl placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30 resize-none transition-all"
              rows={2}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={sendMessage}
                disabled={sendStatus === 'sending' || (!message.trim() && !isRecording)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 ${
                  sendStatus === 'sent'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : sendStatus === 'error'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-indigo-500 hover:bg-indigo-400 text-white'
                }`}
              >
                {sendStatus === 'sending' && <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 animate-spin" style={{ borderTopColor: 'white' }} />}
                {sendStatus === 'sent' ? '✓ Delivered' : sendStatus === 'error' ? '✗ Failed' : sendStatus === 'sending' ? 'Sending…' : 'Send Text'}
              </button>

              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={sendStatus === 'sending' || sendStatus === 'sent'}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-40 ${
                  isRecording 
                    ? 'bg-red-600 text-white shadow-red-500/50 scale-105' 
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                }`}
              >
                <Mic className={`w-3.5 h-3.5 ${isRecording ? 'animate-pulse text-white' : 'text-slate-300'}`} />
                {isRecording ? 'Recording! Release to Send' : 'Hold to Speak'}
              </button>

              {sendStatus === 'error' && (
                <span className="text-[10px] text-red-400/60 ml-2">Check console for details</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Stats bar ──────────────────────────────────────────────── */}
      <div className="px-6 py-3 flex items-center gap-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs text-white/40">Clusters</span>
          <span className="text-sm font-bold text-white tabular-nums">{clusters.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-3 h-3 text-white/30" />
          <span className="text-xs text-white/40">Total Alerts</span>
          <span className="text-sm font-bold text-white tabular-nums">{totalAlerts}</span>
        </div>
        {highConfidence > 0 && (
          <div className="flex items-center gap-2">
            <Flame className="w-3 h-3 text-red-400" />
            <span className="text-xs text-red-400/70">High Confidence</span>
            <span className="text-sm font-bold text-red-400 tabular-nums">{highConfidence}</span>
          </div>
        )}
      </div>

      {/* ── Main content ───────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-[320px_1fr_280px] overflow-hidden">
        {/* Left: Cluster List */}
        <div className="border-r border-white/5 overflow-y-auto" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <ClusterList clusters={clusters} onSelectUser={setSelectedUser} />
        </div>

        {/* Center: Map */}
        <div className="relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 animate-spin" style={{ borderTopColor: '#818cf8' }} />
              <p className="text-white/30 text-sm font-medium">Loading clusters…</p>
            </div>
          ) : (
            <ClusterMap clusters={clusters} />
          )}
        </div>

        {/* Right: Status Panel */}
        <div className="border-l border-white/5 p-5 overflow-y-auto" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">System Status</h3>
          </div>

          <div className="space-y-3">
            {/* Active Clusters */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1">Active Clusters</p>
              <p className="text-2xl font-black text-white tabular-nums">{clusters.length}</p>
              <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min(100, clusters.length * 20)}%` }} />
              </div>
            </div>

            {/* Total Alerts */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1">Total Alerts</p>
              <p className="text-2xl font-black text-white tabular-nums">{totalAlerts}</p>
            </div>

            {/* High Confidence */}
            <div className={`border rounded-xl p-3.5 ${highConfidence > 0 ? 'bg-red-500/5 border-red-500/10' : 'bg-white/[0.03] border-white/5'}`}>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1">High Confidence</p>
              <p className={`text-2xl font-black tabular-nums ${highConfidence > 0 ? 'text-red-400' : 'text-white'}`}>{highConfidence}</p>
              {highConfidence > 0 && (
                <p className="text-[10px] text-red-400/50 mt-1">Immediate attention required</p>
              )}
            </div>

            {/* Cluster detail cards */}
            {clusters.length > 0 && (
              <div className="pt-2">
                <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-2">Recent Activity</p>
                {clusters.slice(0, 3).map((cluster) => (
                  <div key={cluster.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/40 font-mono">#{cluster.id.slice(-6)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        cluster.confidence > 0.8 ? 'bg-red-500/20 text-red-400' :
                        cluster.confidence > 0.6 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {(cluster.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-white/50">{cluster.count} alerts · {cluster.eventTypes.join(', ')}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Captured Images */}
            {alertImages.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <Camera className="w-3 h-3 text-indigo-400" />
                  <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold">Silent Cam Captures</p>
                  <span className="ml-auto text-[9px] text-white/30 font-mono">{alertImages.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {alertImages.map(img => (
                    <div key={img.id} className="relative group cursor-pointer" onClick={() => setExpandedImage(img.image)}>
                      <img
                        src={img.image}
                        alt={`Capture from ${img.userId}`}
                        className="w-full aspect-[4/3] object-cover rounded-lg border border-white/10 hover:border-indigo-500/40 transition-all"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 rounded-b-lg">
                        <p className="text-[8px] text-white/70 font-mono truncate">{img.userId}</p>
                        <p className="text-[7px] text-white/40">{img.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8" onClick={() => setExpandedImage(null)}>
          <div className="relative max-w-3xl max-h-[80vh]">
            <img src={expandedImage} alt="Expanded capture" className="max-w-full max-h-[80vh] object-contain rounded-xl border border-white/20 shadow-2xl" />
            <button onClick={() => setExpandedImage(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white border border-white/20">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
