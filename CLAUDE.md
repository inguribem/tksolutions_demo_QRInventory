# tksolutions_demo_QRInventory — Contexto del proyecto

> Este archivo es el resumen de contexto para retomar el proyecto desde
> Claude Code (VSCode) o cualquier otra sesión. Incluye qué es el
> proyecto, qué ya existe, el esquema de base de datos real, y cómo se
> monta y despliega el stack de Supabase.

## Qué es el proyecto

Demo de inventario por código QR. Se etiquetan cajas físicas con un QR
único; un equipo escanea el QR desde el celular (siempre con conexión a
internet) y puede **ver y editar** el contenido registrado de esa caja,
incluidas fotos.

Modelo mental: cada caja = un registro único en base de datos. El QR NO
guarda los datos completos — codifica el `qr_token` (uuid) de la caja.
Al escanear, la app resuelve ese token contra Supabase.

## Estado actual del repo

```
tksolutions_demo_QRInventory/
├── README.md
├── CLAUDE.md              # este archivo
├── .gitignore
├── venv/                   # venv compartido de todo el repo (Python 3.11, ignorado en git)
├── qr_generator/           # CONSTRUIDO, pero su flujo necesita ajuste (ver "Pendiente" abajo)
│   ├── qr_generator.py
│   ├── requirements.txt    # qrcode==8.2, pillow==12.2.0, reportlab==4.4.10
│   └── README.md
├── supabase/                # Opción A (Supabase CLI) — YA CONFIGURADO Y CORRIENDO
│   ├── config.toml
│   └── migrations/
│       └── 20260821193058_home_inventory_schema.sql
└── app/                      # PWA React + Vite — MVP funcional, conectado directo a Supabase
    ├── package.json         # @supabase/supabase-js, html5-qrcode, qrcode, react-router-dom
    ├── .env.local            # VITE_SUPABASE_URL/ANON_KEY del stack local (ignorado en git)
    └── src/
        ├── lib/               # supabaseClient.js, useSession.js
        ├── components/        # Sidebar, StatCard, Badge, Modal (layout tomado de tksolutions-demo-coworking)
        └── pages/              # Login, Dashboard, Boxes, BoxDetail, Scan
```

**Python**: el proyecto usa **Python 3.11** vía un único venv en la raíz
(`venv/`), compartido por `qr_generator/` y cualquier script futuro
(seed, procesamiento de imágenes, etc). Activar con
`source venv/bin/activate` desde la raíz.

**`qr_generator/`**: script con dos modos — `single` (QR con ID
automático o `--id` custom) y `batch --count N` (N códigos + hoja PDF
para imprimir). Lleva un CSV local `registro_cajas.csv` (ignorado en
git). **Su flujo actual no calza con el esquema real** — ver sección
"Pendiente" más abajo.

**`supabase/`**: Opción A elegida y montada. Ver siguiente sección para
el esquema y cómo se administra el stack.

## Esquema de base de datos (real, ya aplicado)

El esquema completo vive en
[`supabase/migrations/20260821193058_home_inventory_schema.sql`](supabase/migrations/20260821193058_home_inventory_schema.sql).
Es un modelo "Home Inventory" más rico que el borrador inicial de una
sola tabla `cajas`:

- **`profiles`** — extiende `auth.users` (nombre, avatar).
- **`locations`** — jerárquico (casa → clóset → estante), auto-referenciado.
- **`categories`** — con categorías "sistema" (15 precargadas: Ropa, Escuela, Herramientas, etc.) y personalizadas por usuario.
- **`boxes`** — tabla principal. `id` uuid PK, `box_code` texto legible, `qr_token` uuid (único global — **esto es lo que codifica el QR físico**), `status` (enum: stored/borrowed/empty/...), `keywords[]`, campos de IA (`ai_description`, `ai_confidence`) y `embedding vector(1536)` para búsqueda semántica.
- **`items`** — objetos individuales dentro de una caja (opcional, no hay que catalogar todo).
- **`photos`** — metadata de fotos (el archivo real vive en Storage, bucket `inventory`, privado).
- **`tags`**, `box_tags`, `item_tags` — etiquetado libre many-to-many.
- **`ai_analysis`** — historial de procesamiento IA (para cuando se integre reconocimiento de imágenes).
- **`box_history`** — auditoría de cambios por caja.
- **`qr_scans`** — analítica opcional de escaneos.

**Funciones incluidas**: `generate_box_code(user_id)` (genera `HOME-0001`, `HOME-0002`...), `search_inventory(texto)` (búsqueda por keyword/texto), `match_boxes(embedding)` (búsqueda semántica con pgvector).

