/* global process, console, document, window, setTimeout, Buffer */
/**
 * The recording rig: attaches to the dedicated recording Chrome (CDP :9223,
 * launched by ../recording-browser.sh, signed into GitHub), captures frames
 * from whichever page is the SOURCE, follows the narration plan's markers,
 * and encodes one chapter into a 1920x1080 segment.
 *
 * Time model (timeline.mjs): the rig logs wall-clock seconds. A wait is
 * either CUT (t.cut(fn): takes no time in the edit) or SPED UP
 * (t.speed(factor, fn): a timelapse, 1/factor of real time). Markers from the
 * voiced take say when each step fires, so the picture lands on the word.
 *
 * The viewport: every source page gets a CDP device-metrics override of
 * 1728x972 at DPR 2 (exactly 16:9), so frames are 3456x1944 and scale to the
 * 1920x1080 master without letterboxing. Overrides are cleared on the way out.
 */
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { frameDurations, makeEditedTime } from './timeline.mjs';
import { CACHE } from './narrate.mjs';

export const SEGMENTS = resolve(CACHE, 'segments');
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const FFPROBE = process.env.FFPROBE ?? 'ffprobe';
const CDP_URL = process.env.RECORDING_CDP ?? 'http://127.0.0.1:9223';
export const VIEW = { width: 1728, height: 972, deviceScaleFactor: 2, mobile: false };
export const OUT_WIDTH = 1920;
export const OUT_HEIGHT = 1080;
/** Picture before a chapter's narration starts, and after it ends. */
export const LEAD = 1.0;
export const TAIL = 1.0;
/** An action starts this much before its word, so its result shows as the word is said. */
const ACTION_LEAD = 0.2;
/** Later than this past its word, an action is reported as late. */
const LATE = 0.6;

const now = () => Date.now() / 1000;

/**
 * Record one chapter. `take` is { duration, markers, key|null, alignment|null, text }
 * (from the narration plan, or estimated). Returns { duration, steps, cues }.
 */
