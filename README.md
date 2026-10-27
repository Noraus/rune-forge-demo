# Rune Forge

Laboratorio de magia modular en español. Construye un grafo de runas, inspecciona sus estadísticas y ejecútalo en una arena PixiJS. Todo funciona en el navegador, sin cuentas, servicios externos ni imágenes descargadas.

## Requisitos y ejecución

Node.js 22.12+ (validado con Node 24) y npm 10+; navegador moderno con WebGL y JavaScript. Desde la raíz del proyecto:

```bash
npm install
npm run dev
```

Abre la dirección que muestra Vite en tu terminal. Por defecto usa el puerto 5173. Para una instalación reproducible desde el lockfile utiliza `npm ci`. La caché npm se guarda localmente en `.npm-cache/` para admitir máquinas cloud con directorio personal de solo lectura.

```bash
npm run test   # Vitest, ejecución finita
npm run lint   # ESLint y TypeScript ESLint
npm run build  # TypeScript estricto + bundle de producción en dist/
```

## Guía rápida

1. Elige una de las ocho composiciones en el selector del lienzo.
2. Arrastra runas de la biblioteca, o pulsa para añadirlas. Arrastra desde el puerto derecho de un nodo hasta el izquierdo de otro.
3. Conecta Inicio → elemento → forma → modificadores. Un nodo normal tiene una entrada y una salida; Bifurcación requiere dos salidas y Fusión dos entradas.
4. Selecciona una runa para leer su semántica y ajustar su nivel (1–3). Los errores y estadísticas se actualizan inmediatamente.
5. Selecciona objetivos y semilla; pulsa **Lanzar hechizo**. Pausa, reanuda y cambia la velocidad. Cada lanzamiento reinicia objetivos y usa una instantánea del programa: editar el grafo no modifica un lanzamiento ya iniciado.
6. Observa vida, impactos, daño por objetivo, quemaduras y ralentización. Usa el grupo cercano para comprobar cadenas de rayo y áreas.
7. Exporta JSON para compartir; importa para recuperarlo. El grafo se guarda automáticamente en localStorage. Un JSON estructuralmente válido puede contener un circuito incompleto: se carga para editarlo, pero no se puede lanzar hasta corregirlo.

Controles del editor: rueda para zoom, arrastre del fondo para pan, controles inferiores para centrar; Supr/Retroceso elimina la selección; Ctrl/Cmd Z deshace; Ctrl/Cmd Shift Z o Ctrl/Cmd Y rehace. El botón de líneas ordena el grafo por profundidad; la flecha circular recupera el ejemplo seleccionado. Selecciona una conexión y pulsa Supr para eliminarla. La biblioteca ofrece descripciones al pasar el cursor.

## Arquitectura

- `src/engine/model.ts`: esquema JSON, catálogo de runas y parámetros centrales.
- `src/engine/composition.ts`: validación de DAG, puertos, alcance semántico y compilación a IR.
- `src/engine/resolution.ts`: estadísticas puras, coste y límites de daño.
- `src/engine/simulation.ts`: trayectoria, colisiones segmentadas, estados y eventos a 60 Hz.
- `src/renderer/Arena.tsx`: representación procedural PixiJS de los resultados lógicos.
- `src/App.tsx`: editor React Flow, biblioteca, inspector y controles.
- `src/state/store.ts`: Zustand, historial y persistencia versionada.
- `src/examples/`: datos de ejemplo; no hay excepciones por nombre en el motor.

Consulta [el sistema mágico](docs/MAGIC_SYSTEM.md), [la arquitectura](docs/ARCHITECTURE.md) y [el equilibrio](docs/BALANCING.md).

## Pruebas

La suite cubre los ocho ejemplos, errores de grafo, fusiones, orden de modificadores, límites, fórmulas, colisiones, alcance, estados, cadenas, semillas, igualdad de resultados a diferentes frecuencias y JSON no confiable. El motor no necesita WebGL ni navegador para probarse.

## Limitaciones conocidas

- Laboratorio 2D de objetivos de 500 PV; no incluye combate, terreno, editor de objetivos ni resistencias.
- La fusión suma componentes y conserva máximos de modificadores; no inventa elementos nuevos. Solo admite dos entradas y una forma coincidente.
- El área se centra a `min(alcance, 300)` unidades del emisor; el haz usa una línea direccional y la división abre un abanico. No hay apuntado manual.
- El daño proyectado es daño directo teórico por objetivo. Quemaduras y cadenas son adicionales; el daño real depende de colisiones, duración y vida disponible.
- Quemaduras y ralentizaciones se refrescan por máximo, no se apilan. La quemadura aplica daño por paso lógico; la cadena hace un solo salto.
- PixiJS requiere WebGL. Si el navegador no lo admite se muestra un error; no se presenta una animación falsa.
- El historial conserva hasta 40 ediciones; movimientos prolongados pueden ocupar varias entradas. La sesión conserva el grafo, no una simulación activa.
- No se ha calibrado equilibrio para un videojuego concreto. Las fórmulas son explícitas y extensibles.

## Comprobación de navegador opcional

```bash
npx playwright install chromium   # si no hay Chromium del sistema
npm run test:browser
```

Usa Chromium del sistema si existe `/usr/bin/chromium`, o `CHROMIUM_PATH` si se indica; en otro caso usa el instalado por Playwright. Inicia y detiene su propio Vite en el puerto 5174. Verifica WebGL, los ocho ejemplos, creación y conexión real de nodos, edición, pausa, deshacer, recuperación de sesión, JSON y ancho móvil. Guarda capturas en `artifacts/` (ignorado por Git). No necesita un servidor manual.

## Publicar sin descargar: GitHub Pages

El workflow `.github/workflows/pages.yml` compila, prueba y despliega `dist/` a GitHub Pages cuando se publica la rama `main`, o manualmente con **Run workflow**. El repositorio debe tener **Settings → Pages → Source: GitHub Actions**. Vite usa rutas relativas para funcionar dentro del subdirectorio del repositorio. La web no necesita servidor de aplicación ni secretos. El enlace definitivo lo devuelve el paso de despliegue; preparar este workflow no significa que se haya publicado.
