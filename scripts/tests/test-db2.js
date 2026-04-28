const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

// Setup firebase manually based on .env.local
const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
});

const db = getFirestore(app);

async function test() {
  try {
    const snap = await getDocs(collection(db, 'push_subscriptions'));
    console.log(`Found ${snap.size} subscriptions in total.`);
    snap.forEach(doc => {
      console.log(doc.id, "=>", doc.data().userId);
    });
  } catch(e) { console.error(e); }
  process.exit(0);
}
test();
