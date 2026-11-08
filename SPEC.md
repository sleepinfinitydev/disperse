# Especificacións de Deseño e Funcionalidade — DISPERSE

## 1. Visión Xeral
**DISPERSE** é unha aplicación web de páxina única (**SPA**) para a creación e edición de **diagramas como código** (*Diagrams as Code*), inspirada en **Niolesk** e empregando a API pública de **Kroki** (`https://kroki.io`) como motor de renderizado.

### Principios clave
- **Tecnoloxía**: HTML5, CSS3 e JavaScript Vanilla (ES6+), sen frameworks de UI, apoiándose unicamente en librerías específicas para edición de código, zoom/pan, iconografía e compresión. Todo o código e comentarios técnicos están escritos en **inglés**.
- **Interface sen texto (*Zero-Text / Icon-First UI*) e Idioma Esperanto (`lang="eo"`)**: Na interface non existirá máis texto estático ca o título `DISPERSE` e os créditos do pé (xunto cos valores técnicos inevitables dos despregables de motor/formato e as URLs/código xerados). Todas as accións e controis represéntanse mediante **iconas vectoriais (SVG)**, e calquera texto da páxina (créditos, etiquetas `aria-label`, textos de enlaces exportados ou avisos de interface) está en **Esperanto**.
- **Estado na URL**: Calquera diagrama poderá compartirse mediante unha URL que inclúe o código comprimido e codificado no formato estándar de Kroki.

---

## 2. Sistema de Cores (Esquema Tetrádico en CSS `oklch`)

### 2.1. Cor Base e Selector
- **Cor preferida por defecto**: `rgb(0, 128, 192)` (`#0080c0`).
- **Control**: Un botón circular na cabeceira mostra a cor preferida actual e, ao pulsalo, abre o selector de cor nativo do sistema (`<input type="color">`).
- **Persistencia**: A cor escollida e o modo (claro/escuro) gardaranse en `localStorage`.

### 2.2. Harmonia Tetrádica (Dobre Complementaria a 30°)
A partir da cor preferida elixida polo usuario, extráense ou calcúlanse os seus compoñentes no espazo **OKLCH** (`L` luminosidade, `C` croma, `H` ángulo de ton en graos) para definir 4 tons harmónicos:

| Rol | Ángulo de Ton ($H$) | Descrición |
| :--- | :--- | :--- |
| **Primaria ($P$)** | $H_P = H_{\text{base}}$ | Cor de marca (`DISPERSE`), accións principais, foco e acentos activos. |
| **Secundaria ($S$)** | $H_S = (H_P + 30^\circ) \bmod 360^\circ$ | Elementos de apoio, controis secundarios, resaltes suaves. |
| **Terciaria ($T$)** | $H_T = (H_P + 180^\circ) \bmod 360^\circ$ | Contraste complementario da primaria (indicadores, badges, estados alternativos). |
| **Cuaternaria ($Q$)** | $H_Q = (H_S + 180^\circ) \bmod 360^\circ = (H_P + 210^\circ) \bmod 360^\circ$ | Contraste complementario da secundaria (alertas, detalles de sintaxe, acentos de apoio). |

### 2.3. Adaptación a Modo Claro e Modo Escuro
O sistema xerará variables CSS dinámicas (`--color-primary`, `--color-secondary`, `--color-tertiary`, `--color-quaternary` e as súas variantes de superficie, bordo e texto) axustando $L$ e $C$ segundo o tema activo:

- **Modo Claro (`[data-theme="light"]`)**:
  - Fondos principais: Luminosidade alta ($L \approx 0.96 - 0.99$) e croma moi baixo ($C \approx 0.01 - 0.02$) tinguido sutilmente con $H_P$ / $H_S$.
  - Cores de acento ($P, S, T, Q$): Luminosidade media-baixa ($L \approx 0.48 - 0.58$) e croma vivo ($C \approx 0.14 - 0.18$) para garantir contraste sobre fondo claro.
  - Texto principal: $L \approx 0.20$, $C \approx 0.02$, $H = H_P$.
