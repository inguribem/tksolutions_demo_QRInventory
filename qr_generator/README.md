# qr_generator

Módulo que genera los códigos QR que se pegan en cada caja. Cada QR
contiene únicamente el **ID único de la caja** (ej. `CAJA-00001`) — ese ID
es lo que la app usa para buscar el contenido y la foto de la caja en la
base de datos.

## Instalación

Desde esta carpeta (`qr_generator/`):

```bash
pip install -r requirements.txt
```

## Uso

**Un solo QR, con ID automático (consecutivo):**

```bash
python qr_generator.py single
```

**Un solo QR, con un ID que tú elijas:**

```bash
python qr_generator.py single --id CAJA-BODEGA-01
```

**Un lote de varios QR de una vez** (genera las imágenes PNG + una hoja
PDF lista para imprimir, en cuadrícula de 3x4 por página, cada QR con su
ID debajo para recortar y pegar):

```bash
python qr_generator.py batch --count 50
```

**Lote sin la hoja PDF (solo los PNG):**

```bash
python qr_generator.py batch --count 50 --no-pdf
```

## Qué genera

- `output/` — un archivo `.png` por cada QR, nombrado igual que su ID
  (ej. `CAJA-00001.png`), y `hoja_qr_para_imprimir.pdf` cuando se usa el
  modo `batch`. **No se versiona en git** (ver `.gitignore` en la raíz del
  proyecto) porque son artefactos generados.
- `registro_cajas.csv` — el registro de todos los IDs generados, con las
  columnas `id, fecha_generado, contenido, foto_url`. Las columnas
  `contenido` y `foto_url` quedan vacías a propósito: están pensadas para
  llenarse después desde la app, y este mismo archivo se puede importar
  tal cual a la tabla `cajas` de la base de datos. Tampoco se versiona en
  git por defecto (contiene datos reales de inventario que van cambiando).

El script nunca repite un ID: cada vez que corre, revisa el registro y
sigue el consecutivo desde el número más alto que encuentre (ignorando
IDs personalizados que no sigan el formato `CAJA-#####`).

## Cómo encaja en el proyecto

Este es el primer módulo de `tksolutions_demo_QRInventory`. Los próximos
módulos previstos:

- `database/` (o el backend que se elija: Supabase/Firebase) — tabla
  `cajas` con los mismos campos de `registro_cajas.csv`.
- `app/` (o `web/`) — pantalla de escaneo (lector QR vía cámara) +
  pantalla de detalle/edición de caja (ver y editar contenido, subir foto).
