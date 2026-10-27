# Arquitectura

## Contratos

`Graph` es el formato versionado común del editor: id, runa, nivel y posición para cada nodo; id, origen y destino para cada conexión. React Flow adapta estos datos a sus nodos visuales. No entran objetos de React Flow en el motor.

Pipeline: JSON desconocido → `parseGraph` → `compile` (puertos, DAG, conectividad, profundidad y semántica) → `Program` → `resolve` → `Simulation` → eventos / estado → PixiJS.

## Cuatro subsistemas

1. Editor: React y React Flow; biblioteca arrastrable, selección, niveles, conexiones, eliminación, ordenación y navegación. Zustand conserva el grafo e historial. El inspector recompila al editar. Los errores impiden lanzar sin impedir seguir editando.
2. Composición: TypeScript puro. Valida el esquema; recorre desde Inicio; rechaza ciclos, huérfanos y restricciones de puertos; ordena topológicamente. Interpreta contextos con componentes elementales, forma, modificadores y coste. Cada hoja emite una rama IR. La fusión procesa sus dos predecesores antes de producir un único contexto.
3. Resolución y simulación: resolución pura de estadísticas; ejecución a paso fijo de 1/60 s con acumulador. Cada lanzamiento crea una instancia independiente y determinista. Proyectiles usan distancia de segmento a objetivo; área y haz pulsan cada 0,25 s. El azar con semilla solo altera la posición cosmética del evento de daño. La lógica de movimiento y el orden de impactos son deterministas.
4. PixiJS: una instancia por montaje, resize observer y DPR limitado a 2. Consume manifestaciones y eventos de impacto, nunca interpreta runas del editor. Reutiliza un Graphics para dibujar geometría procedural; limita eventos visualizados y no acumula sprites sin liberar. La limpieza cancela observación y destruye canvas y recursos; la inicialización asíncrona contempla desmontajes de StrictMode.

## Tiempo y reproducibilidad

`advance(dt)` acumula tiempo y ejecuta pasos exactos. El delta por llamada está limitado a un segundo para evitar espirales de recuperación al volver de una pestaña suspendida. A iguales semilla, programa y tiempo lógico, el estado es igual: la suite compara 30 y 120 FPS. Pausar no consume pasos. Cambiar velocidad altera el tiempo entregado al acumulador, nunca las fórmulas. Los objetivos móviles cambian su frecuencia de oscilación mientras están ralentizados.

El estado termina cuando no quedan activaciones, manifestaciones ni estados temporales. El render puede seguir dibujando el último estado. La interfaz conserva el último lanzamiento hasta reiniciar o volver a lanzar.

## Persistencia y seguridad

JSON v1 con límites de tamaño, nodos, aristas, nivel, tipos y posiciones finitas. Se reconstruye cada objeto admitiendo solo campos conocidos. No se ejecuta contenido importado ni se usa HTML arbitrario. La validación de esquema y la del grafo se separan para permitir guardar circuitos incompletos. localStorage se usa bajo try/catch, con exportación manual si falta almacenamiento.

## Extensión

Para añadir una runa: ampliar el tipo y catálogo, declarar semántica en composición, añadir fórmulas al equilibrio, y pruebas de composición/resolución/simulación según corresponda. Para una nueva forma, añadir su comportamiento lógico y luego su representación visual. Ninguna extensión debe reconocer nombres de ejemplos.
