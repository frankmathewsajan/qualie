'use client';
import { useEffect, useRef } from 'react';
import { ActionEntry, OpState } from '@/hooks/useCommandSimulation';

const IDLE_MSGS = [
  'Acoustic analysis engine: READY',
  'Behavioral classifier: LOADED',
  'Twilio integration: STANDBY',
  'De-escalation corpus: 48,291 entries indexed',
  'Geo-node Andhra Pradesh: ONLINE',
];

export function ActionLog({ entries, opState }: { entries: ActionEntry[]; opState: OpState }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [entries]);

  const isBreached = opState === 'breach' || opState === 'dispatched';

  return (
    <div className='ops-panel flex flex-col h-full'>
      <div className='border-b border-cyan-900/40 px-3 py-2 flex items-center justify-between shrink-0'>
        <span className='font-mono text-[10px] font-bold text-cyan-500 tracking-widest'>ACTION LOG</span>
        <span className='font-mono text-[9px] text-slate-600'>AUTONOMOUS RESPONSE ENGINE</span>
      </div>

      <div className='flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-2'>
        {/* Idle pre-boot lines */}
        {IDLE_MSGS.map((m, i) => (
          <div key={i} className='text-slate-700'>[INIT] {m}</div>
        ))}

        {entries.length === 0 && (
          <div className='text-slate-700 animate-pulse mt-4'>{'> awaiting threshold breach...'}</div>
        )}

        {entries.map(e => (
          <div key={e.id} className={`animate-fade-in ${e.flash ? 'text-red-400' : 'text-amber-300'} ${e.flash ? 'font-bold' : ''}`}
            style={e.flash ? { textShadow: '0 0 12px rgba(239,68,68,0.7)' } : undefined}>
            {e.text}
          </div>
        ))}

        {opState === 'dispatched' && (
          <div className='mt-4 border border-red-900/60 bg-red-950/30 rounded px-3 py-2 text-red-300 font-bold text-xs animate-pulse'>
            ■ LIVE CALL IN PROGRESS
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className={`border-t border-cyan-900/30 px-3 py-1.5 flex items-center gap-2 shrink-0 ${isBreached ? 'border-red-900/60' : ''}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isBreached ? 'bg-red-500 animate-ping' : 'bg-slate-700'}`} />
        <span className={`font-mono text-[9px] tracking-widest ${isBreached ? 'text-red-400' : 'text-slate-600'}`}>
          {opState === 'dispatched' ? 'TWILIO DISPATCHED' : isBreached ? 'BREACH RESPONSE ACTIVE' : 'MONITORING'}
        </span>
      </div>
    </div>
  );
}
