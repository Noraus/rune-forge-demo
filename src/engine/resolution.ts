import { BALANCE as B, SpellError, type Program, type Stats } from "./model";
export function resolve(p: Program): Stats {
  const elemental = { fire: 0, ice: 0, lightning: 0 };
  let energy = 0,
    manifestations = 0,
    speed = 0,
    range = 0,
    radius = 0,
    duration = 0,
    executionTime = 0;
  for (const b of p.branches) {
    const ticks =
      b.shape === "projectile" ? 1 : Math.ceil(b.duration / B.pulse);
    for (const e of ["fire", "ice", "lightning"] as const)
      elemental[e] +=
        b.elements[e] *
        b.count *
        b.repeats *
        ticks *
        (b.shape === "projectile" ? 1 : B.pulse);
    energy += b.cost * b.repeats * (1 + B.splitCost * (b.count - 1));
    manifestations += b.count * b.repeats;
    speed = Math.max(
      speed,
      b.speed * (b.elements.lightning ? B.lightningSpeed : 1),
    );
    range = Math.max(range, b.range);
    radius = Math.max(radius, b.radius);
    duration = Math.max(duration, b.duration);
    executionTime = Math.max(
      executionTime,
      (b.repeats - 1) * B.interval +
        (b.shape === "projectile"
          ? b.range /
              (b.speed * (b.elements.lightning ? B.lightningSpeed : 1)) +
            b.duration
          : b.duration),
    );
  }
  const damage = Object.values(elemental).reduce((a, b) => a + b, 0);
  if (damage > B.maxDamage)
    throw new SpellError(`Daño máximo permitido: ${B.maxDamage}.`);
  return {
    energy,
    damage,
    manifestations,
    speed,
    range,
    radius,
    duration,
    interval: B.interval,
    executionTime,
    elemental,
    statuses: [
      ...(elemental.fire ? ["Quemadura"] : []),
      ...(elemental.ice ? ["Ralentización 50%"] : []),
      ...(elemental.lightning ? ["Cadena 40%"] : []),
    ],
  };
}