**Extensiones requeridas**: `pgcrypto`, `vector` (pgvector) — ambas confirmadas disponibles en la imagen local de Supabase Postgres.

### Decisiones de arquitectura confirmadas

1. **Acceso privado por usuario** (no compartido en equipo): cada
   política RLS usa `auth.uid() = user_id` — un usuario solo ve/edita
   sus propias cajas. Esto es una decisión explícita del usuario
   (2026-08-21), distinta del borrador original que hablaba de "todo
   el equipo puede editar sin roles". Si en el futuro se necesita
   inventario compartido entre varias personas, hay que revisar estas
   políticas.
2. **El QR codifica `qr_token`** (uuid opaco), no un código legible
   como `box_code`. Decisión explícita (2026-08-21) para evitar que el
   QR sea adivinable/enumerable.

## Pendiente: flujo de generación de QR no calza con el esquema

`qr_generator.py` genera hoy códigos secuenciales (`CAJA-00001`) **sin
tocar la base de datos**, y ese código es lo único que va en el QR.
Con el esquema real:

- Toda caja requiere `user_id` (no nulo) → no se puede "pre-generar"
  una caja sin que exista un usuario dueño.
- El QR debe llevar `qr_token`, que **solo existe después de insertar
  la fila** en `boxes` (se genera con `default gen_random_uuid()`).

Esto implica invertir el orden actual: primero crear la caja en
Supabase (vía app o script, con su `user_id`), y **después** generar
el QR leyendo el `qr_token` que devolvió la inserción — no al revés
como hace el script hoy. Rediseñar `qr_generator.py` (o reemplazarlo
por un script que hable con Supabase) es el siguiente trabajo de fondo
antes de poder sembrar datos reales.

## Cómo se administra el stack local (Docker Desktop + Supabase CLI)

Opción A (Supabase CLI) ya está instalada y decidida — no hay
`docker-compose.yml` propio en el repo; el CLI administra los 12
contenedores a partir de [`supabase/config.toml`](supabase/config.toml).

```bash
supabase start              # levanta todo (Postgres, Auth, Storage, PostgREST, Realtime, Studio)
supabase status              # reimprime URLs y keys sin reiniciar nada
supabase stop                 # apaga, conserva los datos
supabase stop --no-backup     # apaga y borra los datos
supabase db reset             # recrea la base desde cero corriendo todas las migraciones
```

URLs locales (puertos fijos mientras no se cambie `config.toml`):

| Servicio | URL |
|---|---|
| API / REST | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Postgres directo | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Mailpit (emails de prueba, magic link) | http://127.0.0.1:54324 |

Las keys (`ANON_KEY`, `SERVICE_ROLE_KEY`) se obtienen con
`supabase status` — no se versionan en git, van en un `.env` local.

