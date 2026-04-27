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
  const [mapError, setMapError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '';

  if (!apiKey) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6 bg-white/2 border border-white/5 rounded-2xl">
        <div className="max-w-sm text-center space-y-2">
          <p className="text-sm font-semibold text-white">Map unavailable</p>
          <p className="text-xs text-white/40 leading-relaxed">
            Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to a valid Google Maps JavaScript API key to enable the cluster map.
          </p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6 bg-white/2 border border-white/5 rounded-2xl">
        <div className="max-w-sm text-center space-y-2">
          <p className="text-sm font-semibold text-white">Map unavailable</p>
          <p className="text-xs text-white/40 leading-relaxed">
            Google Maps failed to load. The cluster list still works, but the map needs a valid Maps key and an enabled Maps JavaScript API in Google Cloud.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={apiKey}
      onError={(error) => {
        console.error('[ClusterMap] Google Maps failed to load:', error);
        setMapError('Google Maps failed to load');
      }}
    >
      <Map
        style={{ width: '100%', height: '100%' }}
        defaultCenter={{ lat: 16.51, lng: 80.52 }}
        defaultZoom={12}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
        onClick={() => setSelectedCluster(null)}
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
            <div className="p-3 min-w-65 max-w-[320px] font-sans text-gray-900">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <h3 className="font-extrabold text-[13px] tracking-tight text-gray-900 flex-1">Cluster #{selectedCluster.id.slice(-6)}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  selectedCluster.confidence > 0.8 ? 'bg-red-50 text-red-600 border border-red-200' :
                  selectedCluster.confidence > 0.6 ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}>
                  {(selectedCluster.confidence * 100).toFixed(0)}% Conf
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Users Involved</p>
                  <p className="text-xs font-semibold text-gray-800">
                    {selectedCluster.count} {selectedCluster.count === 1 ? 'individual' : 'individuals'}
                    {selectedCluster.userIds.length > 0 && <span className="text-indigo-600 font-mono text-[10px] ml-1 bg-indigo-50 px-1.5 py-0.5 rounded-md">({[...new Set(selectedCluster.userIds)].join(', ')})</span>}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">Trigger Events</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCluster.eventTypes.map(type => (
                      <span key={type} className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-semibold text-gray-700 shadow-sm">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedCluster.analyses && (
                  <div className="pt-1 mt-1">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">AI Analysis</p>
                    <p className="text-[11px] text-gray-700 leading-relaxed max-h-35 overflow-y-auto pr-1 bg-gray-50/80 p-2.5 rounded-lg border border-gray-100 shadow-inner whitespace-pre-wrap">
                      {selectedCluster.analyses}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}