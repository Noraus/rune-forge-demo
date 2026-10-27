# Rune Forge

- Mantener composición, resolución y simulación en TypeScript puro, sin React, PixiJS ni DOM.
- No introducir recetas o animaciones que dependan del nombre de un ejemplo. Todos usan el mismo pipeline.
- Añadir pruebas al modificar reglas. Mantener determinismo, orden estable y timestep fijo.
- Centralizar equilibrio y límites en `src/engine/model.ts`; documentar cambios en `docs/`.
- Priorizar coherencia sistémica y evitar dependencias innecesarias.
- No añadir mecánicas ajenas al laboratorio, backend remoto ni autenticación.
- Ejecutar `npm run test`, `npm run lint` y `npm run build` antes de terminar.
- Usar el checkout existente: las tareas cloud ya están aisladas; no crear worktrees salvo petición explícita.
