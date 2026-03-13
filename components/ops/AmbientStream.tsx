'use client';
import { useEffect, useRef } from 'react';
import { TranscriptLine } from '@/hooks/useCommandSimulation';

const SPEAKER_CLS: Record<string, string> = {
  OFFICER: 'text-cyan-400',
  SUBJECT: 'text-red-400',
  SYS:     'text-amber-400',
};

export function AmbientStream({ lines, active }: { lines: TranscriptLine[]; active: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);

  return (
    <div className='ops-panel flex flex-col h-full'>
      <PanelHeader label='AMBIENT STREAM' sub='STT / TRANSCRIPT FEED' />
      <div className='flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-2 scrollbar-thin'>
        {lines.length === 0 && (
          <span className='text-slate-700 animate-pulse'>{'> awaiting audio input...'}</span>
        )}
        {lines.map(l => (
          <div key={l.id} className='animate-fade-in'>
            <span className='text-slate-700'>{l.ts} </span>
            <span className={`font-bold ${SPEAKER_CLS[l.speaker] ?? 'text-slate-400'}`}>[{l.speaker}] </span>
            <span className='text-slate-300'>{l.text}</span>
          </div>
        ))}
        {active && lines.length > 0 && (
          <span className='text-cyan-600 animate-pulse'>{'> ▋'}</span>
        )}
        <div ref={endRef} />
      </div>
      <StatusBar label={active ? 'RECORDING' : 'STANDBY'} active={active} />
    </div>
  );
}

function PanelHeader({ label, sub }: { label: string; sub: string }) {
  return (
    <div className='border-b border-cyan-900/40 px-3 py-2 flex items-center justify-between shrink-0'>
      <span className='font-mono text-[10px] font-bold text-cyan-500 tracking-widest'>{label}</span>
      <span className='font-mono text-[9px] text-slate-600'>{sub}</span>
    </div>
  );
}

function StatusBar({ label, active }: { label: string; active: boolean }) {
  return (
    <div className='border-t border-cyan-900/30 px-3 py-1.5 flex items-center gap-2 shrink-0'>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
      <span className='font-mono text-[9px] text-slate-600 tracking-widest'>{label}</span>
    </div>
  );
}
