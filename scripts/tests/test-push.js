const webpush = require('web-push');
require('dotenv').config({ path: '.env.local' });

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@aegis.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// We need to fetch the subscription from the REST API or just make a request to our own API
async function testPush() {
  console.log("Testing with public key:", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  try {
    const res = await fetch('http://localhost:3000/api/push?userId=test');
    console.log("Push API works");
  } catch(e) {
    console.log(e);
  }
}
testPush();
