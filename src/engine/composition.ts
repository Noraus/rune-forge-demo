import {
  BALANCE as B,
  RUNES,
  SpellError,
  parseGraph,
  type Branch,
  type Graph,
  type Program,
  type Element,
  type Shape,
} from "./model";
const elements: Element[] = ["fire", "ice", "lightning"];
const shapes: Shape[] = ["projectile", "area", "beam"];
type Context = Omit<Branch, "shape"> & { shape?: Shape };
const clone = (c: Context): Context => ({ ...c, elements: { ...c.elements } });
export function compile(input: Graph): Program {
  const g = parseGraph(input),
    byId = new Map(g.nodes.map((n) => [n.id, n]));
  const starts = g.nodes.filter((n) => n.rune === "start");
  if (starts.length !== 1)
    throw new SpellError("El circuito necesita exactamente un Inicio.");
  const incoming = new Map(g.nodes.map((n) => [n.id, [] as string[]])),
    outgoing = new Map(g.nodes.map((n) => [n.id, [] as string[]]));
  const pairs = new Set<string>();
  for (const e of g.edges) {
    if (!byId.has(e.source) || !byId.has(e.target))
      throw new SpellError("Una conexión apunta a un nodo inexistente.");
    const key = e.source + "→" + e.target;
    if (pairs.has(key)) throw new SpellError("Conexión duplicada.");
    pairs.add(key);
    incoming.get(e.target)!.push(e.source);
    outgoing.get(e.source)!.push(e.target);
  }
  const seen = new Set<string>(),
    visiting = new Set<string>(),
    order: string[] = [];
  function visit(id: string, depth: number) {
    if (visiting.has(id)) throw new SpellError("Se ha detectado un ciclo.");
    if (depth > B.maxDepth)
      throw new SpellError("Profundidad máxima: " + B.maxDepth);
    if (seen.has(id)) return;
    visiting.add(id);
    for (const next of outgoing.get(id)!) visit(next, depth + 1);
    visiting.delete(id);
    seen.add(id);
    order.unshift(id);
  }
  visit(starts[0].id, 1);
  if (seen.size !== g.nodes.length)
    throw new SpellError(
      "Hay nodos desconectados del Inicio. Conéctalos o elimínalos.",
    );
  for (const n of g.nodes) {
    const i = incoming.get(n.id)!.length,
      o = outgoing.get(n.id)!.length,
      d = RUNES[n.rune];
    if (
      i !== d.inputs ||
      o > d.outputs ||
      (n.rune === "fork" && o !== 2) ||
      (n.rune === "start" && o !== 1)
    )
      throw new SpellError(
        `${d.name}: requiere ${d.inputs} entradas y ${n.rune === "fork" ? "exactamente 2" : `hasta ${d.outputs}`} salidas.`,
      );
  }
  const depths = new Map<string, number>();
  for (const id of order) {
    const parents = incoming.get(id)!;
    const depth = parents.length
      ? 1 + Math.max(...parents.map((p) => depths.get(p)!))
      : 1;
    if (depth > B.maxDepth)
      throw new SpellError("Profundidad máxima: " + B.maxDepth);
    depths.set(id, depth);
  }
  const contexts = new Map<string, Context>(),
    leaves: Branch[] = [];
  for (const id of order) {
    const n = byId.get(id)!,
      parents = incoming.get(id)!;
    let c: Context;
    if (n.rune === "start")
      c = {
        elements: { fire: 0, ice: 0, lightning: 0 },
        count: 1,
        repeats: 1,
        speed: B.speed,
        range: B.range,
        radius: B.radius,
        duration: B.duration,
        cost: 0,
      };
    else {
      c = clone(contexts.get(parents[0])!);
      if (n.rune === "merge") {
        const b = contexts.get(parents[1])!;
        if (!c.shape || c.shape !== b.shape)
          throw new SpellError(
            "Fusión requiere dos ramas con la misma forma definida.",
          );
        for (const el of elements) c.elements[el] += b.elements[el];
        for (const k of [
          "count",
          "repeats",
          "speed",
          "range",
          "radius",
          "duration",
        ] as const)
          c[k] = Math.max(c[k], b[k]);
        c.cost += b.cost;
      }
    }
    const l = n.level;
    if (elements.includes(n.rune as Element))
      c.elements[n.rune as Element] += B.baseDamage[n.rune as Element] * l;
    else if (shapes.includes(n.rune as Shape)) {
      if (c.shape)
        throw new SpellError(
          "Cada rama admite una sola forma; usa Bifurcación para combinar formas.",
        );
      c.shape = n.rune as Shape;
    } else if (RUNES[n.rune].category === "Modificador") {
      if (!c.shape || !elements.some((e) => c.elements[e] > 0))
        throw new SpellError(
          "Coloca elemento y forma antes de los modificadores.",
        );
      if (n.rune === "impulse") {
        if (c.shape !== "projectile")
          throw new SpellError("Impulso solo es compatible con Proyectil.");
        c.speed *= 1 + B.impulse * l;
      }
      if (n.rune === "power")
        for (const e of elements)
          if (c.elements[e])
            c.elements[e] +=
              (B.power * l) / elements.filter((e) => c.elements[e] > 0).length;
      if (n.rune === "split") {
        const next = c.count + l;
        for (const e of elements) c.elements[e] *= c.count / next;
        c.count = next;
      }
      if (n.rune === "repeat") c.repeats += l;
      if (n.rune === "duration") c.duration += B.durationBonus * l;
      if (n.rune === "range") {
        c.range += B.rangeBonus * l;
        c.radius += B.radiusBonus * l;
      }
    }
    c.cost += RUNES[n.rune].cost * l * (n.rune === "power" ? c.count : 1);
    if (
      c.count > B.maxManifestations ||
      c.repeats > B.maxRepeats ||
      c.duration > B.maxDuration ||
      c.radius > B.maxRadius ||
      c.speed > B.maxSpeed ||
      c.range > B.maxRange
    )
      throw new SpellError(
        "Se ha superado un límite de seguridad: reduce modificadores.",
      );
    contexts.set(id, c);
    if (outgoing.get(id)!.length === 0) {
      if (!c.shape || !elements.some((e) => c.elements[e] > 0))
        throw new SpellError(
          "Cada rama debe terminar con un elemento y una forma.",
        );
      leaves.push(c as Branch);
    }
  }
  const program: Program = {
    version: 1,
    branches: leaves,
    totalComplexity: g.nodes.length + g.edges.length,
    warnings: [],
  };
  if (
    leaves.reduce(
      (s, b) => s + b.count * b.repeats * Math.ceil(b.duration / B.pulse),
      0,
    ) > B.maxEvents
  )
    throw new SpellError("Demasiados eventos simultáneos.");
  if (program.totalComplexity > 65)
    program.warnings.push("Circuito complejo: considera reducir ramas.");
  return program;
}
