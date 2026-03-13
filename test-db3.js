const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const webpush = require('web-push');
require('dotenv').config({ path: '.env.local' });

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
});
const db = getFirestore(app);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@aegis.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

async function test() {
  const snap = await getDocs(collection(db, 'push_subscriptions'));
  if (snap.empty) {
    console.log("No subs to push to.");
  }
  for (const doc of snap.docs) {
    const sub = doc.data().subscription;
    try {
      console.log(`Pushing to ${doc.data().userId}...`);
      await webpush.sendNotification(sub, JSON.stringify({
        title: 'Test',
        body: 'Testing web push',
      }));
      console.log("Success!");
    } catch(err) {
      console.error("Failed:", err);
    }
  }
  process.exit(0);
}
test();
