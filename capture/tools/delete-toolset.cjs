const { attach, shot } = require('./probe-lib.cjs');
const BASE = 'https://stunning-dollop-q59xxx9gc9x96-8800.app.github.dev';
(async () => {
  const { browser, ctx } = await attach();
  const sam = ctx.pages().find((x) => x.url().includes('app.github.dev'));
  await sam.bringToFront();
  await sam.keyboard.press('Escape').catch(() => {});
  await sam.goto(BASE + '/#/toolsets', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 3000));
  // close any open detail panel
  await sam.keyboard.press('Escape').catch(() => {});
  const row = sam.locator('tr', { hasText: 'travel-planner' }).first();
  console.log('row:', await row.count());
  if (await row.count()) {
    await row.locator('button').last().click();
    await new Promise((r) => setTimeout(r, 700));
    const menu = await sam.evaluate(() => document.querySelector('[role="menu"]')?.innerText ?? '');
    console.log('menu:', JSON.stringify(menu));
    await sam.getByText('Delete', { exact: true }).first().click().catch((e) => console.log('no Delete:', e.message));
    await new Promise((r) => setTimeout(r, 800));
    const dlg = sam.locator('[role="dialog"]').first();
    if (await dlg.count()) {
      const input = dlg.locator('input, textarea').first();
      if (await input.count()) await input.fill('DELETE');
      await new Promise((r) => setTimeout(r, 300));
      await dlg.locator('[data-testid="dialogConfirmButton"]').click({ timeout: 4000 })
        .catch(() => dlg.locator('button').filter({ hasText: /delete/i }).last().click({ timeout: 4000 }).catch(() => {}));
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  await sam.goto(BASE + '/#/toolsets', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 3000));
  const txt = await sam.evaluate(() => document.body.innerText);
  console.log('still has travel-planner:', /travel-planner/.test(txt));
  await sam.goto(BASE + '/#/chat', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1500));
  await shot(sam, 'toolset-deleted');
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
