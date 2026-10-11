// story.html を headless Chrome で開き、render(t) を呼んで 1 コマずつ撮る
// node capture.mjs <outDir> [fps]   → outDir/frames/00000.png ... と outDir/stills/*.png
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || join(here, "out");
const fps = +(process.argv[3] || 30);
const onlyStills = process.argv.includes("--stills");
mkdirSync(join(out, "frames"), { recursive: true });
mkdirSync(join(out, "stills"), { recursive: true });

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "chrome-promo-"));
const port = 9333;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--hide-scrollbars", "--allow-file-access-from-files", "--window-size=1080,1920", "about:blank"], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "file://" + join(here, "story.html") + "?capture" });
for (let i = 0; i < 100; i++) { await sleep(150); try { if (await evaluate("window.ready && window.ready.then(()=>true)")) break; } catch {} }
await sleep(500);

const shot = async (t, file) => {
  await evaluate(`render(${t}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  const { data } = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1080, height: 1920, scale: 1 } });
  writeFileSync(file, Buffer.from(data, "base64"));
};

const dur = await evaluate("DURATION");
const marks = await evaluate("MARKS");
const names = ["clock", "calc", "memo", "todo", "countdown", "timetable", "roulette"];
const stills = [["01_cover", marks.cover], ...marks.apps.map((t, i) => [`${String(i + 2).padStart(2, "0")}_${names[i]}`, t]), ["09_features", marks.feats], ["10_cta", marks.cta]];
for (const [n, t] of stills) await shot(t, join(out, "stills", n + ".png"));
console.log("stills:", stills.length);

if (!onlyStills) {
  const n = Math.round(dur * fps);
  for (let f = 0; f < n; f++) {
    await shot(f / fps, join(out, "frames", String(f).padStart(5, "0") + ".png"));
    if (f % 60 === 0) console.log(`frame ${f}/${n}`);
  }
  console.log("frames:", n, "duration:", dur);
}
ws.close(); chrome.kill();