export async function recordChapter(chapter, take, { spokenCues } = {}) {
  const moment = new Map(Object.entries(take.markers).map(([n, s]) => [n, LEAD + s]));
  const chapterEnd = LEAD + take.duration + TAIL;

  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch {
    throw new Error(`no recording Chrome at ${CDP_URL}: run  bash recording-browser.sh  first`);
  }
  const ctx = browser.contexts()[0];
  if (!ctx) throw new Error('the recording Chrome has no pages');

  // ── frames, from the source page ────────────────────────────────────────
  // Frames go to disk as they are captured: a long chapter at 30fps is several
  // gigabytes of JPEG, which once killed the process when held in memory.
  const frames = [];
  const framesDir = resolve(tmpdir(), `sam-workshop-frames-${chapter.id}`);
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });
  let source = null;
  let recording = false;
  let loop = null;
  let lastGrabWarn = 0;
  const cdpOf = new Map();
  const cdp = async (p) => {
    if (!cdpOf.has(p)) cdpOf.set(p, await p.context().newCDPSession(p));
    return cdpOf.get(p);
  };
  const overridden = new Set();
  const THEME = process.env.RECORDING_THEME ?? 'dark';
  async function fit(p) {
    const s = await cdp(p);
    await s.send('Emulation.setDeviceMetricsOverride', VIEW);
    // one look across GitHub, the SAM UI and VS Code web, whatever the Mac is set to
    await s.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: THEME }] }).catch(() => {});
    overridden.add(p);
  }
  /** A CDP command dropped mid-navigation never answers; this turns it into an error. */
  const stall = (ms, what) => new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} stalled (CDP)`)), ms));
  async function grab(p, quality = 90) {
    const r = await Promise.race([
      (await cdp(p)).send('Page.captureScreenshot', { format: 'jpeg', quality }),
      stall(2500, 'screenshot'),
    ]);
    return Buffer.from(r.data, 'base64');
  }
  /** The session wedged (cross-process navigation): rebuild it and re-apply emulation. */
  async function rebuildSession(p) {
    try { cdpOf.get(p)?.detach?.().catch(() => {}); } catch { /* already dead */ }
    cdpOf.delete(p);
    overridden.delete(p);
    await Promise.race([fit(p), stall(5000, 'session rebuild')]).catch(() => {});
  }
  function startFrames() {
    recording = true;
    loop = (async () => {
      while (recording) {
        const t0 = now();
        try {
          const data = await grab(source);
          const file = resolve(framesDir, `t-${String(frames.length).padStart(6, '0')}.jpg`);
          writeFileSync(file, data);
          frames.push({ t: t0, file });
        } catch (e) {
          // any failed grab: mid-navigation, a page switch, or a dead session
          // (Chrome can reload or discard a background tab, which kills the
          // cached CDP session with a non-stall error such as "Target closed").
          // A fresh session keeps the take alive in every case; holding the
          // last good frame silently does not, so say what happened too.
          const msg = e?.message ?? String(e);
          if (now() - lastGrabWarn > 1) {
            console.warn(`  frame grab failed (${msg.slice(0, 90)}); rebuilding capture session`);
            lastGrabWarn = now();
          }
          await rebuildSession(source);
        }
        const wait = 1000 / 30 - (now() - t0) * 1000;
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      }
    })();
  }

  // ── the edit and the narration's clock ──────────────────────────────────
  const windows = [];
  let origin = null;
  const edited = () => makeEditedTime(windows, origin ?? frames[0]?.t ?? now())(now());
  async function untilEdited(target) {
    while (edited() < target) await new Promise((r) => setTimeout(r, Math.min(100, Math.max(10, (target - edited()) * 1000))));
  }
  const late = [];
  async function untilMoment(name) {
    if (!moment.has(name)) throw new Error(`no {${name}} in ${chapter.id}'s script`);
    const target = moment.get(name) - ACTION_LEAD;
    await untilEdited(target);
    const over = edited() - target;
    if (over > LATE) late.push(`{${name}} ${over.toFixed(1)}s late`);
  }
  let hiddenDepth = 0; // inside a cut or speed window, choreography is wasted real time
  const cut = async (fn) => {
    const t0 = now();
    hiddenDepth++;
    try { return await fn(); } finally { hiddenDepth--; windows.push({ t0, t1: now(), factor: Infinity }); }
  };
  const speed = async (factor, fn) => {
    const t0 = now();
    hiddenDepth++;
    try { return await fn(); } finally { hiddenDepth--; windows.push({ t0, t1: now(), factor }); }
  };

  // ── click choreography: the viewer must SEE every on-camera interaction ──
  // CDP screenshots carry no OS cursor, so one is drawn on the page: it glides
  // to the target, a ring pulses while the narration names it, then the click.
  async function ensurePointer(p) {
    await Promise.race([p.evaluate(() => {
      const stale = document.getElementById('__cap-cursor');
      if (stale && !stale.style.transition.includes('opacity')) stale.remove();
      if (!document.getElementById('__cap-cursor')) {
        const c = document.createElement('div');
        c.id = '__cap-cursor';
        c.style.cssText = 'position:fixed;z-index:2147483646;width:18px;height:18px;border-radius:50%;'
          + 'background:rgba(255,255,255,.95);border:2.5px solid #0b1520;box-shadow:0 1px 8px rgba(0,0,0,.55);'
          + 'pointer-events:none;left:-60px;top:-60px;opacity:0;'
          + 'transition:left .5s cubic-bezier(.22,.61,.36,1),top .5s cubic-bezier(.22,.61,.36,1),opacity .25s ease';
        document.body.appendChild(c);
      }
      if (!document.getElementById('__cap-fx-style')) {
        const s = document.createElement('style');
        s.id = '__cap-fx-style';
        s.textContent = '@keyframes __cap-pulse{0%{transform:translate(-50%,-50%) scale(.55);opacity:1}100%{transform:translate(-50%,-50%) scale(2.7);opacity:0}}';
        document.head.appendChild(s);
      }
    }), stall(4000, 'pointer setup')]).catch(() => {});
  }
  const pointerTo = (p, x, y) => Promise.race([p.evaluate(([a, b]) => {
    const c = document.getElementById('__cap-cursor');
    if (c) { c.style.left = `${a - 9}px`; c.style.top = `${b - 9}px`; }
  }, [x, y]), stall(4000, 'pointer move')]).catch(() => {});
  // The cursor is invisible between choreographies: it appears just shy of the
  // target (teleport while hidden, then fade in so the glide reads as motion)
  // and fades away after a grace period, which a follow-on action cancels so a
  // run of clicks keeps one continuous mouse.
  const pointerSpawn = (p, x, y) => Promise.race([p.evaluate(([a, b]) => {
    const c = document.getElementById('__cap-cursor');
    if (!c) return;
    clearTimeout(window.__capCurHide);
    if ((c.style.opacity || '0') === '0') {
      const t = c.style.transition;
      c.style.transition = 'none';
      c.style.left = `${Math.max(16, a - 110) - 9}px`;
      c.style.top = `${Math.min(innerHeight - 24, b + 80) - 9}px`;
      void c.offsetWidth;
      c.style.transition = t;
    }
    c.style.opacity = '1';
  }, [x, y]), stall(4000, 'pointer spawn')]).catch(() => {});
  const pointerRest = (p, ms) => Promise.race([p.evaluate((t) => {
    clearTimeout(window.__capCurHide);
    window.__capCurHide = setTimeout(() => {
      const c = document.getElementById('__cap-cursor');
      if (c) c.style.opacity = '0';
    }, t);
  }, ms), stall(4000, 'pointer rest')]).catch(() => {});
  const pulseAt = (p, x, y) => Promise.race([p.evaluate(([a, b]) => {
    const r = document.createElement('div');
    r.style.cssText = `position:fixed;z-index:2147483645;left:${a}px;top:${b}px;width:15px;height:15px;`
      + 'border-radius:50%;border:3px solid #ffb02e;transform:translate(-50%,-50%);pointer-events:none;'
      + 'animation:__cap-pulse 1s ease-out 2';
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 2100);
  }, [x, y]), stall(4000, 'pulse')]).catch(() => {});
  /** Glide, ring, beat, click, settle. Inside a cut it is just a plain click. */
  async function showClick({ x, y }, { p, glide = 550, beat = 900, settle = 800, ring = true } = {}) {
    p = p ?? source;
    if (hiddenDepth > 0 || !recording) {
      await p.mouse.move(x, y, { steps: 4 });
      await p.mouse.click(x, y);
      return;
    }
    await ensurePointer(p);
    await pointerSpawn(p, x, y);
    await pointerTo(p, x, y);
    await new Promise((r) => setTimeout(r, glide + 120));
    if (ring) { await pulseAt(p, x, y); await new Promise((r) => setTimeout(r, beat)); }
    await p.mouse.move(x, y, { steps: 4 });
    await p.mouse.click(x, y);
    await new Promise((r) => setTimeout(r, settle));
    await pointerRest(p, 1400);
  }

  /** A label on the source page, in the video's look; gone after `ms` (0 = until replaced). */
  async function label(html, { ms = 0, where = 'title', id = '__cap-label' } = {}) {
    const pos = {
      'top-right': 'top:64px;right:20px', 'top-left': 'top:64px;left:72px',
      'bottom-left': 'bottom:72px;left:72px', title: 'bottom:120px;left:72px',
      center: 'top:42%;left:50%;transform:translateX(-50%)',
    }[where];
    await source.evaluate(([h, css, i, t]) => {
      document.getElementById(i)?.remove();
      const el = document.createElement('div');
      el.id = i;
      el.style.cssText = `position:fixed;${css};z-index:2147483647;padding:12px 18px;border-radius:10px;background:#0b1520;color:#e8f4ee;border:1px solid #2e5c48;box-shadow:0 8px 28px rgba(0,0,0,.45);font:600 18px/1.35 'Avenir Next','Segoe UI',system-ui,sans-serif;max-width:720px`;
      el.innerHTML = h;
      document.body.appendChild(el);
      if (t > 0) setTimeout(() => el.remove(), t);
    }, [html, pos, id, ms]).catch(() => {});
  }

  /** An elapsed clock in the corner, for timelapses; t.clock(false) removes it. */
  async function clock(on, { label: text = 'elapsed' } = {}) {
    if (!on) return source.evaluate(() => { window.__capClock?.stop?.(); document.getElementById('__cap-clock')?.remove(); }).catch(() => {});
    await source.evaluate((t) => {
      document.getElementById('__cap-clock')?.remove();
      const el = document.createElement('div');
      el.id = '__cap-clock';
      el.style.cssText = 'position:fixed;top:16px;right:20px;z-index:2147483647;padding:8px 14px;border-radius:9px;background:rgba(11,21,32,.92);color:#9be09b;border:1px solid #2e5c48;font:700 17px/1.2 ui-monospace,Menlo,monospace';
      document.body.appendChild(el);
      const start = Date.now();
      const tick = () => {
        const s = Math.floor((Date.now() - start) / 1000);
        el.textContent = `${t} ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      };
      tick();
      const iv = setInterval(tick, 500);
      window.__capClock = { stop: () => clearInterval(iv) };
    }, text).catch(() => {});
  }

  const t = {
    ctx,
    get source() { return source; },
    state: {},
    at: (name) => untilMoment(name),
    cut,
    speed,
    wait: (ms) => new Promise((r) => setTimeout(r, ms)),
    label,
    unlabel: (id = '__cap-label') => source.evaluate((i) => document.getElementById(i)?.remove(), id).catch(() => {}),
    clock,
    /** Frames come from this page from now on (sized 16:9, brought to front). */
    useSource: async (p) => {
      if (!overridden.has(p)) await fit(p);
      source = p;
      await p.bringToFront().catch(() => {});
      await new Promise((r) => setTimeout(r, 400));
    },
    /** The first open tab whose URL contains `match`, or null. */
    tab: (match) => ctx.pages().find((p) => p.url().includes(match)) ?? null,
    /** Open (or reuse) a tab on `url` and make it the source. */
    open: async (url, { reuse = true } = {}) => {
      let p = reuse ? ctx.pages().find((x) => x.url() === url) : null;
      if (!p) { p = await ctx.newPage(); await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
      await t.useSource(p);
      return p;
    },
    /** Click the first element whose trimmed text equals `text` (or starts with it, `prefix: true`), via the real mouse. */
    clickText: async (text, { p = source, tag = 'a,button,div,span,h1,h2,h3,summary', prefix = false, ...clickOpts } = {}) => {
      const rect = await Promise.race([stall(6000, `clickText "${text}"`), p.evaluate(([sel, txt, pre]) => {
        const match = (s) => (pre ? s.startsWith(txt) : s === txt);
        const el = [...document.querySelectorAll(sel)].find((e) => match(e.textContent.trim()) && e.children.length <= 2 && e.getClientRects().length);
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, [tag, text, prefix])]);
      if (!rect) throw new Error(`clickText: "${text}" not found`);
      await showClick(rect, { p, ...clickOpts });
    },
    /** The choreographed click, for callers that locate their own target. */
    showClick,
    /** Point at something without clicking: glide there and pulse once. */
    point: async ({ x, y }, { p, ring = true } = {}) => {
      p = p ?? source;
      if (hiddenDepth > 0 || !recording) return;
      await ensurePointer(p);
      await pointerSpawn(p, x, y);
      await pointerTo(p, x, y);
      await new Promise((r) => setTimeout(r, 650));
      if (ring) await pulseAt(p, x, y);
      await pointerRest(p, 2600);
    },
    /** Type as a person would, visibly, into whatever has focus on `p`. */
    type: async (text, { p = source, delay = 38 } = {}) => { await p.keyboard.type(text, { delay }); },
    press: async (key, { p = source } = {}) => { await p.keyboard.press(key); },
    /** Smooth scroll of the page (or the deepest scrollable under the pointer) by `dy`. */
    scroll: async (dy, { p = source, steps = 10 } = {}) => {
      for (let i = 0; i < steps; i++) {
        await p.mouse.wheel(0, dy / steps);
        await new Promise((r) => setTimeout(r, 60));
      }
    },
    /**
     * The person at the keyboard acts in the visible browser; the wait is cut.
     * With `ready` (an async test, polled), the recorder carries on by itself.
     */
    pause: async (text, ready) => cut(async () => {
      const p = source;
      await p.bringToFront().catch(() => {});
      await new Promise((r) => setTimeout(r, 600));
      await p.evaluate((msg) => {
        const el = document.createElement('div');
        el.id = '__cap-pause';
        el.setAttribute('role', 'alert');
        el.style.cssText = 'position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:16px 22px;border-radius:12px;background:#f2a04a;color:#1a1206;font:700 20px/1.35 system-ui,sans-serif;box-shadow:0 10px 32px rgba(0,0,0,.5);max-width:760px;text-align:center';
        el.textContent = msg;
        document.body.appendChild(el);
      }, `Recording paused: ${text}`).catch(() => {});
      console.log(`\n>>> PAUSE: ${text}`);
      process.stdout.write('\u0007');
      try { execFileSync('osascript', ['-e', `display notification ${JSON.stringify(text)} with title "Workshop recording: your turn" sound name "Glass"`]); } catch { /* not a Mac */ }
      if (ready) {
        const until = Date.now() + 15 * 60 * 1000;
        while (!(await ready().catch(() => false))) {
          if (Date.now() > until) throw new Error('the pause waited 15 minutes for the person at the keyboard');
          await new Promise((r) => setTimeout(r, 500));
        }
        console.log('>>> RESUMED');
      } else {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        await rl.question('    then press Enter here: ');
        rl.close();
      }
      await p.evaluate(() => document.getElementById('__cap-pause')?.remove()).catch(() => {});
      await new Promise((r) => setTimeout(r, 900));
    }),
  };

  // ── run ──────────────────────────────────────────────────────────────────
  let failure = null;
  try {
    await chapter.setup(t);
    if (!source) throw new Error(`${chapter.id}: setup(t) must call t.useSource / t.open`);
    startFrames();
    while (frames.length === 0) await new Promise((r) => setTimeout(r, 50));
    origin = frames[0].t;
    if (chapter.title && chapter.titleCard !== false) {
      const num = typeof chapter.number === 'number' ? `<span style="color:#9be09b;margin-right:8px">${chapter.number}</span>` : '';
      await label(`${num}${chapter.title}`, { ms: 3200, where: 'title', id: '__cap-title' });
    }
    const marks = [];
    for (const s of chapter.steps) {
      await untilMoment(s.id);
      marks.push({ id: s.id, raw: now() });
      console.log(`  ${s.id}`);
      await s.act(t);
    }
    await untilEdited(chapterEnd);
    t.state.marks = marks;
  } catch (e) {
    failure = e;
    try { writeFileSync(resolve(CACHE, `failed-${chapter.id}.jpg`), await grab(source ?? ctx.pages()[0])); } catch { /* nothing to show */ }
    console.error(`  at ${source?.url?.() ?? '?'}; screenshot ${resolve(CACHE, `failed-${chapter.id}.jpg`)}`);
  } finally {
    recording = false;
    await loop?.catch(() => {});
    await clock(false).catch(() => {});
    for (const p of overridden) {
      try { await (await cdp(p)).send('Emulation.clearDeviceMetricsOverride'); } catch { /* page gone */ }
    }
    // connectOverCDP: closing the browser object only detaches; the Chrome stays up
    await browser.close().catch(() => {});
  }
  if (failure) { rmSync(framesDir, { recursive: true, force: true }); throw failure; }

  // ── edit: drop cut frames, shrink sped ones, encode, lay the take under ──
  const at = makeEditedTime(windows, origin);
  const work = resolve(tmpdir(), `sam-workshop-${chapter.id}`);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  mkdirSync(SEGMENTS, { recursive: true });
  const timed = frameDurations(frames, windows, origin);
  const lines = [];
  timed.forEach((f) => {
    lines.push(`file '${f.frame.file}'`, `duration ${f.duration.toFixed(4)}`);
  });
  lines.push(lines.at(-2));
  writeFileSync(resolve(work, 'list.txt'), lines.join('\n'));
  try {
    const video = resolve(work, 'video.mp4');
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', resolve(work, 'list.txt'),
      '-vf', `scale=${OUT_WIDTH}:${OUT_HEIGHT}:flags=lanczos,fps=30,format=yuv420p`, '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-an', video]);
    const duration = Number(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]).toString().trim());
    const segment = resolve(SEGMENTS, `${chapter.id}.mov`);
    if (take.key) {
      execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', video, '-i', resolve(CACHE, `${take.key}.mp3`), '-filter_complex',
        `[1:a]adelay=${Math.round(LEAD * 1000)}:all=1,apad,atrim=0:${duration.toFixed(3)},aresample=48000[a]`,
        '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'pcm_s16le', segment]);
    } else {
      execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', video, '-f', 'lavfi', '-t', duration.toFixed(3), '-i', 'anullsrc=r=48000:cl=mono',
        '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'pcm_s16le', segment]);
    }
    const steps = t.state.marks.map((m, i) => ({ id: m.id, start: at(m.raw), end: t.state.marks[i + 1] ? at(t.state.marks[i + 1].raw) : duration }));
    const cues = take.alignment && spokenCues ? spokenCues(take.text, take.alignment, LEAD) : [];
    writeFileSync(resolve(SEGMENTS, `${chapter.id}.json`), JSON.stringify({
      id: chapter.id, estimate: !take.key, key: take.key, duration, steps, cues, late, recordedAt: new Date().toISOString(),
    }, null, 1));
    console.log(`\n${chapter.id}: ${duration.toFixed(1)}s (${windows.length} wait window(s))${take.key ? '' : ', estimated timing, silent'}`);
    console.log(late.length ? `  LATE (the picture lags the voice): ${late.join(', ')}` : '  every action landed on its word');
    return { duration, steps, cues };
  } finally {
    rmSync(work, { recursive: true, force: true });
    rmSync(framesDir, { recursive: true, force: true });
  }
}
