# sam-go-workshop-recording

Produces the per-chapter YouTube videos and the single stitched video for the
SAM Go workshop (`SolaceDev/solace-developer-workshops`, branch `sam-go`).
A narration-first pipeline: each chapter's narration script (with `{marker}`s
pinning words) drives a Playwright/CDP rig that performs the workshop live in
a dedicated Chrome profile, captures 30fps frames synced to the narration
clock, and exports finished mp4s.

Produced and verified 2026-11-05 against workshop commit `432a333`:

- `capture/out/chapters/NN-<id>.mp4` - 17 standalone chapter videos (00-16),
  each with a narration/timing doc in `capture/out/chapters-md/`
- `capture/out/sam-go-workshop-full.mp4` - all chapters stitched (43:45) with
  a 3s title card before each chapter

## Repository map

| Path | What it is |
|---|---|
| `capture/` | The entire pipeline: scripts, chapter definitions, outputs. See `capture/README.md` (reference) and `capture/PLAYBOOK.md` (operating guide) |
| `capture/tools/` | Restage/probe helpers that attach to the recording Chrome (see PLAYBOOK "Staging") |
| `chrome-profile/` | The dedicated recording Chrome profile (signed into GitHub once, cookie banners dismissed). Not disposable: recreating it means redoing those sign-ins |
| `recording-browser.sh` | Launches (or reuses) that profile with CDP on `:9223` and prints the websocket URL |
| `FLOW.md` | Design doc: the narration-first authoring rules the chapters follow |
| `RECON.md`, `SCRIPT.draft.md`, `recon-timings.log` | Design-time recon notes and the narration draft that became `workshop.steps.mjs` |

## What is (and is not) in version control

`.gitignore` keeps three heavyweight things out of git:

- `chrome-profile/` (~850MB, and it holds the GitHub session cookies - a
  secret). If it is lost, relaunch via `recording-browser.sh` and redo the
  manual sign-in and cookie-banner dismissals.
- `capture/out/` (~300MB of generated video). The deliverable mp4s live here
  locally; archive them to wherever published copies belong (YouTube, a
  drive). Everything in `out/` is rebuildable by the pipeline, EXCEPT that
  re-voicing narration from scratch costs ElevenLabs quota: the TTS cache
  that makes rebuilds free lives outside the repo in
  `~/.cache/sam-workshop-tour/` (as do the raw take segments) - back that
  directory up if the recordings matter.
- `node_modules/` (restored by `npm install`).

Everything that defines the videos IS versioned: `workshop.steps.mjs`
(narration + choreography), the pipeline scripts, `recording-manifest.json`,
`tools/`, and the docs.

## Prerequisites

- macOS with Google Chrome; the recording profile in `chrome-profile/`
- Node 20+; `cd capture && npm install` (Playwright connects over CDP, no
  browser download)
- `ffmpeg` (any build; the title cards do not use drawtext) and `ffprobe`
- `gh` CLI authenticated (drift check against the workshop repo)
- ElevenLabs API key at `~/.config/sam-workshop/elevenlabs-key` (fallback
  `~/.config/storming/elevenlabs-key`); optional voice override at
  `~/.config/sam-workshop/elevenlabs-voice`. Narration is cached in
  `~/.cache/sam-workshop-tour/` - re-voicing only happens when spoken text
  changes
- A live workshop environment: a GitHub Codespace of the workshop repo with
  SAM running, reachable as `https://<codespace>-8800.app.github.dev` (SAM web
  UI) and `https://<codespace>.github.dev` (VS Code web)

## Quickstart (re-record one chapter)

```bash
bash recording-browser.sh            # Chrome with CDP :9223 (reuses if running)
cd capture

NARRATE_DRY=1 node narrate.mjs       # must say "0 to voice" if text unchanged
node narrate.mjs                     # (re)build out/narration.plan.json

# stage the chapter's required state first: PLAYBOOK "Staging" + tools/
SAM_URL=https://<codespace>-8800.app.github.dev \
CODESPACE_URL=https://<codespace>.github.dev \
node record.mjs <chapter-id>

node assemble.mjs --chapters <chapter-id>   # -> out/chapters/NN-<id>.mp4
node gen-narration-md.mjs <chapter-id>      # -> out/chapters-md/

# FRAME-VERIFY against the narration before shipping (PLAYBOOK "Verification")

node render-cards.mjs                # only if titles / chapter count changed
node stitch.mjs                      # -> out/sam-go-workshop-full.mp4
```

## Keeping the videos current

The videos mirror the workshop exactly, so workshop changes make them stale.
The standing routine (monthly, and before any delivery):

```bash
cd capture && node check-drift.mjs
```

It compares the workshop repo's `sam-go` HEAD against the commit the videos
were recorded at (`capture/recording-manifest.json`) and reports which
chapters are affected, which new guide files look like new sections, and which
chapters' narration speaks the section count. Then follow
`capture/PLAYBOOK.md` > "Periodic maintenance" and "When workshop content
changes". The expensive event is a change to the NUMBER of sections: 10 of 17
chapters speak "thirteen sections" and would re-voice (ElevenLabs quota), and
every title card renumbers. Editing an existing section is usually an
act-only, quota-free fix to one chapter.

After re-recording everything a drift report flagged, bump
`recordedSha`/`recordedAt` in `capture/recording-manifest.json`.

## The three documents, and when to read which

1. **This README**: what the project is, how to run it, the maintenance loop.
2. **`capture/README.md`**: pipeline reference - every script, flag, cache
   path, and the verified UI facts the acts rely on.
3. **`capture/PLAYBOOK.md`**: the operating guide - the picture-tracks-
   narration contract, the cut patterns, staging/restaging, frame
   verification gates, and every production failure mode with its fix. Read
   it before recording anything.

## Hard rules (short version; PLAYBOOK has the reasoning)

- The picture must be on screen within ~1s of the word that names it. The
  recorder only measures when acts START - frame verification of the exported
  mp4 is the only proof.
- Narration is cached on spoken text: markers are free to move, words cost
  ElevenLabs quota.
- Navigate inside `t.cut(...)`; frame editor views with Ctrl+G, never wheel
  scrolling; `sam` runs in its own terminal tab with absolute-path env.
- Verify frames from the exported mp4, not the raw segment (cuts).
- Never probe the browser while a take is recording.
