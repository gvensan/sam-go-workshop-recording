/**
 * The product tour's timing, as pure functions: the narration script and its
 * markers, the voice's word timings, and the recording's edit. No I/O here, so
 * the rules can be checked without a browser or a voice.
 *
 * Time model. The recorder logs wall-clock seconds. A wait window (a server
 * round trip, a page load, a download being prepared) is either CUT (factor
 * Infinity: it takes no time in the edit) or SPED UP (factor n: it lasts 1/n).
 * `makeEditedTime` integrates over the windows, so every mark, frame and
 * caption maps through one function and the video, the narration and the
 * captions cannot drift apart.
 */

/** Kept on each side of a cut, so the edit shows the click and the result. */
export const CUT_EDGE = 0.35;

/**
 * A chapter script with `{marker}`s: the spoken text (markers removed, spaces
 * kept) and each marker's character offset in it. Marker names are
 * lowercase words joined by hyphens; any other brace is refused, so a typo
 * never gets spoken.
 */
export function parseScript(script) {
  const markers = [];
  let text = '';
  let last = 0;
  const re = /\{([a-z0-9]+(?:-[a-z0-9]+)*)\}/g;
  for (let m = re.exec(script); m; m = re.exec(script)) {
    text += script.slice(last, m.index);
    markers.push({ name: m[1], offset: text.length });
    last = re.lastIndex;
  }
  text += script.slice(last);
  if (/[{}]/.test(text)) throw new Error(`a brace in the script is not a marker: "${text.slice(Math.max(0, text.search(/[{}]/) - 20), text.search(/[{}]/) + 20)}"`);
  const seen = new Set();
  for (const mk of markers) {
    if (seen.has(mk.name)) throw new Error(`marker {${mk.name}} appears twice`);
    seen.add(mk.name);
  }
  return { text, markers };
}

/** The spoken text between two markers (or to the end), trimmed. */
export function spokenBetween(parsed, from, to) {
  const a = parsed.markers.find((m) => m.name === from)?.offset ?? 0;
  const b = to ? parsed.markers.find((m) => m.name === to)?.offset ?? parsed.text.length : parsed.text.length;
  return parsed.text.slice(a, b).trim();
}

/**
 * Check the voice's alignment against the text it was given: the characters
 * must spell the text exactly, one timing per character.
 */
export function checkAlignment(text, alignment) {
  const chars = alignment?.characters ?? [];
  if (chars.join('') !== text) throw new Error('the voice\'s timings do not match the script text');
  if (alignment.character_start_times_seconds.length !== chars.length) throw new Error('the voice returned a timing per character that does not line up');
}

/** Seconds into the chapter audio at which each marker's next spoken character starts. */
export function markerSeconds(parsed, alignment) {
  const starts = alignment.character_start_times_seconds;
  const out = {};
  for (const mk of parsed.markers) {
    let i = mk.offset;
    while (i < parsed.text.length && /\s/.test(parsed.text[i])) i++;
    out[mk.name] = starts[Math.min(i, starts.length - 1)] ?? 0;
  }
  return out;
}

/**
 * Split text into caption cues of at most `max` characters (about two lines
 * on a phone): at sentence ends first, then at the comma or colon nearest an
 * even split, then between words. Every word is kept, in order.
 */
export function splitCues(text, max = 84) {
  const sentences = text.trim().match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [];
  return sentences.map((s) => s.trim()).filter(Boolean).flatMap((s) => balance(s, max));
}

