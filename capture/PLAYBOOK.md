# SAM Go workshop video playbook

How the 17 chapter videos and the stitched full video were made, and how to
recreate or update them when the workshop content changes. Everything here was
learned the hard way across ~30 takes in Nov 2026; the "Hard rules" and
"Failure modes" sections are the distilled version.

## The pipeline at a glance

```
workshop.steps.mjs     the source of truth: chapters, narration scripts with
                       {markers}, staging notes, and the browser acts per beat
narrate.mjs            text -> ElevenLabs TTS, cached; writes out/narration.plan.json
record.mjs             drives Chrome (CDP :9223) per chapter, captures 30fps
                       frames synced to the narration clock -> segment .mov/.json
assemble.mjs           edits (cuts/waits) + muxes narration -> out/chapters/NN-id.mp4
gen-narration-md.mjs   per-chapter narration/timing md (out/chapters-md/)
render-cards.mjs       1920x1080 title-card PNGs via Chrome (ffmpeg here has NO
                       drawtext filter) -> out/stitch-work/cards-png/
stitch.mjs             3s title card per chapter + lossless concat
                       -> out/sam-go-workshop-full.mp4
tools/                 restage and probe helpers (see "Staging" below)
```

Standard commands (from `capture/`):

```bash
# narration: ALWAYS dry-run first; cache is keyed on the spoken text only
NARRATE_DRY=1 node narrate.mjs        # "0 to voice" = free rebuild from cache
node narrate.mjs

# record one chapter (sam/codespace URLs of the live environment)
SAM_URL=https://<codespace>-8800.app.github.dev \
CODESPACE_URL=https://<codespace>.github.dev \
node record.mjs <chapter-id>

# export + docs
node assemble.mjs --chapters <chapter-id>
node gen-narration-md.mjs <chapter-id>

# full video (cards only need re-rendering if titles/chapter count changed)
node render-cards.mjs
node stitch.mjs
```

## The sync contract (the one rule that matters)

The picture must track the narration exactly. A marker like `{canvas}` in a
chapter script pins a word in the narration; the act for that beat starts at
the marker. Early reveal is fine; a late claim is not: if the voice names a
thing, that thing must be on screen within ~1s of the word.

**The recorder cannot catch late pictures.** It measures when an act STARTS,
so "every action landed on its word" in the take output means nothing about
when the target view actually rendered. On-camera navigation (tab switch +
2 clicks) puts the claimed view on screen 6-7 seconds late while the viewer
watches glides over the wrong page - this is exactly the "narration and screen
completely disconnected" failure. The only proof is frame verification
(below).

### Patterns that keep pictures on their words

- **Navigate inside a cut** (`t.cut(async () => { ...nav... })`). Frames
  pause during the cut, so the target view snaps in at the marker. A micro-cut
  costs ~0.45s of edited time; it pays for any wait or nav over ~1s. Used for:
  SAM page navigation beats, the community tab switch, file opens.
- **Diagram-first**: when narration describes a finished run/graph, complete
  the run inside a cut AT the marker so the finished picture is on screen as
  the sentence starts (`t.at('m'); t.cut(async () => { ...run + wait for
  Completed... })`).
- **Editor framing is Ctrl+G, never scrolling.** Wheel-pixel scrolls are not
  reproducible between takes, and VS Code restores each file's last scroll
  position across tab closes. Jump with goto-line inside a cut; a small
  visible `t.scroll(100)` afterwards is fine as a settle gesture. Open files
  with quick-open and start the cut at Enter so the restored-position frame
  never shows.
- **FAST clicks** (`FAST = { glide: 280, beat: 400, settle: 300 }`) for click
  flurries; the default choreographed click costs ~2.3s each.
- Hands-on chapters end with the network/activity flow view: click the network
  icon, show the flow fit-to-window, finish with a canvas pan.
- `sam` runs in its own terminal tab (rail = bash / Codespaces / sam); launch
  with absolute-path env (see failure modes).

## Narration (ElevenLabs) - change discipline

- TTS is cached per chapter keyed on a hash of [voice, model, settings, seed,
  **spoken text**]. `{markers}` are stripped before hashing, so **adding or
  moving markers is free**: `NARRATE_DRY=1 node narrate.mjs` must say
  "0 to voice", then `node narrate.mjs` rebuilds the plan from cache.
- **Changing any spoken word re-voices that whole chapter** (quota). Prefer
  act/marker-only fixes. If content changes force new words, budget quota and
  re-verify every marker time in that chapter afterwards.
