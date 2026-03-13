import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { userId, message, operatorId } = await req.json();

    // Store message in Firestore
    await addDoc(collection(db, 'messages'), {
      userId,
      message,
      operatorId,
      timestamp: Timestamp.fromDate(new Date()),
      type: 'agency_ping',
      delivered: true, // Mark as delivered immediately since we're storing it
      acknowledged: false,
    });

    // Trigger push notification via Firebase Cloud Messaging
    // (Implementation would call FCM API here)

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}