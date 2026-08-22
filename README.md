# tksolutions_demo_QRInventory

Demo de una app para gestionar inventario mediante códigos QR: cada caja
física se etiqueta con un QR único; al escanearlo se puede ver y editar
el contenido registrado de esa caja (incluida una foto), consultando una
base de datos.

## Estructura del proyecto

- **`qr_generator/`** — módulo en Python para generar los códigos QR de
  las cajas (uno por uno o en lote, con hoja PDF lista para imprimir).
  Ver [`qr_generator/README.md`](./qr_generator/README.md) para el detalle
  de uso.
- **`database/`** *(pendiente)* — definición de la base de datos (tabla
  `cajas`: id, contenido, foto_url, etc.).
- **`app/`** *(pendiente)* — aplicación de escaneo y edición (pantalla de
  cámara para leer el QR + pantalla de detalle/edición de la caja).

## Flujo general

1. Se genera un QR único por caja con `qr_generator/` (el QR solo
   contiene el ID de la caja, ej. `CAJA-00001`).
2. Se pega el QR físicamente en la caja.
3. Alguien del equipo escanea el QR desde la app.
4. La app busca ese ID en la base de datos y muestra (y permite editar)
   el contenido y la foto de la caja.
