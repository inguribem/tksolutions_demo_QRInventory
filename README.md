# tksolutions_demo_QRInventory

Demo de una app para gestionar inventario mediante códigos QR: cada caja
física se etiqueta con un QR único; al escanearlo se puede ver y editar
el contenido registrado de esa caja (incluidas fotos), consultando una
base de datos en Supabase.

App en producción: https://tksolutions-demo-qrinventory.onrender.com

## Estructura del proyecto

- **`app/`** — frontend (ver detalle abajo).
- **`supabase/`** — esquema de base de datos, migraciones y configuración
  del stack de Supabase (local vía Docker Desktop + proyecto en
  Supabase Cloud).
- **`qr_generator/`** — script en Python **standalone, independiente de
  la aplicación principal**: no está incorporado a `app/` ni se conecta
  a Supabase. Sirve para generar hojas de QR imprimibles en lote como
  utilidad aparte. Ver [`qr_generator/README.md`](./qr_generator/README.md)
  y la nota abajo.

## Preguntas frecuentes

**¿Qué framework usa la app?**
React + Vite (`app/`), como PWA. No hay backend propio: el frontend
habla directo con Supabase.

**¿Cómo está conectada actualmente a la base de datos?**
Vía `@supabase/supabase-js`, sin ningún servidor intermedio — Supabase
expone automáticamente una API REST (PostgREST) sobre las tablas del
esquema. La app puede apuntar a **dos bases distintas** en runtime,
elegibles con un selector en el sidebar/login:
- **Local** — Postgres corriendo en Docker Desktop vía Supabase CLI
  (`supabase start`).
- **Supabase Cloud** — proyecto `teknowsolutions-QRInventory`, el mismo
  que usa la app desplegada en Render.

Cada ambiente guarda su propia sesión de usuario por separado.

**¿Ya tiene Supabase Auth?**
Sí — login por **magic link** (correo, sin contraseña) vía
`supabase.auth.signInWithOtp`. El acceso es privado por usuario: cada
cuenta ve y edita únicamente sus propias cajas (Row Level Security en
Postgres, no es un inventario compartido entre todo el equipo).

**¿Cómo está implementado el QR?**
- El QR físico codifica `qr_token`, un UUID opaco que se genera solo
  cuando la caja se crea en la base de datos (no es un código
  adivinable como `CAJA-00001`).
- Se genera en el navegador (librería `qrcode`) desde la pantalla de
  detalle de cada caja — no hace falta imprimirlo con un script aparte.
- Se lee con la cámara del celular/laptop (librería `html5-qrcode`)
  desde la pantalla "Escanear" de la app, que busca la caja por
  `qr_token` y abre su detalle.
- `qr_generator/` (el script en Python) es un módulo **aparte, no
  incorporado a la aplicación**: es anterior a este flujo y genera
  códigos de otra forma (secuenciales, sin tocar la base de datos). No
  está integrado con `app/` ni con Supabase — queda pendiente decidir
  si se rediseña para integrarlo o si se reemplaza por el flujo nativo
  de la app. Ver `CLAUDE.md` para el detalle.

## Funcionalidades de la app

1. Iniciar sesión (magic link)
2. Ver tus cajas (listado + búsqueda por nombre/código)
3. Crear una caja (con categoría y ubicación)
4. Abrir una caja: ver/editar sus datos, su QR, su ubicación y sus fotos
5. Subir fotografías a una caja
6. Escanear un QR con la cámara para ir directo a su caja

## Cómo correr esto localmente

```bash
# Base de datos (requiere Docker Desktop)
supabase start

# Frontend
cd app
npm install
npm run dev
```

Variables de entorno en `app/.env.local` (no versionado — ver
`app/.env.example` para la plantilla). Más detalle de arquitectura,
decisiones y pendientes en [`CLAUDE.md`](./CLAUDE.md).
