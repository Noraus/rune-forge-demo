# Validación realizada

En el entorno cloud, con Node.js 24.19.0 y Chromium del sistema:

- `npm install --no-audit --no-fund`: instalación de dependencias.
- `npm ci --no-audit --no-fund`: reinstalación reproducible desde package-lock.json.
- `npm run test`: 46 pruebas aprobadas.
- `npm run lint`: aprobado, sin errores.
- `npm run build`: aprobado. Advertencia no bloqueante: chunk de PixiJS de aproximadamente 519 kB (148 kB gzip); se puede optimizar más si se necesita menor descarga inicial.
- `npm run test:browser`: aprobado con WebGL (Chromium headless y SwiftShader). Verifica los ocho ejemplos, impactos reales, creación y conexión de runas con ratón, niveles, eliminación, deshacer, pausa/reanudación, recuperación de sesión, importación inválida, exportación y diseño móvil. Sin errores JavaScript.
- Capturas desktop y móvil generadas por el runner en `artifacts/`, ignorado por Git. Se corrigió una regresión de altura del editor móvil y se comprueba que los nodos sean visibles.
- Petición HTTP al servidor Vite: respuesta correcta.

No se afirma validación en todos los navegadores, dispositivos físicos o GPUs. Las pruebas a 30 y 120 FPS comparan el estado lógico, independientemente del renderizador. No se ha publicado ni desplegado la aplicación fuera del entorno.
