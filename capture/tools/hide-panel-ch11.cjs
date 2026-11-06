/* Hide the terminal panel: click the tracker tab (focus out of webview/xterm),
 * then Ctrl+Backquote. Verify hidden. */
const { attach, shot } = require('./probe-lib.cjs');
(async () => {
  const { browser, ctx } = await attach();
  const p = ctx.pages().find((x) => /\.github\.dev/.test(x.url()) && !x.url().includes('app.github.dev'));
  await p.bringToFront();
  const tracker = p.locator('.tabs-container .tab').filter({ hasText: 'Workshop Tracker' }).first();
  await tracker.click();
  await p.waitForTimeout(500);
  await p.keyboard.press('Control+Backquote');
  await p.waitForTimeout(1000);
  let vis = await p.evaluate(() => {
    for (const el of document.querySelectorAll('.xterm-screen')) {
      const r = el.getBoundingClientRect();
      if (r.width > 50 && r.height > 40) return true;
    }
    return false;
  });
  console.log('terminal hidden after toggle:', !vis);
  if (vis) {
    // fallback: the panel close (X) button
    const x = p.locator('.panel .codicon-panel-close, .panel [aria-label="Hide Panel"]').first();
    if (await x.count()) { await x.click().catch(() => {}); await p.waitForTimeout(800); }
    vis = await p.evaluate(() => {
      for (const el of document.querySelectorAll('.xterm-screen')) {
        const r = el.getBoundingClientRect();
        if (r.width > 50 && r.height > 40) return true;
      }
      return false;
    });
    console.log('terminal hidden after X:', !vis);
  }
  await p.evaluate(() => document.activeElement?.blur?.()).catch(() => {});
  await p.mouse.move(1250, 170);
  await shot(p, 'ch11-final-stage2');
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
