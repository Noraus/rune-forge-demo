import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";

// Uses a separate port and an isolated browser profile; never touches the user's session.
const port = 5174;
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ],
  { stdio: "pipe" },
);
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Vite startup timeout")),
      15000,
    );
    server.on("error", reject);
    server.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Vite exited: ${code}`));
    });
    server.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("Local:")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.stderr.on("data", (chunk) => process.stderr.write(chunk));
  });
  const executable =
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
  browser = await chromium.launch({
    executablePath: executable,
    headless: true,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForSelector("canvas");
  for (let i = 0; i < 8; i++) {
    await page.getByLabel("Composición de ejemplo").selectOption(String(i));
    await page.getByLabel("Velocidad de simulación").selectOption("4");
    await page.getByRole("button", { name: /Lanzar hechizo/ }).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".arena-label")?.textContent === "FINALIZADO",
      {},
      { timeout: 15000 },
    );
    const damage = await page.locator(".metric-main").innerText();
    assert(!damage.startsWith("0\n"));
    console.log(`Ejemplo ${i + 1}: ${damage.replaceAll("\n", " ")}`);
  }
  await page.getByLabel("Composición de ejemplo").selectOption("0");
  await page.locator(".react-flow__node").filter({ hasText: "Fuego" }).click();
  await page.getByLabel("Nivel de runa").fill("3");
  assert((await page.locator(".energy").innerText()).includes("28"));
  await page.getByRole("button", { name: "Eliminar runa" }).click();
  assert(
    await page.getByRole("button", { name: /Lanzar hechizo/ }).isDisabled(),
  );
  await page.getByTitle("Deshacer · Ctrl Z").click();
  assert(
    await page.getByRole("button", { name: /Lanzar hechizo/ }).isEnabled(),
  );
  await page.reload();
  await page.waitForSelector("canvas");
  assert((await page.locator(".energy").innerText()).includes("28"));
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });
  await page.getByText(/Importación rechazada/).waitFor();
  // A fully user-created graph: import an empty document, add nodes from the library and wire handles.
  await page.locator("input[type=file]").setInputFiles({
    name: "empty.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1,"nodes":[],"edges":[]}'),
  });
  for (const rune of ["Inicio", "Fuego", "Proyectil"])
    await page
      .locator(".library-rune")
      .filter({
        has: page.locator("strong", { hasText: new RegExp(`^${rune}$`) }),
      })
      .click();
  await page.getByTitle("Ordenar grafo").click();
  await page.waitForTimeout(500);
  const nodes = page.locator(".react-flow__node");
  for (let i = 0; i < 2; i++) {
    const from = await nodes.nth(i).locator(".source").boundingBox(),
      to = await nodes
        .nth(i + 1)
        .locator(".target")
        .boundingBox();
    assert(from && to);
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
      steps: 12,
    });
    await page.mouse.up();
  }
  assert(
    await page.getByRole("button", { name: /Lanzar hechizo/ }).isEnabled(),
  );
  await page.getByRole("button", { name: /Lanzar hechizo/ }).click();
  await page.getByRole("button", { name: "Ⅱ Pausar" }).click();
  const time = await page.locator(".metric-grid").innerText();
  await page.waitForTimeout(200);
  assert.equal(await page.locator(".metric-grid").innerText(), time);
  await page.getByRole("button", { name: "▷ Reanudar" }).click();
  await page.waitForFunction(
    () => document.querySelector(".arena-label")?.textContent === "FINALIZADO",
    {},
    { timeout: 10000 },
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "↓ Exportar JSON" }).click();
  assert.equal((await download).suggestedFilename(), "rune-forge.spell.json");
  mkdirSync("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert(
    (await page.locator(".react-flow").boundingBox()).height >= 300,
    "Mobile node canvas must have a real height",
  );
  assert(
    await page.locator(".react-flow__node").first().isVisible(),
    "Mobile nodes must not remain hidden",
  );
  const editorBounds = await page.locator(".editor").boundingBox();
  const firstNode = await page
    .locator(".react-flow__node")
    .first()
    .boundingBox();
  assert(
    firstNode.y >= editorBounds.y &&
      firstNode.y < editorBounds.y + editorBounds.height,
    "Mobile nodes must be visible inside the editor",
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "PASS: WebGL, 8 ejemplos, editor y conexiones reales, parámetros, pausa, undo, sesión, JSON, móvil. Sin errores JS.",
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
