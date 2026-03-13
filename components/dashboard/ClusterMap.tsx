'use client';
import { useState } from 'react';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { Cluster } from '@/hooks/useClusters';

interface ClusterMapProps {
  clusters: Cluster[];
}

function hashId(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function ClusterMap({ clusters }: ClusterMapProps) {
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
      <Map
        style={{ width: '100%', height: '100%' }}
        defaultCenter={{ lat: 16.51, lng: 80.52 }}
        defaultZoom={12}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
      >
        {clusters.map((cluster) => {
          const hue = hashId(cluster.id) % 360;
          const color = `hsl(${hue}, 90%, 55%)`;
          const icon: any = {
            path: 'M0 -48c-9.94 0-18 8.06-18 18 0 13.5 18 30 18 30s18-16.5 18-30c0-9.94-8.06-18-18-18z',
            fillColor: color,
            fillOpacity: 0.9,
            strokeColor: '#111',
            strokeWeight: 1,
            scale: 1,
          };

          if (typeof window !== 'undefined' && (window as any).google?.maps?.Point) {
            icon.anchor = new (window as any).google.maps.Point(0, -24);
          }

          return (
            <Marker
              key={cluster.id}
              position={cluster.centroid}
              title={`${cluster.count} alert(s) - ${cluster.eventTypes.join(', ')} - Confidence: ${(cluster.confidence * 100).toFixed(0)}%`}
              icon={icon}
              onClick={() => setSelectedCluster(cluster)}
            />
          );
        })}

        {selectedCluster && (
          <InfoWindow
            position={selectedCluster.centroid}
            onCloseClick={() => setSelectedCluster(null)}
          >
            <div className="p-2 min-w-[200px] max-w-[280px] text-slate-800 font-sans">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">Cluster #{selectedCluster.id.slice(-6)}</h3>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                  selectedCluster.confidence > 0.8 ? 'bg-red-500' :
                  selectedCluster.confidence > 0.6 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}>
                  {(selectedCluster.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-[11px] mb-1">
                <strong>Users involved:</strong> {selectedCluster.count} 
                {selectedCluster.userIds.length > 0 && ` (${[...new Set(selectedCluster.userIds)].join(', ')})`}
              </p>
              <p className="text-[11px] mb-2">
                <strong>Triggers:</strong> {selectedCluster.eventTypes.join(', ')}
              </p>
              {selectedCluster.analyses && (
                <div className="border-t border-slate-200 mt-2 pt-2">
                  <p className="text-[11px] text-slate-600 leading-relaxed max-h-[120px] overflow-y-auto pr-1">
                    {selectedCluster.analyses}
                  </p>
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}