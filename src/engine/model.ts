export type Element = "fire" | "ice" | "lightning";
export type Shape = "projectile" | "area" | "beam";
export type Rune =
  | Element
  | Shape
  | "start"
  | "fork"
  | "merge"
  | "impulse"
  | "split"
  | "power"
  | "duration"
  | "range"
  | "repeat";
export interface RuneNode {
  id: string;
  rune: Rune;
  level: number;
  x: number;
  y: number;
}
export interface Edge {
  id: string;
  source: string;
  target: string;
}
export interface Graph {
  version: 1;
  nodes: RuneNode[];
  edges: Edge[];
}
export interface RuneDefinition {
  name: string;
  symbol: string;
  category: string;
  color: string;
  description: string;
  cost: number;
  inputs: number;
  outputs: number;
}
export const RUNES: Record<Rune, RuneDefinition> = {
  start: {
    name: "Inicio",
    symbol: "◈",
    category: "Estructura",
    color: "#d8bc7b",
    description: "Entrada única de energía al circuito.",
    cost: 0,
    inputs: 0,
    outputs: 1,
  },
  fork: {
    name: "Bifurcación",
    symbol: "⑂",
    category: "Estructura",
    color: "#d8bc7b",
    description:
      "Copia el contexto en dos ramas independientes; ambas pagan su coste.",
    cost: 3,
    inputs: 1,
    outputs: 2,
  },
  merge: {
    name: "Fusión",
    symbol: "⋈",
    category: "Estructura",
    color: "#d8bc7b",
    description:
      "Une dos ramas de la misma forma. Suma componentes; conserva los máximos de los modificadores.",
    cost: 4,
    inputs: 2,
    outputs: 1,
  },
  fire: {
    name: "Fuego",
    symbol: "焰",
    category: "Elemento",
    color: "#ff9662",
    description: "12 de daño; quemadura durante 1,5 s.",
    cost: 8,
    inputs: 1,
    outputs: 1,
  },
  ice: {
    name: "Hielo",
    symbol: "❄",
    category: "Elemento",
    color: "#79dbea",
    description: "9 de daño; ralentiza un 50% durante 1,5 s.",
    cost: 7,
    inputs: 1,
    outputs: 1,
  },
  lightning: {
    name: "Rayo",
    symbol: "ϟ",
    category: "Elemento",
    color: "#bdabff",
    description:
      "10 de daño; salta a un objetivo cercano al 40%. Velocidad ×1,6.",
    cost: 10,
    inputs: 1,
    outputs: 1,
  },
  projectile: {
    name: "Proyectil",
    symbol: "➶",
    category: "Forma",
    color: "#83c8a6",
    description: "Viaja y colisiona con el primer objetivo.",
    cost: 4,
    inputs: 1,
    outputs: 1,
  },
  area: {
    name: "Área",
    symbol: "◎",
    category: "Forma",
    color: "#83c8a6",
    description: "Pulsa sobre todos los objetivos dentro de su radio.",
    cost: 7,
    inputs: 1,
    outputs: 1,
  },
  beam: {
    name: "Haz",
    symbol: "╱",
    category: "Forma",
    color: "#83c8a6",
    description: "Canal direccional que impacta cada 0,25 s.",
    cost: 8,
    inputs: 1,
    outputs: 1,
  },
  impulse: {
    name: "Impulso",
    symbol: "»",
    category: "Modificador",
    color: "#b5a2d7",
    description: "Velocidad ×(1 + 0,5 × nivel). Solo proyectil.",
    cost: 3,
    inputs: 1,
    outputs: 1,
  },
  split: {
    name: "División",
    symbol: "⋔",
    category: "Modificador",
    color: "#b5a2d7",
    description:
      "Añade manifestaciones y reparte la energía actual entre ellas.",
    cost: 5,
    inputs: 1,
    outputs: 1,
  },
  power: {
    name: "Potencia",
    symbol: "✦",
    category: "Modificador",
    color: "#b5a2d7",
    description: "Añade 8 de energía por nivel a cada manifestación actual.",
    cost: 6,
    inputs: 1,
    outputs: 1,
  },
  duration: {
    name: "Duración",
    symbol: "◷",
    category: "Modificador",
    color: "#b5a2d7",
    description: "Añade 0,75 s por nivel al haz, área y estados.",
    cost: 3,
    inputs: 1,
    outputs: 1,
  },
  range: {
    name: "Alcance",
    symbol: "↗",
    category: "Modificador",
    color: "#b5a2d7",
    description: "Añade 90 unidades por nivel; radio +10.",
    cost: 3,
    inputs: 1,
    outputs: 1,
  },
  repeat: {
    name: "Repetición",
    symbol: "↻",
    category: "Modificador",
    color: "#b5a2d7",
    description: "Añade activaciones separadas 0,45 s; paga cada activación.",
    cost: 5,
    inputs: 1,
    outputs: 1,
  },
};
export const BALANCE = {
  maxNodes: 48,
  maxDepth: 24,
  maxManifestations: 12,
  maxRepeats: 6,
  maxDuration: 6,
  maxDamage: 1500,
  maxRadius: 120,
  maxEvents: 3000,
  maxParticles: 350,
  step: 1 / 60,
  speed: 240,
  range: 430,
  radius: 65,
  duration: 1.5,
  interval: 0.45,
  pulse: 0.25,
  baseDamage: { fire: 12, ice: 9, lightning: 10 },
  power: 8,
  impulse: 0.5,
  durationBonus: 0.75,
  rangeBonus: 90,
  radiusBonus: 10,
  splitCost: 0.15,
  burnRate: 0.18,
  slowFactor: 0.5,
  lightningSpeed: 1.6,
  chainRange: 115,
  chainDamage: 0.4,
  targetHp: 500,
  targetRadius: 20,
  beamHalfWidth: 19,
  spread: 0.105,
  areaDistance: 300,
  maxSpeed: 1600,
  maxRange: 1200,
  maxEdges: 96,
};
export interface Branch {
  elements: Record<Element, number>;
  shape: Shape;
  count: number;
  repeats: number;
  speed: number;
  range: number;
  radius: number;
  duration: number;
  cost: number;
}
export interface Program {
  version: 1;
  branches: Branch[];
  totalComplexity: number;
  warnings: string[];
}
export interface Stats {
  energy: number;
  damage: number;
  manifestations: number;
  speed: number;
  range: number;
  radius: number;
  duration: number;
  interval: number;
  executionTime: number;
  elemental: Record<Element, number>;
  statuses: string[];
}
export class SpellError extends Error {}
export function parseGraph(value: unknown): Graph {
  if (!value || typeof value !== "object")
    throw new SpellError("El archivo debe contener un objeto.");
  const g = value as Graph;
  if (g.version !== 1)
    throw new SpellError("Versión de hechizo no compatible (se requiere 1).");
  if (
    !Array.isArray(g.nodes) ||
    !Array.isArray(g.edges) ||
    g.nodes.length > BALANCE.maxNodes ||
    g.edges.length > BALANCE.maxEdges
  )
    throw new SpellError("Estructura inválida o demasiado grande.");
  const nodes = g.nodes.map((n) => {
    if (
      !n ||
      typeof n.id !== "string" ||
      !n.id ||
      n.id.length > 80 ||
      !Object.hasOwn(RUNES, n.rune) ||
      !Number.isInteger(n.level) ||
      n.level < 1 ||
      n.level > 3 ||
      (["start", "fork", "merge"].includes(n.rune) && n.level !== 1) ||
      !Number.isFinite(n.x) ||
      !Number.isFinite(n.y) ||
      Math.abs(n.x) > 100000 ||
      Math.abs(n.y) > 100000
    )
      throw new SpellError(
        "Nodo inválido: revisa tipo, posición y nivel (1–3).",
      );
    return { id: n.id, rune: n.rune, level: n.level, x: n.x, y: n.y };
  });
  const edges = g.edges.map((e) => {
    if (
      !e ||
      typeof e.id !== "string" ||
      typeof e.source !== "string" ||
      typeof e.target !== "string"
    )
      throw new SpellError("Conexión inválida.");
    return { id: e.id, source: e.source, target: e.target };
  });
  if (
    new Set(nodes.map((n) => n.id)).size !== nodes.length ||
    new Set(edges.map((e) => e.id)).size !== edges.length
  )
    throw new SpellError("Los identificadores deben ser únicos.");
  return { version: 1, nodes, edges };
}
