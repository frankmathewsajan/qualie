// Helper to confirm that the environment variables from .env.local are being loaded.
// Run with: npm run env:check

require('dotenv').config({ path: '.env.local' });

console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ?? '<missing>');
console.log('NEXT_PUBLIC_GEMINI_API_KEY:', process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '<missing>');
