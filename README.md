# Lencería — monorepo inicial

## Arquitectura
- `apps/web`: Next.js 15 + React 19, catálogo y carrito responsive.
- `apps/api`: Node.js + Fastify + TypeScript; productos, categorías, creación de productos e imágenes.
- `supabase/migrations/001_initial.sql`: tablas y RLS de partida.

## Instalación
Requiere Node.js 20+ y npm. Desde la raíz:
```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run dev:api
# otra terminal:
npm run dev:web
```
Abrir http://localhost:3000/catalogo; API http://localhost:4000/health.
Sin configurar Supabase, el catálogo muestra datos de demostración y la API responde 503 en endpoints de datos.

## Supabase
1. Crear proyecto y ejecutar `supabase/migrations/001_initial.sql` en SQL Editor.
2. Configurar `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` SOLO en el entorno privado de `apps/api`.
3. Configurar `API_BASE_URL` en Next.js. Nunca publicar la service role key.
4. Asignar rol admin solo desde un entorno confiable, nunca mediante una ruta pública.

## API
- GET `/health`
- GET `/api/products?q=&category=&subtype=&page=&limit=`
- GET `/api/categories`
- POST `/api/admin/products` (Bearer token de admin)
- POST `/api/admin/images` (Bearer token de admin, multipart imagen; convierte a WebP)
- POST `/api/admin/imports` (501, pendiente de implementación real)
- POST `/api/admin/orders` (501, pendiente de operación transaccional)
- GET `/webhooks/whatsapp` (verificación de webhook; requiere token)
- POST `/webhooks/whatsapp` (503 hasta implementar validación de firma)

## Estado y límites
Esto es un primer incremento de implementación, NO un sistema de ventas listo para producción. Falta importador PDF, eliminación de precios con IA, conservación de originales, revisión editorial, cuentas y administración completas, descuento transaccional de stock y bot real de WhatsApp. La API no finge que esas operaciones ya funcionan.
Para producción: rate limiting, pruebas, monitorización, backups, permisos de storage, política de imágenes, webhook firmado y control de costes.
