import { NextResponse } from 'next/server';
import { isAdmin, sameOrigin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
const api = () => process.env.API_BASE_URL || 'http://127.0.0.1:4000';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Origen inválido' }, { status: 403 });
  const token = process.env.LOCAL_ADMIN_TOKEN;
  if (!token) return NextResponse.json({ error: 'Falta LOCAL_ADMIN_TOKEN' }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 50000) return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 });
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  try {
    const response = await fetch(`${api()}/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: raw,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return NextResponse.json({ error: timeout ? 'La API tardó demasiado en responder' : 'API no disponible' }, { status: timeout ? 504 : 503 });
  }
}



export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: 'Origen inválido' },
      { status: 403 }
    );
  }

  const token = process.env.LOCAL_ADMIN_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: 'Falta LOCAL_ADMIN_TOKEN' },
      { status: 503 }
    );
  }

  const { id } = await context.params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json(
      { error: 'ID de producto inválido' },
      { status: 400 }
    );
  }

  try {
    const api = process.env.API_BASE_URL || 'http://127.0.0.1:4000';

    const response = await fetch(
      `${api}/api/admin/products/${id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000)
      }
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status
    });
  } catch (error) {
    console.error('[ADMIN] Error al eliminar producto:', error);

    return NextResponse.json(
      { error: 'No se pudo eliminar el producto' },
      { status: 503 }
    );
  }
}
