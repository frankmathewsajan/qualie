'use client';
import { useClusters } from '@/hooks/useClusters';
import { ClusterMap } from '@/components/dashboard/ClusterMap';
import { ClusterList } from '@/components/dashboard/ClusterList';
import { GridOverlay } from '@/components/ops/GridOverlay';

export default function DashboardPage() {
  const { clusters, loading, refetch } = useClusters();

  return (
    <div className='min-h-screen bg-[#020c12] text-slate-100 flex flex-col font-mono overflow-hidden scanline'>
      <GridOverlay />
      <div className='relative z-10 flex flex-col h-screen'>
        {/* Header */}
        <div className='border-b border-cyan-900/40 bg-[#020c12] px-6 py-4 flex justify-between items-center'>
          <h1 className='text-xl font-bold text-cyan-300'>AEGIS Emergency Response Dashboard</h1>
          <button
            onClick={refetch}
            className='px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm'
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Main content */}
        <div className='flex-1 grid grid-cols-[1fr_2fr_1fr] gap-px bg-cyan-950/20 overflow-hidden p-px'>
          <ClusterList clusters={clusters} />
          <div className='bg-slate-900'>
            {loading ? (
              <div className='flex items-center justify-center h-full text-slate-500'>
                Loading clusters...
              </div>
            ) : (
              <ClusterMap clusters={clusters} />
            )}
          </div>
          <div className='bg-slate-900 p-4'>
            <h3 className='text-lg font-bold mb-4'>System Status</h3>
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span>Active Clusters:</span>
                <span className='text-cyan-300'>{clusters.length}</span>
              </div>
              <div className='flex justify-between'>
                <span>Total Alerts:</span>
                <span className='text-cyan-300'>{clusters.reduce((sum, c) => sum + c.count, 0)}</span>
              </div>
              <div className='flex justify-between'>
                <span>High Confidence:</span>
                <span className='text-red-400'>{clusters.filter(c => c.confidence > 0.8).length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='border-t border-cyan-900/40 bg-[#020c12] px-6 py-3 flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-4 text-[10px] text-slate-600'>
            <span>NODE: AP-CENTRAL-01</span>
            <span>LAT: 16.48° N · LNG: 80.52° E</span>
            <span>UPTIME: 99.97%</span>
          </div>
          <div className='flex items-center gap-2 text-[10px] text-slate-600'>
            <span className='w-1.5 h-1.5 rounded-full bg-emerald-700' />
            <span>FIREBASE READY</span>
            <span className='ml-3 w-1.5 h-1.5 rounded-full bg-cyan-700' />
            <span>GOOGLE MAPS READY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
