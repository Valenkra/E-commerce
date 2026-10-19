
import { isAdmin } from '@/lib/admin-auth';

export async function GET() {
  if (!(await isAdmin())) {
    return Response.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const origin =
    process.env.API_BASE_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000';

  try {
    const response = await fetch(
      `${origin.replace(/\/$/, '')}/api/admin/inventory`,
      {
        headers: {
          Authorization: `Bearer ${process.env.LOCAL_ADMIN_TOKEN || ''}`,
        },
        cache: 'no-store',
      }
    );

    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return Response.json(
      { error: 'No se pudo conectar con Fastify' },
      { status: 502 }
    );
  }
}
