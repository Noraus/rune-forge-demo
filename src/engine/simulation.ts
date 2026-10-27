import { BALANCE as B, type Branch, type Element, type Program } from "./model";
import { resolve } from "./resolution";
export type Scenario = "static" | "moving" | "cluster" | "spread";
export interface Target {
  id: number;
  x: number;
  y: number;
  originY: number;
  hp: number;
  damage: number;
  burn: number;
  slow: number;
  burnPower: number;
}
export interface Manifestation {
  id: number;
  branch: Branch;
  x: number;
  y: number;
  angle: number;
  age: number;
  tick: number;
  active: boolean;
}
export interface Hit {
  id: number;
  time: number;
  x: number;
  y: number;
  damage: number;
  element: Element;
  target: number;
  chainFrom?: { x: number; y: number };
  status?: boolean;
}
export interface Runtime {
  time: number;
  running: boolean;
  targets: Target[];
  manifestations: Manifestation[];
  hits: Hit[];
  totalDamage: number;
  impacts: number;
  statuses: number;
  seed: number;
}
export function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export class Simulation {
  state: Runtime;
  private accumulator = 0;
  private pending: { at: number; branch: Branch; angle: number }[] = [];
  private nextId = 0;
  private rng: () => number;
  constructor(
    public program: Program,
    scenario: Scenario = "static",
    seed = 42,
  ) {
    resolve(program);
    this.rng = random(seed);
    const points =
      scenario === "cluster"
        ? [
            [360, 190],
            [390, 225],
            [410, 160],
            [435, 205],
          ]
        : scenario === "spread"
          ? [
              [230, 120],
              [360, 210],
              [540, 120],
              [610, 265],
            ]
          : [
              [355, 190],
              [505, 190],
              [435, 285],
            ];
    this.state = {
      time: 0,
      running: true,
      targets: points.map(([x, y], id) => ({
        id,
        x,
        y,
        originY: y,
        hp: B.targetHp,
        damage: 0,
        burn: 0,
        slow: 0,
        burnPower: 0,
      })),
      manifestations: [],
      hits: [],
      totalDamage: 0,
      impacts: 0,
      statuses: 0,
      seed,
    };
    this.scenario = scenario;
    program.branches.forEach((b) => {
      for (let r = 0; r < b.repeats; r++)
        for (let i = 0; i < b.count; i++)
          this.pending.push({
            at: r * B.interval,
            branch: b,
            angle: (i - (b.count - 1) / 2) * B.spread,
          });
    });
  }
  private scenario: Scenario;
  advance(seconds: number) {
    if (!this.state.running) return;
    this.accumulator += Math.max(0, Math.min(seconds, 1));
    while (this.accumulator + 1e-10 >= B.step && this.state.running) {
      this.step();
      this.accumulator -= B.step;
    }
  }
  private damage(
    t: Target,
    value: number,
    element: Element,
    chainFrom?: { x: number; y: number },
    status = false,
  ) {
    if (t.hp <= 0) return;
    const d = Math.min(t.hp, value);
    t.hp -= d;
    t.damage += d;
    this.state.totalDamage += d;
    if (!status) this.state.impacts++;
    this.state.hits.push({
      id: this.nextId++,
      time: this.state.time,
      x: t.x + (this.rng() - 0.5) * 8,
      y: t.y,
      damage: d,
      element,
      target: t.id,
      chainFrom,
      status,
    });
    if (this.state.hits.length > B.maxEvents) this.state.hits.shift();
  }
  private impact(t: Target, b: Branch, factor: number) {
    for (const e of ["fire", "ice", "lightning"] as const) {
      const v = b.elements[e] * factor;
      if (!v) continue;
      this.damage(t, v, e);
      if (e === "fire") {
        t.burn = Math.max(t.burn, b.duration);
        t.burnPower = Math.max(t.burnPower, b.elements.fire * B.burnRate);
        this.state.statuses++;
      }
      if (e === "ice") {
        t.slow = Math.max(t.slow, b.duration);
        this.state.statuses++;
      }
      if (e === "lightning") {
        const near = this.state.targets
          .filter(
            (o) =>
              o !== t &&
              o.hp > 0 &&
              Math.hypot(o.x - t.x, o.y - t.y) < B.chainRange,
          )
          .sort((a, b) => a.id - b.id)[0];
        if (near) this.damage(near, v * B.chainDamage, e, { x: t.x, y: t.y });
      }
    }
  }
  private step() {
    const s = this.state,
      dt = B.step;
    s.time += dt;
    for (const t of s.targets) {
      if (this.scenario === "moving" && t.hp > 0)
        t.y =
          t.originY +
          Math.sin(s.time * (t.slow > 0 ? 1.1 * B.slowFactor : 1.1) + t.id) *
            55;
      if (t.burn > 0 && t.hp > 0)
        this.damage(t, t.burnPower * dt, "fire", undefined, true);
      t.burn = Math.max(0, t.burn - dt);
      t.slow = Math.max(0, t.slow - dt);
    }
    const due = this.pending.filter((p) => p.at <= s.time);
    this.pending = this.pending.filter((p) => p.at > s.time);
    for (const p of due)
      s.manifestations.push({
        id: this.nextId++,
        branch: p.branch,
        x: 70,
        y: 190,
        angle: p.angle,
        age: 0,
        tick: -1,
        active: true,
      });
    for (const m of s.manifestations) {
      if (!m.active) continue;
      const b = m.branch;
      m.age += dt;
      if (b.shape === "projectile") {
        const distance =
          b.speed * (b.elements.lightning ? B.lightningSpeed : 1) * dt;
        const ox = m.x,
          oy = m.y;
        m.x += Math.cos(m.angle) * distance;
        m.y += Math.sin(m.angle) * distance;
        const hit = s.targets
          .filter((t) => t.hp > 0)
          .map((t) => {
            const dx = m.x - ox,
              dy = m.y - oy,
              u = Math.max(
                0,
                Math.min(
                  1,
                  ((t.x - ox) * dx + (t.y - oy) * dy) / (dx * dx + dy * dy),
                ),
              );
            return {
              t,
              u,
              d: Math.hypot(t.x - (ox + u * dx), t.y - (oy + u * dy)),
            };
          })
          .filter((v) => v.d < B.targetRadius)
          .sort((a, b) => a.u - b.u)[0];
        if (hit) {
          this.impact(hit.t, b, 1);
          m.active = false;
        }
        if (Math.hypot(m.x - 70, m.y - 190) >= b.range) m.active = false;
      } else {
        m.x = b.shape === "area" ? 70 + Math.min(b.range, B.areaDistance) : 70;
        m.y = 190 + Math.sin(m.angle) * 200;
        const tick = Math.floor((m.age - 1e-8) / B.pulse);
        if (tick > m.tick && m.age <= b.duration) {
          m.tick = tick;
          for (const t of s.targets) {
            if (t.hp <= 0) continue;
            const dx = t.x - 70,
              dy = t.y - 190;
            const along = dx * Math.cos(m.angle) + dy * Math.sin(m.angle),
              perp = Math.abs(-dx * Math.sin(m.angle) + dy * Math.cos(m.angle));
            if (
              b.shape === "area"
                ? Math.hypot(t.x - m.x, t.y - m.y) < b.radius
                : along > 0 && along < b.range && perp < B.beamHalfWidth
            )
              this.impact(t, b, B.pulse);
          }
        }
        if (m.age >= b.duration) m.active = false;
      }
    }
    if (s.manifestations.length > 100)
      s.manifestations = s.manifestations.filter((m) => m.active);
    if (
      !this.pending.length &&
      !s.manifestations.some((m) => m.active) &&
      !s.targets.some((t) => t.burn > 0 || t.slow > 0)
    )
      s.running = false;
  }
}
