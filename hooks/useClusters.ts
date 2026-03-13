import { useState, useEffect } from 'react';

export interface Cluster {
  id: string;
  centroid: { lat: number; lng: number };
  timeWindow: { start: Date; end: Date };
  userIds: string[];
  confidence: number;
  eventTypes: string[];
  count: number;
}

export function useClusters() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClusters();
    const interval = setInterval(fetchClusters, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchClusters = async () => {
    try {
      const res = await fetch('/api/clusters');
      const data = await res.json();
      setClusters(data.map((c: any) => ({
        ...c,
        timeWindow: {
          start: new Date(c.timeWindow.start.seconds * 1000),
          end: new Date(c.timeWindow.end.seconds * 1000),
        },
      })));
    } catch (error) {
      console.error('Failed to fetch clusters:', error);
    } finally {
      setLoading(false);
    }
  };

  return { clusters, loading, refetch: fetchClusters };
}