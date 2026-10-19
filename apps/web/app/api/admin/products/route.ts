import {NextResponse} from 'next/server';
import {isAdmin,sameOrigin} from '@/lib/admin-auth';
export const dynamic='force-dynamic';
const api=()=>process.env.API_BASE_URL||'http://127.0.0.1:4000';

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const token = process.env.LOCAL_ADMIN_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: 'Falta LOCAL_ADMIN_TOKEN' },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(
      `${api()}/api/admin/products`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000)
      }
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('[ADMIN] Error al cargar productos:', error);

    return NextResponse.json(
      { error: 'No se pudieron cargar los productos' },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
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
      { error: 'Falta LOCAL_ADMIN_TOKEN en el servidor web' },
      { status: 503 }
    );
  }

  const raw = await request.text();

  if (raw.length > 50000) {
    return NextResponse.json(
      { error: 'Solicitud demasiado grande' },
      { status: 413 }
    );
  }

  const startedAt = Date.now();

  try {
    console.log('[ADMIN] Enviando producto a Fastify...');

    const response = await fetch(`${api()}/api/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: raw,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    });

    const data = await response.json();

    console.log(
      `[ADMIN] Fastify respondió ${response.status} en ${Date.now() - startedAt}ms`
    );

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error(
      `[ADMIN] Error después de ${Date.now() - startedAt}ms:`,
      error
    );

    const timeout =
      error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError');

    return NextResponse.json(
      {
        error: timeout
          ? 'La API tardó demasiado en responder (15 segundos).'
          : 'No se pudo comunicar con la API.'
      },
      { status: timeout ? 504 : 503 }
    );
  }
}