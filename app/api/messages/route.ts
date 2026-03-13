import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { userId, message, audioBase64, operatorId } = await req.json();

    console.log(`[POST /api/messages] Handling message for user ${userId}`);

    // Store message in Firestore
    const docData: any = {
      userId,
      message,
      operatorId,
      timestamp: Timestamp.fromDate(new Date()),
      type: 'agency_ping',
      delivered: true, // Mark as delivered immediately since we're storing it
      acknowledged: false,
    };
    
    if (audioBase64) {
      docData.audioBase64 = audioBase64;
    }

    await addDoc(collection(db, 'messages'), docData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}