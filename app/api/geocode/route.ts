import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 });
  }

  const url =
    'https://nominatim.openstreetmap.org/reverse' +
    '?lat=' + lat + '&lon=' + lon + '&format=json&zoom=14';

  console.log('[geocode] reverse geocoding', lat, lon);

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5_000),
      headers: {
        'Accept':          'application/json',
        'Accept-Language': 'en',
        'User-Agent':      'AegisApp/1.0 (safety-monitor; contact@aegis.app)',
      },
    });

    if (!res.ok) {
      console.error('[geocode] nominatim error', res.status);
      return NextResponse.json({ error: 'nominatim error' }, { status: 502 });
    }

    const json = await res.json();
    const a    = json.address ?? {};
    const city = a.suburb || a.neighbourhood || a.city || a.town || a.village || a.county || null;
    const country = (a.country_code ?? '').toUpperCase();

    console.log('[geocode] resolved:', city, country);
    return NextResponse.json({ city, country });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[geocode] fetch failed:', msg);
    return NextResponse.json({ error: 'fetch failed: ' + msg }, { status: 502 });
  }
}
