/**
 * Generate out/chapters/NN-<id>.narration.md for every chapter: the narration
 * text split at its {marker} beats, with the time each beat is on screen when
 * a recorded segment JSON exists (~/.cache/sam-workshop-tour/segments/<id>.json).
 *
 * 01-the-deck has a hand-written slide-by-slide file; it is left untouched.
 *
 * Usage: node gen-narration-md.mjs [chapter-id ...]   (default: all chapters)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { CHAPTERS } from './workshop.steps.mjs';

const SEGMENTS = resolve(homedir(), '.cache/sam-workshop-tour/segments');
const OUT = resolve('out/chapters');
const only = process.argv.slice(2);

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

for (const ch of CHAPTERS) {
  if (only.length && !only.includes(ch.id)) continue;
  if (ch.id === 'the-deck') continue; // hand-written, slide-by-slide
  const num = ch.number ?? 0;
  const base = `${String(num).padStart(2, '0')}-${ch.id}`;

  // beats: the script split at {marker} boundaries
  const parts = ch.script.split(/\{([a-z0-9-]+)\}/);
  const beats = [];
  if (parts[0].trim()) beats.push({ marker: null, text: parts[0].trim() });
  for (let i = 1; i < parts.length; i += 2) {
    const text = (parts[i + 1] ?? '').trim();
    if (text) beats.push({ marker: parts[i], text });
    else if (beats.length) beats[beats.length - 1].followup = parts[i]; // a cue with no text of its own
  }

  // titles from the steps array; timings from the segment JSON when recorded
  const titles = new Map((ch.steps ?? []).map((s) => [s.id, s.title]));
  let seg = null;
  const segPath = resolve(SEGMENTS, `${ch.id}.json`);
  if (existsSync(segPath)) {
    try { seg = JSON.parse(readFileSync(segPath, 'utf8')); } catch { /* unreadable: no times */ }
  }
  const stepTime = new Map((seg?.steps ?? []).map((s) => [s.id, s]));

  const lines = [];
  lines.push(`# ${base}.mp4 - narration by step`);
  lines.push('');
  const dur = seg?.duration ? `, ${mmss(seg.duration)} long` : ' (not yet recorded; no timings)';
  lines.push(`Chapter ${num} of the SAM Go workshop recordings: ${ch.title}${dur}.`);
  lines.push('Each section below is one narration beat: the on-screen step (by its');
  lines.push('marker in the recording script), when it is on screen in the mp4, and');
  lines.push('the narration spoken over it.');
  lines.push('');
  for (const b of beats) {
    const title = b.marker ? (titles.get(b.marker) ?? b.marker) : 'Opening';
    const t = b.marker ? stepTime.get(b.marker) : null;
    const when = t ? ` (${mmss(t.start)} - ${mmss(t.end)})` : '';
    lines.push(`## ${b.marker ?? 'start'} - ${title}${when}`);
    lines.push('');
    lines.push(b.text);
    lines.push('');
  }
  const file = resolve(OUT, `${base}.narration.md`);
  writeFileSync(file, lines.join('\n'));
  console.log(`${base}.narration.md${seg ? '' : ' (no segment: untimed)'}`);
}
