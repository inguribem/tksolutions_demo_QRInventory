#!/usr/bin/env python3
"""
qr_generator.py
----------------
Modulo para generar codigos QR que identifican cajas.

Cada QR contiene UNICAMENTE el ID unico de la caja (ej: "CAJA-00001").
Ese ID es la llave que despues usara la app para buscar el contenido
y la foto de la caja en la base de datos.

Este script tambien lleva un registro local (registro_cajas.csv) con
todos los IDs generados. Ese archivo esta pensado para poder importarse
directamente a la base de datos mas adelante (ya trae las columnas
"contenido" y "foto_url" vacias, listas para llenarse desde la app).

Uso:
    Generar un solo QR (ID automatico):
        python qr_generator.py single

    Generar un solo QR con un ID que tu elijas:
        python qr_generator.py single --id CAJA-BODEGA-01

    Generar un lote de QR (ej. 50 de una vez) + hoja PDF para imprimir:
        python qr_generator.py batch --count 50

    Generar un lote sin el PDF (solo las imagenes PNG):
        python qr_generator.py batch --count 50 --no-pdf
"""

import argparse
import csv
import datetime
import os
import re
import sys

import qrcode
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

# ---------------------------------------------------------------------------
# Configuracion
# ---------------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
REGISTRO_PATH = os.path.join(BASE_DIR, "registro_cajas.csv")

PREFIJO_ID = "CAJA-"
DIGITOS_ID = 5  # CAJA-00001, CAJA-00002, ...

CAMPOS_REGISTRO = ["id", "fecha_generado", "contenido", "foto_url"]


# ---------------------------------------------------------------------------
# Registro (consecutivo de IDs) - esto luego se puede migrar tal cual a la
# tabla "cajas" de la base de datos.
# ---------------------------------------------------------------------------

def asegurar_registro():
    """Crea el archivo de registro con encabezados si todavia no existe."""
    if not os.path.exists(REGISTRO_PATH):
        with open(REGISTRO_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=CAMPOS_REGISTRO)
            writer.writeheader()


