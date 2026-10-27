# Equilibrio y límites

La configuración principal está en `src/engine/model.ts`: `BALANCE` y `RUNES`. Las transformaciones están en `composition.ts`, la agregación en `resolution.ts` y las reglas de impacto en `simulation.ts`. Las constantes de daño base, potencia, estados, velocidad del rayo y pulso se declaran también en BALANCE; ver ese archivo para los valores efectivos.

## Base

Velocidad 240 u/s; alcance 430 u; radio 65 u; persistencia 1,5 s; intervalo 0,45 s. Costes de nodos según catálogo. Complejidad = nodos + aristas. Coste de rama = suma de costes (Potencia multiplicada por manifestaciones existentes), multiplicado por repeticiones y por `1 + 0,15 × (count − 1)`. El coste total suma ramas terminales.

Daño potencial directo por elemento = componente × count × repeats × pulsos × factor. Proyectil: 1 pulso, factor 1. Haz/área: `ceil(duration / 0,25)` pulsos, factor 0,25. Duraciones generadas por las runas están alineadas a ese intervalo. Se excluyen quemadura y cadenas, que dependen del impacto y de vecinos. El valor no multiplica por cantidad de objetivos.

Tiempo estimado = máximo entre ramas de `(repeats−1) × 0,45 + tiempo de forma`. Proyectil: alcance / velocidad efectiva + duración de estados; haz/área: duración. Es una proyección; la ejecución puede terminar antes según impactos. La velocidad resuelta es el máximo de ramas; rayo multiplica velocidad por 1,6 solo si hay componente de rayo.

## Seguridad

48 nodos, 96 aristas, profundidad 24. Por rama: 12 manifestaciones, 6 repeticiones, duración 6 s, radio 120 u, alcance 1200 u, velocidad previa a rayo 1600 u/s. El daño directo potencial agregado máximo es 1500. Presupuesto estimado de eventos: 3000 (count × repeats × ceil(duration/0,25) sumado entre ramas). La cola de impactos mantiene como máximo 3000 entradas. Partículas configuradas: 350; el renderer dibuja un máximo de 43 impactos recientes con 6 partículas cada uno, además de los pocos efectos de estado.

El delta por frame se limita a un segundo. Los proyectiles expiran al agotar alcance; no hay generadores recursivos. Los límites inválidos bloquean lanzamiento con mensaje, sin recortar estadísticas silenciosamente. Una complejidad superior a 65 produce advertencia.

## Contrapartidas

División conserva energía existente pero cuesta energía adicional y dispersa trayectorias. Potencia después de dividir es más cara porque añade energía a más manifestaciones. Repetición y duración aumentan coste y tiempo; alcance cuesta energía y exige tiempo de viaje. Bifurcar duplica el presupuesto de ramas. Las áreas/haces reparten el daño en tiempo y pueden fallar contra blancos móviles.

## Ampliar

Cambiar configuración requiere pruebas de extremos, comparación de orden y verificación de ejemplos. Evitar multiplicadores de daño encadenables sin techo; usar incrementos explícitos y presupuestos. Para nuevas fusiones, documentar si suman o conservan cada propiedad y cómo cobran los prefijos compartidos. No calibrar el renderer con fórmulas propias.
