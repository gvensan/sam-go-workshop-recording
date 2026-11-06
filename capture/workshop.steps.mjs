/* global process, document, MouseEvent */
/**
 * The workshop walkthrough, authored once, narration first (FLOW.md: 17
 * chapters mapping 1:1 to the tracker's 13 sections plus welcome, slides,
 * codespace-create and wrap).
 *
 * Each chapter has a `script`: what the narrator says, one continuous take,
 * with markers in braces where something happens on screen. `{step-id}`
 * starts a step; any other `{name}` is a cue a step's `act` waits for with
 * `t.at(name)`, so a click lands on the word that describes it. Markers are
 * not spoken. Scripts are ported from ../SCRIPT.draft.md, chapter by chapter.
 *
 * House rules (FLOW.md) the acts must honour: tracker-only navigation, guide
 * steps verbatim, the wait convention (start, explain, hold a beat, "after
 * some time...", end state: `t.speed(n, ...)` for a timelapse with
 * `t.clock(true)`, `t.cut(...)` for a straight cut), and every guide prompt
 * run with its output AND its activity diagram shown.
 *
 * Texts in GUIDE (prompts, commands, names, URLs) are byte-verbatim from the
 * workshop guides, em-dashes included, because they are what a workshop user
 * pastes; the narration itself carries none.
 *
 * `stage` is prose: what must already be on screen / in what state the
 * codespace must be before this chapter records.
 */

export const TITLE = 'Solace Agent Mesh workshop: a complete walkthrough';

export const DESCRIPTION = `Build a multi-agent travel planning system with Solace Agent Mesh (SAM), end to end: a custom Go toolset, database and MCP connectors, agents built in the web UI and with the sam CLI, an external A2A agent, full orchestration, and a declarative workflow.

This walkthrough follows the workshop's tracker section by section. Watch a chapter, pause, do that section in your own GitHub Codespace, and continue.

Workshop repository: https://github.com/SolaceDev/solace-developer-workshops/tree/sam-go`;

/** The ElevenLabs narrator: the storming tour's voice (user pick 2026-11-02). */
export const NARRATOR = {
  voice: 'cjVigY5qzO86Huf0OWal',
  model: 'eleven_multilingual_v2',
  settings: { stability: 0.35, similarity_boost: 0.75, style: 0.2, speed: 1.05, use_speaker_boost: true },
  seed: 20261103,
};

/** Where things live. The SAM UI and codespace URLs change per codespace: set them in the environment. */
export const URLS = {
  repo: 'https://github.com/SolaceDev/solace-developer-workshops/tree/sam-go',
  slides: 'https://solacedev.github.io/solace-developer-workshops/slides/01-title.html',
  sam: process.env.SAM_URL ?? '', // e.g. https://<codespace>-8800.app.github.dev
  codespace: process.env.CODESPACE_URL ?? '', // e.g. https://<codespace>.github.dev
};
const SLIDES_BASE = URLS.slides.replace(/[^/]*$/, '');

// ── guide-verbatim texts (prompts, commands, values) ─────────────────────────
export const GUIDE = {
  quickBuildPrompt: `Create the following agents that leverage the built in tools.
Agents to create:

1. Web Researcher
Role: Web research specialist. Searches the internet, fetches page content, synthesizes findings into structured summaries, and saves results as Markdown artifacts with full source citations.
Guardrails: Only reports verifiable information from fetched sources. Never fabricates citations. Declares uncertainty when sources conflict. Does not attempt to access authenticated or private URLs.

2. Data analyst
Role: Structured data analysis specialist. Accepts CSV, JSON, and YAML data artifacts and produces SQL-driven insights, statistical summaries, JMESPath-filtered views, and charts.
Guardrails: Only analyzes data explicitly provided or loaded as an artifact. Never invents data points or fills gaps with assumptions. Always describes the dataset structure before drawing conclusions.

3. Image Analyst
Role: Visual intelligence specialist. Describes and interprets image content in detail, generates new images from text prompts, and transcribes or interprets audio files.

4. Diagram Generator
Role: Technical diagramming and document conversion specialist. Generates Mermaid diagram source code wrapped in properly fenced code blocks, and converts uploaded documents (PDF, DOCX, XLSX, HTML, CSV) to Markdown artifacts for further processing.
Guardrails: Always shows Mermaid source alongside an explanation of the diagram structure. Uses descriptive node labels. Asks for clarification on diagram intent before generating. Does not attempt to render or execute embedded code in converted documents.
Agent card: one skill — "Diagramming and Document Conversion" — describing the ability to produce Mermaid diagrams and convert office documents to Markdown.`,

  researchPrompt: `Research the top 10 most valuable public companies in the world as of 2025, including their market capitalization, industry, and country of origin. Save the results as a structured dataset, then analyze it to find the total market cap by industry and by country, and finally create a Mermaid diagram that visualizes the breakdown.`,

  flightAgent: {
    name: 'FlightSearchAgent',
    description: 'Searches for available flights between any two cities using the travel database. Handles direct routes and multi-hop connections.',
  },

  flightInstructions: `You are the Flight Search Specialist for a multi-agent travel planning system.
You find the best available flights between two cities by querying the travel database
with the flights-db PostgreSQL connector.

You usually work as a delegated specialist, so do not ask clarifying questions.
If details are missing, use these defaults and state them in your answer:
1 traveler, ECONOMY cabin.

CRITICAL RULES:
- Search flights only in the flight_offers view. Do not query flight_schedules, routes, or cabin_fares.
- You may query the airports table only to look up city names or IATA codes.
- Only use the columns listed below. Do not invent or assume additional columns exist.
- Flights run on a daily schedule, so there is no date column. Use the traveler's dates only in your response.
- Search by city name, not a single airport code: many cities have several airports (for example, Tokyo has HND and NRT).
- Only handle flight searches. If asked about anything else, say it is outside your role.

KEY COLUMNS IN flight_offers:
- origin_iata, destination_iata   — 3-letter IATA airport codes
- origin_city, destination_city   — city names, stored in upper case (use ILIKE)
- cabin                           — ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
- flight_no                       — flight number (e.g. SQ317)
- airline                         — full airline name
- departure_time                  — scheduled departure time
- duration                        — human-readable (e.g. "13h 30m")
- duration_minutes                — duration in minutes, for sorting and layover checks
- num_stops                       — 0 = direct, 1+ = connecting
- terminal_dep, terminal_arr      — terminal codes
- aircraft                        — aircraft type
- available_seats                 — seats remaining
- checked_bags                    — checked bags included in the fare
- total_price_usd                 — total price per traveler, including taxes and fees

SEARCH PROCESS:

Step 1 — Direct flights:
  SELECT flight_no, airline, origin_iata, destination_iata, departure_time, duration,
         num_stops, terminal_dep, terminal_arr, aircraft, available_seats,
         checked_bags, total_price_usd
  FROM flight_offers
  WHERE origin_city ILIKE '%<ORIGIN CITY>%'
    AND destination_city ILIKE '%<DESTINATION CITY>%'
    AND cabin = '<CABIN>'
  ORDER BY total_price_usd ASC
  LIMIT 10;

Step 2 — If there are no direct flights, find connecting options with a 90-minute to
12-hour layover (the layover calculation wraps past midnight):
  SELECT f1.flight_no AS leg1_flight, f1.airline AS leg1_airline, f1.departure_time AS leg1_departure,
         f1.destination_iata AS hub,
         f2.flight_no AS leg2_flight, f2.airline AS leg2_airline, f2.departure_time AS leg2_departure,
         (((EXTRACT(EPOCH FROM f2.departure_time)::int / 60
            - (EXTRACT(EPOCH FROM f1.departure_time)::int / 60 + f1.duration_minutes)) % 1440) + 1440) % 1440
           AS layover_minutes,
         f1.duration_minutes + f2.duration_minutes AS total_flight_minutes,
         f1.total_price_usd + f2.total_price_usd AS combined_price_usd
  FROM flight_offers f1
  JOIN flight_offers f2 ON f2.origin_iata = f1.destination_iata
  WHERE f1.origin_city ILIKE '%<ORIGIN CITY>%'
    AND f2.destination_city ILIKE '%<DESTINATION CITY>%'
    AND f1.cabin = '<CABIN>'
    AND f2.cabin = '<CABIN>'
    AND (((EXTRACT(EPOCH FROM f2.departure_time)::int / 60
          - (EXTRACT(EPOCH FROM f1.departure_time)::int / 60 + f1.duration_minutes)) % 1440) + 1440) % 1440
        BETWEEN 90 AND 720
  ORDER BY combined_price_usd ASC
  LIMIT 10;

If a city returns no flights, its name may be stored differently (for example, Bengaluru
is stored as BANGALORE). List the cities with airports in that country and search again
with the closest match:
  SELECT DISTINCT city_name FROM airports WHERE country_code = '<2-LETTER COUNTRY CODE>';

ERROR RECOVERY:
- If a query fails, check the column names against the list above, fix the query, and retry once.
- If there are still no results, say so clearly and suggest the nearest alternative
  (another cabin or a nearby city). Never invent flights, prices, or schedules.

RESPONSE FORMAT:
For each option: airline and flight number, departure time, duration, stops,
aircraft, seats, cabin, checked bags, and price per traveler (USD).
Multiply by the number of travelers to show the total price.
Highlight the CHEAPEST, FASTEST, and BEST VALUE options.
For multi-leg journeys, label Leg 1 and Leg 2 with the hub, the layover, and the combined price.

End your answer with a JSON summary of your recommended option:
{"recommended_flight": {"flight_no": "...", "airline": "...", "route": "SIN-HND",
  "connection_hub": null, "departure_time": "...", "duration": "...", "stops": 0,
  "cabin": "ECONOMY", "price_per_traveler_usd": 0, "travelers": 1, "total_price_usd": 0}}`,

  exportPassword: 'export TRAVEL_DB_PASSWORD=travel123',
  plan07: 'sam config plan --manifest sample_configuration/manifests/07-custom-tools.yaml',
  apply07: 'sam config apply --manifest sample_configuration/manifests/07-custom-tools.yaml',
  plan08: 'sam config plan --manifest sample_configuration/manifests/08-connectors.yaml',
  apply08: 'sam config apply --manifest sample_configuration/manifests/08-connectors.yaml',
  plan09: 'sam config plan --manifest sample_configuration/manifests/09-agents.yaml',
  apply09: 'sam config apply --manifest sample_configuration/manifests/09-agents.yaml',
  plan12: 'sam config plan --manifest sample_configuration/manifests/12-workflows.yaml',
  apply12: 'sam config apply --manifest sample_configuration/manifests/12-workflows.yaml',
  placesHealth: 'curl -s http://ec2-3-138-119-114.us-east-2.compute.amazonaws.com:3001/health',
  weatherHealth: 'curl -s http://ec2-18-189-171-185.us-east-2.compute.amazonaws.com:10000/health',
  weatherUrl: 'http://ec2-18-189-171-185.us-east-2.compute.amazonaws.com:10000',

  pgForm: {
    name: 'flights-db',
    description: 'World flight schedules, routes, and pricing. Queried by FlightSearchAgent through the flight_offers view.',
    database: 'travel',
    hostname: 'ec2-3-15-151-170.us-east-2.compute.amazonaws.com',
    port: '5432',
    username: 'travel',
    password: 'travel123', // the workshop's published demo credential, printed in the guide
  },
  mcpForm: {
    name: 'places-mcp',
    description: 'Foursquare local places search. Provides the find_restaurants and find_attractions tools for LocalExperiencesAgent.',
    serverUrl: 'http://ec2-3-138-119-114.us-east-2.compute.amazonaws.com:3001/mcp',
  },

  prompts: {
    flightsOne: '@FlightSearchAgent Find economy flights from Singapore to Tokyo',
    flightsTwo: '@FlightSearchAgent Find business class flights from Bangalore to San Francisco',
    hotelsOne: '@HotelSearchAgent Find 5-star hotels in Tokyo under $500 per night',
    hotelsTwo: '@HotelSearchAgent Find beachfront resort hotels in Phuket with pool and spa',
    local: '@LocalExperiencesAgent Find Japanese restaurants and cultural attractions in Tokyo',
    weather: '@WeatherAdvisorAgent What will the weather be like in Tokyo next week? What should I pack?',
    orchestrate: `@TravelOrchestratorAgent Plan a 5-day trip from Singapore to Tokyo for 2 people.
Departure: 10 days from today. Return: 5 days later.
We enjoy Japanese cuisine, cultural sites, and outdoor activities.
Include flights, hotels, restaurants, weather forecast, and full budget breakdown.`,
    nairobi: `@TravelOrchestratorAgent I want to travel from Nairobi to Buenos Aires next month.
2 adults, economy class, mid-range hotels. Best route and estimated total cost?`,
    bali: `Plan a 7-night beach holiday in Bali for a couple.
Luxury resort with a beach villa, spa, and water sports.
Departure from London 10 days from today. Include weather and packing list.`,
    workflow: `@TravelOrchestratorAgent Plan a 4-day trip from London to Paris for 2 people.
Departure: 10 days from today. Return: 4 days later.
We love French food, museums, and parks.
Include flights, hotels, restaurants, weather forecast, and full budget breakdown.`,
  },
};

// ── shared helpers ──────────────────────────────────────────────────────────

/** The SAM tab (matching app.github.dev or SAM_URL), found among open tabs or opened. */
async function samPage(t) {
  const match = URLS.sam || 'app.github.dev';
  const p = t.tab(match);
  if (p) { await t.useSource(p); return p; }
  if (!URLS.sam) throw new Error('no SAM tab open and no SAM_URL set');
  return t.open(URLS.sam);
}

/** The VS Code web tab of the codespace (github.dev, not the forwarded app port). */
async function codePage(t) {
  const p = t.ctx.pages().find((x) => /\.github\.dev/.test(x.url()) && !x.url().includes('app.github.dev'));
  if (!p) throw new Error('no codespace tab open (the VS Code web tab)');
  await t.useSource(p);
  return p;
}

const cdpSessions = new WeakMap();
/** Insert text into whatever is focused, instantly, like a paste. */
async function insertText(t, text) {
  const p = t.source;
  if (!cdpSessions.has(p)) cdpSessions.set(p, await p.context().newCDPSession(p));
  await cdpSessions.get(p).send('Input.insertText', { text });
  await t.wait(200);
}

/** Click the first matching element of a CSS selector, via the real mouse. */
/** A page.evaluate that cannot hang: `null` after `ms` means the page did not answer. */
async function ask(p, fn, arg, ms = 5000) {
  return Promise.race([
    p.evaluate(fn, arg),
    new Promise((r) => setTimeout(() => r(null), ms)),
  ]).catch(() => null);
}

async function clickSel(t, selector, { p = t.source, ...clickOpts } = {}) {
  const rect = await ask(p, (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  }, selector);
  if (!rect) throw new Error(`clickSel: ${selector} not found`);
  await t.showClick(rect, { p, ...clickOpts });
  await t.wait(300);
}

/** Click text anywhere, including inside webview iframes (the tracker, previews). */
async function clickFrame(t, text, { exact = false, timeout = 10000 } = {}) {
  const p = t.source;
  const deadline = Date.now() + timeout;
  for (;;) {
    for (const f of p.frames()) {
      try {
        const loc = f.getByText(text, { exact }).first();
        if (await loc.count()) { await loc.click({ timeout: 2500 }); await t.wait(400); return; }
      } catch { /* detached frame or covered element: keep looking */ }
    }
    if (Date.now() > deadline) throw new Error(`clickFrame: "${text}" not found`);
    await t.wait(300);
  }
}

/** Whether any frame's visible text contains `needle`. */
/** A frame.evaluate that cannot hang: a wedged webview counts as empty. */
async function frameText(f, ms = 4000) {
  return Promise.race([
    f.evaluate(() => document.body?.innerText ?? ''),
    new Promise((r) => setTimeout(() => r(''), ms)),
  ]).catch(() => '');
}

async function frameHas(t, needle) {
  for (const f of t.source.frames()) {
    if ((await frameText(f)).includes(needle)) return true;
  }
  return false;
}

