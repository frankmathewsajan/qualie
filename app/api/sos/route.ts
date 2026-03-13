import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs, doc, getDoc, addDoc, Timestamp } from 'firebase/firestore';

// POST — create a new SOS session
export async function POST(req: NextRequest) {
  try {
    const { userId, lat, lng, sessionId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    // Grab user display name
    const { setDoc } = await import('firebase/firestore');
    const userSnap = await getDoc(doc(db, 'users', userId));
    const userName = userSnap.exists()
      ? (userSnap.data().displayName || userSnap.data().name || userId)
      : userId;

    // Create a short-lived SOS session document
    const payload = {
      userId,
      userName,
      lat: lat ?? 0,
      lng: lng ?? 0,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      active: true,
    };

    let createdId = '';
    if (sessionId) {
      await setDoc(doc(db, 'sos_sessions', sessionId), payload);
      createdId = sessionId;
    } else {
      const sessionRef = await addDoc(collection(db, 'sos_sessions'), payload);
      createdId = sessionRef.id;
    }

    return NextResponse.json({ sessionId: createdId });
  } catch (error) {
    console.error('[sos] failed to create session', error);
    return NextResponse.json({ error: 'Failed to create SOS session' }, { status: 500 });
  }
}

// GET — fetch live session data (used by the /sos/[id] page)
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  // Step 1: fetch the SOS session doc
  let session: Record<string, any>;
  try {
    const sessionSnap = await getDoc(doc(db, 'sos_sessions', sessionId));
    if (!sessionSnap.exists()) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }
    session = sessionSnap.data();
  } catch (error) {
    console.error('[sos/GET] failed to load session doc:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }

  const userId = session.userId;

  // Step 2: fetch latest alert — only where(), sort in JS to avoid composite index requirement
  let latestAlert = null;
  try {
    const alertsQ = query(
      collection(db, 'alerts'),
      where('userId', '==', userId),
      limit(20)
    );
    const alertSnap = await getDocs(alertsQ);
    if (!alertSnap.empty) {
      const docs = alertSnap.docs
        .map(d => ({ ...d.data(), _id: d.id }))
        .sort((a: any, b: any) => {
          const ta = a.timestamp?.toMillis?.() ?? (a.timestamp?.seconds ?? 0) * 1000;
          const tb = b.timestamp?.toMillis?.() ?? (b.timestamp?.seconds ?? 0) * 1000;
          return tb - ta;
        });
      const d = docs[0] as any;
      latestAlert = {
        lat: d.lat ?? d.location?.lat ?? session.lat,
        lng: d.lng ?? d.location?.lng ?? session.lng,
        timestamp: d.timestamp?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        analysis: d.analysis ?? null,
        volume: d.volume ?? null,
        city: d.city ?? null,
      };
    }
  } catch (error) {
    console.warn('[sos/GET] could not load alerts:', (error as any)?.message);
  }

  // Images are now fetched directly from Firestore on the client side
  // to avoid massive base64 payloads exceeding response size limits.

  return NextResponse.json({
    session: {
      userId: session.userId,
      userName: session.userName,
      lat: latestAlert?.lat ?? session.lat,
      lng: latestAlert?.lng ?? session.lng,
      createdAt: session.createdAt?.toDate?.()?.toISOString(),
      active: session.active,
    },
    latestAlert,
  });
}

