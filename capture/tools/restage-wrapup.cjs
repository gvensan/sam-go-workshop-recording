// Restage for ch16 (wrap-up): Agents layout back to Cards (the Hierarchical
// click persists across sessions), SAM parked at #/chat, and any stray text
// selection cleared (the SAM SPA keeps it across routes and it tints every
// later frame blue). Run before every wrap-up take.
const { attach } = require('./probe-lib.cjs');

(async () => {
  const { browser, ctx } = await attach();
  const sam = ctx.pages().find((p) => p.url().includes('-8800.app.github.dev'));
  if (!sam) throw new Error('no SAM tab open');
  await sam.bringToFront();
  await sam.goto(sam.url().split('#')[0] + '#/agents', { waitUntil: 'domcontentloaded' });
  await sam.waitForTimeout(2500);
  await sam.getByText('Cards', { exact: true }).first().click({ timeout: 8000 });
  await sam.waitForTimeout(1000);
  await sam.goto(sam.url().split('#')[0] + '#/chat', { waitUntil: 'domcontentloaded' });
  await sam.waitForTimeout(1500);
  await sam.evaluate(() => window.getSelection()?.removeAllRanges());
  const chars = await sam.evaluate(() => window.getSelection().toString().length);
  if (chars !== 0) throw new Error(`selection still present (${chars} chars)`);
  console.log('RESTAGED: Cards layout, parked #/chat, selection clear');
  await browser.close(); // disconnects only; Chrome stays up
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
