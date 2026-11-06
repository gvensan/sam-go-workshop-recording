/* Delete the three connectors created by ch11 take 1 (flights-db, hotels-db,
 * places-mcp) via the Connectors page row kebab, then park on Toolsets. */
const { attach, shot } = require('./probe-lib.cjs');
const BASE = 'https://stunning-dollop-q59xxx9gc9x96-8800.app.github.dev';
(async () => {
  const { browser, ctx } = await attach();
  const sam = ctx.pages().find((x) => x.url().includes('app.github.dev'));
  await sam.bringToFront();
  for (const name of ['places-mcp', 'hotels-db', 'flights-db']) {
    await sam.goto(BASE + '/#/connectors', { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 2500));
    await sam.keyboard.press('Escape').catch(() => {});
    const row = sam.locator('tr', { hasText: name }).first();
    if (!(await row.count())) { console.log(name, ': no row'); continue; }
    await row.locator('button').last().click();
    await new Promise((r) => setTimeout(r, 700));
    const menu = await sam.evaluate(() => document.querySelector('[role="menu"]')?.innerText ?? '');
    console.log(name, 'menu:', JSON.stringify(menu).slice(0, 80));
    await sam.getByText('Delete', { exact: true }).first().click().catch((e) => console.log(name, 'no Delete:', e.message));
    await new Promise((r) => setTimeout(r, 800));
    const dlg = sam.locator('[role="dialog"]').first();
    if (await dlg.count()) {
      const input = dlg.locator('input, textarea').first();
      if (await input.count()) await input.fill('DELETE').catch(() => {});
      await new Promise((r) => setTimeout(r, 300));
      await dlg.locator('[data-testid="dialogConfirmButton"]').click({ timeout: 4000 })
        .catch(() => dlg.locator('button').filter({ hasText: /delete/i }).last().click({ timeout: 4000 }).catch(() => {}));
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  await sam.goto(BASE + '/#/connectors', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 3000));
  const txt = await sam.evaluate(() => document.body.innerText);
  console.log('remaining rows mention:', ['flights-db', 'hotels-db', 'places-mcp'].filter((n) => txt.includes(n)));
  await shot(sam, 'ch11-connectors-cleared');
  // park on Toolsets (post-ch10 state)
  await sam.goto(BASE + '/#/toolsets', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 2000));
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
