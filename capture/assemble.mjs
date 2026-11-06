/* global process, console */
/**
 * Joins the recorded chapter segments into the YouTube package.
 *
 *   node capture/assemble.mjs            (every chapter recorded and voiced)
 *   node capture/assemble.mjs --draft    (silent or estimated segments allowed;
 *                                         missing chapters left out; writes only out/draft.mp4)
 *   node capture/assemble.mjs --chapters (one finished mp4 per recorded chapter,
 *                                         normalized audio, out/chapters/NN-<id>.mp4)
 *
 * Reads ~/.cache/sam-workshop-tour/segments/<id>.mov + .json in CHAPTERS
 * order. A segment must be voiced with the CURRENT narration (its key matches
 * out/narration.plan.json), so a script edit cannot ship with an old take
 * under it.
 *
 * Writes youtube/ in the project root:
 *   workshop.mp4        1920x1080, h264 + aac, chapter marks embedded, faststart
 *   captions.srt        the narration, timed to the voice itself
 *   description.txt     the video description: summary + 0:00 chapter lines
 *   thumbnail.jpg       a 1280x720 frame grab (placeholder until the designed thumbnail)
 *   script.md           the narration with chapter/step timestamps, for reference
 * Outputs land only after every encode succeeded.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAPTERS, TITLE, DESCRIPTION } from './workshop.steps.mjs';
import { CACHE, PLAN_FILE } from './narrate.mjs';
import { parseScript, spokenBetween, toSrt } from './timeline.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SEGMENTS = resolve(CACHE, 'segments');
const OUT = resolve(ROOT, 'youtube');
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const FFPROBE = process.env.FFPROBE ?? 'ffprobe';
const DRAFT = process.argv.includes('--draft');
const EACH = process.argv.includes('--chapters'); // one finished mp4 per chapter, out/chapters/
const RELAXED = DRAFT || EACH;
/** The thumbnail placeholder: a frame from this chapter, this step, `before` seconds early. */
const THUMB = { chapter: 'run-the-system', step: 'orchestrate', before: 2 };

