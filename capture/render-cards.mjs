// Render one 1920x1080 title-card PNG per chapter into out/stitch-work/cards-png/,
// via the recording Chrome (CDP :9223, same instance record.mjs drives). This
// ffmpeg build has no drawtext filter, so stitch.mjs consumes these images.
//
//   node render-cards.mjs      then      node stitch.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHAPTERS } from './workshop.steps.mjs';

const OUT = resolve('out', 'stitch-work', 'cards-png');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function cardHtml(nn, total, title) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:1920px;height:1080px;background:#0B2239;overflow:hidden}
  .wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;
    width:100%;height:100%;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;text-align:center}
  .kicker{color:rgba(255,255,255,.55);font-size:30px;letter-spacing:10px;font-weight:500}
  .num{color:#2EC4A5;font-size:40px;font-weight:700;letter-spacing:6px;margin-top:34px}
  .rule{width:88px;height:4px;background:#2EC4A5;border-radius:2px;margin:44px 0}
  .title{color:#fff;font-size:68px;font-weight:700;line-height:1.25;max-width:1400px}
  </style></head><body><div class="wrap">
  <div class="kicker">SOLACE AGENT MESH WORKSHOP</div>
  <div class="num">CHAPTER ${nn} / ${total}</div>
  <div class="rule"></div>
  <div class="title">${esc(title)}</div>
  </div></body></html>`;
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const ctx = browser.contexts()[0];
const p = await ctx.newPage();
const s = await ctx.newCDPSession(p);
await s.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
const total = String(CHAPTERS.length - 1).padStart(2, '0');
for (let i = 0; i < CHAPTERS.length; i++) {
  const nn = String(i).padStart(2, '0');
  await p.setContent(cardHtml(nn, total, CHAPTERS[i].title), { waitUntil: 'load' });
  await p.waitForTimeout(250);
  const shot = await s.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(resolve(OUT, `card-${nn}.png`), Buffer.from(shot.data, 'base64'));
  console.log(`card-${nn}.png  ${CHAPTERS[i].title}`);
}
await p.close();
await browser.close(); // disconnect only; Chrome stays up
