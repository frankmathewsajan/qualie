import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import webpush from 'web-push';

// Configure VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@aegis.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

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
      delivered: true,
      acknowledged: false,
    };
    
    if (audioBase64) {
      docData.audioBase64 = audioBase64;
    }

    await addDoc(collection(db, 'messages'), docData);

    // ── Send push notification to all subscribed devices for this user ──
    try {
      const subsQ = query(
        collection(db, 'push_subscriptions'),
        where('userId', '==', userId)
      );
      const subsSnap = await getDocs(subsQ);

      const isAudio = !!audioBase64;
      const pushPayload = JSON.stringify({
        title: '🛡️ Aegis — Operator Message',
        body: isAudio
          ? '🎙️ Your emergency operator sent you a voice message. Tap to listen.'
          : message || 'You have a new message from your emergency operator.',
        tag: 'aegis-operator-message',
        url: '/listen',
      });

      const pushPromises = subsSnap.docs.map(async (subDoc) => {
        const subscription = subDoc.data().subscription;
        try {
          await webpush.sendNotification(subscription, pushPayload);
        } catch (err: any) {
          // 410 = subscription expired/invalid — could clean up here
          console.warn('[push] failed to push to subscription:', err.statusCode, err.body);
        }
      });

      await Promise.allSettled(pushPromises);
      console.log(`[push] sent to ${subsSnap.size} subscription(s) for user ${userId}`);
    } catch (pushErr) {
      // Push failure should not fail the whole message send
      console.warn('[push] non-fatal: could not send push notifications:', pushErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}