def leer_ids_existentes():
    """Devuelve el set de todos los IDs que ya estan en el registro."""
    asegurar_registro()
    ids = set()
    with open(REGISTRO_PATH, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for fila in reader:
            ids.add(fila["id"])
    return ids


def siguiente_id_automatico():
    """
    Calcula el siguiente ID consecutivo con formato CAJA-00001, revisando
    el numero mas alto que ya exista en el registro (solo entre los IDs
    que siguen el formato automatico, para no chocar con IDs personalizados).
    """
    ids_existentes = leer_ids_existentes()
    patron = re.compile(rf"^{re.escape(PREFIJO_ID)}(\d{{{DIGITOS_ID}}})$")

    mayor = 0
    for id_existente in ids_existentes:
        match = patron.match(id_existente)
        if match:
            numero = int(match.group(1))
            mayor = max(mayor, numero)

    siguiente = mayor + 1
    return f"{PREFIJO_ID}{siguiente:0{DIGITOS_ID}d}"


def registrar_id(id_caja):
    """Agrega una fila nueva al registro para el ID dado."""
    asegurar_registro()
    with open(REGISTRO_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CAMPOS_REGISTRO)
        writer.writerow({
            "id": id_caja,
            "fecha_generado": datetime.date.today().isoformat(),
            "contenido": "",
            "foto_url": "",
        })


# ---------------------------------------------------------------------------
# Generacion de imagenes QR
# ---------------------------------------------------------------------------

def crear_imagen_qr(id_caja, carpeta_salida=OUTPUT_DIR):
    """Genera el PNG del QR para un ID de caja y devuelve la ruta del archivo."""
    os.makedirs(carpeta_salida, exist_ok=True)

    qr = qrcode.QRCode(
        version=None,  # ajusta el tamano automaticamente
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(id_caja)
    qr.make(fit=True)

    imagen = qr.make_image(fill_color="black", back_color="white")

    ruta = os.path.join(carpeta_salida, f"{id_caja}.png")
    imagen.save(ruta)
    return ruta


# ---------------------------------------------------------------------------
# Modo individual
# ---------------------------------------------------------------------------

def generar_individual(id_personalizado=None):
    ids_existentes = leer_ids_existentes()

    if id_personalizado:
        id_caja = id_personalizado.strip()
        if id_caja in ids_existentes:
            print(f"Error: el ID '{id_caja}' ya existe en el registro. Elige otro.")
            sys.exit(1)
    else:
        id_caja = siguiente_id_automatico()

    ruta = crear_imagen_qr(id_caja)
    registrar_id(id_caja)

    print(f"QR generado para '{id_caja}'")
    print(f"Imagen: {ruta}")
    print(f"Registrado en: {REGISTRO_PATH}")
    return id_caja, ruta


# ---------------------------------------------------------------------------
# Modo lote + hoja PDF para imprimir
# ---------------------------------------------------------------------------

def generar_lote(cantidad, generar_pdf=True, carpeta_salida=OUTPUT_DIR):
    ids_generados = []
    rutas_generadas = []

    for _ in range(cantidad):
        id_caja = siguiente_id_automatico()
        ruta = crear_imagen_qr(id_caja, carpeta_salida)
        registrar_id(id_caja)
        ids_generados.append(id_caja)
        rutas_generadas.append(ruta)
        # nota: siguiente_id_automatico() vuelve a leer el registro cada vez,
        # por eso ya toma en cuenta el que se acaba de registrar.

    print(f"Se generaron {cantidad} codigos QR nuevos:")
    for id_caja in ids_generados:
        print(f"  - {id_caja}")

    if generar_pdf:
        ruta_pdf = crear_hoja_pdf(rutas_generadas, ids_generados, carpeta_salida)
        print(f"Hoja para imprimir: {ruta_pdf}")

    print(f"Registrado en: {REGISTRO_PATH}")
    return ids_generados


def crear_hoja_pdf(rutas_imagenes, ids, carpeta_salida=OUTPUT_DIR):
    """
    Arma un PDF tamano carta con los QR en una cuadricula (3 columnas x 4 filas
    por hoja), cada uno con su ID debajo en texto, listo para imprimir y
    recortar/pegar en las cajas.
    """
    ruta_pdf = os.path.join(carpeta_salida, "hoja_qr_para_imprimir.pdf")

    ancho_pagina, alto_pagina = letter
    c = canvas.Canvas(ruta_pdf, pagesize=letter)

    columnas = 3
    filas = 4
    margen = 1.5 * cm
    celda_ancho = (ancho_pagina - 2 * margen) / columnas
    celda_alto = (alto_pagina - 2 * margen) / filas
    tam_qr = min(celda_ancho, celda_alto) * 0.65

    for i, (ruta_img, id_caja) in enumerate(zip(rutas_imagenes, ids)):
        pos_en_pagina = i % (columnas * filas)

        if i > 0 and pos_en_pagina == 0:
            c.showPage()

        col = pos_en_pagina % columnas
        fila = pos_en_pagina // columnas

        x = margen + col * celda_ancho + (celda_ancho - tam_qr) / 2
        y = alto_pagina - margen - (fila + 1) * celda_alto + (celda_alto - tam_qr) / 2

        c.drawImage(ruta_img, x, y + 0.4 * cm, width=tam_qr, height=tam_qr)
        c.setFont("Helvetica", 9)
        c.drawCentredString(x + tam_qr / 2, y + 0.15 * cm, id_caja)

    c.save()
    return ruta_pdf


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Genera codigos QR para identificar cajas."
    )
    subparsers = parser.add_subparsers(dest="modo", required=True)

    parser_single = subparsers.add_parser("single", help="Generar un solo QR")
    parser_single.add_argument(
        "--id", dest="id_personalizado", default=None,
        help="ID personalizado para la caja (si no se indica, se genera uno automatico)"
    )

    parser_batch = subparsers.add_parser("batch", help="Generar varios QR de una vez")
    parser_batch.add_argument(
        "--count", dest="cantidad", type=int, required=True,
        help="Cantidad de codigos QR a generar"
    )
    parser_batch.add_argument(
        "--no-pdf", dest="sin_pdf", action="store_true",
        help="No generar la hoja PDF para imprimir, solo los PNG"
    )

    args = parser.parse_args()

    if args.modo == "single":
        generar_individual(args.id_personalizado)
    elif args.modo == "batch":
        if args.cantidad <= 0:
            print("Error: --count debe ser mayor a 0")
            sys.exit(1)
        generar_lote(args.cantidad, generar_pdf=not args.sin_pdf)


if __name__ == "__main__":
    main()