- `record.mjs` refuses to run if the plan key does not match the current
  script - the plan must be rebuilt after any script edit.

## Staging and restaging

The videos pretend to be one continuous workshop run, so every chapter has a
`stage:` note in `workshop.steps.mjs` describing what must already be true
(tracker progress, deployed agents, open tabs, parked pages). Between takes,
restore that state **off camera** with the scripts in `tools/` (all attach to
the running Chrome over CDP :9223 via `tools/probe-lib.cjs`; screenshots land
in `tools/shots/`):

| script | what it does |
| --- | --- |
| `restage-wrapup.cjs` | ch16: Agents layout back to Cards, SAM parked #/chat, selection cleared + verified |
| `delete-paris-chats.cjs` | remove the London-Paris chats from SAM |
| `delete-travel-agents.cjs` | remove the 3 YAML travel agents (run twice if the list lags) |
| `delete-toolset.cjs` / `delete-connectors.cjs` | remove the Go toolset / connectors |
| `reset-stage.cjs <n>` | set the tracker back to n sections done |
| `restage-ch12/13/14.cjs` | stage for those chapters |
| `term-run.cjs '<cmd>' <timeoutMs> <shot> [--clear]` | run a command in the bash terminal tab, hardened against focus loss |
| `hide-panel-ch11.cjs` / `open-tracker.cjs` | hide the terminal panel / reopen the Workshop Tracker tab (F1 route) |
| `launch-stack.cjs` / `restart-sam-process.cjs` | bring the broker/sam stack up |

