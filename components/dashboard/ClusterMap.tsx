'use client';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { Cluster } from '@/hooks/useClusters';

interface ClusterMapProps {
  clusters: Cluster[];
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
        {clusters.map((cluster) => (
          <Marker
            key={cluster.id}
            position={cluster.centroid}
            title={`Cluster: ${cluster.count} alerts, Confidence: ${cluster.confidence.toFixed(2)}`}
          />
        ))}
      </Map>
    </APIProvider>
  );
}