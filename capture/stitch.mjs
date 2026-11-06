// Stitch the standalone chapter videos in out/chapters/ into one mp4, with a
// short title card before each chapter. Card images are pre-rendered PNGs in
// out/stitch-work/cards-png/ (this ffmpeg build has no drawtext filter); the
// cards are encoded to match the chapter videos exactly (1920x1080, 30fps,
// h264 high yuvj420p, aac 48k mono), so the final join is a lossless stream
// copy of the chapters themselves.
//
//   node stitch.mjs            -> out/sam-go-workshop-full.mp4
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHAPTERS } from './workshop.steps.mjs';

const OUT_DIR = resolve('out');
const CHAP_DIR = resolve(OUT_DIR, 'chapters');
const WORK = resolve(OUT_DIR, 'stitch-work');
const PNG_DIR = resolve(WORK, 'cards-png');
const FINAL = resolve(OUT_DIR, 'sam-go-workshop-full.mp4');
const CARD_SECONDS = 3;

const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });

const chapters = CHAPTERS.map((c, i) => {
  const nn = String(i).padStart(2, '0');
  return { nn, id: c.id, title: c.title, file: resolve(CHAP_DIR, `${nn}-${c.id}.mp4`), png: resolve(PNG_DIR, `card-${nn}.png`) };
});
for (const c of chapters) {
  if (!existsSync(c.file)) throw new Error(`missing chapter video: ${c.file}`);
  if (!existsSync(c.png)) throw new Error(`missing card image: ${c.png} (render the cards first)`);
}

mkdirSync(WORK, { recursive: true });

const listLines = [];
for (const c of chapters) {
  const card = resolve(WORK, `card-${c.nn}.mp4`);
  ff([
    '-loop', '1', '-framerate', '30', '-i', c.png,
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono',
    '-vf', `fade=t=in:st=0:d=0.4,fade=t=out:st=${CARD_SECONDS - 0.4}:d=0.4,format=yuvj420p`,
    '-c:v', 'libx264', '-profile:v', 'high', '-crf', '18', '-preset', 'medium',
    '-c:a', 'aac', '-ar', '48000', '-ac', '1',
    '-t', String(CARD_SECONDS), '-shortest', '-movflags', '+faststart', card,
  ]);
  listLines.push(`file '${card}'`, `file '${c.file}'`);
}

const listFile = resolve(WORK, 'list.txt');
writeFileSync(listFile, listLines.join('\n') + '\n');
ff(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', FINAL]);

const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', FINAL]).toString().trim();
console.log(`stitched ${chapters.length} chapters + cards -> ${FINAL} (${Math.floor(dur / 60)}:${String(Math.round(dur % 60)).padStart(2, '0')})`);
