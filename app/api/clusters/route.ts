import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { clusterAlerts } from '@/lib/clustering';

// POST /api/alert - Submit a new alert
export async function POST(req: NextRequest) {
  try {
    const { userId, timestamp, lat, lng, eventType, confidence } = await req.json();

    // Store alert
    await addDoc(collection(db, 'alerts'), {
      userId,
      timestamp: Timestamp.fromDate(new Date(timestamp)),
      lat,
      lng,
      eventType,
      confidence,
    });

    // Trigger clustering
    await clusterAlerts();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit alert' }, { status: 500 });
  }
}

// GET /api/clusters - Get current clusters
export async function GET() {
  try {
    const clusters = await getDocs(collection(db, 'clusters'));
    const data = clusters.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch clusters' }, { status: 500 });
  }
}