/** Poll the source page (all frames) until `needle` shows. */
async function untilText(t, needle, { timeoutMs = 6 * 60 * 1000, poll = 2500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await frameHas(t, needle)) return;
    await t.wait(poll);
  }
  throw new Error(`"${needle}" did not appear within ${Math.round(timeoutMs / 1000)}s`);
}

/** Activate an editor tab by its aria-label (main-frame VS Code DOM). */
async function activateTab(t, label) {
  const p = t.source;
  const already = await ask(p, (want) => {
    const tab = document.querySelector('.tabs-container .tab.active');
    return (tab?.getAttribute('aria-label') ?? '').includes(want);
  }, label);
  if (already === true) return;
  const rect = await ask(p, (want) => {
    const tab = [...document.querySelectorAll('.tabs-container .tab')].find((x) => (x.getAttribute('aria-label') ?? '').includes(want));
    if (!tab) return null;
    const r = tab.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, label);
  if (!rect) throw new Error(`activateTab: no editor tab labelled "${label}"`);
  await p.mouse.move(rect.x, rect.y, { steps: 10 });
  await p.mouse.click(rect.x, rect.y);
  await t.wait(900);
}

/** The Workshop Tracker's webview frame (the one listing the sections). */
async function trackerFrame(t) {
  for (const f of t.source.frames()) {
    const text = await frameText(f);
    // after registration it lists the sections; before, it is the welcome form
    if (text.includes('Workshop Sections') || text.includes('Welcome to the workshop')) return f;
  }
  throw new Error('the Workshop Tracker webview is not on screen');
}

/** Open a workshop section from the tracker (house rule: tracker-only navigation). */
async function openSection(t, n) {
  await codePage(t);
  await activateTab(t, 'Workshop Tracker'); // the guide preview covers the tracker otherwise
  const f = await trackerFrame(t);
  await showClickLoc(t, f.getByText(`Section ${n}`, { exact: true }).first(), { beat: 700 });
  await t.wait(2500); // the guide renders as a Markdown preview
}

/** Scroll the rendered guide preview (a webview): pointer over it, then wheel. */
async function scrollGuide(t, dy, steps = 16) {
  await t.source.mouse.move(1000, 520);
  await t.scroll(dy, { steps });
}

/** Close the active editor tab (the guide), so the tracker marks the section complete. */
async function closeGuide(t) {
  const p = t.source;
  await p.evaluate(() => {
    document.querySelector('.tabs-container .tab.active')
      ?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  }).catch(() => {});
  await clickSel(t, '.tabs-container .tab.active a.codicon-close-small')
    .catch(() => clickSel(t, '.tabs-container .tab.active a[class*="codicon-close"]'))
    .catch(() => {});
  await t.wait(500);
}

/** Close a specific editor tab by its label (e.g. the auto-opened Simple Browser). */
async function closeTab(t, label) {
  try { await activateTab(t, label); await closeGuide(t); } catch { /* not open */ }
}

/** Hide the Build with Agent side panel: a clean working surface for the takes. */
async function closeAuxBar(t) {
  const p = t.source;
  const open = (await ask(p, () => (document.querySelector('.part.auxiliarybar')?.offsetWidth ?? 0) > 50)) === true;
  if (!open) return;
  await clickSel(t, '[aria-label="Hide Secondary Side Bar"]')
    .catch(() => p.keyboard.press('Meta+Alt+B'))
    .catch(() => {});
  await t.wait(500);
}

/** Hide the bottom panel (terminal logs): full-height tracker for the takes. */
async function closePanel(t) {
  const p = t.source;
  const open = (await ask(p, () => (document.querySelector('.part.panel')?.offsetHeight ?? 0) > 50)) === true;
  if (!open) return;
  await clickSel(t, '.part.panel [aria-label="Hide Panel"]')
    .catch(() => p.keyboard.press('Meta+J'))
    .catch(() => {});
  await t.wait(600);
}

/** Show the bottom panel (for the PORTS tab and the terminal). */
async function openPanel(t) {
  const p = t.source;
  const open = (await ask(p, () => (document.querySelector('.part.panel')?.offsetHeight ?? 0) > 50)) === true;
  if (open) return;
  await p.keyboard.press('Meta+J');
  await t.wait(900);
}

/** Tick a section's checkbox in the tracker (completion is the checkbox, not the close). */
async function completeSection(t, n) {
  await codePage(t);
  await activateTab(t, 'Workshop Tracker').catch(() => {});
  const f = await trackerFrame(t);
  await showClickLoc(t, f.locator(`#section-s${n} input.section-check`), { beat: 500, settle: 250 });
  // the tracker webview reloads itself after a tick; give it a moment
  await t.wait(1200);
}

/** Open a file in the codespace editor through quick open (Cmd+P). */
async function quickOpen(t, path) {
  const p = t.source;
  await p.keyboard.press('Meta+p');
  await t.wait(500);
  await p.keyboard.type(path, { delay: 14 });
  await t.wait(900);
  await p.keyboard.press('Enter');
  await t.wait(1400);
}

/** Jump the focused editor to a line (revealed centered). Wheel-pixel scrolling
 * is not reproducible across takes, so precise framings go through this, in a cut. */
async function gotoLine(t, line) {
  const p = t.source;
  await p.keyboard.press('Control+g');
  await t.wait(400);
  await p.keyboard.type(String(line), { delay: 20 });
  await p.keyboard.press('Enter');
  await t.wait(500);
}

/** Focus the integrated terminal (the plain bash one, never the Codespaces
 * startup task running SAM) and run one command. */
async function runCmd(t, cmd, { delay = 22, settle = 1 } = {}) {
  const p = t.source;
  const screenSpot = () => ask(p, () => {
    // several terminals can exist; only the visible xterm counts
    for (const el of document.querySelectorAll('.terminal-wrapper .xterm-screen, .xterm-screen')) {
      const r = el.getBoundingClientRect();
      if (r.width > 50 && r.height > 40) return { x: r.x + r.width / 2, y: r.y + Math.min(r.height - 12, 90) };
    }
    return null;
  });
  let spot = await screenSpot();
  if (!spot) { await p.keyboard.press('Control+Backquote'); await t.wait(1000); spot = await screenSpot(); }
  const bashTab = p.locator('.terminal-tabs-list, .tabs-list').getByText('bash', { exact: true }).first();
  if (await bashTab.count()) await bashTab.click().catch(() => {});
  await t.wait(Math.round(400 * settle));
  spot = (await screenSpot()) ?? spot;
  if (spot) await p.mouse.click(spot.x, spot.y);
  await t.wait(Math.round(300 * settle));
  await t.type(cmd, { delay });
  await t.press('Enter');
}

/** Scroll the SAM chat transcript by `dy`, smoothly (its scroller is an inner div). */
async function scrollChat(t, dy, steps = 14) {
  const p = t.source;
  for (let i = 0; i < steps; i++) {
    await p.evaluate((d) => {
      const scrollers = [...document.querySelectorAll('div')].filter((e) => e.scrollHeight > e.clientHeight + 100);
      const main = scrollers.sort((a, b) => b.clientHeight - a.clientHeight)[0];
      if (main) main.scrollTop += d;
    }, dy / steps);
    await t.wait(80);
  }
}

/**
 * Smooth-scroll the page so the first heading or image whose text/alt starts
 * with `text` lands in view, then hold until the browser's smooth scroll
 * settles. Lands exactly on the content the narration is discussing, instead
 * of drifting by a guessed pixel count.
 */
async function scrollToLandmark(t, text, { block = 'start', settle = 2000 } = {}) {
  await t.source.evaluate(([txt, blk]) => {
    const el = [...document.querySelectorAll('h1,h2,h3,h4,img')]
      .find((e) => (((e.alt ?? '') + ' ' + (e.textContent ?? '')).trim().toLowerCase().includes(txt.toLowerCase())));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: blk });
  }, [text, block]);
  await t.wait(settle);
}

/** Choreographed click on a Playwright locator (works inside webview iframes). */
async function showClickLoc(t, locator, opts = {}) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await Promise.race([
    locator.boundingBox(),
    new Promise((r) => setTimeout(() => r(null), 4000)),
  ]).catch(() => null);
  if (!box) throw new Error('showClickLoc: target has no bounding box');
  await t.showClick(
    { x: box.x + box.width / 2, y: box.y + Math.min(box.height / 2, Math.max(box.height - 8, 8)) },
    opts,
  );
}

/** Point at a form field in a webview frame, clear it, and type the value visibly. */
async function typeField(t, frame, sel, value) {
  await showClickLoc(t, frame.locator(sel), { ring: false, glide: 380, settle: 180 });
  await frame.locator(sel).fill('').catch(() => {});
  await t.type(value, { delay: 24 });
}

/**
 * Smooth-scroll the rendered GUIDE (a webview iframe) so the heading or image
 * matching `text` lands in view: image-led first, details after, never a blind
 * pixel scroll. Falls back to a gentle wheel scroll if the landmark is missing.
 */
/** Glide the drawn cursor to a locator without clicking (for native selects). */
async function pointLoc(t, locator) {
  const b = await Promise.race([locator.boundingBox(), new Promise((r) => setTimeout(() => r(null), 3000))]).catch(() => null);
  if (b) await t.point({ x: b.x + b.width / 2, y: Math.min(b.y + b.height / 2, 1040) }, { ring: false });
}

/** The guide webview frame whose text contains `needle` (never the tracker). */
async function guideFrameWith(t, needle) {
  for (const f of t.source.frames()) {
    const tx = await frameText(f);
    if (tx && !tx.includes('Workshop Sections') && tx.includes(needle)) return f;
  }
  return null;
}

async function scrollGuideTo(t, text, { block = 'center', settle = 1800 } = {}) {
  for (const f of t.source.frames()) {
    const tx = await frameText(f);
    if (!tx || tx.includes('Workshop Sections')) continue; // the tracker, not the guide
    if (!tx.toLowerCase().includes(text.toLowerCase())) continue;
    const ok = await Promise.race([
      f.evaluate(([txt, blk]) => {
        const el = [...document.querySelectorAll('h1,h2,h3,h4,img')]
          .find((e) => (((e.alt ?? '') + ' ' + (e.textContent ?? '')).trim().toLowerCase().includes(txt.toLowerCase())));
        if (!el) return false;
        el.scrollIntoView({ behavior: 'smooth', block: blk });
        return true;
      }, [text, block]),
      new Promise((r) => setTimeout(() => r(false), 4000)),
    ]).catch(() => false);
    if (ok) { await t.wait(settle); return; }
  }
  await scrollGuide(t, 900, 16); // landmark missing: keep the take moving
}

/** Start a new SAM chat, and do not return until the chat input is really there. */
async function newChat(t, { settleMs = 600, ...clickOpts } = {}) {
  await samPage(t);
  const p = t.source;
  for (let i = 0; i < 3; i++) {
    const btn = p.locator('button').filter({ hasText: 'New Chat' }).first();
    await showClickLoc(t, btn, { beat: 500, settle: 300, ...clickOpts }).catch(() => {});
    let ok = await p.locator('[contenteditable="true"], textarea').first()
      .waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (ok) { await t.wait(settleMs); return; }
    // last resort: SPA hash route (no reload)
    await p.evaluate(() => { location.hash = '#/chat'; }).catch(() => {});
    ok = await p.locator('[contenteditable="true"], textarea').first()
      .waitFor({ state: 'visible', timeout: 4000 }).then(() => true).catch(() => false);
    if (ok) { await t.wait(settleMs); return; }
  }
  throw new Error('newChat: the chat input never appeared');
}

/** Put a prompt in the chat input (instantly, like a paste) and send it. */
async function sendPrompt(t, text, { holdMs = 900, tailMs = 800, ...clickOpts } = {}) {
  const p = t.source;
  await clickSel(t, '[contenteditable="true"]', clickOpts).catch(() => clickSel(t, 'textarea', clickOpts));
  await insertText(t, text);
  await t.wait(holdMs); // hold the prompt a beat, readable
  await clickSel(t, 'button[type="submit"]', clickOpts)
    .catch(() => clickSel(t, '[aria-label*="Send message" i]', clickOpts))
    .catch(() => p.keyboard.press('Enter'));
  await t.wait(tailMs);
}

/** Open the right-hand Activity panel (works from its collapsed icon rail too);
 * `detail` flips Detail Mode on (it defaults on, so this is a safety net). */
async function openActivity(t, { detail = false, ...clickOpts } = {}) {
  await clickSel(t, '[data-testid="Activity"]', clickOpts)
    .catch(() => t.clickText('Activity', clickOpts))
    .catch(() => clickSel(t, '[aria-label="Activity"]', clickOpts))
    .catch(() => {});
  await t.wait(500);
  if (detail) {
    // Detail Mode defaults on; only click the toggle if it is off
    const sw = t.source.locator('button[role="switch"], [role="switch"]').first();
    const state = await sw.getAttribute('aria-checked').catch(() => null);
    if (state === 'false') await showClickLoc(t, sw, { beat: 400, settle: 250 }).catch(() => {});
  }
  await t.wait(500);
}

/** The Activity tree sometimes renders blank after completion: toggle it back to life. */
async function rerenderActivity(t) {
  await t.clickText('Files').catch(() => {});
  await t.wait(400);
  await t.clickText('Activity').catch(() => {});
  await t.wait(600);
}

/** Fit the activity flow graph to the panel (the Center Workflow control). */
async function centerWorkflow(t, opts = {}) {
  const btn = t.source.locator('[data-testid="Center Workflow"]').first();
  await showClickLoc(t, btn, { beat: 300, settle: 350, ...opts }).catch(() => {});
}

/** A slow top-to-bottom pan of the flow canvas: grab, pull up, release, repeat.
 * The graph content sits behind an overflow-hidden viewport and drag-pans 1:1,
 * so the travel is measured from the canvas transform (scale varies per fit)
 * and split into at most three pulls that end at the bottom of the content. */
async function panFlowCanvas(t) {
  const p = t.source;
  const m = await Promise.race([
    p.evaluate(() => {
      let n = document.querySelector('[data-testid="userNode"]');
      let moved = null, hidden = null;
      while (n) {
        const cs = getComputedStyle(n);
        if (!moved && cs.transform !== 'none') moved = { el: n, tf: cs.transform };
        if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') { hidden = n; break; }
        n = n.parentElement;
      }
      if (!hidden) return null;
      const r = hidden.getBoundingClientRect();
      let scale = 1, ty = 0;
      const mm = moved?.tf.match(/matrix\(([^)]+)\)/);
      if (mm) { const v = mm[1].split(',').map(Number); scale = v[0]; ty = v[5]; }
      const contentH = (moved?.el.offsetHeight ?? r.height) * scale;
      return { x: r.x, y: r.y, h: r.height, travel: Math.max(0, ty + contentH - r.height + 24) };
    }),
    new Promise((r) => setTimeout(() => r(null), 3000)),
  ]).catch(() => null);
  if (!m || m.travel < 60) return;
  const pulls = Math.min(2, Math.max(1, Math.ceil(m.travel / (m.h * 0.72))));
  const pull = Math.min(m.travel / pulls, m.h * 0.78);
  const sx = m.x + 50;
  for (let g = 0; g < pulls; g++) {
    const sy = m.y + m.h * 0.86;
    await p.mouse.move(sx, sy);
    await p.mouse.down();
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      await p.mouse.move(sx, sy - (pull / steps) * i, { steps: 2 });
      await t.wait(30);
    }
    await p.mouse.up();
    await t.wait(120);
  }
}

/** The whole run-a-prompt convention: new chat, send, activity open, wait out the run. */
async function runPrompt(t, text, { factor = 15, detail = true, needle = 'Completed', timeoutMs = 6 * 60 * 1000, cutWait = false, cutAll = false, fast = false } = {}) {
  const o = fast ? FAST : {};
  const setupRun = async () => {
    await newChat(t, o);
    await sendPrompt(t, text, fast ? { holdMs: 600, ...FAST } : {});
    await openActivity(t, { detail, ...o });
  };
  const waitOut = () => untilText(t, needle, { timeoutMs });
  if (cutAll) {
    // montage beat: the whole run happens inside one cut, only the result shows
    await t.cut(async () => { await setupRun(); await waitOut(); await rerenderActivity(t); });
    return;
  }
  await setupRun();
  if (cutWait) await t.cut(async () => { await waitOut(); await rerenderActivity(t); });
  else { await t.speed(factor, waitOut); await t.cut(() => rerenderActivity(t)); }
}

