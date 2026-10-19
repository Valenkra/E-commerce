import { NextResponse } from 'next/server';
import { isAdmin, sameOrigin } from '@/lib/admin-auth';
export const runtime = 'nodejs';
const api = () => process.env.API_BASE_URL || 'http://127.0.0.1:4000';
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Origen inválido' }, { status: 403 });
  const token = process.env.LOCAL_ADMIN_TOKEN;
  if (!token) return NextResponse.json({ error: 'Falta LOCAL_ADMIN_TOKEN' }, { status: 503 });
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 11 * 1024 * 1024) return NextResponse.json({ error: 'Archivo demasiado grande' }, { status: 413 });
  try {
    const data = await request.formData();
    const file = data.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Seleccioná una imagen' }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Máximo 10 MB' }, { status: 413 });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return NextResponse.json({ error: 'Solo JPG, PNG o WebP' }, { status: 415 });
    const body = new FormData(); body.append('file', file, file.name);
    const response = await fetch(`${api()}/api/admin/images`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body,
      cache: 'no-store', signal: AbortSignal.timeout(30000)
    });
    const result = await response.json();
    return NextResponse.json(result, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[IMAGES] Error al subir:', error);
    return NextResponse.json({ error: 'No se pudo subir la imagen' }, { status: 503 });
  }
}