const ff = (args) => execFileSync(FFMPEG, ['-y', '-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
const probe = (file) => Number(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());

// ── the segments, checked before anything is encoded ─────────────────────
const plan = existsSync(PLAN_FILE) ? JSON.parse(readFileSync(PLAN_FILE, 'utf8')) : null;
if (!RELAXED && !plan) {
  console.error('no narration plan: run narrate.mjs, then record every chapter');
  process.exit(1);
}
const problems = [];
const segments = CHAPTERS.map((ch) => {
  const mov = resolve(SEGMENTS, `${ch.id}.mov`);
  const json = resolve(SEGMENTS, `${ch.id}.json`);
  if (!existsSync(mov) || !existsSync(json)) {
    if (RELAXED) console.warn(`  ${ch.id}: not recorded, left out`);
    else problems.push(`${ch.id}: not recorded`);
    return null;
  }
  const meta = JSON.parse(readFileSync(json, 'utf8'));
  if (!RELAXED) {
    const take = plan.chapters.find((c) => c.id === ch.id);
    if (meta.estimate) problems.push(`${ch.id}: recorded with --estimate (silent)`);
    else if (!take || take.key !== meta.key) problems.push(`${ch.id}: recorded against an older narration; record it again`);
  }
  if (meta.late?.length) console.warn(`  ${ch.id}: late cues when recorded: ${meta.late.join(', ')}`);
  return { ch, mov, meta };
});
if (problems.length) {
  console.error(`cannot assemble:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

let at = 0;
const placed = segments.filter(Boolean).map((s) => {
  const duration = probe(s.mov);
  const out = { ...s, start: at, duration };
  at += duration;
  return out;
});
if (!placed.length) { console.error('nothing recorded yet'); process.exit(1); }
const total = at;

// ── one finished video per chapter ────────────────────────────────────────
if (EACH) {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const dir = resolve(HERE, 'out/chapters');
  mkdirSync(dir, { recursive: true });
  let made = 0;
  for (const s of placed) {
    if (only.length && !only.includes(s.ch.id)) continue;
    made++;
    const name = `${String(s.ch.number ?? 0).padStart(2, '0')}-${s.ch.id}.mp4`;
    const file = resolve(dir, name);
    ff(['-i', s.mov, '-map', '0:v', '-map', '0:a',
      '-c:v', 'libx264', '-crf', '20', '-preset', 'medium',
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '160k',
      '-movflags', '+faststart', file]);
    console.log(`  ${name} (${clock(probe(file))}${s.meta.estimate ? ', silent estimate' : ''})`);
  }
  console.log(`chapters: ${made} standalone video(s) -> ${dir}`);
  process.exit(0);
}

const work = resolve(tmpdir(), 'sam-workshop-assemble');
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
try {
  // every segment is 1920x1080 h264 + pcm 48k: the concat demuxer joins them without re-encoding the picture
  writeFileSync(resolve(work, 'list.txt'), placed.map((s) => `file '${s.mov}'`).join('\n'));
  const joined = resolve(work, 'joined.mov');
  ff(['-f', 'concat', '-safe', '0', '-i', resolve(work, 'list.txt'), '-c', 'copy', joined]);

  // the whole narration at web speech loudness, measured over the full video
  const wav = resolve(work, 'narration.wav');
  ff(['-i', joined, '-vn', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-ac', '1', wav]);

  if (DRAFT) {
    mkdirSync(resolve(HERE, 'out'), { recursive: true });
    const draft = resolve(HERE, 'out/draft.mp4');
    ff(['-i', joined, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-crf', '26', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', draft]);
    console.log(`draft: ${draft} (${clock(total)}, ${placed.length}/${CHAPTERS.length} chapters)`);
  } else publish(joined, wav);
} finally {
  rmSync(work, { recursive: true, force: true });
}

function publish(joined, wav) {
  // chapter marks inside the mp4, for players that list them
  const meta = [';FFMETADATA1', `title=${TITLE}`, ...placed.flatMap((s, i) => [
    '[CHAPTER]', 'TIMEBASE=1/1000', `START=${Math.round(s.start * 1000)}`, `END=${Math.round((placed[i + 1]?.start ?? total) * 1000)}`, `title=${chapterLabel(s.ch)}`,
  ])].join('\n');
  writeFileSync(resolve(work, 'chapters.txt'), meta);

  const mp4 = resolve(work, 'workshop.mp4');
  ff(['-i', joined, '-i', wav, '-i', resolve(work, 'chapters.txt'), '-map', '0:v', '-map', '1:a', '-map_metadata', '2', '-map_chapters', '2',
    '-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', mp4]);
  if (Math.abs(probe(mp4) - total) > 0.5) throw new Error(`the encoded video is ${probe(mp4).toFixed(1)}s, the segments add up to ${total.toFixed(1)}s`);

  const thumb = resolve(work, 'thumbnail.jpg');
  ff(['-ss', String(thumbTime()), '-i', joined, '-frames:v', '1', '-vf', 'scale=1280:720:flags=lanczos', '-q:v', '3', thumb]);

  // ── words and times ──────────────────────────────────────────────────
  const chapters = placed.map((s, i) => {
    const parsed = parseScript(s.ch.script);
    const ids = s.ch.steps.map((x) => x.id);
    const end = placed[i + 1]?.start ?? total;
    return {
      id: s.ch.id, number: s.ch.number, title: s.ch.title,
      start: s.start, end,
      steps: s.ch.steps.map((step, si) => {
        const mark = s.meta.steps.find((m) => m.id === step.id);
        if (!mark) throw new Error(`${s.ch.id}: no time for step ${step.id} in its segment`);
        return { id: step.id, title: step.title, start: s.start + mark.start, say: spokenBetween(parsed, step.id, ids[si + 1]) };
      }),
    };
  });
  const cues = placed.flatMap((s) => s.meta.cues.map((c) => ({ ...c, start: s.start + c.start, end: Math.min(s.start + s.duration, s.start + c.end) })));
  if (!cues.length) throw new Error('no captions: the segments carry no voice timings');

  // YouTube chapters need the first line at 0:00 and each chapter at least 10s
  const stampLines = chapters.map((c) => `${clock(c.start)} ${chapterLabel(c.ch ?? c)}`);
  const description = [DESCRIPTION.trim(), '', 'Chapters:', ...stampLines, ''].join('\n');

  mkdirSync(OUT, { recursive: true });
  renameSync(mp4, resolve(OUT, 'workshop.mp4'));
  renameSync(thumb, resolve(OUT, 'thumbnail.jpg'));
  writeFileSync(resolve(OUT, 'captions.srt'), toSrt(cues));
  writeFileSync(resolve(OUT, 'description.txt'), description);
  writeFileSync(resolve(OUT, 'script.md'), [
    `# ${TITLE}: narration`, '',
    `Voice ${plan.voice} (${plan.model}). Video ${clock(total)}. Each chapter is one take; the times are where each part starts in the video.`, '',
    ...chapters.flatMap((c) => [
      `## ${clock(c.start)} ${chapterLabel(c)}`, '',
      ...c.steps.flatMap((x) => [`**${clock(x.start)} ${x.title}.** ${x.say}`, '']),
    ]),
  ].join('\n'));
  console.log(`workshop: ${clock(total)} in ${chapters.length} chapters, ${cues.length} captions -> ${OUT}`);
  for (const line of stampLines) console.log(`  ${line}`);
}

function thumbTime() {
  const seg = placed.find((s) => s.ch.id === THUMB.chapter) ?? placed[0];
  const mark = seg.meta.steps.find((m) => m.id === THUMB.step);
  return Math.round((seg.start + Math.max(0.5, mark ? mark.start - THUMB.before : Math.min(6, seg.duration / 2))) * 100) / 100;
}

/** "3. Launch Solace Agent Mesh"; a chapter without a number carries none. */
function chapterLabel(c) {
  return typeof c.number === 'number' ? `${c.number}. ${c.title}` : c.title;
}
/** m:ss, or h:mm:ss past an hour (YouTube chapter format). */
function clock(sec) {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}
