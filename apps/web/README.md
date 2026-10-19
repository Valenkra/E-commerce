# Catálogo de lencería — Next.js + React + Supabase

## Arranque
1. Instalar Node.js 20+.
2. Ejecutar `npm install` y `npm run dev`.
3. Abrir http://localhost:3000/catalogo.
4. Copiar `.env.example` a `.env.local` y completar variables cuando tengas Supabase.

## Incluido
- Catálogo responsive con buscador por nombre/código/características, filtros por categoría/subtipo/talle.
- Dos precios separados, selector de variantes, carrito persistente en navegador y enlace de WhatsApp.
- Endpoint GET `/api/products` que usa Supabase si hay credenciales, o productos de muestra si no.
- Esquema inicial Supabase en `supabase/schema.sql` con RLS de lectura.

## Pendiente antes de producción
- Imágenes reales de producto: los bloques visuales actuales son ilustrativos, no fotos comerciales.
- Conectar Supabase y cargar productos/variantes reales; stock por variante (SKU) en vez de stock global.
- Autenticación Supabase Auth, perfil de cliente y panel administrativo protegido.
- Implementar escritura de pedidos y descuentos de stock transaccionales en servidor.
- Integración WhatsApp Business Cloud API con webhook verificado, permisos y prevención de duplicados.
- Validar mínimos mayoristas según reglas reales del negocio.

**Seguridad:** No habilitar escrituras desde el navegador usando service_role. El SQL inicial permite lectura pública de productos activos y lectura de pedidos propios; no incluye políticas de escritura ni accesos administrativos.
