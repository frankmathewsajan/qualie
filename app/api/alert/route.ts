import { NextRequest, NextResponse } from 'next/server';

const GEMINI_REST =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function analyseWithGemini(
  audioBytes: ArrayBuffer,
  mimeType:   string,
  peakVol:    string,
  city:       string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return 'GEMINI_API_KEY not configured — analysis skipped.';

  // Encode audio as Base64 inline data
  const u8  = new Uint8Array(audioBytes);
  const b64 = Buffer.from(u8).toString('base64');

  const prompt =
    `You are an AI safety guardian analysing a real-time audio recording.\n` +
    `Location: ${city || 'unknown'}. Peak volume level: ${peakVol}/100.\n\n` +
    `In 3-5 sentences tell me:\n` +
    `- What sounds or speech you can detect in the audio\n` +
    `- Whether there are any signs of distress, danger, or emergency\n` +
    `- What the guardian monitoring this person should do right now\n\n` +
    `Be specific and direct. If the audio is silent or ambient noise only, say so clearly.`;

  const body = {
    contents: [{
      parts: [
        { inlineData: { mimeType, data: b64 } },
        { text: prompt },
      ],
    }],
    generationConfig: {
      temperature:     0.3,
      maxOutputTokens: 600,
    },
  };

  const res  = await fetch(`${GEMINI_REST}?key=${apiKey}`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      // API keys with HTTP-referrer restrictions reject requests with no Referer.
      // Server-side fetches have none, so we supply one explicitly.
      'Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Gemini API ${res.status}: ${txt.slice(0, 200)}`);
  }

  const json = await res.json();
  return (
    json?.candidates?.[0]?.content?.parts?.[0]?.text ??
    'No analysis returned.'
  );
}

const SEP = '─'.repeat(50);

function log(tag: string, label: string, value?: unknown) {
  const ts = new Date().toISOString().slice(11, 23); // HH:mm:ss.mmm
  const val = value !== undefined ? String(value) : '';
  console.log(`[${ts}] [${tag}] ${label}${val ? ' → ' + val : ''}`);
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const form     = await req.formData();
    const audio    = form.get('audio')    as File   | null;
    const locRaw   = form.get('location') as string | null;
    const volume   = form.get('volume')   as string | null;
    const city     = form.get('city')     as string | null;

    const location   = locRaw ? JSON.parse(locRaw) : null;
    const audioBytes = audio && audio.size > 0 ? await audio.arrayBuffer() : null;

    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║       AEGIS  ·  ALERT TRIGGERED               ║');
    console.log('╠══════════════════════════════════════════════╣');
    log('ALERT', 'Timestamp  ', new Date().toISOString());
    log('ALERT', 'Peak vol   ', volume ? Number(volume) + ' / 100' : 'unknown');
    log('ALERT', 'City       ', city || 'unknown');
    if (location?.lat && location?.lon) {
      log('ALERT', 'Coords     ', `${location.lat}, ${location.lon}`);
      log('ALERT', 'Maps URL   ', `https://maps.google.com/?q=${location.lat},${location.lon}`);
    }
    if (audioBytes) {
      const kb = (audioBytes.byteLength / 1024).toFixed(1);
      log('ALERT', 'Audio      ', `${kb} KB  (${audio!.type})`);
    } else {
      log('ALERT', 'Audio      ', 'none captured');
    }
    console.log('╠══════════════════════════════════════════════╣');

    // ── Gemini audio analysis ────────────────────────────────────────────────
    let analysis = 'No audio captured.';
    if (audioBytes) {
      log('GEMINI', 'Sending audio for analysis', `${(audioBytes.byteLength/1024).toFixed(1)} KB`);
      const tG = Date.now();
      try {
        analysis = await analyseWithGemini(
          audioBytes,
          audio!.type || 'audio/webm',
          volume ?? '?',
          city   ?? '',
        );
        log('GEMINI', 'Analysis complete', `${Date.now() - tG} ms`);
        console.log('');
        console.log('┌─ Gemini Analysis ' + SEP.slice(18));
        analysis.split('\n').forEach(line => console.log('│ ' + line));
        console.log('└' + SEP);
        console.log('');
      } catch (geminiErr) {
        const msg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
        log('GEMINI', 'ERROR', msg);
        analysis = 'Gemini analysis failed: ' + msg;
      }
    }

    log('ALERT', 'Total latency', `${Date.now() - t0} ms`);
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');

    return NextResponse.json({ ok: true, received: audio?.size ?? 0, analysis });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ALERT ERROR]', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
