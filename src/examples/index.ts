import type { Graph, Rune } from "../engine/model";
export function chain(runes: Rune[]): Graph {
  return {
    version: 1,
    nodes: runes.map((rune, i) => ({
      id: `n${i}`,
      rune,
      level: 1,
      x: 80 + i * 185,
      y: 150,
    })),
    edges: runes
      .slice(1)
      .map((_, i) => ({ id: `e${i}`, source: `n${i}`, target: `n${i + 1}` })),
  };
}
const fork: Graph = {
  version: 1,
  nodes: [
    { id: "s", rune: "start", level: 1, x: 40, y: 190 },
    { id: "b", rune: "fork", level: 1, x: 230, y: 190 },
    { id: "f", rune: "fire", level: 1, x: 420, y: 80 },
    { id: "i", rune: "ice", level: 1, x: 420, y: 300 },
    { id: "p", rune: "projectile", level: 1, x: 610, y: 80 },
    { id: "a", rune: "area", level: 1, x: 610, y: 300 },
  ],
  edges: [
    ["s", "b"],
    ["b", "f"],
    ["b", "i"],
    ["f", "p"],
    ["i", "a"],
  ].map(([source, target], i) => ({ id: `e${i}`, source, target })),
};
export const EXAMPLES = [
  {
    name: "Ascua primordial",
    subtitle: "Fuego · Proyectil",
    graph: chain(["start", "fire", "projectile"]),
  },
  {
    name: "Aguja boreal",
    subtitle: "Hielo · Alcance",
    graph: chain(["start", "ice", "projectile", "range", "range"]),
  },
  {
    name: "Pulso de tormenta",
    subtitle: "Rayo · Impulso",
    graph: chain(["start", "lightning", "projectile", "impulse"]),
  },
  {
    name: "Lluvia de brasas",
    subtitle: "Fuego · División · Potencia",
    graph: chain(["start", "fire", "projectile", "split", "power"]),
  },
  {
    name: "Círculo de ceniza",
    subtitle: "Fuego · Área",
    graph: chain(["start", "fire", "area", "power"]),
  },
  {
    name: "Invierno eterno",
    subtitle: "Hielo · Haz · Duración",
    graph: chain(["start", "ice", "beam", "duration"]),
  },
  {
    name: "Eco incandescente",
    subtitle: "Fuego · Repetición",
    graph: chain(["start", "fire", "projectile", "repeat"]),
  },
  {
    name: "Convergencia dual",
    subtitle: "Bifurcación · Fuego + Hielo",
    graph: fork,
  },
];
