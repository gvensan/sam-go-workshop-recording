/* Restage for ch14: SAM - close any detail panel, park on home; codespace - clear bash, hide panel. */
const { attach, shot } = require('./probe-lib.cjs');
const BASE = 'https://stunning-dollop-q59xxx9gc9x96-8800.app.github.dev';
(async () => {
  const { browser, ctx } = await attach();

  // SAM
  const sam = ctx.pages().find((x) => x.url().includes('-8800.app.github.dev'));
  await sam.bringToFront();
  await sam.keyboard.press('Escape');
  await sam.evaluate(() => { for (const id of ['__cap-cursor', '__cap-clock']) document.getElementById(id)?.remove(); }).catch(() => {});
  await sam.locator('[data-testid="Close"], [aria-label="Close"]').first().click().catch(() => {});
  await sam.waitForTimeout(600);
  await sam.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await sam.waitForTimeout(3000);
  console.log('SAM parked on', sam.url());

  // codespace
  const p = ctx.pages().find((x) => /\.github\.dev/.test(x.url()) && !x.url().includes('app.github.dev'));
  await p.bringToFront();
  await p.evaluate(() => { for (const id of ['__cap-cursor', '__cap-clock']) document.getElementById(id)?.remove(); }).catch(() => {});
  const tabs = await p.evaluate(() => [...document.querySelectorAll('.tabs-container .tab')].map((t) => t.textContent.trim()));
  console.log('editor tabs:', JSON.stringify(tabs));
  const spot = async () => p.evaluate(() => {
    for (const el of document.querySelectorAll('.xterm-screen')) {
      const r = el.getBoundingClientRect();
      if (r.width > 50 && r.height > 40) return { x: r.x + r.width / 2, y: r.y + 60 };
    }
    return null;
  }).catch(() => null);
  let sp = await spot();
  if (!sp) {
    await p.locator('.tabs-container .tab').filter({ hasText: 'Workshop Tracker' }).first().click().catch(() => {});
    await p.keyboard.press('Control+Backquote');
    for (let i = 0; i < 15 && !sp; i++) { await p.waitForTimeout(1000); sp = await spot(); }
  }
  if (sp) {
    const bashTab = p.locator('.terminal-tabs-list, .tabs-list').getByText('bash', { exact: true }).first();
    await bashTab.click().catch(() => {});
    await p.waitForTimeout(400);
    await p.mouse.click(sp.x, sp.y);
    await p.waitForTimeout(300);
    await p.keyboard.type('clear', { delay: 5 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(600);
  } else console.log('no terminal visible');
  const panelClose = p.locator('.panel .codicon-panel-close, a[aria-label="Hide Panel"]').first();
  if (await panelClose.count()) await panelClose.click().catch(() => {});
  else await p.keyboard.press('Control+Backquote');
  await p.waitForTimeout(800);
  await p.evaluate(() => document.activeElement?.blur?.()).catch(() => {});
  await p.mouse.move(1250, 170);
  await shot(p, 'ch14-staged-code');
  await sam.bringToFront();
  await shot(sam, 'ch14-staged-sam');
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
