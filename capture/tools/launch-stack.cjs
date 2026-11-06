/* Open the codespace editor + SAM UI in the recording Chrome, resuming the codespace if prompted. */
const { attach, shot } = require('./probe-lib.cjs');
const CS = 'https://stunning-dollop-q59xxx9gc9x96.github.dev/';
const SAM = 'https://stunning-dollop-q59xxx9gc9x96-8800.app.github.dev/';
(async () => {
  const { browser, ctx } = await attach();

  // 1. codespace editor page
  let cs = ctx.pages().find((x) => /stunning-dollop.*\.github\.dev/.test(x.url()) && !x.url().includes('app.github.dev'));
  if (!cs) { cs = await ctx.newPage(); }
  await cs.bringToFront();
  if (!/stunning-dollop/.test(cs.url())) await cs.goto(CS, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await cs.waitForTimeout(6000);

  // click through any resume/restart prompt, then wait for the workbench
  for (let i = 0; i < 60; i++) {
    const body = await cs.evaluate(() => document.body?.innerText ?? '').catch(() => '');
    if (await cs.locator('.monaco-workbench').count().catch(() => 0)) { console.log('workbench up at iter', i); break; }
    const btn = cs.locator('button, a.btn, [role="button"]').filter({ hasText: /Resume|Restart codespace|Connect|Open/i }).first();
    if (await btn.count().catch(() => 0)) { console.log('clicking:', await btn.innerText().catch(() => '?')); await btn.click().catch(() => {}); }
    else if (i % 10 === 9) console.log('waiting... body head:', body.slice(0, 120).replace(/\n/g, ' | '));
    await cs.waitForTimeout(5000);
  }
  await cs.waitForTimeout(4000);
  await shot(cs, 'stack-codespace');

  // 2. SAM page
  let sam = ctx.pages().find((x) => x.url().includes('app.github.dev'));
  if (!sam) sam = await ctx.newPage();
  await sam.bringToFront();
  await sam.goto(SAM, { waitUntil: 'domcontentloaded' }).catch(() => {});
  // SAM may take ~2 min after codespace resume (postAttach runs sam)
  for (let i = 0; i < 36; i++) {
    const txt = await sam.evaluate(() => document.body?.innerText ?? '').catch(() => '');
    if (/Agent Mesh|Agents|Builder|Activity/i.test(txt) && !/404|not found/i.test(txt.slice(0, 400))) { console.log('SAM up at iter', i); break; }
    await sam.waitForTimeout(5000);
    await sam.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  }
  await sam.waitForTimeout(2000);
  const samTxt = await sam.evaluate(() => document.body?.innerText.slice(0, 200) ?? '').catch(() => '');
  console.log('SAM body head:', samTxt.replace(/\n/g, ' | '));
  await shot(sam, 'stack-sam');
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
