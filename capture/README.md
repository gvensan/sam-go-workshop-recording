# capture/ - the recording pipeline

Adapted from the storming product tour (`solace-event-storming/apps/web/capture/tour`),
retargeted at a YouTube package. Narration first: the script drives the picture.
This file is the reference; `PLAYBOOK.md` is the operating guide (read it
before recording), and `../README.md` is the front door.

## The pieces

| File | What it does |
|---|---|
| `workshop.steps.mjs` | The source of truth: 17 chapters (00-16), each with `title`, `stage` (required environment state), `script` (narration with `{marker}`s), `setup(t)`, and `steps` with `act(t)` browser choreography. Also NARRATOR, TITLE, DESCRIPTION, URLS, GUIDE prompts, FAST timing, shared helpers (samPage, codePage, gotoLine, newChat, sendPrompt, untilText, ...) |
| `timeline.mjs` | Pure timing math (markers, edited time, captions) - copied verbatim from the storming tour |
| `narrate.mjs` | Voices each chapter with ElevenLabs (with-timestamps); writes `out/narration.plan.json`. Clips cached in `~/.cache/sam-workshop-tour/` keyed on the SPOKEN text only (markers stripped), so marker edits are free. `NARRATE_DRY=1` previews what would be voiced |
| `rig.mjs` | Attaches to the recording Chrome (CDP :9223), sizes pages to 16:9, captures 30fps frames from the current source page, follows the narration clock (`t.at`), provides `t.cut`/`t.speed`/`t.clickText`/`showClick`/`t.open`/`useSource`. Rebuilds the capture session on ANY failed frame grab and logs a warning (a dead session must never silently hold the last frame) |
| `record.mjs` | CLI: records one chapter to `~/.cache/sam-workshop-tour/segments/<id>.{mov,json}` (`--estimate` for silent, pre-voice work). Refuses to run if the narration plan is older than the script |
| `assemble.mjs` | Applies the edit (cuts/waits) and muxes narration. `--chapters [id]` exports standalone chapter mp4s to `out/chapters/`; `--draft` makes a quick cut; bare run builds the single legacy package |
| `gen-narration-md.mjs` | Per-chapter narration/timing doc -> `out/chapters-md/NN-<id>.narration.md` (beat boundaries, spoken text per beat) |
| `render-cards.mjs` | 1920x1080 title-card PNGs via the recording Chrome -> `out/stitch-work/cards-png/` (the local ffmpeg has NO drawtext filter, so cards are rendered as web pages) |
| `stitch.mjs` | Encodes each card PNG to a 3s clip matching the chapters' exact codec parameters, then losslessly concatenates card+chapter pairs -> `out/sam-go-workshop-full.mp4` |
| `check-drift.mjs` | Compares the workshop repo's `sam-go` HEAD to `recording-manifest.json` (the commit the videos were recorded at) and reports which chapters are stale. `--since <sha>` simulates an older baseline. Exit 0 clean / 1 action needed |
| `recording-manifest.json` | Chapter -> workshop-source map, the recorded-at SHA, and `countSensitive` flags (chapters whose narration speaks "thirteen sections") |
| `tools/` | Restage/probe helpers over CDP (`probe-lib.cjs` foundation, `restage-*.cjs`, `term-run.cjs`, `reset-stage.cjs`, delete-* cleanups, `open-tracker.cjs`, `hide-panel-ch11.cjs`). Screenshots land in `tools/shots/`. Never run them while a take is recording |

## Running

```bash
npm install                        # once (@playwright/test; CDP connect, no browser download)
bash ../recording-browser.sh       # the dedicated Chrome profile, CDP on :9223

# while building a chapter (silent, no ElevenLabs cost):
node record.mjs welcome --estimate
node assemble.mjs --draft          # -> out/draft.mp4

# the real thing:
NARRATE_DRY=1 node narrate.mjs     # ALWAYS first: "0 to voice" = free plan rebuild
node narrate.mjs                   # voices changed chapters, writes the plan
node record.mjs welcome            # one segment per chapter, re-recordable alone
node assemble.mjs --chapters welcome
node gen-narration-md.mjs welcome

# the full video:
node render-cards.mjs              # only when titles / chapter count changed
node stitch.mjs                    # -> out/sam-go-workshop-full.mp4 (lossless concat)
```

