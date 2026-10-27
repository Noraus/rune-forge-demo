# Gramática mágica v1

Una arista transporta un contexto mágico desde su salida a la siguiente entrada. Las posiciones visuales ayudan a leer; la dirección y orden de conexiones determinan la semántica. No se admiten ciclos, nodos huérfanos ni ramas incompletas. Se requiere exactamente un Inicio. Los niveles son enteros de 1 a 3; en estructura se fija nivel 1 desde la interfaz.

## Catálogo y reglas

| Runa        | Semántica                                                                                                                             | Coste base por nivel |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------: |
| Inicio      | Contexto vacío; 0 entradas, 1 salida obligatoria                                                                                      |                    0 |
| Bifurcación | Copia contexto; 1 entrada, 2 salidas obligatorias                                                                                     |                    3 |
| Fusión      | Dos entradas, misma forma definida, una salida; suma componentes y costes; máximos de count, repeats, speed, range, radius y duration |                    4 |
| Fuego       | Añade 12 × nivel; quemadura 18% del componente por segundo                                                                            |                    8 |
| Hielo       | Añade 9 × nivel; ralentización 50%                                                                                                    |                    7 |
| Rayo        | Añade 10 × nivel; velocidad ×1,6, un salto a vecino a menos de 115 unidades por 40% del daño del impacto                              |                   10 |
| Proyectil   | Colisión con primer objetivo en la trayectoria; 100% del componente                                                                   |                    4 |
| Área        | Centro a 300 unidades o al alcance si es menor; pulsa cada 0,25 s a todos los objetivos dentro del radio                              |                    7 |
| Haz         | Línea de 38 unidades de anchura; pulsa cada 0,25 s y atraviesa objetivos                                                              |                    8 |
| Impulso     | Solo proyectil: velocidad ×(1 + 0,5 × nivel)                                                                                          |                    3 |
| División    | count nuevo = count + nivel; cada componente × count anterior / count nuevo                                                           |                    5 |
| Potencia    | Añade 8 × nivel repartido entre elementos activos, por manifestación                                                                  |     6 × count actual |
| Duración    | +0,75 s × nivel a persistencia y estados                                                                                              |                    3 |
| Alcance     | +90 × nivel de alcance y +10 × nivel de radio                                                                                         |                    3 |
| Repetición  | repeats += nivel; intervalo 0,45 s                                                                                                    |                    5 |

Nodos normales: una entrada y hasta una salida. Una hoja debe contener al menos un elemento y una forma. Una rama puede acumular elementos (incluso repetidos) pero solo una forma. Modificadores requieren elemento y forma previos. Duración en proyectiles extiende estados, no la trayectoria. División es compatible con las tres formas: crea abanicos de proyectiles/haces o áreas desplazadas angularmente.

## Orden

Daño inicial 12, count=1:

- División → Potencia: división produce 2 × 6; potencia añade 8 a cada una: 2 × 14 = **28**. El nodo Potencia cuesta 12.
- Potencia → División: potencia produce 20; división reparte en 2 × 10 = **20**. El nodo Potencia cuesta 6.

Las formas de área y haz aplican 25% del componente en cada pulso. Con duración base 1,5 s son seis pulsos. El coste de repetición se paga por cada activación; no se obtiene energía gratuita bifurcando.

## Fusión y ramas

Bifurcación duplica un contexto: cada rama paga el coste acumulado desde Inicio. Fusión suma los costes de entrada, incluso si comparten prefijo: es el precio explícito por las dos alimentaciones. Suma daño elemental por manifestación y conserva el máximo de parámetros compatibles; no suma cantidades de proyectiles ni productos de repeticiones. Por tanto, fuego+hielo mantiene ambos componentes y ambos estados, sin crear un elemento nuevo. Fusionar formas diferentes es un error. Ramas no fusionadas se ejecutan simultáneamente.

## Daño y estados

Cada objetivo tiene 500 PV. El daño efectivo nunca excede la vida restante. Quemadura: máximo de intensidad y tiempo restante al refrescar; no apila instancias. Hielo: refresca la duración máxima, reduce a la mitad la frecuencia del movimiento. Estados duran lo mismo que la persistencia resuelta de la rama. Rayos: un salto al objetivo vivo de id más bajo que esté cerca; los saltos no vuelven a saltar ni aplican estados adicionales.

El azar no decide impactos ni estados: todo efecto aplica al impactar. La semilla controla el detalle cosmético de posiciones de eventos. Daño por objetivo y total, impactos y aplicaciones de estado proceden de la simulación, no de estimaciones visuales.
