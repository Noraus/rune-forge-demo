import { create } from "zustand";
import { parseGraph, type Graph } from "../engine/model";
import { EXAMPLES } from "../examples";
const KEY = "rune-forge.v1";
export const serialize = (g: Graph) => JSON.stringify(parseGraph(g), null, 2);
export const deserialize = (text: string) => {
  if (text.length > 100000) throw new Error("El archivo supera 100 KB.");
  return parseGraph(JSON.parse(text));
};
function restore() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? deserialize(raw) : EXAMPLES[0].graph;
  } catch {
    return EXAMPLES[0].graph;
  }
}
interface Store {
  graph: Graph;
  past: Graph[];
  future: Graph[];
  saveError: string;
  setGraph: (g: Graph, history?: boolean) => void;
  undo: () => void;
  redo: () => void;
}
function persist(g: Graph) {
  try {
    localStorage.setItem(KEY, serialize(g));
    return "";
  } catch {
    return "No se pudo guardar la sesión en este navegador. Exporta el JSON.";
  }
}
export const useForge = create<Store>((set, get) => ({
  graph: restore(),
  past: [],
  future: [],
  saveError: "",
  setGraph: (g, history = true) =>
    set({
      graph: g,
      past: history ? [...get().past.slice(-39), get().graph] : get().past,
      future: history ? [] : get().future,
      saveError: persist(g),
    }),
  undo: () => {
    const { past, graph, future } = get();
    if (past.length) {
      const g = past[past.length - 1];
      set({
        graph: g,
        past: past.slice(0, -1),
        future: [graph, ...future],
        saveError: persist(g),
      });
    }
  },
  redo: () => {
    const { past, graph, future } = get();
    if (future.length) {
      const g = future[0];
      set({
        graph: g,
        past: [...past, graph],
        future: future.slice(1),
        saveError: persist(g),
      });
    }
  },
}));
