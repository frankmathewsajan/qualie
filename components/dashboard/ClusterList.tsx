'use client';
import { Cluster } from '@/hooks/useClusters';

interface ClusterListProps {
  clusters: Cluster[];
  onSelectUser?: (userId: string) => void;
}

export function ClusterList({ clusters, onSelectUser }: ClusterListProps) {
  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        <h3 className="text-sm font-bold text-white">Active Clusters</h3>
      </div>
      {clusters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <span className="text-white/20 text-lg">⊘</span>
          </div>
          <p className="text-white/20 text-xs">No active clusters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clusters.map((cluster) => (
          <div key={cluster.id} className="p-3 bg-white/[0.03] rounded-xl border border-white/5 hover:border-white/10 transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-white/70 font-mono">#{cluster.id.slice(-6)}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                cluster.confidence > 0.8 ? 'bg-red-500/20 text-red-400' :
                cluster.confidence > 0.6 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {cluster.confidence.toFixed(2)}
              </span>
            </div>
            <p className="text-[11px] text-white/40 mb-1">
              {cluster.count} users · {cluster.eventTypes.join(', ')}
            </p>
            <p className="text-[10px] text-white/25 font-mono">
              {cluster.timeWindow.start.toLocaleTimeString()} – {cluster.timeWindow.end.toLocaleTimeString()}
            </p>
            <p className="text-[10px] text-white/25 font-mono">
              {cluster.centroid.lat.toFixed(4)}, {cluster.centroid.lng.toFixed(4)}
            </p>
            {cluster.analyses && (
              <p className="text-[10px] text-white/30 mt-2 leading-relaxed">
                {cluster.analyses}
              </p>
            )}
            {onSelectUser && cluster.userIds.length > 0 && (() => {
              const uniqueUserIds = [...new Set(cluster.userIds)];
              return (
              <div className="mt-2.5">
                <p className="text-[9px] text-white/20 uppercase tracking-wider font-semibold mb-1.5">Users</p>
                <div className="flex flex-wrap gap-1">
                  {uniqueUserIds.map((userId) => (
                    <button
                      key={`${cluster.id}-${userId}`}
                      onClick={() => onSelectUser(userId)}
                      className="px-2 py-1 bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 text-[10px] rounded-lg font-mono border border-indigo-500/20 hover:border-indigo-500/40 transition-all"
                      title={`Message user ${userId}`}
                    >
                      {userId}
                    </button>
                  ))}
                </div>
              </div>
              );
            })()}
          </div>
          ))}
        </div>
      )}
    </div>
  );
}