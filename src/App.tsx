import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  useReactFlow,
  type NodeProps,
  type Node,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { RUNES, BALANCE, type Rune, type Graph } from "./engine/model";
import { compile } from "./engine/composition";
import { resolve } from "./engine/resolution";
import { Simulation, type Scenario } from "./engine/simulation";
import { EXAMPLES } from "./examples";
import { deserialize, serialize, useForge } from "./state/store";
import { Arena } from "./renderer/Arena";
import "./styles/app.css";
type RuneData = { rune: Rune; level: number; invalid: boolean };
function RuneCard({ data, selected }: NodeProps<Node<RuneData>>) {
  const r = RUNES[data.rune];
  return (
    <div
      className={`rune-node ${selected ? "selected" : ""} ${data.invalid ? "invalid" : ""}`}
      style={{ "--rune": r.color } as React.CSSProperties}
    >
      {r.inputs > 0 && <Handle type="target" position={Position.Left} />}
      <span className="node-symbol">{r.symbol}</span>
      <div>
        <small>{r.category}</small>
        <strong>{r.name}</strong>
      </div>
      <b className="node-level">{data.level > 1 ? `×${data.level}` : "1"}</b>
      {r.outputs > 0 && <Handle type="source" position={Position.Right} />}
    </div>
  );
}
const nodeTypes = { rune: RuneCard };
const fmt = (n: number) => Number(n.toFixed(2)).toLocaleString("es");
function Forge() {
  const { graph, setGraph, undo, redo, past, future, saveError } = useForge();
  const [selected, setSelected] = useState<string | null>(null),
    [example, setExample] = useState(0),
    [notice, setNotice] = useState(""),
    [scenario, setScenario] = useState<Scenario>("static"),
    [simulation, setSimulation] = useState<Simulation | null>(null),
    [paused, setPaused] = useState(false),
    [speed, setSpeed] = useState(1),
    [seed, setSeed] = useState(42),
    [, refresh] = useState(0);
  const file = useRef<HTMLInputElement>(null),
    flow = useReactFlow();
  const analysis = useMemo(() => {
    try {
      const program = compile(graph);
      return { program, stats: resolve(program), error: "" };
    } catch (e) {
      return { program: null, stats: null, error: (e as Error).message };
    }
  }, [graph]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const resize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void flow.fitView({ padding: 0.22 }), 120);
    };
    window.addEventListener("resize", resize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", resize);
    };
  }, [flow]);
  const current = graph.nodes.find((n) => n.id === selected),
    definition = current ? RUNES[current.rune] : null;
  const notifyFrame = useCallback(() => refresh((n) => n + 1), []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,textarea,select")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [undo, redo]);
  function addRune(rune: Rune, position?: { x: number; y: number }) {
    if (graph.nodes.length >= BALANCE.maxNodes) {
      setNotice("Máximo de 48 runas.");
      return;
    }
    const p =
      position ??
      flow.screenToFlowPosition({ x: window.innerWidth * 0.48, y: 330 });
    setGraph({
      ...graph,
      nodes: [
        ...graph.nodes,
        { id: crypto.randomUUID(), rune, level: 1, x: p.x, y: p.y },
      ],
    });
  }
  function onConnect(c: Connection) {
    if (!c.source || !c.target) return;
    const source = graph.nodes.find((n) => n.id === c.source)!,
      target = graph.nodes.find((n) => n.id === c.target)!;
    if (
      c.source === c.target ||
      target.rune === "start" ||
      graph.edges.some((e) => e.source === c.source && e.target === c.target) ||
      graph.edges.filter((e) => e.source === c.source).length >=
        RUNES[source.rune].outputs ||
      graph.edges.filter((e) => e.target === c.target).length >=
        RUNES[target.rune].inputs
    ) {
      setNotice(
        "Conexión incompatible: revisa puertos y número de entradas/salidas.",
      );
      return;
    }
    const reachable = (id: string, seen = new Set<string>()): boolean => {
      if (id === c.source) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return graph.edges
        .filter((e) => e.source === id)
        .some((e) => reachable(e.target, seen));
    };
    if (reachable(c.target)) {
      setNotice("No se permiten ciclos.");
      return;
    }
    setGraph({
      ...graph,
      edges: [
        ...graph.edges,
        { id: crypto.randomUUID(), source: c.source, target: c.target },
      ],
    });
    setNotice("");
  }
  function onNodesChange(changes: NodeChange[]) {
    let g: Graph = {
      ...graph,
      nodes: [...graph.nodes],
      edges: [...graph.edges],
    };
    let changed = false;
    for (const c of changes) {
      if (c.type === "remove") {
        g = {
          ...g,
          nodes: g.nodes.filter((n) => n.id !== c.id),
          edges: g.edges.filter((e) => e.source !== c.id && e.target !== c.id),
        };
        changed = true;
      }
      if (c.type === "position" && c.position) {
        g.nodes = g.nodes.map((n) =>
          n.id === c.id ? { ...n, x: c.position!.x, y: c.position!.y } : n,
        );
        changed = true;
      }
      if (c.type === "select" && c.selected) setSelected(c.id);
    }
    if (changed) setGraph(g);
  }
  function onEdgesChange(changes: EdgeChange[]) {
    const ids = changes.filter((c) => c.type === "remove").map((c) => c.id);
    if (ids.length)
      setGraph({
        ...graph,
        edges: graph.edges.filter((e) => !ids.includes(e.id)),
      });
  }
  function load(i: number) {
    setExample(i);
    setGraph(structuredClone(EXAMPLES[i].graph));
    setSelected(null);
    setNotice("Ejemplo cargado. Modifica sus runas para experimentar.");
    setTimeout(() => void flow.fitView({ padding: 0.2, duration: 300 }), 50);
  }
  function arrange() {
    const depths = new Map<string, number>();
    for (let pass = 0; pass < graph.nodes.length; pass++)
      for (const n of graph.nodes) {
        const parents = graph.edges.filter((e) => e.target === n.id);
        if (!parents.length) depths.set(n.id, 0);
        else if (parents.every((e) => depths.has(e.source)))
          depths.set(
            n.id,
            Math.min(
              24,
              Math.max(...parents.map((e) => depths.get(e.source)!)) + 1,
            ),
          );
      }
    const rows = new Map<number, number>();
    setGraph({
      ...graph,
      nodes: graph.nodes.map((n) => {
        const d = depths.get(n.id) ?? 0,
          row = rows.get(d) ?? 0;
        rows.set(d, row + 1);
        return { ...n, x: 70 + d * 205, y: 100 + row * 150 };
      }),
    });
    setTimeout(() => void flow.fitView({ padding: 0.2, duration: 300 }), 50);
  }
  function cast() {
    if (!analysis.program) return;
    setSimulation(new Simulation(analysis.program, scenario, seed));
    setPaused(false);
  }
  function exportFile() {
    const url = URL.createObjectURL(
      new Blob([serialize(graph)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "rune-forge.spell.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(f: File) {
    try {
      if (f.size > 100000)
        throw new Error("Archivo demasiado grande (máximo 100 KB).");
      setGraph(deserialize(await f.text()));
      setSelected(null);
      setNotice("Hechizo importado. Revisa su validación antes de lanzarlo.");
      setTimeout(() => void flow.fitView({ padding: 0.2 }), 50);
    } catch (e) {
      setNotice(`Importación rechazada: ${(e as Error).message}`);
    }
  }
  const s = simulation?.state,
    stats = analysis.stats;
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark">✧</span>
          <div>
            RUNE <em>FORGE</em>
            <small>LABORATORIO DE MAGIA MODULAR</small>
          </div>
        </a>
        <div className="header-middle">
          <span className="live-dot" /> Entorno de experimentación{" "}
          <span className="version">v1.0</span>
        </div>
        <div className="header-actions">
          <button onClick={() => file.current?.click()}>↑ Importar</button>
          <button onClick={exportFile}>↓ Exportar JSON</button>
          <input
            type="file"
            accept=".json,application/json"
            ref={file}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>
      <div className="workspace-top">
        <div>
          <span className="eyebrow">EL TALLER / COMPOSICIÓN</span>
          <h1>
            De una chispa, infinitas posibilidades<span>.</span>
          </h1>
          <p>Conecta runas. Transforma la energía. Descubre lo que sucede.</p>
        </div>
        <div className="session-badge">
          <span className="live-dot" />{" "}
          {saveError
            ? "Guardado no disponible"
            : "Sesión guardada en este navegador"}
        </div>
      </div>
      <main className="workbench">
        <aside className="library panel">
          <div className="panel-heading">
            <span>01 / BIBLIOTECA</span>
            <span className="pill">15 runas</span>
          </div>
          <h2>Tu alfabeto arcano</h2>
          <p className="hint">
            Arrastra una runa al lienzo o pulsa para añadirla.
          </p>
          {["Elemento", "Forma", "Modificador", "Estructura"].map(
            (category) => (
              <section className="rune-category" key={category}>
                <h3>
                  {category}
                  <span>
                    {
                      Object.values(RUNES).filter(
                        (r) => r.category === category,
                      ).length
                    }
                  </span>
                </h3>
                <div className="rune-list">
                  {(Object.entries(RUNES) as [Rune, (typeof RUNES)[Rune]][])
                    .filter(([, r]) => r.category === category)
                    .map(([key, r]) => (
                      <button
                        key={key}
                        className="library-rune"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/rune", key);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => addRune(key)}
                        title={`${r.description} Coste base: ${r.cost}`}
                        style={{ "--rune": r.color } as React.CSSProperties}
                      >
                        <span className="library-symbol">{r.symbol}</span>
                        <span>
                          <strong>{r.name}</strong>
                          <small>{r.description}</small>
                        </span>
                        <span className="add">+</span>
                      </button>
                    ))}
                </div>
              </section>
            ),
          )}
        </aside>
        <section className="composition panel">
          <div className="panel-heading">
            <span>02 / CIRCUITO DE COMPOSICIÓN</span>
            <span className={`validation ${analysis.error ? "bad" : ""}`}>
              {analysis.error ? "◇ Revisar circuito" : "● Circuito estable"}
            </span>
          </div>
          <div className="editor-toolbar">
            <div>
              <span className="field-label">COMPOSICIÓN</span>
              <select
                aria-label="Composición de ejemplo"
                value={example}
                onChange={(e) => load(Number(e.target.value))}
              >
                {EXAMPLES.map((e, i) => (
                  <option key={e.name} value={i}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="icon-actions">
              <button
                title="Deshacer · Ctrl Z"
                disabled={!past.length}
                onClick={undo}
              >
                ↶
              </button>
              <button
                title="Rehacer · Ctrl Shift Z"
                disabled={!future.length}
                onClick={redo}
              >
                ↷
              </button>
              <span />
              <button title="Restablecer ejemplo" onClick={() => load(example)}>
                ↻
              </button>
              <button title="Ordenar grafo" onClick={arrange}>
                ☷
              </button>
            </div>
          </div>
          <div
            className="editor"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const rune = e.dataTransfer.getData("application/rune") as Rune;
              if (Object.hasOwn(RUNES, rune))
                addRune(
                  rune,
                  flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }),
                );
            }}
          >
            <ReactFlow
              nodes={graph.nodes.map((n) => ({
                id: n.id,
                type: "rune",
                width: 180,
                height: 78,
                position: { x: n.x, y: n.y },
                data: {
                  rune: n.rune,
                  level: n.level,
                  invalid: !!analysis.error,
                },
                selected: n.id === selected,
              }))}
              edges={graph.edges.map((e) => ({
                ...e,
                animated: !analysis.error,
                style: {
                  stroke: analysis.error ? "#916c64" : "#91baa2",
                  strokeWidth: 1.5,
                },
              }))}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onPaneClick={() => setSelected(null)}
              fitView
              fitViewOptions={{ padding: 0.22 }}
              minZoom={0.2}
              maxZoom={1.8}
              deleteKeyCode={["Backspace", "Delete"]}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#3b4545" gap={22} size={1} />
              <Controls showInteractive={false} />
            </ReactFlow>
            {!graph.nodes.length && (
              <div className="empty-editor">
                Arrastra Inicio para comenzar tu primer circuito.
              </div>
            )}
            <div className="canvas-caption">
              GRAFO DIRIGIDO · {graph.nodes.length}/{BALANCE.maxNodes} RUNAS{" "}
              <span>Arrastra entre puertos para conectar</span>
            </div>
          </div>
          <div
            className={`diagnostics ${analysis.error ? "error" : ""}`}
            role="status"
          >
            <span>{analysis.error ? "⚠" : "✧"}</span>
            <div>
              <strong>
                {analysis.error
                  ? "El circuito necesita un ajuste"
                  : "La energía fluye sin interrupciones"}
              </strong>
              <p>
                {analysis.error ||
                  "Selecciona una runa para inspeccionarla, o lanza el hechizo en la arena."}
              </p>
              {analysis.program?.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          </div>
        </section>
        <aside className="inspector panel">
          <div className="panel-heading">
            <span>03 / INSPECTOR</span>
            <span>◈</span>
          </div>
          <h2>{definition ? definition.name : "Lectura del hechizo"}</h2>
          {current && definition ? (
            <div className="selected-rune">
              <div
                className="inspector-symbol"
                style={{ color: definition.color }}
              >
                {definition.symbol}
              </div>
              <span className="eyebrow">{definition.category}</span>
              <p>{definition.description}</p>
              {!["start", "fork", "merge"].includes(current.rune) && (
                <label className="level-control">
                  Nivel <b>{current.level}</b>
                  <input
                    aria-label="Nivel de runa"
                    type="range"
                    min="1"
                    max="3"
                    value={current.level}
                    onChange={(e) =>
                      setGraph({
                        ...graph,
                        nodes: graph.nodes.map((n) =>
                          n.id === current.id
                            ? { ...n, level: Number(e.target.value) }
                            : n,
                        ),
                      })
                    }
                  />
                </label>
              )}
              <small>
                {definition.inputs} entradas · hasta {definition.outputs}{" "}
                salidas · coste base {definition.cost}
              </small>
              <button
                className="delete-button"
                onClick={() => {
                  setGraph({
                    ...graph,
                    nodes: graph.nodes.filter((n) => n.id !== current.id),
                    edges: graph.edges.filter(
                      (e) => e.source !== current.id && e.target !== current.id,
                    ),
                  });
                  setSelected(null);
                }}
              >
                Eliminar runa
              </button>
            </div>
          ) : (
            <p className="hint">
              Cada conexión transforma el resultado. Selecciona una runa para
              explorar sus reglas.
            </p>
          )}
          <div className="stats-heading">PROYECCIÓN ENERGÉTICA</div>
          <div className="energy">
            <span>{stats ? fmt(stats.energy) : "—"}</span>
            <div>
              energía<small>Coste total por lanzamiento</small>
            </div>
            <span className="energy-icon">ϟ</span>
          </div>
          <dl className="spell-stats">
            {[
              ["Daño directo potencial", stats?.damage],
              ["Manifestaciones", stats?.manifestations],
              ["Velocidad máxima", stats?.speed],
              ["Alcance", stats?.range],
              ["Radio", stats?.radius],
              ["Persistencia / estados", stats?.duration],
              ["Intervalo de repetición", stats?.interval],
              ["Tiempo estimado", stats?.executionTime],
              ["Complejidad", analysis.program?.totalComplexity],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {typeof value === "number" ? fmt(value) : "—"}
                  {[
                    "Persistencia / estados",
                    "Intervalo de repetición",
                    "Tiempo estimado",
                  ].includes(String(label))
                    ? " s"
                    : ""}
                </dd>
              </div>
            ))}
          </dl>
          <div className="element-breakdown">
            {(["fire", "ice", "lightning"] as const).map((e) => (
              <div key={e}>
                <span style={{ color: RUNES[e].color }}>
                  {RUNES[e].symbol} {RUNES[e].name}
                </span>
                <b>{stats ? fmt(stats.elemental[e]) : "—"}</b>
              </div>
            ))}
          </div>
          <p className="hint">
            Daño potencial por activación completa; quemaduras y cadenas se
            contabilizan al impactar.
          </p>
          <div className="status-tags">
            {stats?.statuses.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </aside>
        <section className="simulator panel">
          <div className="simulation-header">
            <div>
              <div className="panel-heading">
                <span>04 / ARENA DE PRUEBAS</span>
              </div>
              <h2>
                La teoría se convierte en magia
                <span className="arena-label">
                  {s?.running
                    ? paused
                      ? "EN PAUSA"
                      : "EN EJECUCIÓN"
                    : s
                      ? "FINALIZADO"
                      : "EN ESPERA"}
                </span>
              </h2>
            </div>
            <div className="sim-settings">
              <label>
                Objetivos
                <select
                  aria-label="Configuración de objetivos"
                  value={scenario}
                  onChange={(e) => {
                    setScenario(e.target.value as Scenario);
                    setSimulation(null);
                  }}
                >
                  <option value="static">Estáticos</option>
                  <option value="moving">Móviles</option>
                  <option value="cluster">Grupo cercano</option>
                  <option value="spread">Separados</option>
                </select>
              </label>
              <label>
                Semilla
                <input
                  aria-label="Semilla"
                  type="number"
                  value={seed}
                  min="0"
                  max="4294967295"
                  onChange={(e) => setSeed(Number(e.target.value) || 0)}
                />
              </label>
            </div>
          </div>
          <div className="arena-layout">
            <div className="arena-wrap">
              <Arena
                simulation={simulation}
                paused={paused}
                speed={speed}
                onFrame={notifyFrame}
              />
              <div className="arena-coordinate">
                CAMPO DE RESOLUCIÓN / 720 × 380
              </div>
              {!simulation && (
                <div className="arena-empty">
                  El siguiente descubrimiento empieza con un lanzamiento.
                </div>
              )}
              {s && (
                <div className="damage-floats">
                  {s.hits
                    .filter((h) => !h.status && s.time - h.time < 0.6)
                    .slice(-12)
                    .map((h) => (
                      <span
                        key={h.id}
                        style={{
                          left: `${(h.x / 720) * 100}%`,
                          top: `${((h.y - 30 - (s.time - h.time) * 28) / 380) * 100}%`,
                          color: RUNES[h.element].color,
                        }}
                      >
                        -{fmt(h.damage)}
                      </span>
                    ))}
                </div>
              )}
            </div>
            <div className="runtime-metrics">
              <span className="eyebrow">RESULTADO DE EJECUCIÓN</span>
              <div className="metric-main">
                {fmt(s?.totalDamage ?? 0)}
                <small>DAÑO TOTAL</small>
              </div>
              <div className="metric-grid">
                <div>
                  <b>{s?.impacts ?? 0}</b>
                  <small>Impactos</small>
                </div>
                <div>
                  <b>{s?.targets.filter((t) => t.damage > 0).length ?? 0}</b>
                  <small>Alcanzados</small>
                </div>
                <div>
                  <b>{fmt(s?.time ?? 0)} s</b>
                  <small>Tiempo lógico</small>
                </div>
                <div>
                  <b>{s?.statuses ?? 0}</b>
                  <small>Estados aplicados</small>
                </div>
              </div>
              <div className="target-results">
                {s?.targets.map((t) => (
                  <div key={t.id}>
                    <span>
                      Objetivo {t.id + 1}
                      {t.burn > 0 ? " · 🔥" : ""}
                      {t.slow > 0 ? " · ❄" : ""}
                    </span>
                    <b>{fmt(t.damage)}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="simulation-controls">
            <button
              className="cast-button"
              disabled={!analysis.program}
              onClick={cast}
            >
              ✦ Lanzar hechizo <span>↗</span>
            </button>
            <button
              disabled={!simulation || !s?.running}
              onClick={() => setPaused(!paused)}
            >
              {paused ? "▷ Reanudar" : "Ⅱ Pausar"}
            </button>
            <button
              onClick={() => {
                setSimulation(null);
                setPaused(false);
              }}
            >
              ↻ Reiniciar
            </button>
            <label className="speed-control">
              Velocidad
              <select
                aria-label="Velocidad de simulación"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                <option value="0.5">0,5×</option>
                <option value="1">1×</option>
                <option value="2">2×</option>
                <option value="4">4×</option>
              </select>
            </label>
            <span className="deterministic">
              ◈ Paso fijo 60 Hz · Semilla {s?.seed ?? seed}
            </span>
          </div>
        </section>
      </main>
      <div className="toast" role="status">
        {notice || saveError}
      </div>
      <footer>
        <span>
          RUNE FORGE <i> / </i> Un espacio para lo que aún no existe.
        </span>
        <span>Sin recetas. Solo reglas y posibilidades.</span>
      </footer>
    </div>
  );
}
export default function App() {
  return (
    <ReactFlowProvider>
      <Forge />
    </ReactFlowProvider>
  );
}
