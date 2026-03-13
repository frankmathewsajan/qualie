import { NextRequest, NextResponse } from 'next/server';

const ts = () => new Date().toISOString().slice(11, 23);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      event:   string;
      detail?: string | number | Record<string, unknown>;
    };

    const detail = body.detail !== undefined ? ' → ' + JSON.stringify(body.detail) : '';
    console.log(`[${ts()}] [GEMINI-LIVE] ${body.event}${detail}`);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
