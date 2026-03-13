import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    // Get user's emergency contact from Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const emergencyContact = userData.emergencyContact;
    if (!emergencyContact) {
      return NextResponse.json({ error: 'No emergency contact configured' }, { status: 400 });
    }

    // Get current location (assuming passed or fetched)
    const location = userData.lastLocation; // Or fetch from recent alert

    const message = `Emergency alert from AEGIS.
User: ${userData.name || userId}
Location: https://maps.google.com/?q=${location.lat},${location.lng}
Time: ${new Date().toLocaleTimeString()}
The user may be in danger.`;

    // Send via WhatsApp API (Twilio example)
    // const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    //   method: 'POST',
    //   headers: { 'Authorization': `Basic ${btoa(accountSid + ':' + authToken)}` },
    //   body: new URLSearchParams({
    //     From: 'whatsapp:+1234567890', // Your WhatsApp number
    //     To: `whatsapp:${emergencyContact}`,
    //     Body: message,
    //   }),
    // });

    // For now, log the message
    console.log('WhatsApp message to send:', message);

    return NextResponse.json({ success: true, message });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 });
  }
}