const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

// We use the REST API for simplicity, or just read via fetch
async function test() {
  const res = await fetch('http://localhost:3000/api/push?userId=foo');
  console.log(await res.text());
}
test();
