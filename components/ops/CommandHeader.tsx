import { ShieldAlert, Wifi, Clock, Home } from 'lucide-react';
import Link from 'next/link';
import { OpState } from '@/hooks/useCommandSimulation';

const STATE_CFG: Record<OpState, { label: string; cls: string; dot: string }> = {
  armed:      { label: 'SYS ARMED',      cls: 'text-cyan-400',   dot: 'bg-cyan-400' },
  active:     { label: 'ANALYSIS LIVE',  cls: 'text-amber-400',  dot: 'bg-amber-400 animate-pulse' },
  breach:     { label: 'THREAT BREACH',  cls: 'text-red-400',    dot: 'bg-red-500 animate-pulse' },
  dispatched: { label: 'CALL DISPATCHED',cls: 'text-red-300',    dot: 'bg-red-400 animate-ping' },
};

export function CommandHeader({ opState, threat }: { opState: OpState; threat: number }) {
  const cfg = STATE_CFG[opState];
  return (
    <header className='border-b border-cyan-900/40 bg-[#020c12] px-6 py-3 flex items-center justify-between'>
      <div className='flex items-center gap-3'>
        <ShieldAlert className='w-5 h-5 text-cyan-400' />
        <span className='font-mono font-bold text-cyan-300 tracking-[0.15em] text-sm'>OMNI//COMM</span>
        <span className='text-cyan-900 font-mono'>|</span>
        <span className='font-mono text-[10px] text-cyan-600 tracking-widest'>TACTICAL RESPONSE SYSTEM v4.2.1</span>
      </div>
      <div className='flex items-center gap-6'>
        <div className='flex items-center gap-2'>
          <span className='font-mono text-[10px] text-slate-500'>THREAT</span>
          <span className='font-mono text-sm font-bold text-red-400'>{String(threat).padStart(3, '0')}</span>
        </div>
        <div className='flex items-center gap-2'>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          <span className={`font-mono text-[10px] font-bold tracking-widest ${cfg.cls}`}>{cfg.label}</span>
        </div>
        <Wifi className='w-3.5 h-3.5 text-cyan-700' />
        <Clock className='w-3.5 h-3.5 text-slate-600' />
        <Link href='/' className='text-slate-600 hover:text-cyan-400 transition-colors'><Home className='w-3.5 h-3.5' /></Link>
      </div>
    </header>
  );
}