- **Modo Escuro (`[data-theme="dark"]`)**:
  - Fondos principais: Luminosidade baixa ($L \approx 0.15 - 0.22$) e croma baixo ($C \approx 0.02 - 0.03$) tinguido con $H_P$ / $H_S$.
  - Cores de acento ($P, S, T, Q$): Luminosidade media-alta ($L \approx 0.68 - 0.78$) e croma equilibrado ($C \approx 0.14 - 0.18$) para destacar sobre fondo escuro.
  - Texto principal: $L \approx 0.92$, $C \approx 0.02$, $H = H_P$.
  - **Adaptación de diagramas no visualizador**: Aplícase `filter: invert(0.92) hue-rotate(180deg)` aos diagramas SVG/PNG renderizados en modo escuro para que as liñas, frechas e textos negros con fondo transparente se mostren claros e lexibles conservando o ton orixinal das figuras coloreadas.

---

## 3. Estrutura da Interface (Layout)

A aplicación ocupa o `100vw x 100dvh` (`100vh` como fallback) sen desprazamento global (`overflow: hidden`), estruturada en 3 franxas horizontais e **adaptable a calquera tamaño de pantalla (Responsive Design)**:

```
+-----------------------------------------------------------------------+
| DISPERSE       [Motor v] [Formato v] (↻)                 (☀/☾)  (●)   |  <- Cabeceira
+---------------------------+-------------------------------------------+
|                           |                                           |
|                           |                                           |
|      EDITOR DE CÓDIGO     |         VISUALIZADOR (SVG / PNG)          |
|         (~38.2%)          |                 (~61.8%)                  |  <- Área Central
|                           |                                    [+][-] |
|                           |                                           |
+---------------------------+-------------------------------------------+
| [🖼] [🔗] [M↓] [</>]  https://kroki.io/...                        [📋] |  <- Pé de publicación
| [✏️] [🔗] [M↓] [</>]  https://.../disperse/#...                   [📋] |
+-----------------------------------------------------------------------+
```

### 3.1. Barra Superior (Cabeceira)
1. **Esquerda**:
   - Enlace de marca (`#brand-link`) composto pola icona `favicon.svg`, o título **`DISPERSE`** en maiúsculas (`text-transform: uppercase`) con cor primaria (`--color-primary`) e unha icona de elo de cadea (`link`). Mantén sempre o `href` sincronizado coa URL completa da páxina actual (`window.location.href` co estado do diagrama) e, ao facer clic nel, non recarga nin reinicia o editor, senón que copia automaticamente a URL actual ao portapapeis mostrando confirmación visual (`✓`).
2. **Centro (Controis do Diagrama)**:
   - **Despregable de motor Kroki**: Lista con todos os motores soportados por Kroki. Cambiar de motor actualiza:
     - O endpoint de renderizado en Kroki.
     - O modo de resaltado de sintaxe e formateo do editor.
     - O **estado do código propio dese motor**: a aplicación mantén o código de xeito independente para cada linguaxe (`codeByEngine`), iniciándose coa plantilla de exemplo de cada motor e conservando o que o usuario escriba en cada un ao alternar entre motores.
   - **Despregable de formato de saída**: `svg` (por defecto) e `png`.
   - **Botón de Refrescar**: Botón con icona de actualización (`↻`) para forzar o renderizado da vista previa.
     - **Atallo de teclado**: `Ctrl + R` (ou `Cmd + R`), interceptando o evento (`e.preventDefault()`) para actualizar o diagrama sen recargar o navegador.
3. **Dereita (Preferencias Visuais)**:
   - **Botón Modo Claro / Escuro**: Botón redondo con icona de sol/lúa.
   - **Botón Cor Preferida**: Botón redondo **do mesmo diámetro** ca o botón de modo claro/escuro, recheo coa cor preferida actual (`rgb(0, 128, 192)` por defecto). Ao premer nel ábrese o selector nativo `<input type="color">`.

### 3.2. Área Central (Editor + Vista Previa)
- Ocupa todo o espazo vertical dispoñible entre a cabeceira e o pé (`flex: 1`).
- **Proporción Áurea por defecto ($\varphi \approx 1.618$)**:
  - **Panel Esquerdo (Editor)**: $38.2\%$ do ancho total ($1 - 1/\varphi$).
  - **Panel Dereito (Vista Previa)**: $61.8\%$ do ancho total ($1/\varphi$).
