import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
const api = () => process.env.API_BASE_URL || 'http://127.0.0.1:4000';
export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  if (!/^[0-9a-f-]{36}\.webp$/i.test(filename)) return new Response('No encontrada', { status: 404 });
  try {
    const response = await fetch(`${api()}/uploads/${filename}`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return new Response('No encontrada', { status: response.status === 404 ? 404 : 502 });
    return new Response(response.body, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch { return NextResponse.json({ error: 'Imagen no disponible' }, { status: 503 }); }
}
