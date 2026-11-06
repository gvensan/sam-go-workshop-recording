/* Generic: type a command into the codespace 'bash' terminal, wait, screenshot.
 * Usage: node term-run.cjs '<command>' <waitMs> <shotName> [--clear] */
const { attach, shot } = require('./probe-lib.cjs');
const [, , cmd, waitMs = '8000', name = 'term-run', ...rest] = process.argv;
(async () => {
  const { browser, ctx } = await attach();
  const p = ctx.pages().find((x) => /\.github\.dev/.test(x.url()) && !x.url().includes('app.github.dev'));
  await p.bringToFront();
  await p.locator('.tabs-container .tab').filter({ hasText: 'Workshop Tracker' }).first().click().catch(() => {});
  await p.waitForTimeout(400);
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
    for (let i = 0; i < 20 && !sp; i++) { await p.waitForTimeout(1000); sp = await spot(); }
  }
  if (!sp) { console.log('NO TERMINAL'); await browser.close(); return; }
  // activate the plain 'bash' entry via LEFT-EDGE click (center hits the hover split icon!)
  // then verify it is active; abort rather than type into sam/Codespaces.
  const entries = p.locator('.terminal-tabs-entry');
  let ok = false;
  for (let attempt = 0; attempt < 3 && !ok; attempt++) {
    const texts = await entries.allInnerTexts();
    const bi = texts.findIndex((t) => t.replace(/[^a-zA-Z: ]/g, '').trim() === 'bash');
    if (bi < 0) { console.log('NO BASH TAB:', JSON.stringify(texts)); await browser.close(); return; }
    const box = await entries.nth(bi).boundingBox();
    await p.mouse.click(box.x + 12, box.y + box.height / 2);
    await p.waitForTimeout(800);
    const cls = (await entries.nth(bi).getAttribute('class')) || '';
    ok = /is-active|selected/.test(cls);
  }
  if (!ok) { console.log('BASH TAB NOT ACTIVE, aborting'); await browser.close(); return; }
  sp = await spot();
  await p.mouse.click(sp.x, sp.y);
  await p.waitForTimeout(400);
  await p.keyboard.type(cmd, { delay: 5 });
  await p.keyboard.press('Enter');
  await p.waitForTimeout(parseInt(waitMs, 10));
  await shot(p, name);
  if (rest.includes('--clear')) {
    await p.keyboard.type('clear', { delay: 5 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(400);
  }
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
