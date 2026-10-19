import { isAdmin, sameOrigin } from '@/lib/admin-auth';

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (!(await isAdmin())) return Response.json({ error: 'No autorizado' }, { status: 401 });
  if (request.method !== 'GET' && !sameOrigin(request)) return Response.json({error:'Origen inválido'},{status:403});
  const { path } = await context.params;
  if (!path?.length || path.some(p => !/^[a-zA-Z0-9-]+$/.test(p))) return Response.json({error:'Ruta inválida'}, {status:400});
  const origin = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const url = new URL(request.url);
  const destination = `${origin.replace(/\/$/,'')}/api/admin/orders/${path.join('/')}${url.search}`;
  try {
    const response = await fetch(destination, {
      method: request.method,
      headers: { Authorization: `Bearer ${process.env.LOCAL_ADMIN_TOKEN || ''}`, ...(['POST','PATCH','DELETE'].includes(request.method) ? {'Content-Type':'application/json'} : {}) },
      body: ['POST','PATCH','DELETE'].includes(request.method) ? await request.text() : undefined,
      cache: 'no-store',
    });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type':'application/json' } });
  } catch { return Response.json({error:'No se pudo conectar con Fastify'}, {status:502}); }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
