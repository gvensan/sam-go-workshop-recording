# CLAUDE.md - sam-go-workshop-recording

This repo produces the SAM Go workshop videos: 17 standalone chapter mp4s and
one stitched full video, recorded by driving the live workshop in a dedicated
Chrome profile, synced to ElevenLabs narration.

## Read before doing anything

1. `README.md` - what this is, prerequisites, quickstart, what is not in git
2. `capture/PLAYBOOK.md` - the operating guide: REQUIRED reading before any
   recording, re-recording, or act/script change
3. `capture/README.md` - pipeline reference and verified UI facts

## Rules that override convenience

- **Narration costs money.** The TTS cache keys on spoken text only. Never
  change spoken words casually: marker/act edits are free, word edits re-voice
  a chapter against ElevenLabs quota. Always `NARRATE_DRY=1 node narrate.mjs`
  first and expect "0 to voice" unless a re-voice was deliberate.
- **The picture tracks the narration.** On-screen within ~1s of the word that
  names it; early reveal fine, late claim never. The recorder cannot detect
  late pictures (it measures act starts), so NOTHING ships without
  frame-verifying the exported mp4 against the chapter's narration md
  (PLAYBOOK "Verification"). Verify the exported mp4, not the raw segment.
- **Never commit video outputs or the Chrome profile.** `capture/out/` and
  `chrome-profile/` are gitignored; the profile holds GitHub session cookies.
  Deliverables are archived via GitHub Releases or external storage, never
  the git history (GitHub rejects the >100MB full video anyway).
- **Never run `capture/tools/` probes while a take is recording** - they
  share the same Chrome and will corrupt the take.
- **Restage between takes.** Chapters assume the environment state in their
  `stage:` note. The SAM UI is an SPA: layout choices and stray text
  selections persist across routes and ruin takes (PLAYBOOK "Staging").

## Maintenance entry point

`cd capture && node check-drift.mjs` reports which chapters the workshop repo
has invalidated. Follow PLAYBOOK "Periodic maintenance". After re-recording
everything flagged, bump `recordedSha` in `capture/recording-manifest.json`.
Adding/removing workshop SECTIONS is the expensive case: 10 of 17 chapters
speak "thirteen sections" and re-voice, and all title cards renumber.

## Environment specifics

- Recording Chrome: `bash recording-browser.sh` (profile in `chrome-profile/`,
  CDP on :9223)
- Per-codespace env for record.mjs: `SAM_URL` (…-8800.app.github.dev) and
  `CODESPACE_URL` (….github.dev)
- ElevenLabs key: `~/.config/sam-workshop/elevenlabs-key`; TTS cache and raw
  take segments: `~/.cache/sam-workshop-tour/` (back this up - it is the
  free-rebuild guarantee)
- Known SAM bug: relative `SAM_DATA_DIR` in the codespace `.env` breaks
  toolset discovery after restart; keep absolute paths
  (PLAYBOOK "Failure modes")
