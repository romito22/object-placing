#!/usr/bin/env python3
"""
Genera la alfombra en USDZ para AR Quick Look (iOS).

Todo se construye en METROS, que es la unidad nativa de USD/ARKit.
14 ft x 12 ft -> 4.2672 m x 3.6576 m exactos.

Salida:
  build/corn_weave.jpg   textura de tejido, tileable, color maiz
  build/rug.usda         geometria + material
  models/alfombra-maiz-14x12.usdz
  assets/poster.png      preview para el <a rel="ar">
"""

import math
import os
import shutil
import subprocess
import zipfile

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------- medidas ---

FT = 0.3048  # metros por pie, exacto por definicion

LARGO_FT = 14.0
ANCHO_FT = 12.0
GROSOR_M = 0.006  # 6 mm: alfombra plana sin pelo, pero con cuerpo real

LARGO_M = LARGO_FT * FT  # 4.2672
ANCHO_M = ANCHO_FT * FT  # 3.6576

# La textura representa un cuadro fisico de 20 cm, asi el tejido conserva
# escala real cuando se repite sobre toda la superficie.
TILE_M = 0.20
TEX_PX = 1024
HILO_MM = 2.0

REPEAT_U = LARGO_M / TILE_M
REPEAT_V = ANCHO_M / TILE_M

# ----------------------------------------------------------------- colores ---

CORN_SRGB = (251, 236, 93)  # #FBEC5D


def srgb_a_lineal(c8):
    """USD espera diffuseColor en espacio lineal, no sRGB."""
    c = c8 / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


# ----------------------------------------------------------------- textura ---


def generar_textura(ruta):
    """Tejido plano (plain weave): urdimbre y trama alternando encima/debajo."""
    px_por_hilo = int(round(TEX_PX / (TILE_M * 1000.0 / HILO_MM)))
    n_hilos = TEX_PX // px_por_hilo
    lado = n_hilos * px_por_hilo  # multiplo exacto -> el tile calza sin costura

    ii, jj = np.meshgrid(np.arange(lado), np.arange(lado), indexing="ij")
    hilo_x = ii // px_por_hilo
    hilo_y = jj // px_por_hilo

    # posicion 0..1 dentro del hilo, para darle volumen cilindrico
    t_x = (ii % px_por_hilo + 0.5) / px_por_hilo
    t_y = (jj % px_por_hilo + 0.5) / px_por_hilo

    # en un plain weave la urdimbre queda arriba cuando (fila+columna) es par
    urdimbre_arriba = (hilo_x + hilo_y) % 2 == 0

    # sombreado transversal: el centro del hilo recibe mas luz que los bordes
    def bombeo(t):
        return 1.0 - 0.38 * (2.0 * t - 1.0) ** 2

    brillo = np.where(urdimbre_arriba, bombeo(t_x), bombeo(t_y))

    # el hilo que pasa por debajo se oscurece: es oclusion del tejido
    brillo = np.where(urdimbre_arriba, brillo, brillo * 0.80)

    # variacion hilo a hilo, para que no se vea como patron de computadora
    rng = np.random.default_rng(1412)
    var_hilo = rng.normal(1.0, 0.035, size=(n_hilos, n_hilos))
    brillo *= np.repeat(np.repeat(var_hilo, px_por_hilo, 0), px_por_hilo, 1)

    # ruido fino de fibra: bajo a proposito, el ruido por pixel produce
    # centelleo al alejarse y ademas infla el archivo
    brillo *= rng.normal(1.0, 0.012, size=brillo.shape)
    brillo = np.clip(brillo, 0.35, 1.25)

    base = np.array(CORN_SRGB, dtype=np.float32)
    rgb = np.clip(brillo[..., None] * base, 0, 255).astype(np.uint8)

    img = Image.fromarray(rgb, "RGB")
    if lado != TEX_PX:
        img = img.resize((TEX_PX, TEX_PX), Image.LANCZOS)
    # JPEG en vez de PNG: el tejido no necesita alfa y el usdz baja ~10x,
    # que importa cuando el celular lo descarga con datos moviles
    img.save(ruta, "JPEG", quality=92, optimize=True, subsampling=0)
    return img


