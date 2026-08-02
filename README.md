# object-placing

Ver una alfombra de **14 × 12 ft** en tu piso con realidad aumentada, desde el iPhone.

## Cómo funciona la escala

No se calibra ni se adivina nada. La cadena de escala real es:

| Eslabón | Regla |
|---|---|
| USD/USDZ | El spec define `metersPerUnit`. Aquí vale `1` → 1 unidad = 1 metro |
| Geometría | Malla construida en `4.2672 × 3.6576 m` = 14 × 12 ft exactos (1 ft = 0.3048 m) |
| ARKit | VIO (cámara + IMU) ya conoce las distancias reales de tu sala, con ~1–2% de error |
| Quick Look | `#allowsContentScaling=0` bloquea el pellizco, nadie puede reescalar y romper la medida |

Verificación: `usdchecker --arkit` pasa, y el bounding box del USDZ mide
`4.2672 × 3.6576 × 0.006 m`, apoyado en `y = 0`.

## El modelo

- Losa rectangular, esquinas vivas, **6 mm** de grosor. No es un plano de espesor
  cero: eso hace z-fighting contra el piso detectado y se ve como calcomanía.
- Sin pelo. Tejido plano (*plain weave*) generado por procedimiento en color
  maíz `#FBEC5D`, tile de 20 cm con hilos de 2 mm, así el tejido conserva
  escala física al repetirse.
- 615 KB, textura JPEG embebida.

## Regenerar

```bash
python3 tools/make_rug.py
```

Requiere `numpy`, `Pillow` y las herramientas USD de macOS (`usdzip`, que viene
con las Command Line Tools). Salida en `models/` y `assets/`.

Para cambiar la medida o el color, edita las constantes al inicio de
[`tools/make_rug.py`](tools/make_rug.py):

```python
LARGO_FT = 14.0
ANCHO_FT = 12.0
CORN_SRGB = (251, 236, 93)
```

## Deploy

Cloudflare Pages conectado a este repo. Sin build — es sitio estático.
El archivo `_headers` sirve el USDZ con `model/vnd.usdz+zip`.

> AR Quick Look solo corre en Safari/iOS. En escritorio la página lo detecta
> con `relList.supports('ar')` y muestra la URL para abrirla en el celular.
