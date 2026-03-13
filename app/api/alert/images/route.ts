import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { userId, imageBase64, lat, lng } = await req.json();

    await addDoc(collection(db, 'alert_images'), {
      userId,
      image: imageBase64,
      lat,
      lng,
      timestamp: Timestamp.fromDate(new Date()),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
