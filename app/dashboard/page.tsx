'use client';
import { useState } from 'react';
import { AREAS } from '@/lib/crisis/areas';
import { useBroadcastFSM } from '@/hooks/useBroadcastFSM';
import { StatusHeader } from '@/components/crisis/StatusHeader';
import { AreaSelector } from '@/components/crisis/AreaSelector';
import { AlertBanner } from '@/components/crisis/AlertBanner';
import { BroadcastTrigger } from '@/components/crisis/BroadcastTrigger';
import { LocaleCards } from '@/components/crisis/LocaleCards';
import { TelemetryFeed } from '@/components/crisis/TelemetryFeed';
import { CrisisMap } from '@/components/crisis/CrisisMap';
import { DisasterFeed } from '@/components/crisis/DisasterFeed';

export default function DashboardPage() {
  const [area, setArea] = useState(AREAS[0]);
  const { state, initiate, reset } = useBroadcastFSM();
  const onAreaChange = (next: typeof area) => { if (state !== 'idle') reset(); setArea(next); };
  return (
    <div className='min-h-screen bg-slate-950 text-slate-100 font-sans'>
      <StatusHeader state={state} area={area} />
      <main className='max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6'>
        <AreaSelector areas={AREAS} selected={area} onChange={onAreaChange} disabled={state !== 'idle'} />
        <AlertBanner area={area} />
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 items-center'>
          <BroadcastTrigger state={state} onInitiate={initiate} onReset={reset} />
          <CrisisMap area={area} />
        </div>
        {state === 'broadcast' && (
          <>
            <LocaleCards area={area} />
            <TelemetryFeed area={area} active />
          </>
        )}
        <DisasterFeed />
      </main>
    </div>
  );
}