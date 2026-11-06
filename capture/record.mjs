/* global process, console */
/**
 * Records ONE chapter of the workshop walkthrough into a segment;
 * assemble.mjs joins the segments into the YouTube package.
 *
 *   node capture/record.mjs <chapter-id> [--estimate]
 *   (the recording Chrome up: bash recording-browser.sh; narrate.mjs run
 *    first, unless --estimate)
 *
 * The recorder follows the narration plan: each step and cue fires as the
 * narrator reaches its word (in EDITED time: waits that are cut take none,
 * timelapses 1/factor). `--estimate` times the chapter from its text instead
 * (about 15 characters a second) and writes a silent segment, for working on
 * a chapter before it is voiced.
 *
 * A chapter declares its `stage` as prose (what the codespace and the SAM UI
 * must already show); the person recording prepares that by hand or by
 * running the earlier chapters first. The rig never mutates git or GitHub.
 *
 * Writes ~/.cache/sam-workshop-tour/segments/<id>.mov (+ .json: length, step
 * marks, caption cues).
 */
import { existsSync, readFileSync } from 'node:fs';
import { CHAPTERS } from './workshop.steps.mjs';
import { parseScript, spokenCues } from './timeline.mjs';
import { PLAN_FILE, chapterScripts } from './narrate.mjs';
import { recordChapter } from './rig.mjs';

const EST_RATE = 15; // characters a second, for --estimate

const args = process.argv.slice(2);
const chapterId = args.find((a) => !a.startsWith('--'));
const ESTIMATE = args.includes('--estimate');
const chapter = CHAPTERS.find((c) => c.id === chapterId);
if (!chapter) {
  console.error(`usage: record.mjs <chapter> [--estimate]\nchapters: ${CHAPTERS.map((c) => c.id).join(', ')}`);
  process.exit(2);
}

const parsed = parseScript(chapter.script);
let take;
if (ESTIMATE) {
  const markers = Object.fromEntries(parsed.markers.map((m) => [m.name, m.offset / EST_RATE]));
  take = { duration: parsed.text.length / EST_RATE, markers, key: null, alignment: null, text: parsed.text };
} else {
  if (!existsSync(PLAN_FILE)) { console.error('no narration plan: run narrate.mjs first (or record with --estimate)'); process.exit(1); }
  const plan = JSON.parse(readFileSync(PLAN_FILE, 'utf8'));
  const p = plan.chapters.find((c) => c.id === chapter.id);
  const current = chapterScripts().find((c) => c.id === chapter.id);
  if (!p || p.key !== current.key) { console.error(`${chapter.id}'s narration is out of date: run narrate.mjs (or record with --estimate)`); process.exit(1); }
  take = p;
}

if (chapter.stage) console.log(`${chapter.id}: stage expected on screen: ${chapter.stage}`);
try {
  await recordChapter(chapter, take, { spokenCues });
} catch (e) {
  console.error(`\n${chapter.id} failed, no segment written: ${String(e.message ?? e).split('\n')[0]}`);
  process.exit(1);
}
process.exit(0);
