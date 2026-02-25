'use client';
import { useCommandSimulation } from '@/hooks/useCommandSimulation';
import { CommandHeader } from '@/components/ops/CommandHeader';
import { AmbientStream } from '@/components/ops/AmbientStream';
import { ThreatGauge } from '@/components/ops/ThreatGauge';
import { ActionLog } from '@/components/ops/ActionLog';
import { GridOverlay } from '@/components/ops/GridOverlay';

export default function DashboardPage() {
  const { opState, threat, transcript, actions, initiate, reset } = useCommandSimulation();
  const isActive = opState !== 'armed';

  return (
    <div className='min-h-screen bg-[#020c12] text-slate-100 flex flex-col font-mono overflow-hidden scanline'>
      <GridOverlay />
      <div className='relative z-10 flex flex-col h-screen'>
        <CommandHeader opState={opState} threat={threat} />

        {/* Three-panel grid */}
        <div className='flex-1 grid grid-cols-[1fr_1.6fr_1fr] gap-px bg-cyan-950/20 overflow-hidden p-px'>
          <AmbientStream lines={transcript} active={isActive} />
          <ThreatGauge value={threat} />
          <ActionLog entries={actions} opState={opState} />
        </div>

        {/* Control bar */}
        <div className='border-t border-cyan-900/40 bg-[#020c12] px-6 py-3 flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-4 text-[10px] text-slate-600'>
            <span>NODE: AP-CENTRAL-01</span>
            <span>LAT: 16.48° N · LNG: 80.52° E</span>
            <span>UPTIME: 99.97%</span>
          </div>

          <div className='flex items-center gap-3'>
            {opState === 'armed' && (
              <button
                onClick={initiate}
                className='px-6 py-2 rounded border border-cyan-600 bg-cyan-950/50 text-cyan-300 font-bold text-xs tracking-widest hover:bg-cyan-900/60 hover:border-cyan-400 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] focus:outline-none'
              >
                ▶ INITIATE ANALYSIS
              </button>
            )}
            {opState !== 'armed' && (
              <button
                onClick={reset}
                className='px-5 py-2 rounded border border-slate-700 text-slate-500 font-bold text-xs tracking-widest hover:border-slate-500 hover:text-slate-300 transition-all focus:outline-none'
              >
                ■ RESET
              </button>
            )}
          </div>

          <div className='flex items-center gap-2 text-[10px] text-slate-600'>
            <span className='w-1.5 h-1.5 rounded-full bg-emerald-700' />
            <span>TWILIO READY</span>
            <span className='ml-3 w-1.5 h-1.5 rounded-full bg-cyan-700' />
            <span>ELEVENLABS READY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