**Auth / magic link**: `supabase/config.toml` tiene `site_url =
"http://localhost:5173"` y `additional_redirect_urls` apuntando al
mismo puerto — es el puerto del dev server de `app/` (Vite). Si el
login por magic link deja de redirigir bien después de un `supabase
db reset` o `supabase start` en otra máquina, revisar que esos valores
sigan apuntando al puerto real donde corre el frontend (por defecto
5173). Los correos de magic link se ven en Mailpit
(http://127.0.0.1:54324), no llegan a una bandeja real en local.

**Endpoints**: no se escriben a mano. PostgREST expone automáticamente
`GET/POST/PATCH/DELETE /rest/v1/<tabla>` para cada tabla del esquema,
filtrado por las políticas RLS. Solo se necesitaría código de servidor
propio (Edge Functions, `supabase/functions/`) para lógica que no sea
CRUD simple (ej. redimensionar fotos, análisis de IA).

## Deploy a producción (Supabase Cloud)

Proyecto remoto creado, **vinculado** (`supabase link`) y **ya
sincronizado**: `teknowsolutions-QRInventory` (ref
`ojtkcjhlihttzaydqvll`, región `us-east-2`, plan Free).

- `supabase db push` (2026-08-22) — esquema aplicado, `boxes` confirmado
  vía REST (`GET /rest/v1/boxes` → 200).
- `supabase config push` (2026-08-22) — el bloque `[auth]` de
  `config.toml` se empujó completo al proyecto cloud (no solo
  `site_url`). Efectos secundarios a tener en cuenta: bajó el
  rate-limit de reenvío de OTP a 1s (era 1min), desactivó
  `enable_confirmations` y deshabilitó enrolamiento MFA — son valores
  pensados para desarrollo local. **Si este proyecto cloud pasa a
  manejar usuarios reales, revisar `Authentication > Settings` en el
  dashboard antes de lanzar.**
- Cloud usa el sistema de email por defecto de Supabase (no Mailpit) —
  en el plan Free sin SMTP propio configurado, los envíos están
  fuertemente limitados (~pocos por hora). Para pruebas frecuentes de
  login, usar el ambiente **Local** (Mailpit, sin límite).

Cambios de esquema futuros van siempre como **nueva migración**
(`supabase migration new <nombre>`) + `supabase db push`, nunca
editando tablas a mano en el Studio de producción, para no
desincronizar local/cloud.

**Frontend**: se despliega aparte (Vercel o Netlify), no en Supabase.
No hay backend custom que desplegar — Supabase Cloud cubre ese rol
completo (Auth + DB + Storage + API REST automática).

## Frontend (`app/`) — MVP funcional

Web app React + Vite conectada directo a Supabase (`@supabase/supabase-js`,
sin backend propio). Layout tomado de
`tksolutions-demo-coworking/frontend` (sidebar oscuro, cards, modal,
stat-grid) para no reinventar estilo desde cero.

- **Login** — magic link vía Supabase Auth (`signInWithOtp`). Necesario
  porque el acceso es privado por usuario (ver decisiones confirmadas
  arriba).
- **Dashboard** — stats de cajas por estado.
- **Cajas** — listado + búsqueda (por nombre/código) + alta (usa la
  función SQL `generate_box_code`), con selector de ubicación y alta
  rápida de ubicaciones nuevas inline.
- **Detalle de caja** — ver/editar (nombre, descripción, estado,
  ubicación, notas), genera el QR en pantalla desde `qr_token`
  (librería `qrcode`), muestra y permite subir fotos (Storage, bucket
  `inventory`, URLs firmadas), lista items (solo lectura por ahora).
- **Escanear** — lee QR con la cámara (`html5-qrcode`), busca por
  `qr_token` y navega al detalle.

**Selector Local / Supabase Cloud** (`EnvSwitcher`, en el Sidebar y en
Login): permite cambiar en caliente contra qué Supabase habla la app,
sin reiniciar el servidor. Implementación en
[`src/lib/supabaseClient.js`](app/src/lib/supabaseClient.js):
- Ambas configuraciones (URL + anon key de local y de cloud) viven
  simultáneamente en `.env.local` como 4 variables
  (`VITE_SUPABASE_URL_LOCAL`, `VITE_SUPABASE_ANON_KEY_LOCAL`,
  `VITE_SUPABASE_URL_CLOUD`, `VITE_SUPABASE_ANON_KEY_CLOUD`) — Vite las
  expone todas igual, la elección de cuál usar es en runtime, no en
  build time.
- La elección se guarda en `localStorage` (`qrinv-supabase-env`) y al
  cambiar se hace `window.location.reload()` — el cliente de Supabase
  es un singleton creado una vez al cargar el módulo, así que recargar
  es la forma más simple de reinstanciarlo con el otro ambiente.
- Cada ambiente guarda su sesión de Auth por separado
  (`storageKey: sb-local-auth-token` / `sb-cloud-auth-token`), así que
  cambiar de un lado a otro no cierra la sesión del otro — son usuarios
  distintos en cada proyecto de Supabase.
- El switcher se ve **verde** en Local y **ámbar** en Cloud a propósito
  — en Cloud los datos son reales (el proyecto vinculado ya existe y
  tiene el esquema aplicado), no hay confirmación antes de escribir.

**Falta en esta versión**: alta/edición de `items` y edición de
`categoría` desde el detalle de caja.

**Correr localmente**: `cd app && npm install && npm run dev` (con
`supabase start` corriendo). Variables en `.env.local` (no versionado,
ver `.env.example` para la plantilla).

## Próximos pasos sugeridos

1. Agregar en `app/`: alta/edición de `items` dentro del detalle de
   caja.
2. Rediseñar el flujo de `qr_generator.py` para que cree la caja en
   Supabase primero y genere el QR a partir del `qr_token` devuelto
   (ver sección "Pendiente" arriba) — o directamente reemplazarlo por
   el flujo de `app/` (crear caja → ver/imprimir QR desde el detalle),
   ya que la app ya cubre esa función.
3. Revisar en el dashboard de Supabase Cloud los valores de Auth que
   quedaron heredados de la config local (rate-limit de OTP, MFA,
   confirmaciones — ver nota en "Deploy a producción" arriba) antes de
   que el proyecto cloud maneje usuarios reales.
4. Evaluar deploy del frontend (Vercel/Netlify).
5. Evaluar deploy del frontend (Vercel/Netlify) una vez validado
   localmente contra Supabase Cloud.
