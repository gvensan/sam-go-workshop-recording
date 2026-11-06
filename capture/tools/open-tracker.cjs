/* Reopen the Workshop Tracker webview via the command palette. */
const { attach, shot } = require('./probe-lib.cjs');
(async () => {
  const { browser, ctx } = await attach();
  const p = ctx.pages().find((x) => /\.github\.dev/.test(x.url()) && !x.url().includes('app.github.dev'));
  await p.bringToFront();
  await p.keyboard.press('F1');
  await p.waitForTimeout(800);
  await p.keyboard.type('Workshop Tracker', { delay: 20 });
  await p.waitForTimeout(1200);
  const list = await p.evaluate(() => document.querySelector('.quick-input-list')?.innerText ?? 'NO LIST');
  console.log('palette entries:', JSON.stringify(list.slice(0, 400)));
  await p.keyboard.press('Enter');
  await p.waitForTimeout(2500);
  const tabs = await p.evaluate(() => [...document.querySelectorAll('.tabs-container .tab')].map((t) => t.textContent.trim()));
  console.log('tabs now:', JSON.stringify(tabs));
  await shot(p, 'tracker-reopened');
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
