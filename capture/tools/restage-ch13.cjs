/* Restage codespace for ch13: close leftover tabs, clear bash, hide panel. */
const { attach, shot } = require('./probe-lib.cjs');
(async () => {
  const { browser, ctx } = await attach();
  const p = ctx.pages().find((x) => /\.github\.dev/.test(x.url()) && !x.url().includes('app.github.dev'));
  await p.bringToFront();

  for (let pass = 0; pass < 8; pass++) {
    const tabs = await p.evaluate(() => [...document.querySelectorAll('.tabs-container .tab')].map((t) => t.getAttribute('aria-label') ?? t.textContent.trim()));
    const victim = tabs.find((n) => !/Workshop Tracker/.test(n));
    if (!victim) break;
    const tab = p.locator('.tabs-container .tab').filter({ hasText: victim.split(',')[0].replace(/, preview$/, '').trim().slice(0, 25) }).first();
    if (!(await tab.count())) { console.log('cannot locate tab', victim); break; }
    await tab.click().catch(() => {});
    await p.waitForTimeout(500);
    const close = p.locator('.tab.active a.codicon-close-small, .tab.active .codicon-close-small, .tab.active a[title*="Close"]').first();
    if (await close.count()) { await close.click().catch(() => {}); await p.waitForTimeout(600); }
    else { console.log('no close icon for', victim); break; }
  }
  const tabsNow = await p.evaluate(() => [...document.querySelectorAll('.tabs-container .tab')].map((t) => t.textContent.trim()));
  console.log('tabs now:', JSON.stringify(tabsNow));
  const tracker = p.locator('.tabs-container .tab').filter({ hasText: 'Workshop Tracker' }).first();
  if (await tracker.count()) await tracker.click().catch(() => {});
  await p.waitForTimeout(800);

  // terminal: make sure the bash tab is active, clear it
  const spot = async () => p.evaluate(() => {
    for (const el of document.querySelectorAll('.xterm-screen')) {
      const r = el.getBoundingClientRect();
      if (r.width > 50 && r.height > 40) return { x: r.x + r.width / 2, y: r.y + 60 };
    }
    return null;
  }).catch(() => null);
  let sp = await spot();
  if (!sp) {
    await p.keyboard.press('Control+Backquote');
    for (let i = 0; i < 15 && !sp; i++) { await p.waitForTimeout(1000); sp = await spot(); }
  }
  if (sp) {
    const bashTab = p.locator('.terminal-tabs-list, .tabs-list').getByText('bash', { exact: true }).first();
    await bashTab.click().catch(() => {});
    await p.waitForTimeout(500);
    await p.mouse.click(sp.x, sp.y);
    await p.waitForTimeout(300);
    await p.keyboard.type('clear', { delay: 5 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(800);
  } else console.log('no terminal visible');

  const panelClose = p.locator('.panel .codicon-panel-close, a[aria-label="Hide Panel"]').first();
  if (await panelClose.count()) await panelClose.click().catch(() => {});
  else await p.keyboard.press('Control+Backquote');
  await p.waitForTimeout(900);

  await p.evaluate(() => document.activeElement?.blur?.()).catch(() => {});
  await p.mouse.move(1250, 170);
  await shot(p, 'ch13-staged');
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
