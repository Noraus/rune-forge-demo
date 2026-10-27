import { describe, it, expect } from "vitest";
import {
  BALANCE as B,
  type Graph,
  type Rune,
  parseGraph,
} from "../engine/model";
import { compile } from "../engine/composition";
import { resolve } from "../engine/resolution";
import { Simulation, random } from "../engine/simulation";
import { chain, EXAMPLES } from "../examples";
import { deserialize, serialize } from "../state/store";
const program = (runes: Rune[]) => compile(chain(runes));
const stats = (runes: Rune[]) => resolve(program(runes));
const run = (s: Simulation, dt = 1 / 60) => {
  for (let i = 0; i < 1800 && s.state.running; i++) s.advance(dt);
  return s.state;
};
const merged = (): Graph => {
  const g = structuredClone(EXAMPLES[7].graph);
  g.nodes.find((n) => n.id === "a")!.rune = "projectile";
  g.nodes.push({ id: "m", rune: "merge", level: 1, x: 800, y: 190 });
  g.edges.push(
    { id: "pm", source: "p", target: "m" },
    { id: "am", source: "a", target: "m" },
  );
  return g;
};
describe("Validación y composición", () => {
  it.each(EXAMPLES)("compila $name y resuelve sus estadísticas", (e) => {
    expect(compile(e.graph).branches.length).toBeGreaterThan(0);
    expect(resolve(compile(e.graph)).energy).toBeGreaterThan(0);
  });
  it("exige exactamente un Inicio", () => {
    expect(() => program(["fire", "projectile"])).toThrow(/Inicio/);
    expect(() => program(["start", "start", "fire", "projectile"])).toThrow(
      /Inicio/,
    );
  });
  it("rechaza ciclos", () => {
    const g = chain(["start", "fire", "projectile"]);
    g.edges.push({ id: "cycle", source: "n2", target: "n0" });
    expect(() => compile(g)).toThrow(/ciclo/);
  });
  it("rechaza huérfanos", () => {
    const g = chain(["start", "fire", "projectile"]);
    g.nodes.push({ id: "orphan", rune: "ice", level: 1, x: 0, y: 0 });
    expect(() => compile(g)).toThrow(/desconectados/);
  });
  it("rechaza conexiones inexistentes y duplicadas", () => {
    const g = chain(["start", "fire", "projectile"]);
    g.edges.push({ id: "bad", source: "missing", target: "n0" });
    expect(() => compile(g)).toThrow(/inexistente/);
    g.edges[g.edges.length - 1] = { ...g.edges[0], id: "duplicate" };
    expect(() => compile(g)).toThrow(/duplicada/);
  });
  it("rechaza impulso en área y modificadores sin contexto", () => {
    expect(() => program(["start", "fire", "area", "impulse"])).toThrow(/solo/);
    expect(() => program(["start", "power", "fire", "projectile"])).toThrow(
      /antes/,
    );
  });
  it("exige una forma y elemento por rama", () => {
    expect(() => program(["start", "fire"])).toThrow(/elemento y una forma/);
    expect(() => program(["start", "projectile"])).toThrow(
      /elemento y una forma/,
    );
    expect(() => program(["start", "fire", "area", "beam"])).toThrow(
      /sola forma/,
    );
  });
  it("bifurca sin confundirlo con División", () => {
    const p = compile(EXAMPLES[7].graph);
    expect(p.branches).toHaveLength(2);
    expect(p.branches.map((b) => b.shape).sort()).toEqual([
      "area",
      "projectile",
    ]);
    expect(p.branches.every((b) => b.count === 1)).toBe(true);
  });
  it("fusiona componentes de ramas compatibles", () => {
    const p = compile(merged());
    expect(p.branches).toHaveLength(1);
    expect(p.branches[0].elements).toEqual({ fire: 12, ice: 9, lightning: 0 });
  });
  it("rechaza fusión de formas incompatibles", () => {
    const g = merged();
    g.nodes.find((n) => n.id === "a")!.rune = "area";
    expect(() => compile(g)).toThrow(/misma forma/);
  });
  it("exige puertos correctos", () => {
    const g = chain(["start", "fire", "projectile"]);
    g.nodes.push({ id: "ice", rune: "ice", level: 1, x: 0, y: 0 });
    g.edges.push({ id: "branch", source: "n0", target: "ice" });
    expect(() => compile(g)).toThrow(/entradas/);
  });
  it("limita tamaño y profundidad", () => {
    expect(() =>
      program([
        "start",
        "fire",
        "projectile",
        ...Array<Rune>(48).fill("power"),
      ]),
    ).toThrow(/grande/);
    expect(() =>
      program(["start", "fire", "projectile", ...Array<Rune>(23).fill("fire")]),
    ).toThrow(/Profundidad/);
  });
});
describe("Resolución", () => {
  it("centraliza fórmulas base", () => {
    const s = stats(["start", "fire", "projectile"]);
    expect(s.energy).toBe(12);
    expect(s.damage).toBe(12);
    expect(s.speed).toBe(B.speed);
    expect(s.range).toBe(B.range);
    expect(s.statuses).toContain("Quemadura");
  });
  it("el orden cambia energía, daño y coste de potencia", () => {
    const splitFirst = stats(["start", "fire", "projectile", "split", "power"]);
    const powerFirst = stats(["start", "fire", "projectile", "power", "split"]);
    expect(splitFirst.damage).toBe(28);
    expect(powerFirst.damage).toBe(20);
    expect(splitFirst.energy).toBeGreaterThan(powerFirst.energy);
    expect(splitFirst.manifestations).toBe(2);
  });
  it("repetir añade activaciones y coste", () => {
    const s = stats(["start", "fire", "projectile", "repeat"]);
    expect(s.manifestations).toBe(2);
    expect(s.damage).toBe(24);
    expect(s.energy).toBe(34);
    expect(s.interval).toBe(0.45);
  });
  it("alcance, duración, velocidad y elementos tienen efectos distintos", () => {
    expect(stats(["start", "ice", "projectile", "range"]).range).toBe(
      B.range + 90,
    );
    expect(stats(["start", "ice", "beam", "duration"]).duration).toBe(
      B.duration + 0.75,
    );
    expect(stats(["start", "lightning", "projectile"]).speed).toBe(
      B.speed * 1.6,
    );
    expect(stats(["start", "fire", "projectile", "impulse"]).speed).toBe(
      B.speed * 1.5,
    );
  });
  it("resuelve determinísticamente sin modificar IR", () => {
    const p = compile(merged()),
      before = JSON.stringify(p);
    expect(resolve(p)).toEqual(resolve(structuredClone(p)));
    expect(JSON.stringify(p)).toBe(before);
  });
  it("limita modificadores y daño", () => {
    expect(() =>
      program([
        "start",
        "fire",
        "projectile",
        ...Array<Rune>(12).fill("split"),
      ]),
    ).toThrow(/seguridad/);
    expect(() =>
      program([
        "start",
        "fire",
        "projectile",
        ...Array<Rune>(6).fill("repeat"),
      ]),
    ).toThrow(/seguridad/);
    expect(() =>
      program(["start", "fire", "beam", ...Array<Rune>(7).fill("duration")]),
    ).toThrow(/seguridad/);
    const p = program(["start", "fire", "area"]);
    p.branches[0].elements.fire = 9999;
    expect(() => resolve(p)).toThrow(/Daño máximo/);
  });
});
describe("Simulación lógica", () => {
  it.each(EXAMPLES)("ejecuta $name con impactos reales", (e) => {
    const s = run(new Simulation(compile(e.graph)));
    expect(s.running).toBe(false);
    expect(s.totalDamage).toBeGreaterThan(0);
    expect(s.impacts).toBeGreaterThan(0);
  });
  it("avanza trayectorias y colisiona con el primer objetivo", () => {
    const sim = new Simulation(program(["start", "ice", "projectile"]));
    sim.advance(0.1);
    expect(sim.state.manifestations[0].x).toBeGreaterThan(70);
    const s = run(sim);
    expect(s.targets[0].damage).toBe(9);
    expect(s.targets[1].damage).toBe(0);
  });
  it("no alcanza más allá de su alcance", () => {
    const p = program(["start", "fire", "projectile"]);
    p.branches[0].range = 100;
    const s = run(new Simulation(p));
    expect(s.totalDamage).toBe(0);
  });
  it("el área afecta a grupos y haz atraviesa objetivos", () => {
    const area = run(
      new Simulation(program(["start", "ice", "area"]), "cluster"),
    );
    expect(area.targets.filter((t) => t.damage > 0).length).toBeGreaterThan(1);
    const beam = run(
      new Simulation(program(["start", "ice", "beam", "range"])),
    );
    expect(beam.targets.filter((t) => t.damage > 0).length).toBe(2);
  });
  it("aplica y expira estados; quemadura causa daño posterior", () => {
    const sim = new Simulation(program(["start", "fire", "projectile"]));
    while (!sim.state.impacts) sim.advance(B.step);
    expect(sim.state.targets[0].burn).toBeGreaterThan(0);
    const initial = sim.state.totalDamage;
    const s = run(sim);
    expect(s.totalDamage).toBeGreaterThan(initial);
    expect(s.targets.every((t) => t.burn === 0)).toBe(true);
  });
  it("ralentiza y expira en el tiempo lógico", () => {
    const sim = new Simulation(program(["start", "ice", "projectile"]));
    while (!sim.state.impacts) sim.advance(B.step);
    expect(sim.state.targets[0].slow).toBeGreaterThan(0);
    run(sim);
    expect(sim.state.targets[0].slow).toBe(0);
  });
  it("el rayo salta a un vecino", () => {
    const s = run(
      new Simulation(program(["start", "lightning", "area"]), "cluster"),
    );
    expect(s.hits.some((h) => h.chainFrom)).toBe(true);
  });
  it("mueve objetivos sin depender del render", () => {
    const sim = new Simulation(program(["start", "ice", "beam"]), "moving");
    sim.advance(0.5);
    expect(sim.state.targets[0].y).not.toBe(sim.state.targets[0].originY);
  });
  it("produce resultados iguales a 30 y 120 fps", () => {
    const p = program(["start", "fire", "projectile", "repeat"]);
    const a = run(new Simulation(p, "moving", 72), 1 / 30),
      b = run(new Simulation(p, "moving", 72), 1 / 120);
    expect(a).toEqual(b);
  });
  it("respeta pausa, semilla y PRNG reproducible", () => {
    const p = program(["start", "lightning", "projectile"]);
    const a = run(new Simulation(p, "static", 19)),
      b = run(new Simulation(p, "static", 19));
    expect(a).toEqual(b);
    const sim = new Simulation(p);
    sim.state.running = false;
    sim.advance(1);
    expect(sim.state.time).toBe(0);
    const r = random(7),
      r2 = random(7);
    expect([r(), r()]).toEqual([r2(), r2()]);
  });
});
describe("Persistencia segura", () => {
  it("serializa y deserializa todas las composiciones", () => {
    for (const e of EXAMPLES)
      expect(deserialize(serialize(e.graph))).toEqual(e.graph);
  });
  it("rechaza JSON malformado, versión y estructura arbitraria", () => {
    for (const bad of [
      "{",
      "null",
      '{"version":2}',
      '{"version":1,"nodes":[],"edges":[null]}',
    ])
      expect(() => deserialize(bad)).toThrow();
  });
  it("rechaza niveles inválidos, ids duplicados, tipos y posiciones inválidos", () => {
    const g = chain(["start", "fire", "projectile"]);
    g.nodes[1].level = 99;
    expect(() => parseGraph(g)).toThrow();
    g.nodes[1].level = 1;
    g.nodes[1].id = "n0";
    expect(() => parseGraph(g)).toThrow(/únicos/);
    g.nodes[1].id = "n1";
    g.nodes[1].x = Infinity;
    expect(() => parseGraph(g)).toThrow();
  });
  it("rechaza archivos excesivos", () => {
    expect(() => deserialize(" ".repeat(100001))).toThrow(/100 KB/);
  });
});
