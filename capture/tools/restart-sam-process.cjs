/* Restart the embedded SAM platform: in the Codespaces TASK terminal (not the
 * recording bash), pkill the sam run process and start it again. Then poll the
 * SAM UI until the Connectors page loads (rows or empty state, not an error). */
const { attach, shot } = require('./probe-lib.cjs');
const BASE = 'https://stunning-dollop-q59xxx9gc9x96-8800.app.github.dev';
(async () => {
  const { browser, ctx } = await attach();
  const p = ctx.pages().find((x) => /\.github\.dev/.test(x.url()) && !x.url().includes('app.github.dev'));
  const sam = ctx.pages().find((x) => x.url().includes('app.github.dev'));
  await p.bringToFront();

  // reveal panel if hidden
  const vis = async () => p.evaluate(() => {
    for (const el of document.querySelectorAll('.xterm-screen')) {
      const r = el.getBoundingClientRect();
      if (r.width > 50 && r.height > 40) return true;
    }
    return false;
  }).catch(() => false);
  if (!(await vis())) {
    const tracker = p.locator('.tabs-container .tab').filter({ hasText: 'Workshop Tracker' }).first();
    await tracker.click().catch(() => {});
    await p.waitForTimeout(400);
    await p.keyboard.press('Control+Backquote');
    await p.waitForTimeout(1200);
  }
  // select the Codespaces task terminal in the rail
  const taskRow = p.locator('.terminal-tabs-list').getByText('Codespac', { exact: false }).first();
  if (await taskRow.count()) { await taskRow.click(); await p.waitForTimeout(800); }
  else console.log('WARN: task terminal row not found; typing into active terminal');
  const spot = await p.evaluate(() => {
    for (const el of document.querySelectorAll('.xterm-screen')) {
      const r = el.getBoundingClientRect();
      if (r.width > 50 && r.height > 40) return { x: r.x + r.width / 2, y: r.y + 60 };
    }
    return null;
  });
  if (!spot) throw new Error('no visible terminal');
  await p.mouse.click(spot.x, spot.y);
  await p.waitForTimeout(400);
  await p.keyboard.type("pkill -f 'sam run --embedded' ; sleep 3 ; cd /workspaces/solace-developer-workshops && sam run --embedded /etc/sam/configs &", { delay: 6 });
  await p.keyboard.press('Enter');
  console.log('restart command sent; waiting for SAM to come back');
  await p.waitForTimeout(15000);
  await shot(p, 'ch11-samproc-restart');

  // poll the UI
  await sam.bringToFront();
  for (let i = 0; i < 24; i++) {
    try {
      await sam.goto(BASE + '/#/connectors', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sam.waitForTimeout(5000);
      const txt = await sam.evaluate(() => document.body.innerText);
      if (/HTTP ERROR|can.t be found/.test(txt)) { console.log('t+' + (i + 1) * 15 + 's: port down (restarting)'); }
      else if (/Failed to fetch|Failed to Load/i.test(txt)) { console.log('t+' + (i + 1) * 15 + 's: UI up, API still failing'); }
      else if (/Loading/i.test(txt)) { console.log('t+' + (i + 1) * 15 + 's: loading...'); }
      else {
        console.log('CONNECTORS PAGE OK at ~' + (i + 1) * 15 + 's:');
        const tail = txt.split('Refresh')[1] ?? txt;
        console.log(tail.slice(0, 300).replace(/\n{2,}/g, '\n'));
        break;
      }
    } catch (e) { console.log('t+' + (i + 1) * 15 + 's: ' + e.message.split('\n')[0].slice(0, 60)); }
    await new Promise((r) => setTimeout(r, 10000));
  }
  await shot(sam, 'ch11-sam-after-procrestart');
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
