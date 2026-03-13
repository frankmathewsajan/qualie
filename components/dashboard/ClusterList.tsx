'use client';
import { Cluster } from '@/hooks/useClusters';

interface ClusterListProps {
  clusters: Cluster[];
}

export function ClusterList({ clusters }: ClusterListProps) {
  return (
    <div className="p-4 bg-slate-900 text-slate-100 h-full overflow-y-auto">
      <h3 className="text-lg font-bold mb-4">Active Clusters</h3>
      {clusters.length === 0 ? (
        <p className="text-slate-500">No active clusters</p>
      ) : (
        clusters.map((cluster) => (
          <div key={cluster.id} className="mb-4 p-3 bg-slate-800 rounded border border-slate-700">
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold">Cluster {cluster.id.slice(-6)}</span>
              <span className={`px-2 py-1 rounded text-xs ${
                cluster.confidence > 0.8 ? 'bg-red-600' :
                cluster.confidence > 0.6 ? 'bg-yellow-600' : 'bg-green-600'
              }`}>
                {cluster.confidence.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-slate-400 mb-1">
              {cluster.count} users • {cluster.eventTypes.join(', ')}
            </p>
            <p className="text-xs text-slate-500">
              {cluster.timeWindow.start.toLocaleTimeString()} - {cluster.timeWindow.end.toLocaleTimeString()}
            </p>
            <p className="text-xs text-slate-500">
              Centroid: {cluster.centroid.lat.toFixed(4)}, {cluster.centroid.lng.toFixed(4)}
            </p>
            {cluster.analyses && (
              <p className="text-xs text-slate-300 mt-2">
                Analysis: {cluster.analyses.length > 100 ? cluster.analyses.slice(0, 100) + '...' : cluster.analyses}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}