ch15 restage sequence (before re-recording workflows): delete Paris chats ->
delete TravelPlanningWorkflow in Builder > Workflows (row kebab > Delete, type
DELETE into the dialog's second input; the menu has **no Undeploy**) ->
`term-run` `sam config apply --manifest sample_configuration/manifests/09-agents.yaml`
(expect 3 unchanged) -> `reset-stage.cjs 12` -> `restage-ch13.cjs` -> park SAM
at `#/chat`.

### Environment facts that bite

- **The SAM UI is an SPA**: Agents page layout (Cards/Table/Hierarchical)
  persists across sessions; a stray drag-selection survives route changes and
  tints every later frame blue. Restage must reset layout and clear selection
  (and the acts clear it again inside their first cut).
- **Chrome discards background tabs.** A pre-opened tab (repo, community) can
  be silently reloaded on bringToFront; Discourse then renders an intermediate
  route for a beat. Any beat that switches to a pre-opened tab should cut over
  the switch and `untilText` a page-specific heading before frames resume.
- Builder lists lag deployments by up to minutes; poll table rows (`tr`), never
  body text (toasts carry agent names), and close auto-opened detail panels
  via `[aria-label="Close"]`.
- community.solace.com: the cookie banner dismissal is a cookie in the Chrome
  profile - dismiss once per profile, off camera.
- Focus leaks: after a take, codespace focus may sit in the terminal and
  swallow Meta+P. Probes click the target tab first and verify the quick-open
  input value before pressing Enter.

## Verification (gates every ship)

1. Record; the take output must show every marker and no
   "frame grab failed" warnings (rig.mjs logs and self-heals capture-session
   deaths - a silent hold of the last good frame is no longer possible, but a
   warning means check that beat's frames).
2. **Verify frames from the exported mp4, not the raw segment** - the raw
   `~/.cache/sam-workshop-tour/segments/<id>.mov` still contains cut footage,
   so its timeline only matches the final video when the take has no cuts.
   Export first (`assemble.mjs --chapters <id>`), then extract a ladder:
   `ffmpeg -ss <t> -i out/chapters/<nn>-<id>.mp4 -frames:v 1 -q:v 7 f<t>.jpg`
   at: the chapter open, every marker time (from `out/narration.plan.json`),
   ~1.5s after each marker (the snap must have landed), mid-beat holds, and
   the tail.
3. Check each frame against the narration md (`out/chapters-md/`): the named
   thing is on screen within ~1s of its cue, no wrong pages, no selection
   tint, no restored-scroll flashes, lower-right/center clear in the final
   chapter (end-screen cards).
4. Re-stitch (`node stitch.mjs`) and spot-check the changed chapter's boundary
   inside the full video; the concat is a lossless stream copy, so the full
   file needs no further per-frame checks beyond a decode pass
   (`ffmpeg -v error -i out/sam-go-workshop-full.mp4 -f null -`).

## Failure modes seen in production (and their fixes)

- **Picture lags its sentence by seconds** -> navigation was on camera; move
  it into a cut (see sync contract). The recorder will NOT flag this.
- **A beat shows a stale/previous page while the recorder says on-word** ->
  the capture session died (background tab reload) and frames held. rig.mjs
  now rebuilds on any failed grab and warns; if warnings appear, verify that
  beat's frames.
- **Workflow shows Not Deployed after codespace restart** -> relative
  `SAM_DATA_DIR` breaks custom-toolset discovery (fork/exec ENOENT). Fix:
  absolute paths in `/workspaces/solace-developer-workshops/.env` (backup at
  `/tmp/env-backup` in the codespace), then delete/recreate the toolset.
  Reported to the SAM team as a bug.
- **YAML beats framed wrong between takes** -> VS Code restored scroll
  positions; use Ctrl+G in cuts (nodes=line 75 centered, deps=148 centered in
  TravelPlanningWorkflow.yaml).
- **Blue selection tint over the SAM UI** -> SPA-persistent drag selection;
  clear in restage and inside the first cut of each SAM beat.
- **Community beat shows the wrong Discourse page** -> discarded-tab reload;
  cut + `untilText('Latest topics in Solace Agent Mesh')`.
- **Quick-open types into the terminal** -> focus leak; click the editor tab
  first, verify the quick-open input, then Enter.

## Periodic maintenance (the standing routine)

Run this on a cadence (monthly, and always before a workshop delivery or
promoting the videos anywhere new):

1. `node check-drift.mjs` - compares the workshop repo's `sam-go` HEAD against
   the commit the videos were recorded at (`recording-manifest.json`) and
   prints per-chapter impact: AFFECTED chapters with the changed files, GLOBAL
   changes (section list), possible NEW sections (new guide files no chapter
   claims), count-sensitive narration warnings, and unmapped files to triage.
   Exit 0 = nothing to do. Needs `gh` authenticated.
2. Triage the report: a changed guide does not always change the video - read
   the diff and judge whether what is ON CAMERA or SPOKEN changed. Unmapped
   files that turn out to be on camera: add them to the manifest's `sources`.
3. For chapters that really changed, run the update loop below. Re-voicing
   (any spoken-word change, and anything count-sensitive when sections are
   added/removed) costs ElevenLabs quota - batch those decisions.
4. After ALL affected chapters are re-recorded and the full video re-stitched,
   bump `recordedSha`/`recordedAt` in `recording-manifest.json` to the HEAD
   you rebuilt against (the SHA applies to the whole set - never bump it with
   known-stale chapters outstanding).
5. Even on a CLEAN report, UI drift (SAM/VS Code/GitHub) can rot the acts
   silently. Before a high-stakes delivery, spot-rehearse one hands-on
   chapter's acts off camera; if selectors broke, expect to touch others.

## When workshop content changes: the update loop

1. Map the change to chapters: `workshop.steps.mjs` `CHAPTERS` is ordered
   00-16; each has `title`, `stage`, `script` (narration + markers), `steps`
   (beats with acts). Guides/UI changes usually touch only the acts; flow or
   message changes touch the script (= re-voicing, see narration section).
2. Edit the chapter; `node --check workshop.steps.mjs`.
3. Rebuild the narration plan (dry-run first). Rehearse new/changed UI beats
   off camera with a `tools/` probe before burning a take: confirm selectors,
   page headings, and where lists lag.
4. Restage that chapter's `stage:` state, record, export, frame-verify (the
   gates above). One take per fix: each retake should fix one verified defect,
   full chapter re-records each time (video syncs to one continuous narration
   track; only the broken beat's act changes between takes).
5. If chapter titles or the chapter list changed: `node render-cards.mjs`.
   Then `node stitch.mjs` and decode-check. The stitched file updates in
   place at `out/sam-go-workshop-full.mp4`.
6. Leave the environment parked for the next session: tracker at the right
   count, SAM at `#/chat`, Agents layout Cards, terminal panel hidden, no
   leftover take chats.

## Fixed parameters

- Video: 1920x1080, 30fps, h264 High, `yuvj420p`; audio aac 48kHz mono. Title
  cards are encoded to exactly these so the stitch concat is `-c copy`.
- Title cards: navy #0B2239, teal #2EC4A5, 3s, 0.4s fade in/out, "SOLACE
  AGENT MESH WORKSHOP / CHAPTER NN / 16 / <section title>".
- Chrome: the recording profile runs with CDP on :9223; `tools/probe-lib.cjs`
  attaches to it. Never run probes while a take is recording.
- Recording theme: `RECORDING_THEME` (default dark) is forced per page via
  CDP emulation, so the Mac's appearance does not matter.
