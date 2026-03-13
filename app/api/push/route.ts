import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';

// Store a push subscription for a user
export async function PUT(req: NextRequest) {
  try {
    const { userId, subscription } = await req.json();
    if (!userId || !subscription) {
      return NextResponse.json({ error: 'userId and subscription required' }, { status: 400 });
    }

    await addDoc(collection(db, 'push_subscriptions'), {
      userId,
      subscription,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[push] failed to store subscription:', error);
    return NextResponse.json({ error: 'Failed to store subscription' }, { status: 500 });
  }
}

// GET — fetch subscriptions for a user (used server-side to send push)
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  try {
    const q = query(collection(db, 'push_subscriptions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const subscriptions = snap.docs.map(d => d.data().subscription);
    return NextResponse.json({ subscriptions });
  } catch (error) {
    return NextResponse.json({ subscriptions: [] });
  }
}