- **Separador Axustable (Splitter)**:
  - Barra vertical arrastrable mediante rato/táctil (`pointerdown` / `pointermove` con `setPointerCapture`) para redimensionar ambos paneis libremente (con límites mínimos `15%` - `85%`).
  - **Atracción magnética (*Magnetic Snap*)**: Cando ao arrastrar o separador se achega á proporción áurea predeterminada ($38.2\% \pm 1.6\%$), encaixa suavemente nese valor e resáltase visualmente coa cor complementaria (`--color-tertiary`).
  - Dobre clic no separador restaura tamén a proporción áurea ($38.2\% / 61.8\%$).

#### Panel Esquerdo: Editor de Texto Enriquecido
- Numeración de liñas, resaltado de sintaxe adaptado á linguaxe do diagrama, peche automático de chaves/comiñas, indentación con `Tab` e pregado de código.
- Tema do editor sincronizado co sistema de cores `oklch` e co modo claro/escuro.
- Actualización da vista previa con *debounce* (ex. `500ms` tras deixar de escribir) ademais da actualización manual con `Ctrl + R` ou o botón de refrescar.

#### Panel Dereito: Visualizador de Diagramas (SVG / PNG)
- Soporte completo de **Zoom** (roda do rato, xesto *pinch*, botóns `+` / `-`) e **Pan** (arrastrar co rato no lenzo).
- Funciona de forma homoxénea tanto cando a saída é **SVG** como cando é **PNG**.
- Barra flotante de accións (só iconas):
  - Zoom In (`+`)
  - Zoom Out (`-`)
  - Axustar/Centrar na vista (*Fit / Reset*)
  - Descargar ficheiro (`.svg` ou `.png`)
- Indicador visual (spinner sen texto) durante a carga.
- **Xestión explícita de erros de renderizado**: En caso de erro de sintaxe devolto por Kroki (ex. `HTTP 400`) ou código baleiro, nunca falla silenciosamente; límpase o diagrama anterior e amósase unha tarxeta de alerta superposta e centrada (`#viewer-error`). O marco e a icona de erro aparecen sempre en **vermello** (`--color-error`, invariable respecto á cor preferida escollida), mentres que o texto interior co detalle do erro (`<pre>`) segue o esquema de cores activo e conta con desprazamento propio.

### 3.3. Parte Inferior (Fragmentos de Publicación e Compartición)
Panel compacto orientado a obter enlaces e fragmentos listos para publicar:
1. **Tipos de destino** (seleccionables ou en dúas filas identificadas por iconas):
   - **Imaxe (icona de imaxe)**: Apunta directamente á API pública de Kroki:
     `https://kroki.io/{motor}/{formato}/{codigo_comprimido}`
   - **Editor (icona de lapis/código)**: Apunta a esta mesma aplicación Disperse co estado na URL:
     `{ orixe_actual }/#{motor}/{formato}/{codigo_comprimido}`
2. **Formatos de saída do snippet** (seleccionables mediante iconas):
   - **URL directa** (icona de cadea/enlace):
     - Imaxe: `https://kroki.io/mermaid/svg/eNpL...`
     - Editor: `https://.../disperse/#mermaid/svg/eNpL...`
   - **Markdown** (icona `M↓`):
     - Imaxe: `![](https://kroki.io/mermaid/svg/eNpL...)`
     - Editor (imaxe + enlace de edición en Esperanto a continuación): `![](https://kroki.io/mermaid/svg/eNpL...) [Redakti en Disperse](https://.../disperse/#mermaid/svg/eNpL...)`
   - **HTML** (icona `</>`):
     - Imaxe: `<img src="https://kroki.io/mermaid/svg/eNpL..." />`
     - Editor (imaxe + enlace de edición en Esperanto a continuación): `<img src="https://kroki.io/mermaid/svg/eNpL..." /> <a href="https://.../disperse/#mermaid/svg/eNpL...">Redakti en Disperse</a>`
