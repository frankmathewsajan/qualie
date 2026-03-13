'use client';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
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
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
      <Map
        style={{ width: '100%', height: '100%' }}
        defaultCenter={{ lat: 16.48, lng: 80.52 }}
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
              title={`${cluster.count} alert(s) - ${cluster.eventTypes.join(', ')} - Confidence: ${cluster.confidence.toFixed(2)}`}
              icon={icon}
            />
          );
        })}
      </Map>
    </APIProvider>
  );
}