# ---------------------------------------------------------------- geometria ---


def construir_caja():
    """
    Losa rectangular centrada en X/Z, apoyada en y=0.

    Se modela con grosor real en vez de un plano de espesor cero: un plano
    pegado al piso hace z-fighting con la malla del piso detectado por ARKit
    y se ve como calcomania. 6 mm bastan para que lea como objeto.
    """
    x = LARGO_M / 2.0
    z = ANCHO_M / 2.0
    h = GROSOR_M

    ru, rv = REPEAT_U, REPEAT_V
    rh = h / TILE_M  # el canto usa la misma escala de tejido

    caras = [
        # (4 vertices, 4 uv, normal)
        ([(-x, h, z), (x, h, z), (x, h, -z), (-x, h, -z)],
         [(0, 0), (ru, 0), (ru, rv), (0, rv)], (0, 1, 0)),          # arriba
        ([(-x, 0, -z), (x, 0, -z), (x, 0, z), (-x, 0, z)],
         [(0, 0), (ru, 0), (ru, rv), (0, rv)], (0, -1, 0)),         # abajo
        ([(-x, 0, z), (x, 0, z), (x, h, z), (-x, h, z)],
         [(0, 0), (ru, 0), (ru, rh), (0, rh)], (0, 0, 1)),          # canto +Z
        ([(x, 0, -z), (-x, 0, -z), (-x, h, -z), (x, h, -z)],
         [(0, 0), (ru, 0), (ru, rh), (0, rh)], (0, 0, -1)),         # canto -Z
        ([(x, 0, z), (x, 0, -z), (x, h, -z), (x, h, z)],
         [(0, 0), (rv, 0), (rv, rh), (0, rh)], (1, 0, 0)),          # canto +X
        ([(-x, 0, -z), (-x, 0, z), (-x, h, z), (-x, h, -z)],
         [(0, 0), (rv, 0), (rv, rh), (0, rh)], (-1, 0, 0)),         # canto -X
    ]

    puntos, uvs, normales = [], [], []
    for verts, uv, n in caras:
        puntos.extend(verts)
        uvs.extend(uv)
        normales.extend([n] * 4)

    return puntos, uvs, normales


def fmt_v3(v):
    return "(%.6f, %.6f, %.6f)" % v


def fmt_v2(v):
    return "(%.6f, %.6f)" % v


def generar_usda(ruta, textura):
    puntos, uvs, normales = construir_caja()
    r, g, b = (srgb_a_lineal(c) for c in CORN_SRGB)
    n_caras = len(puntos) // 4

    extent = "[(%.6f, 0, %.6f), (%.6f, %.6f, %.6f)]" % (
        -LARGO_M / 2, -ANCHO_M / 2, LARGO_M / 2, GROSOR_M, ANCHO_M / 2)

    usda = f'''#usda 1.0
(
    defaultPrim = "Alfombra"
    metersPerUnit = 1
    upAxis = "Y"
    doc = "Alfombra tejida {LARGO_FT:g} x {ANCHO_FT:g} ft ({LARGO_M:.4f} x {ANCHO_M:.4f} m) - color maiz"
)

def Xform "Alfombra" (
    kind = "component"
)
{{
    def Mesh "Malla" (
        prepend apiSchemas = ["MaterialBindingAPI"]
    )
    {{
        float3[] extent = {extent}
        int[] faceVertexCounts = [{", ".join(["4"] * n_caras)}]
        int[] faceVertexIndices = [{", ".join(str(i) for i in range(len(puntos)))}]
        point3f[] points = [{", ".join(fmt_v3(p) for p in puntos)}]
        normal3f[] normals = [{", ".join(fmt_v3(n) for n in normales)}] (
            interpolation = "faceVarying"
        )
        texCoord2f[] primvars:st = [{", ".join(fmt_v2(t) for t in uvs)}] (
            interpolation = "faceVarying"
        )
        uniform token subdivisionScheme = "none"
        rel material:binding = </Alfombra/Tejido>
    }}

    def Material "Tejido"
    {{
        token outputs:surface.connect = </Alfombra/Tejido/Superficie.outputs:surface>

        def Shader "Superficie"
        {{
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor.connect = </Alfombra/Tejido/Difuso.outputs:rgb>
            color3f inputs:emissiveColor = (0, 0, 0)
            float inputs:metallic = 0
            float inputs:roughness = 0.88
            float inputs:opacity = 1
            normal3f inputs:normal = (0, 0, 1)
            token outputs:surface
        }}

        def Shader "LectorST"
        {{
            uniform token info:id = "UsdPrimvarReader_float2"
            string inputs:varname = "st"
            float2 inputs:fallback = (0, 0)
            float2 outputs:result
        }}

        def Shader "Difuso"
        {{
            uniform token info:id = "UsdUVTexture"
            asset inputs:file = @{textura}@
            float2 inputs:st.connect = </Alfombra/Tejido/LectorST.outputs:result>
            token inputs:wrapS = "repeat"
            token inputs:wrapT = "repeat"
            float4 inputs:fallback = ({r:.6f}, {g:.6f}, {b:.6f}, 1)
            token inputs:sourceColorSpace = "sRGB"
            float3 outputs:rgb
        }}
    }}
}}
'''
    with open(ruta, "w") as f:
        f.write(usda)