3. **Acción de copiado**:
   - Botón con icona de portapapeis ao carón de cada fragmento (ou copia ao facer clic) con feedback visual (cambio temporal a icona de validación `✓`).
4. **Créditos no pé da páxina**:
   - Liña final centrada en Esperanto: `Farita kun ❤️ en Betanzos. https://sleepinfinity.dev`.

### 3.4. Deseño Adaptable (Responsive Design)

A interface adaptarase de xeito fluído ás dimensións e orientación do dispositivo empregando CSS Grid/Flexbox, unidades dinámicas (`dvh`, `clamp()`) e *media queries*:

1. **Escritorio e Pantallas Anchas (`> 1024px` ou orientación apaisada ancha)**:
   - Disposición central **horizontal** (Editor á esquerda `38.2%` | Separador vertical | Vista previa á dereita `61.8%`).
   - Cabeceira nunha única liña e pé de publicación coas dúas filas ou selector compacto visibles.

2. **Tabletas e Pantallas Medianas (`768px – 1024px` ou ventás estreitas)**:
   - Se a relación de aspecto é vertical (*portrait*) ou o ancho é menor ca `900px`, a área central pasa a **disposición vertical apilada** (Editor arriba `38.2%` da altura | Separador horizontal arrastrable | Vista previa abaixo `61.8%` da altura).
   - O separador (*splitter*) cambia automaticamente de orientación (`col-resize` ↔ `row-resize`) e soporta eventos táctiles (`Pointer Events`: `pointerdown`, `pointermove`, `pointerup` con `touch-action: none`).

3. **Móbiles e Pantallas Pequenas (`< 768px`)**:
   - **Cabeceira compacta**: Mantén `DISPERSE`, os controis de motor/formato/refresco e os dous botóns circulares (tema e cor) axustando espazados e tamaños con `clamp()`, ou agrupando os controis en dúas liñas compactas se o ancho é moi reducido (`< 480px`).
   - **Área central adaptable**:
     - Disposición vertical redimensionable (Editor arriba / Vista previa abaixo en proporción áurea `38.2% / 61.8%`), acompañado de botóns de icona de acceso rápido no propio separador para maximizar temporalmente o Editor ou o Visualizador cun só toque.
   - **Soporte táctil completo**:
     - Xestos *pinch-to-zoom* e arrastre cun dedo no visualizador.
     - Áreas de toque mínimas recomendadas (`>= 36px–44px`) en botóns e controis.
   - **Pé de publicación compacto**:
     - Unificación mediante conmutadores de iconas (`[🖼 / ✏️]` para elixir entre Imaxe ou Editor + `[🔗 / M↓ / </>]` para o formato) cun único campo de código deslizable horizontalmente e botón de copiado, aforrando espazo vertical.

---

## 4. Motores de Kroki Soportados

O despregable de modelos incluirá todos os motores da API pública de Kroki, co seu modo de sintaxe correspondente no editor e unha plantilla de exemplo inicial:

1. `actdiag` (ActDiag)
2. `blockdiag` (BlockDiag)
3. `bpmn` (BPMN - XML)
4. `bytefield` (Bytefield - Clojure)
5. `c4plantuml` (C4 with PlantUML)
6. `d2` (D2)
7. `dbml` (DBML)
8. `ditaa` (Ditaa)
9. `erd` (Erd)
10. `excalidraw` (Excalidraw - JSON)
11. `graphviz` (GraphViz / DOT)
12. `mermaid` (Mermaid - **seleccionado por defecto**)
13. `nomnoml` (Nomnoml)
14. `nwdiag` (NwDiag)
15. `packetdiag` (PacketDiag)
16. `pikchr` (Pikchr)
17. `plantuml` (PlantUML)
18. `rackdiag` (RackDiag)
19. `seqdiag` (SeqDiag)
20. `structurizr` (Structurizr)
21. `svgbob` (Svgbob)
22. `symbolator` (Symbolator - VHDL/Verilog)
23. `tikz` (TikZ - LaTeX)
24. `umlet` (UMLet - XML)
25. `vega` (Vega - JSON)
26. `vegalite` (Vega-Lite - JSON)
27. `wavedrom` (WaveDrom - JSON)
28. `wireviz` (WireViz - YAML)

