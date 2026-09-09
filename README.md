# Cancha AR · object-placing

Traza una cancha de vóley en tu patio desde Safari en iPhone/iPad. Reemplaza la antigua alfombra en el mismo repositorio y sitio publicado.

## Uso

1. Elige largo entre **6 y 18 m** (ancho proporcional 2:1), altura de red masculina **2,43 m** o femenina **2,24 m**, y si quieres ver la red.
2. Pulsa **Preparar cancha en AR**, luego **Abrir cancha en mi patio**.
3. Reconoce el suelo, mueve y gira la cancha para alinearla. La escala queda bloqueada mediante `#allowsContentScaling=0`.
4. Marca el centro de las cuatro cruces de esquina y las dos cruces de postes. Comprueba lados y ambas diagonales con cinta.

En escritorio/Android se ofrece la vista superior y descarga USDZ; no se ofrece AR en esos dispositivos. AR puede derivar durante un recorrido largo: no sustituye un levantamiento, no reconoce estacas y no conserva anclajes entre sesiones. La precisión física debe comprobarse en un iPhone/iPad en el patio.

## Medidas

Basadas en [FIVB 2025–2028](https://www.fivb.com/volleyball/the-game/official-volleyball-rules/), voleibol de sala (no beach volley):

- Rectángulo de juego **18 × 9 m**, medido por los bordes exteriores; perímetro de 5 cm situado dentro del rectángulo.
- Línea central en el eje de la red. Borde posterior de ataque a **3 m** del eje central a escala oficial.
- Cruces centradas en las esquinas exteriores; altura geométrica de marcas de hasta 25 mm para legibilidad sobre el suelo detectado.
- Postes a **1 m fuera de los laterales**, separación de ejes de 11 m a tamaño oficial. Postes guía de 2,55 m de alto.
- Red ilustrativa de 1 m de alto y ancho de cancha + 1 m. Borde superior a 2,43/2,24 m. La malla ilustra ubicación, no es un modelo de fabricación.
- Al reducir, se escalan largo, ancho y distancia de ataque. Se conservan ancho de línea, altura de red y retiro de postes. La cancha reducida se identifica como recreativa.
- Zona libre mínima de 3 m alrededor; para competiciones mundiales/oficiales FIVB, 5 m laterales y 6,5 m al fondo. La zona libre se explica en la página y **no forma parte del modelo**.

## Desarrollo y verificación

Sitio estático, sin frameworks, dependencias ni build. `js/court.mjs` crea geometría y un USDZ en el navegador; se genera un archivo independiente para cualquier medida seleccionada. ZIP sin compresión con CRC32 y datos alineados a 64 bytes; escena USDA en metros, Y hacia arriba. No se envían imágenes ni medidas a un servidor.

```sh
python3 -m http.server 8080
node --test tools/court.test.mjs
node tools/generate.mjs
usdchecker --arkit models/cancha-18x9.usdz
```

`models/cancha-18x9.usdz` es un modelo estándar de referencia. El botón crea el modelo actual como Blob y requiere un segundo toque para abrir Quick Look. Cambiar cualquier control invalida el modelo preparado para evitar colocar medidas anteriores.

Publicación existente verificada en GitHub Pages: https://romito22.github.io/object-placing/ . Sirve la raíz sin build. `_headers` también conserva compatibilidad con Cloudflare Pages para el MIME USDZ. Las fuentes Barlow Condensed y DM Sans se cargan desde Google Fonts.
