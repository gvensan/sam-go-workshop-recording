/* Reset the tracker stage between chapter takes.
 * Usage: node reset-stage.cjs <N>  -> Reset progress (keeps registration),
 * re-tick sections 1..N so they read Done (no In Progress), scroll top,
 * collapse the guides folder, blur, park the mouse, verify N of 13. */
const { attach, pageByUrl, shot, frameWithText } = require('./probe-lib.cjs');

const N = parseInt(process.argv[2] ?? '0', 10);

(async () => {
  const { browser, ctx } = await attach();
  const p = pageByUrl(ctx, 'github.dev');
  if (!p) { console.log('no codespace page'); process.exit(1); }
  await p.bringToFront();

  // stale drawn cursor out of the way
  await p.evaluate(() => {
    document.getElementById('__cap-cursor')?.remove();
    clearTimeout(window.__capCurHide);
  }).catch(() => {});

  // 1. reset: clears done AND started, keeps registration
  let f = await frameWithText(p, 'of 13 sections');
  if (!f) { console.log('tracker frame not found'); process.exit(1); }
  await f.evaluate(() => { window.confirmReset(); });
  await new Promise((r) => setTimeout(r, 800));
  f = await frameWithText(p, 'of 13 sections');
  await f.evaluate(() => { window.doReset(); });
  await new Promise((r) => setTimeout(r, 2500));

  // 2. re-tick sections 1..N (fresh frame after each re-render)
  for (let i = 1; i <= N; i++) {
    f = await frameWithText(p, 'of 13 sections');
    const r = await f.evaluate((n) => {
      const cb = document.querySelector(`#section-s${n} input.section-check`);
      if (!cb) return 'no-checkbox';
      if (!cb.checked) { cb.click(); return 'ticked'; }
      return 'already';
    }, i);
    console.log(`section ${i}:`, r);
    await new Promise((r2) => setTimeout(r2, 2500));
  }

  // 3. top of the tracker
  f = await frameWithText(p, 'of 13 sections');
  await f.evaluate(() => { document.scrollingElement?.scrollTo(0, 0); window.scrollTo(0, 0); });
  await new Promise((r) => setTimeout(r, 800));

  // 4. close every editor tab except the Workshop Tracker
  for (let i = 0; i < 10; i++) {
    const btn = p.locator('.tabs-container .tab:not([aria-label*="Workshop Tracker"]) a[class*="codicon-close"]').first();
    if (!(await btn.count())) break;
    const tab = p.locator('.tabs-container .tab:not([aria-label*="Workshop Tracker"])').first();
    await tab.hover().catch(() => {});
    await btn.click().catch(() => {});
    await new Promise((r) => setTimeout(r, 500));
  }

  // 5. collapse the guides and sample_configuration folders if expanded
  for (const name of ['guides', 'sample_configuration']) {
    await p.evaluate((want) => {
      const row = [...document.querySelectorAll('.explorer-folders-view .monaco-list-row')]
        .find((x) => x.textContent?.trim() === want || x.getAttribute('aria-label')?.startsWith(want));
      if (row && row.getAttribute('aria-expanded') === 'true') row.querySelector('.label-name')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, name).catch(() => {});
    await new Promise((r) => setTimeout(r, 600));
  }

  // 5. blur + park mouse
  await p.evaluate(() => document.activeElement?.blur?.()).catch(() => {});
  await p.mouse.move(1250, 170);

  // 6. verify
  f = await frameWithText(p, 'of 13 sections');
  const txt = await f.evaluate(() => document.body.innerText);
  const m = txt.match(/(\d+) of 13 sections completed/);
  const badges = (txt.match(/In Progress/g) || []).length;
  console.log('tracker reads:', m ? m[0] : 'NOT FOUND', '| In Progress badges:', badges);
  await shot(p, 'stage-reset');
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