Narration clips are cached per chapter with no neighbor coupling: editing one
chapter's script re-voices only that chapter, and every other recorded take
stays valid. The deliverables are `out/chapters/` and
`out/sam-go-workshop-full.mp4`. Note `out/` is gitignored (generated, large):
the mp4s exist only here and wherever you publish them, and the free-rebuild
guarantee rests on the TTS cache in `~/.cache/sam-workshop-tour/`.

ElevenLabs key: `~/.config/sam-workshop/elevenlabs-key`, falling back to
`~/.config/storming/elevenlabs-key`. Voice override: `~/.config/sam-workshop/elevenlabs-voice`.

Per-codespace URLs come from the environment: `SAM_URL` (the `-8800.app.github.dev`
web UI) and `CODESPACE_URL` (the `.github.dev` VS Code web). Chapters that use
already-open tabs find them by URL instead.

Fixed encoding (cards must keep matching it for the `-c copy` concat):
1920x1080, 30fps, h264 High `yuvj420p`, aac 48kHz mono. Recording theme is
forced per page via CDP (`RECORDING_THEME`, default dark).

## Authoring rules (FLOW.md governs; PLAYBOOK.md has the production patterns)

- A chapter's `script` must open with its first step's marker; step markers
  appear once each, in step order. Cue markers (`t.at('name')`) are free.
- The picture tracks the narration: early reveal allowed, late claim not.
  The recorder measures act STARTS only - it cannot flag a view that renders
  seconds after its word. Frame-verify the exported mp4, always.
- Navigation and anything slower than ~1s goes inside `t.cut(fn)` so the
  target view snaps in at the marker (a micro-cut costs ~0.45s edited time).
  `t.speed(8, fn)` is a timelapse (pair with `t.clock(true)`); narration must
  license the compression ("after some time...").
- `t.pause('do X', readyFn)` hands control to the person at the keyboard
  (registration form, anything credential-shaped); the pause is cut.
- Editor framing: Ctrl+G goto-line inside a cut (`gotoLine`); wheel scrolling
  is not reproducible across takes and VS Code restores per-file scroll
  positions. Open files via quick-open with the cut starting at Enter.
- Every guide prompt: run it, show the output, open the Activity panel.
  Hands-on chapters end on the network/activity flow view with a canvas pan.

## What the helpers know (verified live, Nov 2026)

- Tracker: a webview frame containing "Workshop Sections"; its editor tab must
  be activated first. Sections open via `Section N` (exact text), complete via
  the `#section-s{n}` checkbox - closing a guide alone completes nothing.
  Reopen the tracker tab with F1 > "Open Workshop Tracker".
- VS Code web: files open through Cmd+P with a full relative path; the guide
  tab's close button is `a.codicon-close-small`; the terminal is canvas-based
  (type in, but never read from, the DOM - sam CLI waits are timed, and
  `tools/term-run.cjs` guards against focus loss). `sam` runs in its own
  terminal tab (rail: bash / Codespaces / sam) and must be launched with
  absolute-path env (relative `SAM_DATA_DIR` breaks toolset discovery after a
  codespace restart - reported to the SAM team).
- SAM UI (an SPA - state persists across routes): new chat ONLY via the
  `Start New Chat Session` button (the nav text posts into the current chat);
  the input is a contenteditable div; runs are done when the Activity panel
  shows `Completed`; `Builder` toggles its submenu, so click the subitem
  first. The Agents page Layout (Cards/Table/Hierarchical) persists across
  sessions; a stray drag-selection persists too and tints every frame - clear
  it in restage and inside the first cut. Builder lists lag deployments: poll
  `tr` rows, never body text (toasts carry agent names); close auto-opened
  panels via `[aria-label="Close"]`. Workflow row kebab has Edit / View
  Access / Delete only (no Undeploy); deletion types DELETE into the dialog's
  second input.
- Browser: Chrome discards background tabs; a pre-opened tab (repo, community)
  can reload on bringToFront and briefly render an intermediate route - cut
  over such switches and `untilText` a page-specific heading.
  community.solace.com's cookie-banner dismissal is already stored in the
  recording profile.