/** Fill a captioned form field: the first input/textarea after the caption text, paste-fast. */
async function fillField(t, label, value) {
  const p = t.source;
  const rect = await p.evaluate((lab) => {
    const want = lab.toLowerCase();
    const caption = [...document.querySelectorAll('label, div, span, p, h3, h4')].find(
      (e) => e.children.length <= 2 && e.getClientRects().length && e.textContent.trim().toLowerCase().startsWith(want));
    const input = caption
      ? [...document.querySelectorAll('input, textarea')].find(
        (i) => i.getClientRects().length && (caption.compareDocumentPosition(i) & 4 /* FOLLOWING */))
      : [...document.querySelectorAll('input, textarea')].find((i) => (i.placeholder ?? '').toLowerCase().includes(want));
    if (!input) return null;
    input.scrollIntoView({ block: 'center' });
    const r = input.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, label);
  if (!rect) throw new Error(`fillField: "${label}" not found`);
  await t.showClick(rect, { p, ring: false, glide: 380, settle: 250 });
  await insertText(t, value);
}

/** Navigate the SAM UI left nav: Builder -> `item` (Toolsets, Connectors, ...).
 * Clicking Builder toggles the group, so it is only clicked when the item is hidden. */
async function builder(t, item, clickOpts = {}) {
  await samPage(t);
  if (!item) { await t.clickText('Builder', clickOpts); return; }
  try { await t.clickText(item, clickOpts); }
  catch { await t.clickText('Builder', clickOpts); await t.wait(600); await t.clickText(item, clickOpts); }
  await t.wait(900);
}

// quicker click choreography for wizard flurries whose narration is a list
const FAST = { glide: 280, beat: 400, settle: 300 };

// ── the chapters ────────────────────────────────────────────────────────────

export const CHAPTERS = [
  {
    id: 'welcome',
    title: 'Welcome: the workshop and how to follow along',
    // the opening carries no number on screen; chapter numbers start with the deck
    stage: 'Nothing special: the repository page is public. Any browser state works.',
    script: `{welcome}This is the Solace Agent Mesh workshop. Across thirteen hands-on sections you will build a team of AI agents that plans real trips: flights and hotels from a real database, restaurants from a live API, weather from an agent built in another framework, and the itinerary and budget computed in Go. {repo}Everything starts here, in the workshop repository on GitHub, on the sam-go branch.

{how-to-use}This series walks the whole workshop with you, one short video at a time. Use it like this: watch a chapter, pause, do that section in your own environment, and continue. The chapters match the workshop's sections one for one, so you can always jump to exactly where you are.

{readme}Before you start, open the READ ME and check its required resources against your own setup: a GitHub account, access to GitHub Codespaces, and a network that can reach AWS, because the workshop's backing services run there. You do not need an AWS login. {local}And if Codespaces is not available to you, the same READ ME documents running the identical environment locally with Docker, VS Code, and the Dev Containers extension; everything in this series works the same way there.

First, the theory. The workshop opens with a short deck, and it is worth your time, because it explains why this platform is shaped the way it is.`,
    async setup(t) {
      await t.open(URLS.repo);
      await t.wait(1500);
      // the browser restores the last visit's scroll position: start at the top
      await t.source.evaluate(() => window.scrollTo(0, 0));
      await t.wait(400);
    },
    steps: [
      {
        id: 'welcome',
        title: 'The workshop and its repository',
        async act(t) {
          // hold the repository header and file list while the premise is spoken
          await t.at('repo');
          await scrollToLandmark(t, 'Open in GitHub Codespaces', { block: 'center' });
        },
      },
      {
        id: 'how-to-use',
        title: 'Watch, pause, do, continue',
        async act(t) {
          await scrollToLandmark(t, 'Table of Contents');
        },
      },
      {
        id: 'readme',
        title: 'What you need before you start',
        async act(t) {
          await scrollToLandmark(t, 'Required Resources');
          await t.at('local');
          await scrollToLandmark(t, 'If you do not have the above', { block: 'center' });
        },
      },
    ],
  },

  {
    id: 'the-deck',
    number: 1,
    title: 'The intro deck: grounding on SAM',
    stage: 'Nothing special: the deck is public GitHub Pages. Any browser state works.',
    script: `{title}Welcome to the workshop: building enterprise agentic systems that scale, with Solace Agent Mesh. It is written for developers, architects, and technical practitioners, and its premise is on the title slide: a structured engineering approach to AI agents. Build, test, deploy, observe, improve.

{agenda}The agenda in one look: an introduction and the takeaways, then why agents need a new lifecycle, what Solace Agent Mesh is, the real challenges that kill production agents, and why event-driven is the answer to the coordination problem agents actually have.

{takeaways}And what you will walk away with: you will be able to explain the agent development lifecycle and map its stages to Agent Mesh capabilities, stand up an Agent Mesh environment and apply declarative configuration, define an agent, give it tools, and connect it to an external system, evaluate agent behavior in a structured way, and reason about the operational and governance concerns that show up at production scale. Five skills, one complete picture.

{iceberg}Now the ground truth behind all of it. Across enterprise AI deployments, about twenty percent of the difficulty sits above the surface: model quality. GPT, Claude, Gemini: they all produce strong results on well-scoped tasks. The model question is largely solved. The other eighty percent is below the surface: connecting agents to enterprise data, systems, and events, reliably and at scale. Context pipelines, routing, observability, failure handling. That is where teams actually get stuck.

{challenges}And when you name that eighty percent, it looks like this. Take a moment with this wall: over-permissioned agents, data silos, prompt injection, behavioral drift, hallucinations, agent sprawl, audit trails, token cost, framework churn. Every word on this slide is a real engineering problem some team is facing in production right now. Not model problems. Operations problems.

{adlc}The answer this workshop proposes is discipline: the Agent Development Lifecycle, five stages from idea to continuous improvement. Build: with a guided quick build, plain YAML, or vibe-coded with a coding assistant. Test: datasets, experiments, and evaluators, because agents need scoring, not just assertions. Deploy: configuration as code, with pass-rate gates wired into CI/CD. Observe: a visualizer, OpenTelemetry traces and metrics, one trace ID across every component. And improve: comparing evaluation runs, offline and in real time. The arrow at the bottom is the point: every production signal feeds the next build. It is a loop, not a line.

{evolution}If a new lifecycle sounds dramatic, remember the industry has done this twice before. In the early eighties, the SDLC structured deterministic, rule-based software. Around 2013, MuleSoft's API-led lifecycle addressed integration-first software: versioned contracts, rate limits, schema governance. And now agents, which are not deterministic at all, get theirs. Same pattern, new paradigm, new process.

{nondeterminism}Here is the core of why. Traditional software is deterministic: same input, same output, and a unit test proves correctness. The failure mode is clear: it works, or it crashes. An AI agent is probabilistic: the same input can produce different outputs, a distribution of answers rather than a single value. Unit tests can pass while the agent answers a customer incorrectly in production. The agent runs, responds confidently, and may still be wrong. Silent failure. That single property is why the old methodology is not enough.

{what-is-sam}So, the platform. Solace Agent Mesh is a Go-based agent development and runtime platform. Four things to hold onto: an event-driven runtime, where agents run as always-on workers embedded in your event-driven architecture, not endpoints you poll. CLI tooling, for scaffolding, declarative push and pull, and lifecycle management. Declarative configuration, so agents, tools, and integrations are defined as code, version-controlled and repeatable. And entrypoint integrations, the gateway layer that connects the outside world to the mesh.

{process-types}Architecturally it decomposes into three independently deployable processes. The agent-workflow executor hosts agents, workflows, and proxy adapters, and scales with LLM workload. The entrypoint executor bridges external clients in, and scales with inbound connections. The secure tool runtime executes tools as isolated subprocesses, and scales with tool throughput. And notice what is missing: no component talks directly to another. No HTTP between them, no gRPC. The Solace message broker is the nervous system, and everything crosses it.

{broker-vs-http}Why insist on that? Because of the coordination problem agents actually have. An agent task is long and non-linear: multiple model turns, tool calls that block on external APIs, delegations to other agents. Coordinate that over synchronous HTTP and you hold connections open for minutes, reimplement retry logic at every layer, and lose the task when anything restarts. A broker solves it structurally: the publisher sends and moves on, the subscriber receives when ready, delivery guarantees are a property of the infrastructure, and checkpointing means another instance resumes where a dead one left off. Solace has run exactly that infrastructure for over twenty years, in financial trading, logistics, and industrial IoT, where losing a message has real consequences.

{closing}That is the grounding. The closing slide says the rest: you're ready, the runtime is already waiting, open your GitHub Codespace. Let's do it.`,
    async setup(t) {
      await t.open(URLS.slides);
      await t.wait(1200);
    },
    steps: [
      { id: 'title', title: 'The premise', async act() { /* already on slide 1 */ } },
      { id: 'agenda', title: 'The agenda', async act(t) { await t.source.goto(`${SLIDES_BASE}02-agenda.html`); } },
      { id: 'takeaways', title: 'Five takeaways', async act(t) { await t.source.goto(`${SLIDES_BASE}03-takeaways.html`); } },
      { id: 'iceberg', title: 'The 80/20 iceberg', async act(t) { await t.source.goto(`${SLIDES_BASE}04-real-challenges-stat.html`); } },
      { id: 'challenges', title: 'The operational wall', async act(t) { await t.source.goto(`${SLIDES_BASE}05-operational-challenges.html`); } },
      { id: 'adlc', title: 'The lifecycle, five stages', async act(t) { await t.source.goto(`${SLIDES_BASE}06-adlc-overview.html`); } },
      { id: 'evolution', title: 'Third time the industry does this', async act(t) { await t.source.goto(`${SLIDES_BASE}07-lifecycle-evolution.html`); } },
      { id: 'nondeterminism', title: 'Why agents need their own', async act(t) { await t.source.goto(`${SLIDES_BASE}08-nondeterminism.html`); } },
      { id: 'what-is-sam', title: 'What Solace Agent Mesh is', async act(t) { await t.source.goto(`${SLIDES_BASE}09-what-is-sam.html`); } },
      { id: 'process-types', title: 'Three processes, one broker', async act(t) { await t.source.goto(`${SLIDES_BASE}10-process-types.html`); } },
      { id: 'broker-vs-http', title: 'Broker versus HTTP', async act(t) { await t.source.goto(`${SLIDES_BASE}11-broker-vs-http.html`); } },
      { id: 'closing', title: 'Open your codespace', async act(t) { await t.source.goto(`${SLIDES_BASE}13-closing.html`); } },
    ],
  },

  {
    id: 'create-codespace',
    number: 2,
    title: 'Create your Codespace, and let it come up',
    stage: 'The recording Chrome signed into GitHub as the workshop account. No codespace for this repo yet: this chapter creates THE codespace the rest of Part 2 records in.',
    script: `{open-badge}If you have never used GitHub Codespaces: it is a complete development environment that GitHub builds from this repository on demand, a container with VS Code running in your browser, so there is nothing to install on your machine. {click-badge}On the repository's front page, click Open in GitHub Codespaces, {create}and create the codespace. {build}Now let it work: the environment sets itself up, and from click to a working Agent Mesh it is about five minutes: two for the machine to provision, and the rest after you open it. Let it finish before you touch anything.

Here is what it is doing, because it is worth knowing. First, registration: a script registers your codespace with the workshop's services on AWS and waits for access to be confirmed. That registration is what fetches your language model key and applies it, so your agents can think without you configuring anything. Then the sam command line tool is installed, a local Solace broker starts in Docker, and Agent Mesh itself comes up.

{trust}When the editor opens, it asks one question first: do you trust the authors of the files in this folder. {trust-click}Click Trust Folder and Continue; it is your own codespace, built from the workshop repository. {ready}And then the sign to wait for: the Workshop Tracker opens by itself, showing a registration form. That means your environment is ready.

{fill-form}Registering is what activates the AI API key your agents will use all day, so complete it now: your first and last name, your work email, where you work and what you do, and pick your country from the list. {goals}The last question, what you hope to get from this workshop, is read by the team that runs it, so say something real; then agree to the privacy policy. {register}And click Register and set my AI API Key. {sections}A few seconds later, the tracker swaps to the thirteen workshop sections. That is the sign you are fully set up, and this list is home base for everything that follows.`,
    async setup(t) {
      await t.open(URLS.repo);
      await t.wait(1000);
    },
    steps: [
      {
        id: 'open-badge',
        title: 'Open in GitHub Codespaces',
        async act(t) {
          // the repo page holds through the concept talk; the click lands on its words
          await t.at('click-badge');
          await clickSel(t, 'article a[href*="codespaces"]').catch(() => t.clickText('Open in GitHub Codespaces', { prefix: true }));
          await t.wait(2500);
        },
      },
      {
        id: 'create',
        title: 'Create the codespace',
        async act(t) {
          await t.clickText('Create new codespace')
            .catch(() => t.clickText('Create codespace', { prefix: true, tag: 'button,span,a' }));
          await t.wait(2000);
          // the "Setting up your codespace" page now holds, real time, under the
          // whole provisioning narration ({build} is narration-only); no timelapse
        },
      },
      {
        id: 'trust',
        title: 'Trust the folder; the tracker appears',
        async act(t) {
          // cut the unpredictable wait: the dialog appears exactly on "When the editor opens".
          // Guarded evaluate, never isVisible: a CDP stall must read as "retry", not hang.
          await t.cut(async () => {
            const deadline = Date.now() + 12 * 60 * 1000;
            while (true) {
              const vis = await ask(t.source, () => {
                const els = [...document.querySelectorAll('a, button, .monaco-button, .monaco-text-button')];
                const b = els.find((x) => (x.textContent ?? '').trim() === 'Trust Folder & Continue');
                if (!b) return false;
                const r = b.getBoundingClientRect();
                return r.width > 10 && r.height > 10;
              }, undefined, 4000);
              if (vis === true) break;
              if (Date.now() > deadline) throw new Error('the trust dialog never appeared');
              await t.wait(3000);
            }
            await t.wait(1500); // the workbench behind the dialog finishes painting
          });
          await t.at('trust-click');
          await t.clickText('Trust Folder & Continue');
          await t.wait(600);
          // extensions come up; the tracker tab opens on the registration form.
          // The recorder keeps rolling after this cut to cover the closing lines,
          // so the stage must be PROVABLY calm before the cut closes: the setup
          // task pops the panel and toasts seconds later, and the tracker
          // prefills the name fields from an earlier registration.
          await t.cut(async () => {
            await untilText(t, 'Register to start workshop', { timeoutMs: 4 * 60 * 1000, poll: 3000 });
            await closeTab(t, 'Simple Browser');
            await closeTab(t, 'README.md'); // the auto-opened [Preview] tab
            await closeAuxBar(t);
            await activateTab(t, 'Workshop Tracker').catch(() => {});
            const start = Date.now();
            let calm = 0;
            while (Date.now() - start < 120 * 1000 && calm < 3) {
              await t.wait(3000);
              let noisy = false;
              const state = await ask(t.source, () => ({
                panel: (document.querySelector('.part.panel')?.offsetHeight ?? 0) > 50,
                toast: !!document.querySelector('.notifications-toasts .notification-toast'),
              }));
              if (state?.panel) { await closePanel(t); noisy = true; }
              if (state?.toast) {
                await clickSel(t, '.notifications-toasts .codicon-notifications-clear')
                  .catch(() => t.source.keyboard.press('Escape').catch(() => {}));
                noisy = true;
              }
              const f = await trackerFrame(t).catch(() => null);
              if (f) {
                const first = await frameText(f).then((x) => x.includes('Welcome to the workshop'));
                const val = first ? await Promise.race([
                  f.locator('#firstName').inputValue(),
                  new Promise((r) => setTimeout(() => r(''), 3000)),
                ]).catch(() => '') : '';
                if (val) {
                  await f.locator('#firstName').fill('').catch(() => {});
                  await f.locator('#lastName').fill('').catch(() => {});
                  noisy = true;
                }
              }
              // calm means: three consecutive quiet checks, none before 15s in
              calm = noisy || Date.now() - start < 15 * 1000 ? 0 : calm + 1;
            }
          });
          await t.wait(1500);
        },
      },
      {
        id: 'fill-form',
        title: 'Complete the registration',
        async act(t) {
          // the demo persona, typed visibly (authorized 2026-11-04)
          const f = await trackerFrame(t);
          await typeField(t, f, '#firstName', 'Giri');
          await typeField(t, f, '#lastName', 'Venkatesan');
          await typeField(t, f, '#email', 'workshop.demo@solace.com');
          await typeField(t, f, '#company', 'Solace');
          await typeField(t, f, '#jobTitle', 'PDA');
          await showClickLoc(t, f.locator('#country'), { ring: false, glide: 380, settle: 250 });
          await f.selectOption('#country', { label: 'India' });
          await t.wait(400);
        },
      },
      {
        id: 'goals',
        title: 'Goals and consent',
        async act(t) {
          const f = await trackerFrame(t);
          await typeField(t, f, '#goals', 'Following the Solace Agent Mesh workshop walkthrough.');
          await showClickLoc(t, f.locator('#consent'), { glide: 450, beat: 600, settle: 300 });
        },
      },
      {
        id: 'register',
        title: 'Register and set the AI API key',
        async act(t) {
          const f = await trackerFrame(t);
          await showClickLoc(t, f.locator('#submitBtn'), { beat: 900, settle: 600 });
          // the webview reloads into the sections list; the wait is cut
          await t.cut(async () => {
            const deadline = Date.now() + 3 * 60 * 1000;
            while (!(await frameHas(t, 'of 13 sections'))) {
              if (Date.now() > deadline) throw new Error('registration did not complete');
              await t.wait(3000);
            }
            await t.wait(1200);
          });
        },
      },
      {
        id: 'sections',
        title: 'Thirteen sections: home base',
        async act(t) {
          await t.wait(800); // the list holds under the closing lines
        },
      },
    ],
  },

  {
    id: 'tracker',
    number: 3,
    title: 'Meet the Workshop Tracker · Getting Started',
    stage: 'The registered codespace on the tracker sections list, 0 of 13 complete (chapter 2 ends here).',
    script: `{tracker-list}You are registered, and the tracker now shows the workshop itself: thirteen sections, in order. Some are concept guides, and the ones marked hands-on are where you build. The rhythm is always the same: open a section, work through its guide, then come back and tick it off. It is also how we navigate in this series: always through the tracker, never jumping ahead.

{open-tile}Try it now: click the first section, Getting Started. {guide-opens}Its guide opens beside the tracker as a rendered page, and the section flips to in progress. {overview}This first guide frames the whole day. The picture is the platform at a glance: Solace Agent Mesh, a Go based platform for building and running agentic systems, with its four pillars: an event driven runtime, CLI tooling, declarative configuration, and entrypoint integrations. You will touch all four today. {concepts}Below the picture, the concepts table is really the syllabus: lifecycle, architecture, components, quick build, declarative configuration and the CLI, built in tools, custom tools, connectors, orchestration, the A2A proxy, and workflows. Every row in that table gets its own section. {resources}And the takeaways make the same promise the deck did, now concrete, with resources at the bottom linking the product page and documentation for afterwards.

{close-guide}When you finish a guide, close its tab, {tick}then tick the section's checkbox in the tracker, and the progress bar moves: one of thirteen. {feedback}A completed section also grows a feedback button, so you can tell the team how that section went, and if you ever want a clean slate, reset progress is one click away, right at the top. One down, twelve to go.`,
    async setup(t) {
      await codePage(t);
      await closeTab(t, 'README.md');       // the auto-opened preview tab
      await closePanel(t);                  // raw startup logs are not the show
      await activateTab(t, 'Workshop Tracker').catch(() => {});
    },
    steps: [
      {
        id: 'tracker-list',
        title: 'Thirteen sections, in order',
        async act(t) {
          await t.wait(500); // hold the section list
        },
      },
      {
        id: 'open-tile',
        title: 'Open section 1',
        async act(t) {
          await openSection(t, 1);
        },
      },
      {
        id: 'overview',
        title: 'The platform at a glance (image first)',
        async act(t) {
          await scrollGuideTo(t, 'SAM Overview', { block: 'center', settle: 2200 });
        },
      },
      {
        id: 'concepts',
        title: 'The concepts table: the syllabus',
        async act(t) {
          await scrollGuideTo(t, 'Concepts Covered', { block: 'start' });
        },
      },
      {
        id: 'resources',
        title: 'Takeaways and resources',
        async act(t) {
          await scrollGuideTo(t, 'Takeaways', { block: 'start' });
        },
      },
      {
        id: 'close-guide',
        title: 'Close the guide',
        async act(t) {
          await closeGuide(t);
        },
      },
      {
        id: 'tick',
        title: 'Tick it off: one of thirteen',
        async act(t) {
          await completeSection(t, 1);
        },
      },
      {
        id: 'feedback',
        title: 'Feedback and reset, at arm\'s reach',
        async act(t) {
          // point at (never click) the new Feedback button, then Reset progress
          const f = await trackerFrame(t);
          const fb = await f.getByText('Feedback', { exact: true }).first().boundingBox().catch(() => null);
          if (fb) await t.point({ x: fb.x + fb.width / 2, y: fb.y + fb.height / 2 });
          await t.wait(2200);
          const rs = await f.getByText('Reset progress', { exact: true }).first().boundingBox().catch(() => null);
          if (rs) await t.point({ x: rs.x + rs.width / 2, y: rs.y + rs.height / 2 });
          await t.wait(600);
        },
      },
    ],
  },

  {
    id: 'use-case',
    number: 4,
    title: 'The use case: multi-agent travel planning',
    stage: 'The codespace with section 1 complete; the tracker visible.',
    script: `{open-tile}Section two is the use case, and it is worth reading slowly, because every hands-on section builds a piece of it.

{big-picture}You are building a travel planning system the way a travel agency would staff it. {without-agents}But start where the guide starts: without agents. You could hand-build the same five capabilities: parse a rigid form, call a flights API, a hotels API, a places API, a weather API, and hand-roll the budget math. {challenges}The guide's table says what that costs you: every new data source is another hand-maintained connector, the call order is frozen at build time, there is no natural-language front door, every change is a redeploy, and your reasoning and your integration glue live tangled in one codebase. Keep that picture; it is what the rest of the workshop is an answer to.

{agents}Now the agent version. Each specialist owns one domain and one data source. A flight search agent and a hotel search agent query a real Postgres database on AWS. A local experiences agent finds restaurants and attractions through the Foursquare Places API, over MCP. A weather advisor exists outside Agent Mesh entirely; it is a LangChain agent, and it joins through an A2A proxy. {flow}Above them, an orchestrator takes the traveler's request, decides who to involve, and assembles the answer. And one more piece: itineraries and budgets are arithmetic, not judgment. Ask a language model to add up fares and the same trip can price differently twice. So those two jobs, compile itinerary and calculate budget, run as compiled Go functions in a custom toolset. The agent reasons; the code computes.

{where-it-runs}Note where everything runs: Agent Mesh and your agents live in your codespace; the database, the places server, and the weather agent are pre-deployed on AWS for you. You deploy no backends today. {finish-line}And notice the finish line at the bottom: one prompt asking for a five day trip from Singapore to Tokyo, with flights, hotels, restaurants, weather, and a full budget. You will send it in section twelve.

{wrap}Close the guide, tick off the use case, and the tracker reads two of thirteen. Next, we make sure Agent Mesh itself is running.`,
    async setup(t) {
      await codePage(t);
    },
    steps: [
      { id: 'open-tile', title: 'Open section 2', async act(t) { await openSection(t, 2); } },
      {
        id: 'big-picture',
        title: 'The system, as a picture',
        async act(t) { await scrollGuideTo(t, 'Travel planning use case', { block: 'center', settle: 2000 }); },
      },
      {
        id: 'without-agents',
        title: 'Without agents: the hand-built pipeline',
        async act(t) { await scrollGuideTo(t, 'Without agents', { block: 'start' }); },
      },
      {
        id: 'challenges',
        title: 'What that costs you',
        async act(t) { await scrollGuideTo(t, 'Challenges and limitations', { block: 'start' }); },
      },
      {
        id: 'agents',
        title: 'The agent version',
        async act(t) { await scrollGuideTo(t, 'The agents', { block: 'start' }); },
      },
      {
        id: 'flow',
        title: 'How a request flows',
        async act(t) { await scrollGuideTo(t, 'How a request flows', { block: 'start' }); },
      },
      {
        id: 'where-it-runs',
        title: 'Where everything runs',
        async act(t) { await scrollGuideTo(t, 'Where everything runs', { block: 'start' }); },
      },
      {
        id: 'finish-line',
        title: 'The finish line: one prompt',
        async act(t) { await scrollGuideTo(t, 'Sample query', { block: 'start', settle: 2000 }); },
      },
      {
        id: 'wrap',
        title: 'Tick off: two of thirteen',
        async act(t) {
          await closeGuide(t);
          await completeSection(t, 2);
          await t.wait(800);
        },
      },
    ],
  },

  {
    id: 'launch-sam',
    number: 5,
    title: 'Launch Solace Agent Mesh',
    stage: 'The codespace with sections 1-2 complete; Agent Mesh running (it has been since setup).',
    script: `{open-section}Section three is your first hands-on, and in a codespace most of it already happened: option one is the codespace, and the setup you watched earlier did the work. What is left is to confirm it.

{ports}During setup, a simple browser tab may have opened inside VS Code and failed to connect; close it, it is not the surface you want. Instead, open the PORTS tab and find Solace Agent Mesh on port 8800, {web-ui}then click the globe icon to open it in a full browser tab. If GitHub asks whether you really want to access the forwarded port, continue; that check appears once. And there it is: the Agent Mesh web UI, with a built-in orchestrator already deployed. This is where you will spend most of the workshop.

{option-two}Scroll through option two before you move on, because it is the path you will use later at your own desk: SAM Desktop. {desktop-install}You download the installer for your platform, {register-ip}register your IP address with the workshop services, because they only accept registered traffic, {configure-model}configure the general and planning models with an API key and the model endpoint, {clone-path}clone the repository, put the bundled sam CLI on your path, {target-desktop}and add target desktop to every config command so the CLI finds the running app. The guides flag that desktop difference at every step, so nothing later will surprise you. Today, the codespace has done all of it.

{wrap}Close the guide and tick off section three, and keep the web UI tab around: from here on, the workshop happens in it and in the terminal next to it.`,
    async setup(t) {
      await codePage(t);
    },
    steps: [
      { id: 'open-section', title: 'Open section 3', async act(t) { await openSection(t, 3); } },
      {
        id: 'ports',
        title: 'The PORTS tab, port 8800',
        async act(t) {
          // the panel tab reads "Ports" plus a forwarded-count badge
          await openPanel(t);
          await t.clickText('Ports', { prefix: true });
          await t.wait(1500);
        },
      },
      {
        id: 'web-ui',
        title: 'The web UI in a full tab',
        async act(t) {
          // the globe icon only exists while its row is hovered: hover first, then the choreographed click
          const row = t.source.locator('.ports-view .monaco-list-row', { hasText: 'Solace Agent Mesh' }).first();
          await row.hover().catch(() => {});
          await t.wait(400);
          const globe = row.locator('.codicon-globe, [aria-label*="Open in Browser" i]').first();
          await showClickLoc(t, globe, { beat: 700 }).catch(() => t.open(URLS.sam));
          await samPage(t);
          await t.wait(2000);
          // GitHub's one-time forwarded-port check, continued on camera when it shows
          const cont = await t.source.getByRole('button', { name: /continue/i }).first();
          if (await Promise.race([cont.isVisible(), new Promise((r) => setTimeout(() => r(false), 2500))]).catch(() => false)) {
            await showClickLoc(t, cont, { beat: 700 });
            await t.wait(2500);
          }
          await t.clickText('Agents').catch(() => {});
          await t.wait(1200);
        },
      },
      {
        id: 'option-two',
        title: 'Option two: SAM Desktop, for later',
        async act(t) {
          await codePage(t);
          await closePanel(t);
          await scrollGuideTo(t, 'Option 2: SAM Desktop', { block: 'start' });
        },
      },
      {
        id: 'desktop-install',
        title: 'The installer',
        async act(t) { await scrollGuideTo(t, 'Install SAM Desktop', { block: 'start' }); },
      },
      {
        id: 'register-ip',
        title: 'Register your IP',
        async act(t) { await scrollGuideTo(t, 'Register your IP address', { block: 'start' }); },
      },
      {
        id: 'configure-model',
        title: 'Configure the models',
        async act(t) { await scrollGuideTo(t, 'Configure the LLM model', { block: 'start' }); },
      },
      {
        id: 'clone-path',
        title: 'Clone and the sam CLI',
        async act(t) { await scrollGuideTo(t, 'Clone the workshop repository', { block: 'start' }); },
      },
      {
        id: 'target-desktop',
        title: 'target desktop on every command',
        async act(t) { await scrollGuideTo(t, 'Point the', { block: 'start' }); },
      },
      {
        id: 'wrap',
        title: 'Tick off: three of thirteen',
        async act(t) {
          await closeGuide(t);
          await completeSection(t, 3);
          await t.wait(800);
        },
      },
    ],
  },

  {
    id: 'adlc',
    number: 6,
    title: 'The Agent Development Lifecycle',
    stage: 'The codespace with sections 1-3 complete; the tracker visible.',
    script: `{open-section}Section four returns to the lifecycle, now in depth, and it opens with the numbers that explain the urgency. {why-adlc}Gartner forecasts that more than forty percent of agentic AI projects will be canceled by the end of 2027, for rising costs, unproven value, and inadequate risk controls. MIT's study of enterprise GenAI found ninety five percent of pilots produced no measurable return, and its diagnosis was not the models: the organizations lacked the integration, feedback discipline, and operational structure to reach production. This is a process problem, and the fix is a repeatable process.

{five-stages}Walk the five stages with the guide. {build-stage}Build is three concerns: role, access, and teamwork. Role means a well-specified system prompt with guardrails and skills; an agent with a vague role duplicates work or oversteps. Access means connections to databases, APIs, MCP servers, and other agents, with least privilege as the rule: too many tools overloads the context, too few starves the decision. Teamwork is the choice you will live all day: deterministic workflows when the steps are known, dynamic orchestration when an LLM should plan at runtime. In Agent Mesh, this stage is quick build, YAML, AI-assisted authoring, connectors, A2A proxies, peer delegation, and workflows.

{test-stage}Test: agents do not ship on vibes. Offline evals run the agent against a defined suite with expected outputs and expected tool use, and an LLM can be the judge where exact match is impossible. And testing is not a gate you pass once; running evals regularly is how you notice drift. Agent Mesh gives you datasets, evaluators, experiments, and a task visualizer for debugging.

{deploy-stage}Deploy: the configuration you built and tested is promoted unchanged from environment to environment, and deployment decides triggers, a chat message, an event, an API call, an email, and access: role-based control, single sign-on, and delegated access, where the agent inherits the permissions of the user it acts for. That is sam config plan and apply, secrets as placeholders, and the entrypoints.

{observe-stage}Observe: autonomy without oversight is operational risk, so oversight is proportional to stakes. Dashboards for the routine, human-in-the-loop checkpoints designed in, not bolted on, for the high-stakes, and agents that escalate on their own when confidence is low. The visualizer, logs, OpenTelemetry metrics, one trace ID across components, and approval on any tool call.

{improve-stage}And improve: deployment is day one. Gather execution data, run online evals against the agent's original purpose, collect human feedback, thumbs up or down and why, and feed all of it into the next build. A loop, not a line. Read this one fully; you will touch build and deploy directly today, and you will know exactly where the other three live.

{wrap}Close it, tick off section four, and the count stands at four of thirteen.`,
    async setup(t) {
      await codePage(t);
      await closePanel(t); // the Ports panel from the last chapter; full height for the guide
    },
    steps: [
      { id: 'open-section', title: 'Open section 4: the numbers', async act(t) { await openSection(t, 4); } },
      {
        id: 'why-adlc',
        title: 'The numbers behind the urgency',
        async act(t) { await scrollGuideTo(t, 'Why do we need an ADLC', { block: 'start' }); },
      },
      {
        id: 'five-stages',
        title: 'The five stages, as a picture',
        async act(t) { await scrollGuideTo(t, 'The five stages of the ADLC', { block: 'center', settle: 2000 }); },
      },
      { id: 'build-stage', title: 'Build: role, access, teamwork', async act(t) { await scrollGuideTo(t, '1. Build', { block: 'start' }); } },
      { id: 'test-stage', title: 'Test: scoring, not assertions', async act(t) { await scrollGuideTo(t, '2. Test', { block: 'start' }); } },
      { id: 'deploy-stage', title: 'Deploy: promoted unchanged', async act(t) { await scrollGuideTo(t, '3. Deploy', { block: 'start' }); } },
      { id: 'observe-stage', title: 'Observe: proportional oversight', async act(t) { await scrollGuideTo(t, '4. Observe', { block: 'start' }); } },
      { id: 'improve-stage', title: 'Improve: a loop, not a line', async act(t) { await scrollGuideTo(t, '5. Improve', { block: 'start' }); } },
      {
        id: 'wrap',
        title: 'Tick off: four of thirteen',
        async act(t) {
          await closeGuide(t);
          await completeSection(t, 4);
          await t.wait(800);
        },
      },
    ],
  },

  {
    id: 'what-is-sam',
    number: 7,
    title: 'What is Solace Agent Mesh',
    stage: 'The codespace with sections 1-4 complete; the tracker visible.',
    script: `{open-section}Section five is the architecture, the one guide that explains the platform you are about to build on. Take it in three passes.

{the-shape}First, the shape. Agent Mesh is a Go-based platform decomposed into three independently deployable processes: the agent-workflow executor hosts agents, workflows, and proxies and scales with LLM workload; the entrypoint executor bridges external clients and scales with connections; and the secure tool runtime executes tools as isolated subprocesses and scales with throughput. They communicate only through the Solace broker. {tool-forms}Tools reach an agent in five forms: built-in Go functions in process, Python or Go tools in the secure runtime, MCP servers, peer agents, and remote A2A proxies, and every form presents the same interface to the calling agent. The runtime owns the whole LLM loop: streaming, parallel tool dispatch, context compaction, session persistence.

{why-a-broker}Second, why a broker. {expand-challenges}Expand the challenges and read them; they are the eighty percent from the deck made specific. State that survives restarts. Tool calls that fail mid-flight and need checkpoints, so a different instance can resume. Delegation between agents that cannot be a blocking HTTP call, because either side can die. Tool results too large for a context window, which need an artifact store and references. Access control that propagates when agent A delegates to agent B calling tool C for user D. And reactive execution, because the highest-value agents are triggered by events, not chat. {solace-advantage}The broker answers these structurally, and Solace adds the specifics: hierarchical topics with wildcards, so instances load-balance and a monitor can watch everything without touching delivery; metadata on messages, so routing never means parsing payloads; and guaranteed delivery with precise acknowledgment, which is what makes checkpoint-and-resume actually correct. If your organization already runs Solace, agents join the mesh you have; nothing is forklifted.

{vocabulary}Third, the vocabulary you will use all day. An agent is a role, a model, and tools, described in configuration, and every task runs the same loop: model decides, tools run, results feed back, until an answer. {cards}Every agent publishes a card, a live resume of its skills; an orchestrator registers permitted peers as callable tools and the card's description becomes the routing rule, so write it as "when to hand off to me". {external}External agents join through an A2A proxy and look like any other peer. {tool-kinds}Tools come in four kinds: built-in, MCP, OpenAPI, and custom code, which always runs isolated in the secure runtime. {connectors-def}Connectors are named, credentialed bindings that surface a database, an MCP server, an API, or a knowledge base as tools, defined once, assigned by name. {entrypoints}And entrypoints are the front doors: web UI, Slack, Teams, email, MCP, event mesh, webhook, several at once, all pointing at the same agents.

{quick-build-note}And Quick Build, which you will use first: describe what you want, review the plan it lays on the canvas, refine it in conversation, and build and activate. It is experimental, and it is the fastest way to feel the platform. Read this guide at your own pace, then come back; the rest of the workshop is doing.

{wrap}Close it, tick off section five on the tracker, and watch the badge flip to done. Five of thirteen, and from here on, you build.`,
    async setup(t) {
      await codePage(t);
      await closePanel(t);
    },
    steps: [
      { id: 'open-section', title: 'Open section 5: three passes', async act(t) { await openSection(t, 5); } },
      {
        id: 'the-shape',
        title: 'The three processes, as a picture',
        async act(t) { await scrollGuideTo(t, 'runtimes', { block: 'center', settle: 2000 }); },
      },
      {
        id: 'tool-forms',
        title: 'Five forms, one interface',
        async act(t) { await scrollGuideTo(t, 'Tool types and agent core', { block: 'center', settle: 2000 }); },
      },
      {
        id: 'why-a-broker',
        title: 'The operational challenges',
        async act(t) { await scrollGuideTo(t, 'General Challenges', { block: 'start', settle: 600 }); },
      },
      {
        id: 'expand-challenges',
        title: 'Expand the challenges, on camera',
        async act(t) {
          const f = await guideFrameWith(t, 'More details on Challenges');
          if (f) {
            await showClickLoc(t, f.getByText('More details on Challenges').first(), { beat: 600, settle: 400 });
            await t.wait(800);
          }
        },
      },
      {
        id: 'solace-advantage',
        title: 'What the broker answers',
        async act(t) { await scrollGuideTo(t, 'The Solace Advantage', { block: 'start' }); },
      },
      {
        id: 'vocabulary',
        title: 'The vocabulary: agents',
        async act(t) { await scrollGuideTo(t, 'Agent Mesh Components', { block: 'start' }); },
      },
      { id: 'cards', title: 'Agent cards', async act(t) { await scrollGuideTo(t, 'Agent cards and delegation', { block: 'start' }); } },
      { id: 'external', title: 'External agents', async act(t) { await scrollGuideTo(t, 'External agents', { block: 'start' }); } },
      { id: 'tool-kinds', title: 'Tools, four kinds', async act(t) { await scrollGuideTo(t, 'Tools', { block: 'start' }); } },
      { id: 'connectors-def', title: 'Connectors', async act(t) { await scrollGuideTo(t, 'Connectors', { block: 'start' }); } },
      { id: 'entrypoints', title: 'Entrypoints: the front doors', async act(t) { await scrollGuideTo(t, 'Entrypoints', { block: 'start' }); } },
      {
        id: 'quick-build-note',
        title: 'And Quick Build',
        async act(t) { await scrollGuideTo(t, 'Quick Build', { block: 'start' }); },
      },
      {
        id: 'wrap',
        title: 'Tick off: five of thirteen',
        async act(t) {
          await closeGuide(t);
          await completeSection(t, 5);
          await t.wait(800);
        },
      },
    ],
  },

  {
    id: 'declarative-cli',
    number: 8,
    title: 'Declarative SAM and the sam CLI',
    stage: 'The codespace with sections 1-5 complete; the tracker visible.',
    script: `{open-section}Section six introduces the second way of working, the one production teams live by. {capabilities}The sam CLI handles the platform's whole lifecycle: authentication with cached logins, declarative configuration, packaging toolsets and skills, sending tasks to agents from the terminal, running evaluations, calling the REST API directly, and a doctor command that checks your setup. And one capability worth a special mention: it ships AI-assisted authoring skills, schema-accurate knowledge your coding assistant can install with one command, so Claude Code or Codex can write valid Agent Mesh YAML without guessing field names.

{config-repo}The heart of it is declarative configuration. You describe the desired state of the platform as plain YAML in a repository, and the CLI reconciles the running platform to match. {repo-layout}This repository already contains that config repo, under sample configuration: look at the layout. One folder per resource kind: models, agents, connectors, toolsets, skills, entrypoints, workflows, plus datasets, evaluators, and experiments for the test stage, and rbac for roles. {manifest}On top, manifests: the entry point of every operation. A manifest names the target platform and lists which resources to manage, by name; only what is listed is touched.

{three-commands}Three commands carry everything. Sam config plan shows the creates, updates, and deletes a manifest would make, without changing anything. Sam config apply makes them. Plan before apply, every time, like a code review for your platform; applying the same manifest twice is safe. And sam config pull is the reverse: it exports a running platform into a ready-to-apply repo, the usual way to adopt declarative config after starting in the web UI. One warning, in red, and it matters today: do not use the prune flag. It deletes everything not in the manifest, including the built-in orchestrator.

{secrets-pattern}Secrets never sit in files: any value can be a placeholder resolved from environment variables at apply time, and a local env file loads automatically. {targets}Targets are flexible: a URL, a named platform you logged into, or target desktop for the desktop app. {toolsets-repo}Custom toolsets live in the repo as source, built on apply, or as a pre-built zip. {workshop-pattern}And the workshop's own pattern, at the bottom of the guide: each hands-on section has a manifest named for its guide, and each one includes everything from the earlier steps, so you can apply any of them safely. Two commands, repeated: plan, then apply.

{wrap}Close the guide and the manifest you peeked at, and tick off section six on the tracker. Watch the cursor find the row, the checkbox tick, and the badge flip to done. Six of thirteen in, and from here on, the workshop is hands-on.`,
    async setup(t) {
      await codePage(t);
    },
    steps: [
      { id: 'open-section', title: 'Open section 6', async act(t) { await openSection(t, 6); } },
      { id: 'capabilities', title: 'What the CLI covers', async act(t) { await scrollGuideTo(t, 'Key Capabilities', { block: 'start' }); } },
      {
        id: 'config-repo',
        title: 'Declarative SAM, as a picture',
        async act(t) { await scrollGuideTo(t, 'sam_cli', { block: 'center', settle: 2000 }); },
      },
      {
        id: 'repo-layout',
        title: 'The config repo, in the Explorer',
        async act(t) {
          // the file tree: make sure the Explorer is SHOWING (the icon is a toggle),
          // then expand sample_configuration so the per-resource folders are visible
          const p = t.source;
          const sidebarOpen = await p.evaluate(() => (document.querySelector('.part.sidebar')?.offsetWidth ?? 0) > 50).catch(() => false);
          if (!sidebarOpen) { await clickSel(t, '.codicon-explorer-view-icon').catch(() => {}); await t.wait(600); }
          // opening the guide auto-reveals it in the explorer and shifts rows;
          // let that settle, then find the folder row live (never by text-rect snapshot)
          await t.wait(1000);
          const row = p.locator('.explorer-folders-view .monaco-list-row[aria-label^="sample_configuration"]').first();
          const expanded = await row.getAttribute('aria-expanded').catch(() => null);
          if (expanded !== 'true') {
            await showClickLoc(t, row, { beat: 500, settle: 300 });
          }
          await t.wait(1200);
        },
      },
      {
        id: 'manifest',
        title: 'A real manifest',
        async act(t) {
          await quickOpen(t, 'sample_configuration/manifests/07-custom-tools.yaml');
        },
      },
      {
        id: 'three-commands',
        title: 'Plan, apply, pull',
        async act(t) {
          // back to the rendered guide
          await activateTab(t, '05_Declarative_SAM_CLI').catch(() => {});
          await t.wait(600);
          await scrollGuideTo(t, 'Plan, apply, and pull', { block: 'start' });
        },
      },
      {
        id: 'secrets-pattern',
        title: 'Secrets never sit in files',
        async act(t) { await scrollGuideTo(t, 'Secrets and variables', { block: 'start' }); },
      },
      { id: 'targets', title: 'Targets', async act(t) { await scrollGuideTo(t, 'Targets', { block: 'start' }); } },
      { id: 'toolsets-repo', title: 'Toolsets in the repo', async act(t) { await scrollGuideTo(t, 'Toolsets in a config repository', { block: 'start' }); } },
      {
        id: 'workshop-pattern',
        title: 'The workshop pattern',
        async act(t) { await scrollGuideTo(t, 'How this workshop uses declarative configuration', { block: 'start' }); },
      },
      {
        id: 'wrap',
        title: 'Tick off: six of thirteen',
        async act(t) {
          await closeGuide(t);
          await closeTab(t, '07-custom-tools.yaml'); // opened during the layout look
          await completeSection(t, 6);
          await t.wait(800);
        },
      },
    ],
  },

  {
    id: 'quick-build',
    number: 9,
    title: 'Hands-on: built-in tools with Quick Build',
    stage: 'The codespace with sections 1-6 complete; the SAM UI tab open; no Quick Build agents yet (this take creates them).',
    script: `{open-section}Now you build. Section seven creates four general-purpose agents without writing a line of configuration, using the built-in tools the runtime ships: web research, data analysis, image work, diagramming, document conversion.

{quick-build}In the web UI, go to Builder, then Quick Build, {prompt}and paste the prompt from the guide. Read it before you send it, because its shape is the lesson. Four agents, each with a role and guardrails: a web researcher that only reports verifiable information from fetched sources and never fabricates citations; a data analyst that only analyzes data it was actually given and describes the dataset before drawing conclusions; an image analyst for visual and audio work; and a diagram generator that always shows its Mermaid source and asks before guessing intent. Roles and guardrails, exactly as the lifecycle's build stage prescribed. {send}Send it.

{plan}Quick Build reads the descriptions, designs the agents, and lays them out on the canvas as a plan: four cards, each marked new, with keep editing if you want to reshape them by chatting. Today, review the plan, {build}click Build and Activate, and confirm: the dialog reminds you this deploys the agents live. The four agents build in parallel; it takes a few minutes, so let it work while you watch the activity timeline. After some time, it says your build is ready. There they are.

{agents}Now make them work together. Open the Agents tab: four new specialists beside the orchestrator, and the guide's hint is worth taking: click the hierarchical view to see how they relate. {research}Start a new chat, select the Orchestrator, and paste the research prompt: the ten most valuable public companies, saved as a structured dataset, analyzed by industry and country, and visualized as a diagram. One request, three different specialties, and nobody tells the orchestrator which agents to use. {delegation}Watch the activity timeline: it reads the agent cards, lays out a four step plan, researches first, then saves, analyzes, and visualizes in parallel. After some time, under four minutes in our run, the answer arrives with key insights, {files}and the Files tab holds the artifacts made along the way: the dataset, the analysis summaries, the diagram as a Mermaid file you can render anywhere.

{wrap}Four agents, one paragraph, zero YAML. Pause here, run this section yourself, and when the tracker shows it complete, continue to the custom toolset.`,
    async setup(t) {
      await codePage(t);
    },
    steps: [
      { id: 'open-section', title: 'Open section 7', async act(t) { await openSection(t, 7); } },
      {
        id: 'quick-build',
        title: 'Builder, Quick Build',
        async act(t) {
          await builder(t, 'Quick Build');
        },
      },
      {
        id: 'prompt',
        title: 'The four-agent prompt',
        async act(t) {
          await clickSel(t, 'textarea').catch(() => clickSel(t, '[contenteditable="true"]'));
          await insertText(t, GUIDE.quickBuildPrompt);
        },
      },
      {
        id: 'send',
        title: 'Send it',
        async act(t) {
          await clickSel(t, '[data-testid="sendMessage"]')
            .catch(() => clickSel(t, 'button[type="submit"]'))
            .catch(() => clickSel(t, 'button[aria-label*="end" i]'))
            .catch(() => t.press('Enter'));
          await t.wait(1000);
        },
      },
      {
        id: 'plan',
        title: 'The plan on the canvas',
        async act(t) {
          // Quick Build designs the agents; the plan is ready when Build & Activate shows
          await t.speed(15, () => untilText(t, 'Build & Activate', { timeoutMs: 5 * 60 * 1000 }));
          await t.wait(500);
        },
      },
      {
        id: 'build',
        title: 'Build and Activate',
        async act(t) {
          await t.clickText('Build & Activate').catch(() => t.clickText('Build and Activate'));
          await t.wait(900);
          // the confirm dialog ("Build & Activate Plan ... deploy them live"): click ITS
          // confirm button and do not move on until the dialog is really gone
          const dlg = t.source.locator('[role="dialog"], [class*="modal" i], [class*="dialog" i]')
            .filter({ hasText: 'Build & Activate Plan' }).first();
          for (let i = 0; i < 4; i++) {
            if (!(await dlg.count())) break;
            const confirm = dlg.locator('[data-testid="dialogConfirmButton"]').first();
            if (await confirm.count()) await confirm.click({ timeout: 4000 }).catch(() => {});
            else await dlg.locator('button').filter({ hasText: 'Build & Activate' }).last().click({ timeout: 4000 }).catch(() => {});
            const gone = await dlg.waitFor({ state: 'hidden', timeout: 4000 }).then(() => true).catch(() => false);
            if (gone) break;
          }
          await t.clock(true, { label: 'build' });
          await t.speed(22, () => untilText(t, 'build is ready', { timeoutMs: 9 * 60 * 1000 }));
          await t.clock(false);
        },
      },
      {
        id: 'agents',
        title: 'Four new specialists',
        async act(t) {
          await t.clickText('Agents');
          await t.wait(1200);
          await t.clickText('Hierarchical').catch(() => clickSel(t, '[aria-label*="ierarch"]')).catch(() => {});
          await t.wait(800);
        },
      },
      {
        id: 'research',
        title: 'The research prompt, to the Orchestrator',
        async act(t) {
          await newChat(t);
          // the agent selector already defaults to the Orchestrator: point at it
          // on "select the Orchestrator" instead of risking a stray menu click
          const sel = t.source.locator('[data-testid="chatAgentSelect"]').first();
          const b = await sel.boundingBox().catch(() => null);
          if (b) await t.point({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
          // hold so the typing carries the prompt-description words and the
          // send lands as they end (the voice reads the prompt until ~116.5)
          await t.wait(3400);
          await sendPrompt(t, GUIDE.researchPrompt);
        },
      },
      {
        id: 'delegation',
        title: 'The delegation timeline',
        async act(t) {
          const p = t.source;
          await openActivity(t, { detail: true });
          // flow-view rule: fit the graph to the panel while the run fans out
          await centerWorkflow(t);
          // a box of importance, while the voice says "researches first": a web
          // tool node - its modal leads with the research query as the request.
          // Prefer the real fetch; the search node (present from the first
          // seconds of every run) is the fallback that makes this deterministic.
          const fetchNode = p.locator('[data-testid="tool-node-web_request"]').first();
          const searchNode = p.locator('[data-testid="tool-node-web_search_google"]').first();
          const until = Date.now() + 2200;
          while (Date.now() < until && !(await fetchNode.count()) && !(await searchNode.count())) await t.wait(250);
          const node = (await fetchNode.count()) ? fetchNode : ((await searchNode.count()) ? searchNode : null);
          if (node) {
            await showClickLoc(t, node, { beat: 350, settle: 300 });
            await t.wait(1500);
            const close = p.locator('button').filter({ hasText: 'Close' }).last();
            await showClickLoc(t, close, { beat: 250, settle: 250 }).catch(() => t.press('Escape'));
          } else {
            await t.wait(2800); // no nodes yet: hold the live fan-out instead
          }
          await t.clock(true, { label: 'run' });
          await t.speed(85, () => untilText(t, 'Completed', { timeoutMs: 7 * 60 * 1000 }));
          await t.clock(false);
          await centerWorkflow(t); // re-fit the grown graph as the answer arrives
        },
      },
      {
        id: 'files',
        title: 'The artifacts in Files',
        async act(t) {
          await clickSel(t, '[data-testid="files"]').catch(() => t.clickText('Files'));
          await t.wait(2500); // the Files sentence plays over the artifact list
        },
      },
      {
        id: 'wrap',
        title: 'The tracker shows it complete',
        async act(t) {
          const p = t.source;
          // the summary line plays over the complete network: back to the flow,
          // re-fit (the tab return sometimes resets the canvas), then pan down it
          await clickSel(t, '[data-testid="activity"]').catch(() => t.clickText('Activity'));
          await centerWorkflow(t, { beat: 250, settle: 300 });
          await panFlowCanvas(t);
          // "when the tracker shows it complete": cut to the ticked tracker
          await t.cut(async () => { await codePage(t); await closeGuide(t); await completeSection(t, 7); });
          await t.wait(800);
        },
      },
    ],
  },

  {
    id: 'go-toolset',
    number: 10,
    title: 'Hands-on: the custom Go toolset',
    stage: 'The codespace with sections 1-7 complete; travel-planner NOT yet applied (this take runs manifest 07).',
    script: `{open-section}Section eight adds the first piece of the travel system: the travel planner toolset, two tools written in Go. Compile itinerary turns search results into a day-by-day plan; calculate budget adds up flights, hotels, meals, and activities. Exact, repeatable arithmetic in compiled code, so the same trip never prices differently twice.

{toolset-source}Look at what a toolset is, in the editor. A YAML file names and describes it, and a source folder carries main.go with the two functions, the go module, build scripts for both platforms, and a manifest that tells the secure tool runtime how to run the binary. You do not modify any of it today; you ship it. {manifest}Open the zero seven manifest: it manages exactly one resource, the toolset, and its target is your local instance.

{plan}In the terminal, from the repository root, run sam config plan with that manifest. The CLI compiles the Go source for your platform, Go is already installed in the codespace, and reports one resource to create. That is the review. {apply}Now sam config apply: it builds, packages the binary with its manifest into a zip, uploads it, and waits until the runtime has discovered the tools. {verify}Verify in the web UI: Builder, Toolsets, and travel planner shows Ready, with compile itinerary and calculate budget listed.

{option-two}The guide's option two does the same thing through the web UI: sam toolset package writes the zip yourself, {upload-zip}and the Create Toolset form takes the name, the description from the guide, and the file. Useful when someone else built the toolset and handed you the artifact. {arch-tip}Either way, one tip to remember: if the status sticks at Discovering or says exec format error, the binary was built for the wrong architecture; rebuild with the right URL or target. {wrap}Close the guide and the two files you had open, then tick off section eight on the tracker and watch it flip. Eight of thirteen, and the travel system has its arithmetic.`,
    async setup(t) {
      await codePage(t);
    },
    steps: [
      { id: 'open-section', title: 'Open section 8', async act(t) { await openSection(t, 8); } },
      {
        id: 'toolset-source',
        title: 'What a toolset is',
        async act(t) {
          await quickOpen(t, 'sample_configuration/toolsets/travel-planner/src/main.go');
          await t.scroll(500, { steps: 8 });
        },
      },
      {
        id: 'manifest',
        title: 'The 07 manifest',
        async act(t) {
          await quickOpen(t, 'sample_configuration/manifests/07-custom-tools.yaml');
        },
      },
      {
        id: 'plan',
        title: 'sam config plan',
        async act(t) {
          await runCmd(t, GUIDE.plan07);
          // the Go build takes a few seconds; narration covers it
          await t.speed(2, () => t.wait(16000));
        },
      },
      {
        id: 'apply',
        title: 'sam config apply',
        async act(t) {
          await runCmd(t, GUIDE.apply07);
          await t.speed(3, () => t.wait(15000));
        },
      },
      {
        id: 'verify',
        title: 'Toolsets: travel-planner Ready',
        async act(t) {
          await builder(t, 'Toolsets');
          await t.wait(800);
          // the description and the two tools live on the toolset's detail panel
          await t.clickText('travel-planner');
          await t.wait(1200);
        },
      },
      {
        id: 'option-two',
        title: 'Option two: package and upload',
        async act(t) {
          await codePage(t);
          await activateTab(t, '07_Handson_custom_tools').catch(() => {});
          await t.wait(400);
          await scrollGuideTo(t, 'Package the toolset', { block: 'start' });
        },
      },
      {
        id: 'upload-zip',
        title: 'The Create Toolset form',
        async act(t) { await scrollGuideTo(t, 'Upload the zip', { block: 'start' }); },
      },
      {
        id: 'arch-tip',
        title: 'The architecture tip',
        async act(t) { await scrollGuideTo(t, 'Verify the toolset', { block: 'start' }); },
      },
      {
        id: 'wrap',
        title: 'Tick off: eight of thirteen',
        async act(t) {
          await closeGuide(t);
          // the two source tabs vanish in a cut so the on-camera tick
          // lands on "Eight of thirteen" with the audio we have
          await t.cut(async () => {
            await closeTab(t, 'main.go');
            await closeTab(t, '07-custom-tools.yaml');
          });
          await completeSection(t, 8);
          await t.wait(800);
        },
      },
    ],
  },

  {
    id: 'connectors',
    number: 11,
    title: 'Hands-on: connectors',
    stage: 'The codespace with sections 1-8 complete; the toolset applied; connectors NOT yet applied (this take runs manifest 08).',
    script: `{open-section}Section nine connects the agents' data sources, and this is the part of agentic systems that usually means writing integration code. Here it is three YAML files.

{read-yamls}Read them. Flights and hotels are Postgres connectors pointing at the travel database the workshop runs for you on AWS: same host, same database, same user, different descriptions, because the description is what an agent's model reads when deciding how to use it. {places-yaml}The third is a remote MCP connector to the places server, over server-sent events, no authentication, and it will surface find restaurants and find attractions as tools. {password}And notice the password field: it is a placeholder, not a value. Secrets stay out of files and come from the environment at apply time.

{export}So first, export the database password; the guide gives it. {plan-apply}Then the same two commands with the zero eight manifest: plan shows three connectors to create and the toolset from last section untouched, and apply creates them. {verify}Verify in Builder, Connectors: all three listed.

{option-two}The guide's option two builds the same three connectors through the web UI instead: create connector, pick PostgreSQL from the apps, and fill the same values from the guide's tables; {mcp-wizard}for the places connector, pick Remote MCP under custom, set the connection type to server sent events, and the wizard connects to the server and lists the tools it found, find restaurants and find attractions, before you confirm. We stay with the CLI in this series, but both roads end in the same place, so follow option two if you prefer forms to terminals. {health}And one move worth knowing either way: if a connector cannot reach its service, curl the health endpoint, and on SAM Desktop, re-register your IP. {wrap}Pause here, wire up your three connectors, and continue to the agents that will use them.`,
    async setup(t) {
      await codePage(t);
    },
    steps: [
      { id: 'open-section', title: 'Open section 9', async act(t) { await openSection(t, 9); } },
      {
        id: 'read-yamls',
        title: 'Three YAML files',
        async act(t) {
          await quickOpen(t, 'sample_configuration/connectors/flights-db.yaml');
          await t.at('places-yaml');
          await quickOpen(t, 'sample_configuration/connectors/places-mcp.yaml');
        },
      },
      {
        id: 'password',
        title: 'The placeholder, not a value',
        async act(t) {
          // the ${TRAVEL_DB_PASSWORD} placeholder lives in the Postgres YAML
          await activateTab(t, 'flights-db.yaml');
          await t.wait(600);
        },
      },
      {
        id: 'export',
        title: 'Export the password',
        async act(t) {
          await runCmd(t, GUIDE.exportPassword);
        },
      },
      {
        id: 'plan-apply',
        title: 'Plan, then apply, manifest 08',
        async act(t) {
          await runCmd(t, GUIDE.plan08, { delay: 12, settle: 0.6 });
          // plan is warm (~2s real); narration keeps playing over the window
          await t.speed(8, () => t.wait(8000));
          await runCmd(t, GUIDE.apply08, { delay: 12, settle: 0.6 });
          // apply itself is quick but the Connectors LIST lags it by ~20s;
          // hold long enough (compressed to ~1s edited) that verify's first
          // fetch already has the rows
          await t.speed(32, () => t.wait(32000));
        },
      },
      {
        id: 'verify',
        title: 'Connectors: all three listed',
        async act(t) {
          // the parked SAM page can show stale errors, and the list API lags
          // the apply by ~20s; do the whole navigation inside a cut and only
          // resume recording once all three rows are rendered
          await t.cut(async () => {
            const p = await samPage(t);
            await p.goto(`${URLS.sam}/#/connectors`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
            await t.wait(2000);
            for (let i = 0; i < 20; i++) {
              const txt = await p.evaluate(() => document.body.innerText).catch(() => '');
              if (txt.includes('flights-db') && txt.includes('hotels-db') && txt.includes('places-mcp')) return;
              await p.getByText('Refresh', { exact: true }).first().click().catch(() => {});
              await t.wait(1500);
            }
          });
          await t.wait(900);
        },
      },
      {
        id: 'option-two',
        title: 'Option two, in the guide',
        async act(t) {
          // CLI is the followed path; the UI option is shown in the guide, not performed
          await codePage(t);
          await activateTab(t, '08_Handson_connectors').catch(() => {});
          await t.wait(400);
          await scrollGuideTo(t, 'Create through the web UI', { block: 'start' });
        },
      },
      {
        id: 'mcp-wizard',
        title: 'The Remote MCP wizard',
        async act(t) { await scrollGuideTo(t, 'Places MCP server', { block: 'start' }); },
      },
      {
        id: 'health',
        title: 'The health check',
        async act(t) {
          await runCmd(t, GUIDE.placesHealth);
          await t.wait(2500);
        },
      },
      {
        id: 'wrap',
        title: 'Tick off: nine of thirteen',
        async act(t) {
          // the closing line plays over the ticked tracker
          await t.cut(async () => {
            await activateTab(t, '08_Handson_connectors').catch(() => {});
            await closeGuide(t);
            await closeTab(t, 'places-mcp.yaml');
            await closeTab(t, 'flights-db.yaml');
            await completeSection(t, 9);
          });
          await t.wait(800);
        },
      },
    ],
  },

  {
    id: 'travel-agents',
    number: 12,
    title: 'Hands-on: the travel agents',
    stage: 'The codespace with sections 1-9 complete; connectors applied; no travel agents yet (this take creates FlightSearchAgent in the UI and applies manifest 09).',
    script: `{open-section}Section ten creates the four travel agents, and you build them both ways on purpose: one in the web UI, three from YAML, so you can feel which one your team would choose.

{create-agent}First, the flight search agent, manually. Builder, Agent Management, Add Agent, Create New Agent, Create Manually. {name}Name it exactly as the guide says, because other agents will refer to it by name, and give it the description, because that description becomes its card. {instructions}Then add its instructions, pasted from the guide, and take a moment to scroll them, because this is the real lesson of the section: what a production agent role actually contains. It names the one database view to query and forbids the others. It lists the exact columns that exist, so the model never invents one. It gives the search process: direct flights first, then connections with a sensible layover window, and even how to recover when a city is stored under a different name. It defines error recovery, fix the query once, then say so, never invent flights, and the response format, down to a JSON summary of the recommendation, which the workflow will rely on later. Not a vibe, a contract. {connector}Apply the instructions, attach the flights connector under Connectors, {deploy}and Create and Deploy.

{yaml-agents}The other three live as YAML in the config repo. Open them: the hotel agent binds the hotels connector, the local experiences agent binds the places connector, {orchestrator-yaml}and the travel orchestrator is the interesting one. It carries the travel planner toolset and the built-in time tools, so it can turn "ten days from today" into a date, and one block worth reading: inter-agent communication with an allow list of star, meaning it may delegate to every agent on the mesh, with a three minute timeout. That list is the orchestrator's reach; a specialist that should stay focused keeps its list empty. {plan-apply}Plan and apply with the zero nine manifest: three agents to create, everything else unchanged.

{verify}Verify in Agent Management: all four deployed. {hierarchy}Flip to the hierarchical view and the shape of the system appears: the orchestrator above its specialists. Pause and build yours; next, the one agent that was never built here at all.`,
    async setup(t) {
      await codePage(t);
    },
    steps: [
      { id: 'open-section', title: 'Open section 10', async act(t) { await openSection(t, 10); } },
      {
        id: 'create-agent',
        title: 'Create New Agent, manually',
        async act(t) {
          await builder(t, 'Agent Management', FAST);
          await t.clickText('Add Agent', FAST);
          await t.wait(250);
          await t.clickText('Create New Agent', FAST);
          await t.wait(300);
          await t.clickText('Create Manually', FAST); // the small link under the AI dialog
          await t.wait(300);
        },
      },
      {
        id: 'name',
        title: 'Name and description: the card',
        async act(t) {
          await fillField(t, 'Name', GUIDE.flightAgent.name);
          await fillField(t, 'Description', GUIDE.flightAgent.description);
          await t.clickText('Continue', FAST).catch(() => {});
          await t.cut(() => t.wait(900));
        },
      },
      {
        id: 'instructions',
        title: 'The instructions: a contract',
        async act(t) {
          await t.clickText('Add Instructions').catch(() => t.clickText('Add Instruction'));
          await t.wait(900);
          await clickSel(t, 'textarea');
          await insertText(t, GUIDE.flightInstructions);
          await t.wait(800);
          // scroll the pasted instructions slowly while the narration reads them
          await t.source.mouse.move(860, 500);
          await t.scroll(1800, { steps: 40 });
        },
      },
      {
        id: 'connector',
        title: 'Apply, and attach flights-db',
        async act(t) {
          const p = t.source;
          await t.clickText('Apply', FAST);
          // Apply can advance the editor into a section detail (Skills);
          // step back until the main editor with its section list is visible
          await t.cut(async () => {
            await t.wait(1200);
            for (let i = 0; i < 3; i++) {
              const txt = await p.evaluate(() => document.body.innerText).catch(() => '');
              if (txt.includes('Add Connectors')) break;
              await p.locator('[aria-label*="ack"], [aria-label*="Back"]').first().click().catch(() => t.press('Escape'));
              await t.wait(900);
            }
          });
          await t.clickText('Add Connectors', FAST);
          // the narration gives this attach ~3 seconds: do the modal dance
          // inside a cut, then let the attached flights-db row be seen
          await t.cut(async () => {
            await t.wait(800);
            await t.clickText('Add Connector');
            await t.wait(800);
            // tick the flights-db row's checkbox (first row)
            await clickSel(t, 'div[role="checkbox"]');
            await t.wait(500);
            const dlg = p.locator('[role="dialog"]');
            await dlg.locator('button').filter({ hasText: 'Close' }).last().click().catch(() => t.press('Escape'));
            await t.wait(700);
            for (let i = 0; i < 3 && (await dlg.count()); i++) { await t.press('Escape'); await t.wait(600); }
            // the section list only shows the row once saved: apply off-camera
            await t.clickText('Apply');
            await t.wait(900);
            await t.source.mouse.move(860, 500);
          });
          // glide down the overview to the saved Connectors (1) section
          await t.scroll(800, { steps: 12 });
          await t.wait(500);
        },
      },
      {
        id: 'deploy',
        title: 'Create and Deploy',
        async act(t) {
          await t.clickText('Create and Deploy', FAST);
          // back on the Agent Management list, FlightSearchAgent shows Running
          await t.cut(() => untilText(t, 'Add Agent', { timeoutMs: 3 * 60 * 1000 }));
          await t.wait(600);
        },
      },
      {
        id: 'yaml-agents',
        title: 'The other three, as YAML',
        async act(t) {
          await codePage(t);
          await quickOpen(t, 'sample_configuration/agents/HotelSearchAgent.yaml');
          await t.wait(800);
          // "binds the hotels connector": the connectors block is near line 93
          await t.cut(async () => {
            await t.press('Control+g');
            await t.wait(600);
            await t.type('93');
            await t.press('Enter');
            await t.wait(700);
          });
          await t.at('orchestrator-yaml');
          await quickOpen(t, 'sample_configuration/agents/TravelOrchestratorAgent.yaml');
          await t.wait(900);
          // toolsets (78) + interAgentCommunication allowList (85-88): center 84
          await t.cut(async () => {
            await t.press('Control+g');
            await t.wait(600);
            await t.type('84');
            await t.press('Enter');
            await t.wait(700);
          });
        },
      },
      {
        id: 'plan-apply',
        title: 'Plan, apply, manifest 09',
        async act(t) {
          // TRAVEL_DB_PASSWORD is exported off-camera during staging: the
          // narration never mentions it in this chapter
          await runCmd(t, GUIDE.plan09, { delay: 9, settle: 0.6 });
          await t.speed(16, () => t.wait(8000));
          await runCmd(t, GUIDE.apply09, { delay: 9, settle: 0.6 });
          // agents deploy asynchronously; hold compressed so the list catches up
          await t.speed(64, () => t.wait(32000));
        },
      },
      {
        id: 'verify',
        title: 'All four deployed',
        async act(t) {
          await builder(t, 'Agent Management', FAST);
          // hold invisibly until all four agents are really IN THE LIST.
          // The list API lags the deployments by a while and Refresh alone is
          // not always enough: re-route away and back to force a refetch,
          // which also drops any lingering agent detail panel.
          await t.cut(async () => {
            const p = t.source;
            const NAMES = ['FlightSearchAgent', 'HotelSearchAgent', 'LocalExperiencesAgent', 'TravelOrchestratorAgent'];
            const listed = () => p.evaluate(() => [...document.querySelectorAll('tr')].map((r) => r.innerText).join('\n')).catch(() => '');
            for (let i = 0; i < 100; i++) {
              const rows = await listed();
              if (NAMES.every((n) => rows.includes(n))) break;
              if (i % 20 === 19) {
                // the registry list can lag the platform by minutes: hard reload
                await p.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
                await t.wait(5000);
                await t.clickText('Agent Management').catch(() => {});
                await t.wait(1500);
              } else if (i % 5 === 4) {
                await t.clickText('Connectors').catch(() => {});
                await t.wait(900);
                await t.clickText('Agent Management').catch(() => {});
                await t.wait(1400);
              } else {
                await p.getByText('Refresh', { exact: true }).first().click().catch(() => {});
                await t.wait(1800);
              }
            }
            // the list on screen now shows all four: just drop the detail panel
            await p.locator('[data-testid="Close"], [aria-label="Close"]').first().click().catch(() => {});
            await t.wait(700);
          });
          await t.wait(600);
          await t.at('hierarchy');
          await t.clickText('Agents', FAST);
          await t.cut(() => t.wait(900));
          await t.clickText('Hierarchical', FAST).catch(() => clickSel(t, '[aria-label*="ierarch"]')).catch(() => {});
          await t.wait(800);
          await t.cut(async () => {
            await codePage(t);
            await activateTab(t, '09_Handson_agents').catch(() => {});
            await closeGuide(t);
            await completeSection(t, 10);
            await samPage(t);
          });
        },
      },
    ],
  },

  {
    id: 'a2a-proxy',
    number: 13,
    title: 'Hands-on: the A2A proxy',
    stage: 'The codespace with sections 1-10 complete; five agents minus the weather advisor (this take runs the Connect External Agent wizard).',
    script: `{open-section}Section eleven brings in the outsider. The weather advisor is a LangChain agent, running on AWS, built by someone else in a different framework. The mesh takes it anyway, through an A2A proxy, and this whole section is a wizard.

{health}First check the agent is reachable: curl its health endpoint from the terminal, and it answers with its name. {wizard}Then, in the web UI: Builder, Agent Management, Add Agent, and this time Connect External Agent. Paste the agent's URL from the guide, set the card location to the well-known URI, and the authentication to none, {fetch-card}and click Fetch Agent Card. The wizard reads the agent's self-description over the open A2A protocol: there it is, WeatherAdvisorAgent. {review}Keep the default display name, because the orchestrator will call it by that name, set no authentication for invocation as well, step through to the review, and confirm the card shows its skill: weather forecast and activity advisor. That card is how every other agent will know when to hand work to it. {deploy}Connect and Deploy.

{verify}Check Agent Management: five agents now, and the external one looks exactly like the others. The proxy fetches its card, handles authentication, and translates between A2A over HTTPS outside and A2A over Solace inside. That is the point of a protocol. {wrap}Pause, connect yours, and then it is time to run the whole thing.`,
    async setup(t) {
      await codePage(t);
    },
    steps: [
      { id: 'open-section', title: 'Open section 11', async act(t) { await openSection(t, 11); } },
      {
        id: 'health',
        title: 'Is it reachable',
        async act(t) {
          await runCmd(t, GUIDE.weatherHealth, { delay: 12, settle: 0.8 });
          await t.wait(1600);
        },
      },
      {
        id: 'wizard',
        title: 'Connect External Agent',
        async act(t) {
          await builder(t, 'Agent Management', FAST);
          await t.clickText('Add Agent', FAST);
          await t.wait(400);
          await t.clickText('Connect External Agent', FAST);
          await t.wait(800);
          await fillField(t, 'Agent URL', GUIDE.weatherUrl);
          await t.wait(300);
          // both selects are required: card location, then card authentication
          const sels = t.source.locator('select');
          await pointLoc(t, sels.nth(0));
          await sels.nth(0).selectOption('well_known');
          await t.wait(600); // the auth select and Fetch button appear
          await pointLoc(t, sels.nth(1));
          await sels.nth(1).selectOption('none');
          await t.wait(300);
        },
      },
      {
        id: 'fetch-card',
        title: 'Fetch Agent Card',
        async act(t) {
          await t.clickText('Fetch Agent Card');
          await t.cut(() => untilText(t, 'WeatherAdvisorAgent', { timeoutMs: 60 * 1000 }));
          await t.wait(1000);
        },
      },
      {
        id: 'review',
        title: 'The card, the skill',
        async act(t) {
          await t.clickText('Next: Enter Additional Information', FAST).catch(() => t.clickText('Next', { prefix: true, ...FAST }));
          await t.wait(1200);
          // step 2: the invocation authentication select is required too
          const sel = t.source.locator('select').first();
          await pointLoc(t, sel);
          await sel.selectOption('bearer'); // nudge the form state
          await t.wait(300);
          await sel.selectOption('none');
          await t.wait(600);
          await t.clickText('Next: Review Agent', FAST).catch(() => t.clickText('Next', { prefix: true, ...FAST }));
          await t.wait(2000);
        },
      },
      {
        id: 'deploy',
        title: 'Connect and Deploy',
        async act(t) {
          await t.clickText('Connect and Deploy', FAST);
          // back on the Agent Management list, WeatherAdvisorAgent shows Running, type External
          await t.cut(() => untilText(t, 'Add Agent', { timeoutMs: 2 * 60 * 1000 }));
          await t.wait(600);
        },
      },
      {
        id: 'verify',
        title: 'Five agents now',
        async act(t) {
          await builder(t, 'Agent Management', FAST);
          // hold invisibly until the external agent is really listed
          await t.cut(async () => {
            const p = t.source;
            for (let i = 0; i < 20; i++) {
              const txt = await p.evaluate(() => document.body.innerText).catch(() => '');
              if (txt.includes('WeatherAdvisorAgent')) return;
              await p.getByText('Refresh', { exact: true }).first().click().catch(() => {});
              await t.wait(1500);
            }
          });
          await t.wait(1500);
        },
      },
      {
        id: 'wrap',
        title: 'Tick off: eleven of thirteen',
        async act(t) {
          // the closing line plays over the ticked tracker
          await t.cut(async () => {
            await codePage(t);
            await activateTab(t, '10_Handson_a2a_proxy').catch(() => {});
            await closeGuide(t);
            await completeSection(t, 11);
          });
          await t.wait(800);
        },
      },
    ],
  },

  {
    id: 'run-the-system',
    number: 14,
    title: 'Hands-on: run the system',
    stage: 'The codespace with sections 1-11 complete: all five travel agents deployed, NO workflow yet (manifest 12 must not be applied before this chapter records).',
    script: `{open-section}Section twelve is the payoff, and the guide is disciplined about it: test the specialists first, one new chat each, directly at the agent.

{flights-one}Ask the flight search agent for economy flights from Singapore to Tokyo. After some time, real options arrive with the cheapest, fastest, and best value called out. {flights-activity}But the answer is only half the lesson: open the activity panel on the right and read the flow once, properly. Your message, routed by the mention to the agent; the agent's language model deciding what to do; and travel sql query calls going through the flights connector to the database. That shape - agent, model, tool, connector - is the shape of everything you will see today. {flights-two}Then the second prompt, business class from Bangalore to San Francisco, chosen to stress it: there may be no direct flight, so watch it recover - the city stored under a different name, the two-leg search from its instructions - and still end with its JSON recommendation. {hotels}The hotel agent gets both its prompts the same way, and the diagrams look identical, which is exactly the point: same pattern, different database, nothing new to learn. {local}Two runs that do teach something new: the local experiences agent's diagram shows find restaurants and find attractions - not SQL, but tools an MCP server advertises, called the same way. {weather}And the weather advisor's diagram shows an external node: the request leaving the mesh through the proxy you just built, to a LangChain agent on AWS, and coming back as if it were local. About a minute each, and you know every part works before you compose them.

{orchestrate}Now the real test. New chat, and paste the full prompt from the guide: a five day trip from Singapore to Tokyo for two people, departure ten days from today, with flights, hotels, restaurants, weather, and a full budget. Send it, and watch the activity panel rather than the answer, because this diagram is the whole workshop in one picture. The tree starts building live: the orchestrator converts the relative dates with its time tools, then fans out to all four specialists at once - and nobody told it to; it read their cards and decided. Hold on that fan-out a moment: four branches working in parallel, each running the same agent-model-tool shape you read earlier. {orchestrate-tree}After some time, the results flow back up and the orchestrator calls the Go tools: compile itinerary, then calculate budget - deterministic math, no model in the loop. And then the plan arrives: the recommended flight, the hotel with nightly rate, a day by day itinerary with the restaurants placed on it, the forecast with packing tips, and a budget with every line item, {files-tab}saved as an artifact in the Files tab. A real run takes about two and a half minutes end to end; the video compresses the waiting, never the steps.

{nairobi}The guide gives two more orchestrations, and each run shows a different decision. Nairobi to Buenos Aires, best route and estimated total cost: a partial request, and the diagram proves it - only the specialists it needed, and the budget computed by the orchestrator itself. {bali}And the Bali prompt names no agent at all: send it to the default orchestrator and watch the diagram show who it chose to involve, compared side by side with the first two. Three prompts, three different trees, one system. {expected-flow}When you have run all of them, check your diagram against the guide's expected flow: orchestrator, four specialists, two tools, one plan. {wrap}Pause here and run every prompt in your own mesh; when you come back, we make the process deterministic.`,
    async setup(t) {
      await codePage(t);
    },
    steps: [
      { id: 'open-section', title: 'Open section 12', async act(t) { await openSection(t, 12); } },
      {
        id: 'flights-one',
        title: 'Flights: Singapore to Tokyo',
        async act(t) {
          await newChat(t, FAST);
          await sendPrompt(t, GUIDE.prompts.flightsOne, { holdMs: 500, ...FAST });
          await openActivity(t, { ...FAST });
          await t.cut(() => untilText(t, 'Completed', { timeoutMs: 4 * 60 * 1000 }));
          await t.wait(1000);
        },
      },
      {
        id: 'flights-activity',
        title: 'The shape: agent, model, tool, connector',
        async act(t) {
          const p = t.source;
          await openActivity(t, { detail: true, ...FAST });
          await t.cut(() => rerenderActivity(t));
          // flow-view rule: fit the finished run to the panel
          await centerWorkflow(t);
          // a box of importance while the voice says "travel sql query calls":
          // the tool node's modal leads with the SQL the agent generated
          const node = p.locator('[data-testid^="tool-node-travel_sql_query"]').first();
          if (await node.count()) {
            await showClickLoc(t, node, { beat: 350, settle: 300 });
            await t.wait(2200);
            const close = p.locator('button').filter({ hasText: 'Close' }).last();
            await showClickLoc(t, close, { beat: 250, settle: 250 }).catch(() => t.press('Escape'));
          }
          await t.wait(1200);
        },
      },
      {
        id: 'flights-two',
        title: 'Flights: the stress test',
        async act(t) {
          await runPrompt(t, GUIDE.prompts.flightsTwo, { fast: true, cutWait: true, timeoutMs: 5 * 60 * 1000 });
          await scrollChat(t, 1200, 12); // down to the legs, the layover, the JSON
        },
      },
      {
        id: 'hotels',
        title: 'Hotels, twice, montage',
        async act(t) {
          // the narration's claim is about the finished DIAGRAMS looking identical,
          // so both runs happen inside cuts and only the diagrams get screen time
          await runPrompt(t, GUIDE.prompts.hotelsOne, { cutAll: true });
          await centerWorkflow(t, FAST);
          await t.wait(1800);
          await runPrompt(t, GUIDE.prompts.hotelsTwo, { cutAll: true });
          await centerWorkflow(t, FAST);
          await t.wait(2200);
        },
      },
      {
        id: 'local',
        title: 'MCP tools, not SQL',
        async act(t) {
          // diagram-first: the beat opens on the finished MCP-tool diagram
          await runPrompt(t, GUIDE.prompts.local, { cutAll: true });
          await centerWorkflow(t, FAST);
          await t.wait(1500);
        },
      },
      {
        id: 'weather',
        title: 'The external node',
        async act(t) {
          // diagram-first: the external-node diagram is on screen for the whole claim
          await runPrompt(t, GUIDE.prompts.weather, { cutAll: true });
          await centerWorkflow(t, FAST);
          await t.wait(1500);
        },
      },
      {
        id: 'orchestrate',
        title: 'The whole workshop in one picture',
        async act(t) {
          await newChat(t);
          await sendPrompt(t, GUIDE.prompts.orchestrate);
          await openActivity(t, { detail: true });
          await t.wait(14000); // hold the live fan-out: four branches at once
        },
      },
      {
        id: 'orchestrate-tree',
        title: 'The tree, walked',
        async act(t) {
          const p = t.source;
          await t.clock(true, { label: 'run' });
          await t.speed(14, () => untilText(t, 'Completed', { timeoutMs: 8 * 60 * 1000 }));
          await t.clock(false);
          await t.cut(() => rerenderActivity(t));
          await centerWorkflow(t); // re-fit the grown tree as the answer arrives
          // a box of importance while the voice says "calls the Go tools":
          // compile_itinerary's modal shows the deterministic result
          const goNode = p.locator('[data-testid="tool-node-compile_itinerary"]').first();
          if (await goNode.count()) {
            await showClickLoc(t, goNode, { beat: 350, settle: 300 });
            await t.wait(2000);
            const close = p.locator('button').filter({ hasText: 'Close' }).last();
            await showClickLoc(t, close, { beat: 250, settle: 250 }).catch(() => t.press('Escape'));
          }
          await t.source.mouse.move(1450, 500);
          await t.scroll(900, { steps: 24 }); // walk the completed tree top to bottom
          await t.at('files-tab');
          await t.clickText('Files');
          await t.wait(1200);
        },
      },
      {
        id: 'nairobi',
        title: 'A partial request, a smaller tree',
        async act(t) {
          await runPrompt(t, GUIDE.prompts.nairobi, { fast: true, cutWait: true, timeoutMs: 8 * 60 * 1000 });
          await centerWorkflow(t);
          await t.wait(1500);
        },
      },
      {
        id: 'bali',
        title: 'No agent named at all',
        async act(t) {
          // the prompt itself ("names no agent at all") stays on camera; the run
          // and panel open hide in the cut so the diagram lands on "watch the diagram"
          await newChat(t, FAST);
          await sendPrompt(t, GUIDE.prompts.bali, { holdMs: 500, ...FAST });
          await t.cut(async () => {
            await openActivity(t, { detail: true });
            await untilText(t, 'Completed', { timeoutMs: 8 * 60 * 1000 });
            await rerenderActivity(t);
          });
          await centerWorkflow(t, FAST);
          await t.wait(1500);
        },
      },
      {
        id: 'expected-flow',
        title: 'Check against the expected flow',
        async act(t) {
          await codePage(t);
          await activateTab(t, '11_Handson_run_the_system').catch(() => {});
          await t.wait(400);
          await scrollGuideTo(t, 'Expected agent flow', { block: 'start' });
        },
      },
      {
        id: 'wrap',
        title: 'Tick off: twelve of thirteen',
        async act(t) {
          // the closing line plays over the ticked tracker
          await t.cut(async () => { await closeGuide(t); await completeSection(t, 12); });
          await t.wait(800);
        },
      },
    ],
  },

  {
    id: 'workflows',
    number: 15,
    title: 'Hands-on: workflows',
    stage: 'The codespace with sections 1-12 complete, all section-12 runs done; manifest 12 NOT applied yet (this take applies it).',
    script: `{open-section}One thing might bother you about that last section: the orchestrator decided the steps itself, and it could decide differently tomorrow. For a conversation, that flexibility is the feature. For a known process, you want the same steps every time. That is section thirteen: workflows.

{comparison}The guide's comparison table is the heart of it, so read it line by line. In a workflow, you decide the steps when you write it; in dynamic orchestration, the LLM decides at runtime. Parallelism is declared through dependencies, not discovered. Data between steps is typed, each node declares the fields it returns, instead of free text in a conversation. Tool steps call the tool directly, no LLM involved. Retries and timeouts are configured per node. And every node's input and output is recorded, which is what auditability means. The two approaches are not rivals: the orchestrator handles the conversation and decides whether a request needs the full process; the workflow runs that process identically every time.

{workflow-yaml}Now read the workflow itself in the editor. An input schema declares what it expects: origin, destination, dates, travelers, cabin, preferences. {wf-nodes}Three agent nodes, flights, hotels, and local, have no dependencies between them, so they run in parallel. Each one carries an output schema override, the typed fields it must return, which is why you built the specialists to end with JSON. {wf-deps}A budget node depends only on flights and hotels; an itinerary node waits for all three. Both are tool nodes: they execute the Go functions directly, no model call. Each agent node retries once, and if one search fails the other branches still run. {wf-card}To the rest of the mesh, the deployed workflow publishes a card and looks like any other agent.

{plan-apply}Plan and apply with the twelve manifest: it creates the workflow and updates the orchestrator, whose instructions now route complete trip plans to it, keep focused questions with the single specialists, and handle partial combinations itself. {canvas}Verify under Builder, Workflows, and open the canvas: the graph you just read, drawn.

{run}Then run it. New chat, the London to Paris prompt from the guide. {timeline}On the timeline: the orchestrator calls the workflow and the weather agent together; inside the workflow the three searches light up at once; budget fires the moment flights and hotels are done, itinerary when all three are; {finished-plan}and the orchestrator folds the forecast into the final plan, in about half the time the free-form run took. Same system as section twelve, two coordination styles, and you now know when to use each. {wrap}Pause and run yours; this is the last build of the workshop.`,
    async setup(t) {
      await codePage(t);
    },
    steps: [
      { id: 'open-section', title: 'Open section 13', async act(t) { await openSection(t, 13); } },
      {
        id: 'comparison',
        title: 'The comparison table, line by line',
        async act(t) { await scrollGuideTo(t, 'Workflows vs. dynamic orchestration', { block: 'start' }); },
      },
      {
        id: 'workflow-yaml',
        title: 'The workflow, read: the input schema',
        async act(t) {
          // inline quickOpen so the cut starts at Enter: the file opens at the
          // scroll position VS Code remembered, and that frame must never show
          const p = t.source;
          await p.keyboard.press('Meta+p');
          await t.wait(500);
          await p.keyboard.type('sample_configuration/workflows/TravelPlanningWorkflow.yaml', { delay: 14 });
          await t.wait(900);
          await p.keyboard.press('Enter');
          await t.cut(async () => {
            await t.wait(1400);
            await p.mouse.click(860, 500); // guarantee editor focus for the jump
            await t.wait(300);
            await gotoLine(t, 1);
          });
          await p.mouse.move(860, 500);
          await t.wait(600);
        },
      },
      {
        id: 'wf-nodes',
        title: 'Three parallel agent nodes',
        async act(t) {
          await t.cut(() => gotoLine(t, 75)); // flights node centered
          await t.scroll(100, { steps: 6 });
        },
      },
      {
        id: 'wf-deps',
        title: 'Dependencies and tool nodes',
        async act(t) {
          await t.cut(() => gotoLine(t, 148)); // itinerary + budget tool nodes centered
          await t.scroll(100, { steps: 6 });
        },
      },
      {
        id: 'wf-card',
        title: 'A card, like any agent',
        async act(t) {
          // the deps framing already ends on output_mapping at the file's last
          // line; any further scroll lands in blank scroll-beyond-end space
          await t.wait(400);
        },
      },
      {
        id: 'plan-apply',
        title: 'One create, one update',
        async act(t) {
          // TRAVEL_DB_PASSWORD is exported off-camera during staging
          await runCmd(t, GUIDE.plan12, { delay: 12, settle: 0.6 });
          await t.speed(8, () => t.wait(8000));
          await runCmd(t, GUIDE.apply12, { delay: 12, settle: 0.6 });
          // hold compressed so the Workflows list catches up before the verify
          await t.speed(32, () => t.wait(32000));
        },
      },
      {
        id: 'canvas',
        title: 'The graph, drawn',
        async act(t) {
          // inline nav (not builder()): this beat must end by the run cue,
          // so every visible wait is trimmed to the minimum that still reads
          await samPage(t);
          await t.clickText('Workflows', FAST)
            .catch(async () => { await t.clickText('Builder', FAST); await t.wait(500); await t.clickText('Workflows', FAST); });
          // hold invisibly until the new workflow is really listed
          await t.cut(async () => {
            const p = t.source;
            for (let i = 0; i < 20; i++) {
              const txt = await p.evaluate(() => document.body.innerText).catch(() => '');
              if (txt.includes('TravelPlanningWorkflow')) return;
              await p.getByText('Refresh', { exact: true }).first().click().catch(() => {});
              await t.wait(1500);
            }
          });
          await t.wait(250);
          await t.clickText('TravelPlanningWorkflow', FAST).catch(() => {});
          await t.wait(450);
          // flow-view rule: fit the drawn graph to the window
          await centerWorkflow(t, FAST).catch(() => {});
          await t.wait(300);
        },
      },
      {
        id: 'run',
        title: 'London to Paris, through the workflow',
        async act(t) {
          await newChat(t, { settleMs: 300, ...FAST });
          await sendPrompt(t, GUIDE.prompts.workflow, { holdMs: 500, tailMs: 300, ...FAST });
          // diagram-first: the run completes inside the cut, so the full activity
          // tree is already on screen when the voice starts reading the timeline
          await t.at('timeline');
          await t.cut(async () => {
            await openActivity(t, { detail: true, ...FAST });
            await untilText(t, 'Completed', { timeoutMs: 6 * 60 * 1000 });
            await rerenderActivity(t);
          });
          await t.wait(600);
        },
      },
      {
        id: 'finished-plan',
        title: 'Half the time',
        async act(t) {
          await scrollChat(t, 1600, 16);
        },
      },
      {
        id: 'wrap',
        title: 'Tick off: thirteen of thirteen',
        async act(t) {
          // the closing line plays over the fully completed tracker
          await t.cut(async () => {
            await codePage(t);
            await activateTab(t, '12_Handson_workflows').catch(() => {});
            await closeGuide(t);
            await closeTab(t, 'TravelPlanningWorkflow.yaml');
            await completeSection(t, 13);
          });
          await t.wait(800);
        },
      },
    ],
  },

  {
    id: 'wrap-up',
    number: 16,
    title: 'Wrap-up: your turn',
    stage: 'Everything done: the tracker shows all thirteen sections complete; all agents and the workflow deployed. Lower right and center stay clear for end-screen cards.',
    script: `{tracker-complete}And that is the workshop: thirteen sections, and look what they add up to. Agents built four ways: described to Quick Build, assembled in the web UI, written as YAML, and adopted from another framework over A2A. {hierarchy}Tools of every kind: built in, compiled from Go source, and discovered from a database and an MCP server through connectors. An orchestrator that improvises, {canvas}and a workflow that never does. All of it coordinated over a Solace broker, and all of it declarative, planned and applied like any other production change.

{repo}In lifecycle terms, you lived the build and deploy stages today. Test, observe, and improve, the evals, the visualizer, the feedback loop, are waiting in the same platform, and the documentation linked from the first guide is the next step.

The workshop is self-paced: the repository link is below, one click starts the codespace, and the tracker takes you the rest of the way. {community}If you get stuck, the Solace Community forum is the place to ask, {repo-back}and if you have feedback on the workshop itself, the team reads it: the registration form's last question, or an issue on the repository. Happy building.`,
    async setup(t) {
      // pre-open the tail tabs: the on-camera beats then reuse them as instant
      // tab switches (a fresh cross-process navigation can wedge the capture
      // session, which froze the repo frame over the community beat in take 2)
      await t.open(URLS.repo);
      await t.open('https://community.solace.com/c/solace-agent-mesh/16');
      await t.wait(3000);
      await codePage(t);
      await activateTab(t, 'Workshop Tracker').catch(() => {});
      await t.wait(800);
    },
    steps: [
      {
        id: 'tracker-complete',
        title: 'Thirteen of thirteen',
        async act(t) {
          await t.wait(500); // hold the completed tracker
        },
      },
      {
        id: 'hierarchy',
        title: 'The team, one last time',
        async act(t) {
          // the sentence on this marker names the team, so the hierarchical
          // view must snap in AT the marker; navigating on camera left the old
          // chat page under 6s of narration (take 4's disconnect)
          await t.cut(async () => {
            await samPage(t);
            // the SAM UI is an SPA: a stray drag-selection survives route
            // changes and tints every later beat (take 5) - drop it here
            await ask(t.source, () => window.getSelection()?.removeAllRanges());
            await t.clickText('Agents', FAST);
            await t.wait(900);
            await t.clickText('Hierarchical', FAST).catch(() => clickSel(t, '[aria-label*="ierarch"]')).catch(() => {});
            await t.wait(1100); // let the tree render fully before frames resume
          });
          await t.wait(400);
        },
      },
      {
        id: 'canvas',
        title: 'And the workflow',
        async act(t) {
          // same: "a workflow that never does" needs the canvas on the word
          await t.cut(async () => {
            await builder(t, 'Workflows');
            await ask(t.source, () => window.getSelection()?.removeAllRanges());
            await t.wait(700);
            await t.clickText('TravelPlanningWorkflow', FAST).catch(() => {});
            await t.wait(1400); // canvas draw
          });
          await t.wait(400);
        },
      },
      {
        id: 'repo',
        title: 'One click starts the codespace',
        async act(t) {
          await t.open(URLS.repo);
          await t.wait(800);
        },
      },
      {
        id: 'community',
        title: 'Where to ask: the SAM category',
        async act(t) {
          // the pre-opened tab can be discarded and reloaded by Chrome in the
          // background, and Discourse then renders an intermediate route for a
          // moment (take 6 caught its Boards page). Cut over the switch and
          // resume frames only once the category heading is on screen.
          await t.cut(async () => {
            await t.open('https://community.solace.com/c/solace-agent-mesh/16');
            await untilText(t, 'Latest topics in Solace Agent Mesh', { timeoutMs: 20000, poll: 400 });
            await t.wait(400);
          });
          await t.wait(600);
        },
      },
      {
        id: 'repo-back',
        title: 'Feedback: the form or an issue',
        async act(t) {
          await t.open(URLS.repo); // reuses the already-open repo tab
          await t.wait(500);
        },
      },
    ],
  },
];
