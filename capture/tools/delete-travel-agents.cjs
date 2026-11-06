/* Restage for ch12 take 4: undeploy + delete the four travel agents that
 * take 3 created (FlightSearchAgent via UI, the other three via manifest 09).
 * Parks SAM on #/toolsets afterwards. */
const { attach, shot } = require('./probe-lib.cjs');
const AGENTS = ['FlightSearchAgent', 'HotelSearchAgent', 'LocalExperiencesAgent', 'TravelOrchestratorAgent'];
const BASE = 'https://stunning-dollop-q59xxx9gc9x96-8800.app.github.dev';
async function confirmTyped(sam) {
  const dlg = sam.locator('[role="dialog"]').first();
  if (!(await dlg.count())) return;
  const input = dlg.locator('input, textarea').first();
  if (await input.count()) await input.fill('DELETE');
  await sam.waitForTimeout(300);
  await dlg.locator('[data-testid="dialogConfirmButton"]').click({ timeout: 5000 }).catch(() => {});
  await sam.waitForTimeout(1500);
}
(async () => {
  const { browser, ctx } = await attach();
  const sam = ctx.pages().find((x) => x.url().includes('-8800.app.github.dev'));
  await sam.bringToFront();
  await sam.keyboard.press('Escape');
  await sam.evaluate(() => { for (const id of ['__cap-cursor', '__cap-clock']) document.getElementById(id)?.remove(); }).catch(() => {});

  // 1. undeploy
  await sam.goto(BASE + '/#/agent-management', { waitUntil: 'domcontentloaded' });
  await sam.waitForTimeout(3500);
  for (const name of AGENTS) {
    const row = sam.locator('tr', { hasText: name }).first();
    if (!(await row.count())) { console.log(name, ': no deployed row'); continue; }
    await row.locator('button').last().click();
    await sam.waitForTimeout(600);
    await sam.getByText('Undeploy', { exact: true }).first().click();
    await sam.waitForTimeout(800);
    const dlg = sam.locator('[role="dialog"]').first();
    if (await dlg.count()) {
      const btn = dlg.locator('button').filter({ hasText: /undeploy/i }).last();
      if (await btn.count()) await btn.click();
    }
    await sam.waitForTimeout(2500);
    console.log(name, 'undeployed');
  }

  // 2. delete from the Undeployed tab
  await sam.getByText(/Undeployed \(\d+\)/).first().click().catch(() => {});
  await sam.waitForTimeout(1500);
  for (const name of AGENTS) {
    const row = sam.locator('tr', { hasText: name }).first();
    if (!(await row.count())) { console.log(name, ': no undeployed row'); continue; }
    await row.locator('button').last().click();
    await sam.waitForTimeout(600);
    await sam.getByText('Delete', { exact: true }).first().click();
    await sam.waitForTimeout(800);
    await confirmTyped(sam);
    console.log(name, 'deleted');
  }
  const txt = await sam.evaluate(() => document.body.innerText);
  console.log('tabs:', txt.match(/Deployed \(\d+\)/)?.[0], txt.match(/Undeployed \(\d+\)/)?.[0]);
  for (const name of AGENTS) if (txt.includes(name)) console.log('WARN still visible:', name);

  // 3. park on toolsets
  await sam.goto(BASE + '/#/toolsets', { waitUntil: 'domcontentloaded' });
  await sam.waitForTimeout(2500);
  await shot(sam, 'ch12-agents-deleted');
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