function balance(s, max) {
  if (s.length <= max) return [s];
  const parts = Math.ceil(s.length / max);
  const target = s.length / parts;
  const breaks = [...s.matchAll(/[,:] /g)].map((m) => m.index + 1);
  const near = breaks.sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
  if (near !== undefined && near <= max && Math.abs(near - target) < target * 0.45) {
    return [s.slice(0, near).trim(), ...balance(s.slice(near).trim(), max)];
  }
  const out = [];
  let line = '';
  for (const word of s.split(/\s+/)) {
    if (line && (line + ' ' + word).length > target && out.length < parts - 1) { out.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  out.push(line);
  return out;
}

/**
 * Captions timed to the voice itself: each cue runs from its first spoken
 * character to its last, offset by where the chapter sits in the video.
 */
export function spokenCues(text, alignment, offset) {
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  let pos = 0;
  return splitCues(text).map((p) => {
    const i = text.indexOf(p, pos);
    if (i < 0) throw new Error(`caption "${p}" not found in the script`);
    pos = i + p.length;
    return { start: offset + starts[i], end: offset + ends[i + p.length - 1], text: p };
  });
}

/**
 * Normalize wait windows: trim CUT_EDGE from each side of a cut (a window
 * shorter than both edges is left alone), drop empty ones, sort, and refuse
 * overlaps (two windows over the same instant would count twice).
 */
export function normalizeWindows(windows) {
  const out = windows
    .map((w) => {
      if (w.factor !== Infinity) return { ...w };
      const t0 = w.t0 + CUT_EDGE;
      const t1 = w.t1 - CUT_EDGE;
      return t1 > t0 ? { ...w, t0, t1 } : null;
    })
    .filter((w) => w && w.t1 > w.t0 && (w.factor === Infinity || w.factor > 1))
    .sort((a, b) => a.t0 - b.t0);
  for (let i = 1; i < out.length; i++) {
    if (out[i].t0 < out[i - 1].t1) throw new Error(`wait windows overlap at ${out[i].t0.toFixed(2)}s`);
  }
  return out;
}

/** Raw wall-clock seconds (from `origin`) to seconds in the edited video. */
export function makeEditedTime(windows, origin) {
  const ws = normalizeWindows(windows);
  return (t) => {
    let removed = 0;
    for (const w of ws) {
      if (t <= w.t0) break;
      const inside = Math.min(t, w.t1) - w.t0;
      removed += w.factor === Infinity ? inside : inside * (1 - 1 / w.factor);
    }
    return Math.max(0, t - origin - removed);
  };
}

/** Is raw time `t` inside a cut (its frame is dropped from the edit)? */
export function inCut(windows, t) {
  return normalizeWindows(windows).some((w) => w.factor === Infinity && t > w.t0 && t < w.t1);
}

/**
 * Frame durations for the ffmpeg concat list: each kept frame lasts until the
 * next kept frame, in edited time; the last one holds `tail` seconds.
 */
export function frameDurations(frames, windows, origin, tail = 0.5) {
  const at = makeEditedTime(windows, origin);
  const kept = frames.filter((f) => !inCut(windows, f.t));
  // the floor only guards against zero/negative durations: inside a speed
  // window frames must be allowed to last far less than an output frame
  // (the fps filter drops them), or a slow grab rate caps the compression
  // and the video runs long while marks and cues stay on the narration
  return kept.map((f, i) => {
    const next = kept[i + 1];
    return { frame: f, duration: next ? Math.max(1 / 1000, at(next.t) - at(f.t)) : tail };
  });
}

const pad = (n, w = 2) => String(n).padStart(w, '0');
/** Seconds as a WebVTT (`.`) or SRT (`,`) timestamp. */
export function stamp(sec, sep = '.') {
  const ms = Math.round(Math.max(0, sec) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms % 1000, 3)}`;
}

/** WebVTT file from cues ({start, end, text, id?}). */
export function toVtt(cues) {
  return ['WEBVTT', '', ...cues.flatMap((c) => [...(c.id ? [c.id] : []), `${stamp(c.start)} --> ${stamp(c.end)}`, c.text, ''])].join('\n');
}
/** SRT file from cues: what dubbing and subtitle tools import. */
export function toSrt(cues) {
  return cues.flatMap((c, i) => [String(i + 1), `${stamp(c.start, ',')} --> ${stamp(c.end, ',')}`, c.text, '']).join('\n');
}
