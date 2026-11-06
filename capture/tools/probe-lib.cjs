/* Rehearsal probe kit: attach to the recording Chrome (CDP :9223), find pages,
 * screenshot into the scratchpad for visual verification. CJS so it can
 * require playwright from the capture project by absolute path. */
const { chromium } = require('@playwright/test');
const SCRATCH = require('node:path').join(__dirname, 'shots');
require('node:fs').mkdirSync(SCRATCH, { recursive: true });

async function attach() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const ctx = browser.contexts()[0];
  return { browser, ctx };
}

function pageByUrl(ctx, frag) {
  // 'github.dev' means the codespace workbench, never the forwarded SAM app tab
  if (frag === 'github.dev') {
    return ctx.pages().find((p) => /\.github\.dev/.test(p.url()) && !p.url().includes('app.github.dev'));
  }
  return ctx.pages().find((p) => p.url().includes(frag));
}

async function openOrReuse(ctx, url, frag) {
  let p = pageByUrl(ctx, frag ?? url);
  if (!p) { p = await ctx.newPage(); await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
  await p.bringToFront();
  return p;
}

async function shot(p, name) {
  const file = `${SCRATCH}/${name}.jpg`;
  await p.screenshot({ path: file, type: 'jpeg', quality: 70 });
  console.log(`shot: ${file}`);
  return file;
}

/** Frame whose innerText contains `needle` (for VS Code webviews like the tracker). */
async function frameWithText(p, needle) {
  for (const f of p.frames()) {
    if (f === p.mainFrame()) continue;
    try { if ((await f.evaluate(() => document.body?.innerText ?? '')).includes(needle)) return f; } catch { /* cross-origin or gone */ }
  }
  return null;
}

async function dumpText(target, limit = 3000) {
  const text = await target.evaluate(() => document.body?.innerText ?? '');
  console.log(text.slice(0, limit));
}

module.exports = { attach, pageByUrl, openOrReuse, shot, frameWithText, dumpText, SCRATCH };
