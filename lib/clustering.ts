import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, writeBatch } from 'firebase/firestore';

export async function clusterAlerts() {
  // Fetch recent alerts (last 20 minutes)
  const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
  const alertsQuery = query(
    collection(db, 'alerts'),
    where('timestamp', '>', Timestamp.fromDate(twentyMinutesAgo)),
    orderBy('timestamp', 'desc')
  );
  const alerts = await getDocs(alertsQuery);
  const alertData = alerts.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

  // Simple clustering: group by proximity (500m radius)
  const clusters = [];
  const processed = new Set();

  for (const alert of alertData) {
    if (!alert.lat || !alert.lng) continue;
    if (processed.has(alert.id)) continue;

    const cluster = [alert];
    processed.add(alert.id);

    for (const other of alertData) {
      if (!other.lat || !other.lng) continue;
      if (processed.has(other.id)) continue;
      const distance = getDistance(alert.lat, alert.lng, other.lat, other.lng);
      if (distance < 10) { // 10km
        cluster.push(other);
        processed.add(other.id);
      }
    }

    if (cluster.length >= 1) {
      // Calculate centroid, confidence, etc.
      const centroid = calculateCentroid(cluster);
      const avgConfidence = cluster.reduce((sum, a) => sum + (a.confidence || 0.5), 0) / cluster.length;
      const eventTypes = [...new Set(cluster.map(a => a.eventType || 'unknown'))];

      clusters.push({
        centroid,
        timeWindow: { start: cluster[0].timestamp, end: cluster[cluster.length - 1].timestamp },
        userIds: cluster.map(a => a.userId || 'unknown'),
        confidence: avgConfidence,
        eventTypes,
        count: cluster.length,
        analyses: cluster.map(a => `User ${a.userId || 'Unknown'}:\n${a.analysis || 'No analysis'}`).join('\n\n---\n\n'),
      });
    }
  }

  // Store clusters (clear old, add new)
  const oldClusters = await getDocs(collection(db, 'clusters'));
  const batch = writeBatch(db);
  oldClusters.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  for (const cluster of clusters) {
    await addDoc(collection(db, 'clusters'), cluster);
  }
  // Keep database completely clean (delete anything > 24 hours old)
  await cleanupExpiredData();
}

export async function cleanupExpiredData() {
  const cutoff = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  const collectionsToClean = ['alerts', 'alert_images', 'messages'];
  
  for (const col of collectionsToClean) {
    try {
      const snaps = await getDocs(query(collection(db, col), where('timestamp', '<', cutoff)));
      if (!snaps.empty) {
        const batch = writeBatch(db);
        snaps.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        // Cleanup log removed
      }
    } catch (e: any) {
      // Ignore missing index errors on first run, it will still clean effectively over time
      console.warn(`[cleanup] Skipped ${col}: ${e.message}`);
    }
  }
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Haversine formula in km
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateCentroid(alerts: any[]): { lat: number, lng: number } {
  const validAlerts = alerts.filter(a => a.lat && a.lng);
  if (validAlerts.length === 0) return { lat: 0, lng: 0 };
  const lat = validAlerts.reduce((sum, a) => sum + a.lat, 0) / validAlerts.length;
  const lng = validAlerts.reduce((sum, a) => sum + a.lng, 0) / validAlerts.length;
  return { lat, lng };
}