---

## 5. Codificación, Compresión e Comunicación con Kroki

1. **Algoritmo de codificación (Estándar Kroki)**:
   - Codificar o texto do editor en UTF-8 (`TextEncoder`).
   - Comprimir mediante **Zlib Deflate** (nivel 9).
   - Converter o buffer comprimido a **Base64 URL-safe** (substituíndo `+` por `-` e `/` por `_`).
2. **Descodificación (Carga desde URL)**:
   - Ao abrir Disperse cun hash `#motor/formato/payload` (ou parámetro), descodifícase o Base64 URL-safe, descomprímese con Inflate a UTF-8 e cárgase automaticamente o código no editor xunto co motor e formato correspondentes.
3. **Renderizado**:
   - Para diagramas estándar úsase a URL `GET https://kroki.io/{motor}/{formato}/{payload}` (que ademais coincide coa URL pública de imaxe).
   - Se se produce un erro de sintaxe, faise petición para mostrar de forma visual o erro no panel dereito ou no editor.

---

## 6. Arquitectura Técnica e Librerías (Vanilla + CDN)

Estrutura de ficheiros limpa e sen paso de compilación obrigatorio:
- `index.html` — Estrutura semántica e carga de librerías CDN.
- `favicon.svg` — Icona e logotipo vectorial de marca (un prisma que dispersa un feixe en 4 nodos de grafo coas 4 cores tetrádicas).
- `css/styles.css` — Sistema de cores `oklch` tetrádico, layout con proporción áurea e temas claro/escuro.
- `js/app.js` — Inicialización, estado da aplicación, atallos de teclado (`Ctrl+R`), splitter e eventos.
- `js/theme.js` — Conversión RGB → OKLCH, xeración da paleta tetrádica e cambio de modo claro/escuro.
- `js/kroki.js` — Catálogo de motores, exemplos por defecto, compresión/descompresión e comunicación coa API de Kroki.
- `js/viewer.js` — Xestión do visualizador (SVG e PNG) con zoom, pan e descarga.

### Librerías externas (vía CDN ESM / UMD)
- **Editor de código**: **Ace Editor** (ou **CodeMirror 5/6**), por ofrecer soporte inmediato para modos como DOT, JSON, XML, YAML, Clojure, LaTeX, Verilog, etc.
- **Zoom e Pan**: **`@panzoom/panzoom`** (permite facer zoom e pan fluído sobre calquera contedor DOM, funcionando igual para `<svg>` inline/imaxe que para `<img>` PNG).
- **Compresión**: **`pako`** (`deflate` / `inflate` compatible 100% co formato Zlib con cabeceira que esixe Kroki).
- **Iconografía**: **`lucide`** (`lucide.min.js` vía CDN, xerando iconas vectoriais SVG limpas mediante atributos `data-lucide`).

---

## 7. Despregue e Contedorización

A aplicación está deseñada para servirse estaticamente dende calquera servidor web. Para iso inclúense as seguintes ferramentas:

- **`Containerfile`**: Permite xerar unha imaxe OCI baseada en `nginx:stable` (Debian, sen Alpine), copiando só os ficheiros estáticos estritamente necesarios (`index.html`, `css/` e `js/`).
- **`Taskfile.yml`**: Proporciona rutinas para axilizar o desenvolvemento e o empaquetado:
  - `task run`: Levanta un servidor web local lixeiro (`python3 -m http.server`) no porto `8765` por defecto, sendo configurable mediante a variable `PORT` (ex. `task run PORT=9000`).
  - `task build`: Crea a imaxe do contedor (`ghcr.io/sleepinfinitydev/disperse` por defecto, configurable con `IMAGE=...`) etiquetada tanto co hash curto de Git (`git rev-parse --short HEAD`) coma con `latest`, empregando de forma transparente `podman` ou `docker`.
  - `task push`: Constrúe e empurra ao rexistro ambas etiquetas (`:{{.GIT_HASH}}` e `:latest`).
