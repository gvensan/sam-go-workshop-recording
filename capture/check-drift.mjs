// Which chapter videos are stale? Compares the workshop repo's current
// sam-go HEAD against the commit the videos were recorded at
// (recording-manifest.json) and maps changed files to chapters.
//
//   node check-drift.mjs                   # against the manifest's recordedSha
//   node check-drift.mjs --since <sha>     # simulate from an older baseline
//
// Exit code: 0 all clean, 1 chapters affected (cron-friendly). Needs `gh`.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('./recording-manifest.json', import.meta.url)));
const { repo, branch, recordedSha, recordedAt } = manifest.workshop;
const sinceIdx = process.argv.indexOf('--since');
const base = sinceIdx > -1 ? process.argv[sinceIdx + 1] : recordedSha;

const gh = (path) => JSON.parse(execFileSync('gh', ['api', path], { maxBuffer: 64 * 1024 * 1024 }).toString());

const head = gh(`repos/${repo}/branches/${encodeURIComponent(branch)}`).commit.sha;
console.log(`workshop:  ${repo}@${branch}`);
console.log(`recorded:  ${base.slice(0, 7)} (${sinceIdx > -1 ? 'simulated baseline' : recordedAt})`);
console.log(`current:   ${head.slice(0, 7)}`);

if (head === base) {
  console.log('\nCLEAN: the workshop has not changed since the videos were recorded.');
  process.exit(0);
}

const cmp = gh(`repos/${repo}/compare/${base}...${head}`);
const files = (cmp.files ?? []).map((f) => ({ path: f.filename, status: f.status }));
console.log(`\n${cmp.total_commits} commit(s), ${files.length} changed file(s) since baseline` +
  (files.length >= 300 ? ' (GitHub caps the list at 300: treat this report as incomplete)' : ''));

const covered = new Set();
const affected = [];
for (const ch of manifest.chapters) {
  const hits = files.filter((f) => ch.sources.some((s) => f.path === s || f.path.startsWith(s)));
  hits.forEach((h) => covered.add(h.path));
  if (hits.length) affected.push({ ch, hits });
}
const globalHits = files.filter((f) => manifest.globalSources.some((s) => f.path === s || f.path.startsWith(s)));
globalHits.forEach((h) => covered.add(h.path));
const unmapped = files.filter((f) => !covered.has(f.path));

if (globalHits.length) {
  console.log('\nGLOBAL sources changed (section list / tracker):');
  for (const f of globalHits) console.log(`  ${f.status.padEnd(8)} ${f.path}`);
  const sensitive = manifest.chapters.filter((c) => c.countSensitive).map((c) => `${c.nn}-${c.id}`);
  console.log('  if the SECTION COUNT changed, these chapters speak it and re-voice:');
  console.log(`  ${sensitive.join(', ')}`);
}

if (affected.length) {
  console.log('\nAFFECTED chapters:');
  for (const { ch, hits } of affected) {
    console.log(`  ${ch.nn}-${ch.id}${ch.countSensitive ? '  [count-sensitive narration]' : ''}`);
    for (const f of hits) console.log(`      ${f.status.padEnd(8)} ${f.path}`);
  }
} else {
  console.log('\nNo mapped chapter sources changed.');
}

const newGuides = unmapped.filter((f) => f.status === 'added' && /^guides\/\d+_.+\.md$/.test(f.path));
if (newGuides.length) {
  console.log('\nPOSSIBLE NEW SECTION(S) (new guide files no chapter covers):');
  for (const f of newGuides) console.log(`  ${f.path}`);
  console.log('  a new section means: new chapter in workshop.steps.mjs, cards renumber');
  console.log('  (CHAPTER NN / <total> changes on EVERY card), and count-sensitive');
  console.log('  narration re-voices. See PLAYBOOK.md.');
}

const other = unmapped.filter((f) => !newGuides.includes(f));
if (other.length) {
  console.log(`\nUnmapped changes (${other.length}): no chapter claims these; skim and extend the manifest if any are actually on camera:`);
  for (const f of other.slice(0, 30)) console.log(`  ${f.status.padEnd(8)} ${f.path}`);
  if (other.length > 30) console.log(`  ... and ${other.length - 30} more`);
}

console.log('\nNext steps for affected chapters: PLAYBOOK.md > "When workshop content changes".');
process.exit(affected.length || globalHits.length || newGuides.length ? 1 : 0);
