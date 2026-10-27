import { useEffect, useRef } from "react";
import { Application, Graphics } from "pixi.js";
import { BALANCE, RUNES, type Branch, type Element } from "../engine/model";
import type { Simulation } from "../engine/simulation";
const color = (e: Element) => parseInt(RUNES[e].color.slice(1), 16);
const dominant = (b: Branch): Element =>
  b.elements.lightning ? "lightning" : b.elements.ice ? "ice" : "fire";
export function Arena({
  simulation,
  paused,
  speed,
  onFrame,
}: {
  simulation: Simulation | null;
  paused: boolean;
  speed: number;
  onFrame: () => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef({ simulation, paused, speed, onFrame });
  useEffect(() => {
    latest.current = { simulation, paused, speed, onFrame };
  }, [simulation, paused, speed, onFrame]);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let app: Application | undefined;
    let observer: ResizeObserver | undefined;
    async function init() {
      const instance = new Application();
      await instance.init({
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(devicePixelRatio, 2),
        autoDensity: true,
        width: el!.clientWidth,
        height: 360,
        preference: "webgl",
      });
      if (disposed) {
        instance.destroy(true);
        return;
      }
      app = instance;
      el!.appendChild(instance.canvas);
      const g = new Graphics();
      instance.stage.addChild(g);
      const resize = () => {
        instance.renderer.resize(
          el!.clientWidth,
          (el!.clientWidth * 380) / 720,
        );
        g.scale.set(el!.clientWidth / 720);
      };
      observer = new ResizeObserver(resize);
      observer.observe(el!);
      resize();
      let elapsed = 0,
        frames = 0;
      instance.ticker.add((ticker) => {
        const state = latest.current;
        if (state.simulation && !state.paused)
          state.simulation.advance((ticker.deltaMS / 1000) * state.speed);
        elapsed += ticker.deltaMS / 1000;
        g.clear();
        // Etched grid and concentric casting platform.
        for (let x = 30; x < 720; x += 35)
          for (let y = 15; y < 380; y += 35)
            g.circle(x, y, 0.8).fill({ color: 0x59726e, alpha: 0.22 });
        g.ellipse(70, 200, 38, 18).stroke({
          width: 1,
          color: 0x9bd7bf,
          alpha: 0.55,
        });
        g.circle(70, 190, 24).stroke({ width: 1, color: 0x6aa894, alpha: 0.5 });
        g.moveTo(25, 190)
          .lineTo(690, 190)
          .stroke({ width: 1, color: 0x59726e, alpha: 0.12 });
        const s = state.simulation?.state;
        if (s) {
          for (const t of s.targets) {
            const alive = t.hp > 0;
            const c = t.slow > 0 ? 0x88e0ee : t.burn > 0 ? 0xff9966 : 0x99aca2;
            g.ellipse(t.x, t.y + 20, 24, 8).fill({
              color: 0x000000,
              alpha: 0.35,
            });
            g.circle(t.x, t.y, 19)
              .fill({ color: 0x18282c, alpha: alive ? 1 : 0.3 })
              .stroke({ width: 1.5, color: c, alpha: alive ? 0.8 : 0.2 });
            g.moveTo(t.x - 10, t.y)
              .lineTo(t.x + 10, t.y)
              .moveTo(t.x, t.y - 10)
              .lineTo(t.x, t.y + 10)
              .stroke({ color: c, width: 1 });
            g.rect(t.x - 21, t.y - 32, 42, 3).fill(0x263638);
            g.rect(t.x - 21, t.y - 32, (42 * t.hp) / BALANCE.targetHp, 3).fill(
              c,
            );
            if (t.slow > 0) {
              for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI) / 3;
                g.moveTo(t.x + Math.cos(a) * 21, t.y + Math.sin(a) * 21)
                  .lineTo(t.x + Math.cos(a) * 27, t.y + Math.sin(a) * 27)
                  .stroke({ color: 0x93eeff, width: 2 });
              }
            }
            if (t.burn > 0)
              for (let i = 0; i < 5; i++) {
                const f = (elapsed * 1.5 + i * 0.21) % 1;
                g.circle(
                  t.x + Math.sin(i * 4 + elapsed) * 13,
                  t.y + 10 - f * 38,
                  2 * (1 - f),
                ).fill({ color: 0xffa25f, alpha: 1 - f });
              }
          }
          for (const m of s.manifestations) {
            if (!m.active) continue;
            const e = dominant(m.branch),
              c = color(e);
            if (m.branch.shape === "projectile") {
              for (let i = 10; i >= 0; i--)
                g.circle(
                  m.x - Math.cos(m.angle) * i * 4,
                  m.y - Math.sin(m.angle) * i * 4,
                  Math.max(0.5, 7 - i * 0.5),
                ).fill({ color: c, alpha: (1 - i / 11) * 0.38 });
              if (e === "ice") {
                g.poly([
                  m.x + 13,
                  m.y,
                  m.x - 7,
                  m.y - 6,
                  m.x - 3,
                  m.y,
                  m.x - 7,
                  m.y + 6,
                ]).fill(c);
              } else if (e === "lightning") {
                g.moveTo(m.x - 28, m.y)
                  .lineTo(m.x - 14, m.y - 8)
                  .lineTo(m.x - 8, m.y + 5)
                  .lineTo(m.x + 10, m.y)
                  .stroke({ width: 3, color: c });
              } else {
                g.circle(m.x, m.y, 5).fill(c);
              }
              g.circle(m.x, m.y, 2).fill(0xffffff);
            } else if (m.branch.shape === "area") {
              const r = m.branch.radius;
              g.circle(m.x, m.y, r)
                .fill({ color: c, alpha: 0.045 })
                .stroke({ width: 1, color: c, alpha: 0.5 });
              g.circle(m.x, m.y, r * ((m.age * 2) % 1)).stroke({
                width: 2,
                color: c,
                alpha: 0.5,
              });
              for (let i = 0; i < 8; i++) {
                const a = (i * Math.PI) / 4 + elapsed * 0.25;
                g.circle(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r, 2).fill(
                  c,
                );
              }
            } else {
              const x = 70 + Math.cos(m.angle) * m.branch.range,
                y = 190 + Math.sin(m.angle) * m.branch.range;
              for (const [width, alpha] of [
                [24, 0.04],
                [12, 0.13],
                [4, 0.7],
                [1, 1],
              ])
                g.moveTo(70, 190)
                  .lineTo(x, y)
                  .stroke({ width, color: c, alpha });
            }
          }
          const hits = s.hits
            .filter((h) => s.time - h.time < 0.65 && !h.status)
            .slice(-BALANCE.maxParticles / 8);
          for (const h of hits) {
            const age = s.time - h.time,
              c = color(h.element);
            g.circle(h.x, h.y, 6 + age * 36).stroke({
              color: c,
              width: 1,
              alpha: Math.max(0, 1 - age / 0.65),
            });
            for (let i = 0; i < 6; i++) {
              const a = (i * Math.PI) / 3 + h.id;
              g.circle(
                h.x + Math.cos(a) * age * 65,
                h.y + Math.sin(a) * age * 65,
                2,
              ).fill({ color: c, alpha: Math.max(0, 1 - age / 0.65) });
            }
            if (h.chainFrom)
              g.moveTo(h.chainFrom.x, h.chainFrom.y)
                .lineTo(
                  (h.x + h.chainFrom.x) / 2 + 8,
                  (h.y + h.chainFrom.y) / 2 - 13,
                )
                .lineTo(h.x, h.y)
                .stroke({ width: 2, color: c, alpha: 1 - age / 0.65 });
          }
        }
        g.circle(70, 190, 7 + Math.sin(elapsed * 2)).fill({
          color: 0xc6edd3,
          alpha: 0.8,
        });
        g.circle(70, 190, 3).fill(0xffffff);
        if (++frames % 6 === 0) state.onFrame();
      });
    }
    void init().catch(() => {
      if (el && !disposed)
        el.textContent =
          "No se pudo iniciar WebGL. La simulación lógica sigue disponible en las pruebas.";
    });
    return () => {
      disposed = true;
      observer?.disconnect();
      app?.destroy(true, { children: true });
    };
  }, []);
  return (
    <div
      className="arena-canvas"
      ref={host}
      aria-label="Arena de simulación mágica"
    />
  );
}
