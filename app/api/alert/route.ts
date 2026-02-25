import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const form     = await req.formData();
    const audio    = form.get('audio')    as File   | null;
    const locRaw   = form.get('location') as string | null;
    const volume   = form.get('volume')   as string | null;
    const city     = form.get('city')     as string | null;

    const location = locRaw ? JSON.parse(locRaw) : null;

    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║        QUALIE · ACOUSTIC ALERT TRIGGERED      ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('[ALERT] Peak volume :', volume ? Number(volume) + '/100' : 'unknown');
    console.log('[ALERT] City        :', city || 'unknown');
    if (location) {
      console.log('[ALERT] Latitude    :', location.lat);
      console.log('[ALERT] Longitude   :', location.lon);
      console.log('[ALERT] Maps URL    :', 'https://maps.google.com/?q=' + location.lat + ',' + location.lon);
    }
    if (audio && audio.size > 0) {
      const bytes = await audio.arrayBuffer();
      console.log('[ALERT] Audio type  :', audio.type);
      console.log('[ALERT] Audio size  :', bytes.byteLength + ' bytes (' + (bytes.byteLength / 1024).toFixed(1) + ' KB)');
      console.log('[ALERT] Compressed  : yes (opus codec, 6kbps)');
    } else {
      console.log('[ALERT] Audio       : no data captured');
    }
    console.log('[ALERT] Timestamp   :', new Date().toISOString());
    console.log('──────────────────────────────────────────────');
    console.log('[ALERT] Parent notification → would dispatch Twilio call');
    console.log('');

    return NextResponse.json({ ok: true, received: audio?.size ?? 0 });
  } catch (err) {
    console.error('[ALERT ERROR]', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