# ------------------------------------------------------------------ poster ---


def generar_poster(ruta, textura):
    w, h = 1200, 900
    img = Image.new("RGB", (w, h), (28, 28, 30))

    # la alfombra en perspectiva simple, conservando la proporcion 14:12
    rw, rh = 760, int(760 * ANCHO_M / LARGO_M * 0.55)
    swatch = textura.resize((rw, rh), Image.LANCZOS)
    img.paste(swatch, ((w - rw) // 2, (h - rh) // 2 - 20))

    d = ImageDraw.Draw(img)
    d.rectangle([(w - rw) // 2, (h - rh) // 2 - 20,
                 (w + rw) // 2 - 1, (h + rh) // 2 - 21],
                outline=(140, 128, 60), width=2)

    def fuente(tam):
        for ruta_f in ("/System/Library/Fonts/SFNS.ttf",
                       "/System/Library/Fonts/Helvetica.ttc"):
            if os.path.exists(ruta_f):
                try:
                    return ImageFont.truetype(ruta_f, tam)
                except OSError:
                    continue
        return ImageFont.load_default()

    titulo = "Alfombra maíz · 14 × 12 ft"
    sub = "4.2672 × 3.6576 m · toca para ver en tu espacio"
    f1, f2 = fuente(52), fuente(30)
    d.text((w / 2, h - 120), titulo, font=f1, fill=(245, 240, 220), anchor="mm")
    d.text((w / 2, h - 62), sub, font=f2, fill=(150, 148, 140), anchor="mm")

    img.save(ruta, "PNG", optimize=True)


# -------------------------------------------------------------------- main ---


def main():
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    build = os.path.join(raiz, "build")
    models = os.path.join(raiz, "models")
    assets = os.path.join(raiz, "assets")
    for d in (build, models, assets):
        os.makedirs(d, exist_ok=True)

    tex_png = os.path.join(build, "corn_weave.jpg")
    usda = os.path.join(build, "rug.usda")
    usdz = os.path.join(models, "alfombra-maiz-14x12.usdz")

    print("generando textura de tejido...")
    tex = generar_textura(tex_png)

    print("generando geometria %.4f x %.4f x %.3f m..." % (LARGO_M, ANCHO_M, GROSOR_M))
    generar_usda(usda, "corn_weave.jpg")

    print("empaquetando usdz...")
    if os.path.exists(usdz):
        os.remove(usdz)
    # --arkitAsset camina las dependencias (mete la textura), aplana la
    # composicion y adapta los datos a lo que RealityKit espera.
    subprocess.run(["usdzip", usdz, "--arkitAsset", "rug.usda"],
                   cwd=build, check=True)

    print("generando poster...")
    generar_poster(os.path.join(assets, "poster.png"), tex)

    kb = os.path.getsize(usdz) / 1024.0
    print("\nlisto -> %s (%.1f KB)" % (os.path.relpath(usdz, raiz), kb))


if __name__ == "__main__":
    main()
