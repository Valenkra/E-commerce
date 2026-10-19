# Plataforma de e-commerce y gestión comercial

**ValenShop** es un proyecto de comercio electrónico orientado a una tienda de indumentaria. Combina una experiencia de compra online con un panel de administración para centralizar el catálogo, el inventario y la operación comercial.

El objetivo es construir una solución propia, adaptable y escalable: una tienda que permita presentar productos de manera clara y, al mismo tiempo, gestionar la información del negocio desde un único lugar.

> **Estado:** proyecto en desarrollo activo. La infraestructura web, la API y la base de datos ya se encuentran desplegadas; algunas funcionalidades e integraciones siguen en proceso de implementación y validación.

## Funcionalidades

### Tienda online

- Catálogo de productos adaptable a dispositivos móviles.
- Navegación por categorías y búsqueda de productos.
- Visualización de productos y sus variantes, como talle y color.
- Interfaz de carrito de compras.

### Panel de administración

- **Dashboard:** vista general de la operación y sus indicadores.
- **Productos:** alta, edición y desactivación de artículos.
- **Inventario:** consulta de existencias por variante y registro de movimientos de stock.
- **Pedidos:** módulo de consulta y gestión de pedidos.
- **Clientes:** módulo de información de clientes y direcciones de entrega.
- **Reportes:** consultas de inventario y movimientos.
- **Configuración:** ajustes generales de la tienda.
- **Acceso protegido:** autenticación para ingresar al administrador y token de servicio para las operaciones de la API.

> La presencia de un módulo no implica que todo su flujo esté terminado o listo para operar con clientes reales.

## Tecnologías

| Capa | Tecnologías |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript |
| Backend | Node.js, Fastify, TypeScript |
| Base de datos | PostgreSQL |
| Procesamiento de imágenes | Sharp, WebP |
| Despliegue web | Vercel |
| Despliegue de API y base de datos | Railway |

## Arquitectura

El proyecto está organizado como un **monorepo** que separa la interfaz web de la API:

```text
E-commerce/
├── apps/
│   ├── web/                # Tienda online y panel de administración
│   └── api/                # API Fastify y lógica de acceso a datos
├── sql/                    # Migraciones de pedidos, clientes y configuración
├── supabase/
│   └── migrations/         # Esquemas y migraciones SQL del proyecto
└── package.json
```

En el despliegue actual, **Next.js se ejecuta en Vercel**, mientras que **Fastify y PostgreSQL se alojan en Railway**. La aplicación web consulta la API para obtener y administrar la información de la tienda.

## Próximos pasos

- Completar la validación integral de los flujos de pedidos y clientes en producción.
- Incorporar almacenamiento persistente para imágenes de productos.
- Migrar o cargar el catálogo definitivo.
- Fortalecer pruebas, observabilidad, copias de seguridad y controles de seguridad.
- Avanzar con integraciones y automatizaciones comerciales planificadas.

## Sobre el proyecto

ValenShop reúne desarrollo frontend, backend, modelado de datos y despliegue en la nube en un mismo producto. Además de construir una tienda online, el proyecto busca resolver necesidades concretas de administración comercial y servir como base para nuevas funcionalidades.
