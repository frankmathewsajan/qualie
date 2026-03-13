import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 });
  }

  const url =
    'https://api.open-meteo.com/v1/forecast' +
    '?latitude=' + parseFloat(lat).toFixed(4) +
    '&longitude=' + parseFloat(lon).toFixed(4) +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,' +
    'wind_speed_10m,weather_code,uv_index' +
    '&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto';

  console.log('[weather] fetching open-meteo for', lat, lon);

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6_000),
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[weather] open-meteo error', res.status, body.slice(0, 200));
      return NextResponse.json({ error: 'upstream error' }, { status: 502 });
    }

    const json = await res.json();
    console.log('[weather] ok – code', json.current?.weather_code, 'temp', json.current?.temperature_2m + '°C');
    return NextResponse.json(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[weather] fetch failed:', msg);
    return NextResponse.json({ error: 'fetch failed: ' + msg }, { status: 502 });
  }
}
