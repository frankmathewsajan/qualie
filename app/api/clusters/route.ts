import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, Timestamp, query, where, updateDoc, doc } from 'firebase/firestore';
import { clusterAlerts } from '@/lib/clustering';

export const dynamic = 'force-dynamic';

async function checkDeadManSwitches() {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('isRecording', '==', true));
    const snapshot = await getDocs(q);

    let clusterTriggered = false;
    const now = Date.now();
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data.lastHeartbeat) {
        const hbTime = data.lastHeartbeat.toDate().getTime();
        // If heartbeat is older than 20 seconds, flag as connection loss
        if (now - hbTime > 20000) {
          await addDoc(collection(db, 'alerts'), {
            userId: docSnap.id,
            timestamp: Timestamp.fromMillis(hbTime), // Mark alert exactly when connection died
            lat: data.lastLocation?.lat || null,
            lng: data.lastLocation?.lng || null,
            volume: 100,
            eventType: 'connection_loss',
            confidence: 1.0,
            analysis: 'CRITICAL WARNING: Streaming telemetry from this user was suddenly and violently severed. This could indicate phone destruction, confiscation, or signal blocking.',
          });
          
          await updateDoc(doc(db, 'users', docSnap.id), {
            isRecording: false
          });
          
          clusterTriggered = true;
          console.log(`[Dead Man Switch] Disconnection alert triggered for User ${docSnap.id}`);
        }
      }
    }

    if (clusterTriggered) {
      await clusterAlerts();
    }
  } catch (error) {
    console.error('Failed to check dead man switches', error);
  }
}

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
    // Run the heartbeat sweep on interval syncs from the dashboard
    await checkDeadManSwitches();

    const clusters = await getDocs(collection(db, 'clusters'));
    const data = clusters.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch clusters' }, { status: 500 });
  }
}