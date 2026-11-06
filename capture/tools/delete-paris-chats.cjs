/* Restage cleanup, card-based: remove only the chat sessions the chapter-14
   recording take created minutes ago. Keeps the two pre-existing demo chats. */
const { attach, shot } = require('./probe-lib.cjs');
const BASE = 'https://stunning-dollop-q59xxx9gc9x96-8800.app.github.dev';
const KEEP = /(Top 10 Most Valuable|Utility Agents Suite)/i;
const TAKE_TOPICS = /London to Paris/i;
(async () => {
  const { browser, ctx } = await attach();
  const sam = ctx.pages().find((x) => x.url().includes('-8800.app.github.dev'));
  await sam.bringToFront();
  await sam.keyboard.press('Escape');
  await sam.evaluate(() => { for (const id of ['__cap-cursor', '__cap-clock']) document.getElementById(id)?.remove(); }).catch(() => {});
  if (!/chats/.test(sam.url())) {
    await sam.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await sam.waitForTimeout(2500);
    const viewAll = sam.getByText('View All', { exact: true }).first();
    if (await viewAll.count()) { await viewAll.click(); await sam.waitForTimeout(2000); }
  }

  const listTitles = () => sam.evaluate(() => {
    const out = [];
    for (const lm of [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /^Last message/.test(e.textContent.trim()))) {
      let card = lm.parentElement;
      while (card && !card.querySelector('button')) card = card.parentElement;
      if (!card) continue;
      const titleEl = [...card.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim().length > 3 && !/^Last message/.test(e.textContent.trim()));
      if (titleEl) out.push(titleEl.textContent.trim());
    }
    return [...new Set(out)];
  });

  for (let round = 0; round < 15; round++) {
    const titles = await listTitles();
    const victim = titles.find((x) => !KEEP.test(x) && TAKE_TOPICS.test(x));
    if (!victim) { console.log('done after', round, 'deletions; remaining:', JSON.stringify(titles)); break; }
    const pos = await sam.evaluate((title) => {
      const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === title);
      if (!el) return null;
      let card = el.parentElement;
      while (card && !card.querySelector('button')) card = card.parentElement;
      if (!card) return null;
      const btns = card.querySelectorAll('button');
      const b = btns[btns.length - 1];
      b.scrollIntoView({ block: 'center' });
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, victim);
    if (!pos) { console.log('no kebab for', victim); break; }
    await sam.mouse.click(pos.x, pos.y);
    await sam.waitForTimeout(600);
    const del = sam.getByText('Delete', { exact: true }).first();
    if (!(await del.count())) { console.log('no Delete menu for', victim); await sam.keyboard.press('Escape'); break; }
    await del.click();
    await sam.waitForTimeout(600);
    const dlg = sam.locator('[role="dialog"]').first();
    if (await dlg.count()) await dlg.locator('[data-testid="dialogConfirmButton"], button').filter({ hasText: /delete/i }).last().click().catch(() => {});
    await sam.waitForTimeout(1200);
    console.log('removed take chat:', victim);
  }
  await shot(sam, 'chat-list-after');
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
