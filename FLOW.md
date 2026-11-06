# SAM Go Workshop Recording - flow (v2, walkthrough edition)

A narrated **follow-along walkthrough** of the Solace Agent Mesh workshop,
published directly to YouTube. This is not a product tour: it is a companion a
participant keeps open beside their own Codespace. They watch a chapter, pause,
do that section themselves, and continue. Coverage of the whole workshop flow
matters more than runtime.

Source material: `SolaceDev/solace-developer-workshops` branch `sam-go`
(13 tracker sections, guides 01-12) and the GitHub Pages slide deck
(13 slides). Production pipeline adapted from the event-storming product tour
(`solace-event-storming/apps/web/capture/tour`).

Decisions locked (2026-11-03): complete step-by-step walkthrough (pause, do,
continue) · **thorough coverage: every tracker section walked fully, timing is
not a constraint** · the slides segment walks the FULL deck (it grounds the
viewer on SAM before the hands-on) · narrator voice same as the storming tour
(Eric, eleven_multilingual_v2) · recorded on Giri's GitHub account, backends
always on · narration only, no music.

Estimated runtime: **35-45 minutes**, 17 YouTube chapters. Working title:
*"Solace Agent Mesh Workshop: a complete walkthrough."*

---

## Design principles

1. **One chapter per tracker section.** The YouTube chapter bar mirrors the
   Workshop Tracker, so a participant on section 8 jumps straight to chapter 8.
   Two framing chapters (welcome, wrap-up) and the slides intro are added
   around the 13 sections.
2. **Thorough coverage.** Every section is walked fully: concept guides are
   presented properly (not skimmed), hands-on guides show every step, and
   where a guide offers two options the recommended one is performed and the
   alternative is shown and explained. Waits are the one thing compressed:
   show the start, narrate what is happening, land on the final state, and
   state the real duration so nobody thinks theirs is broken.
3. **Pause points are explicit.** Each hands-on chapter ends with the same
   cue: "pause here, do this section, and continue when the tracker shows it
   complete."
4. **Instructional voice.** Second person, present tense: "open the PORTS
   tab", "run the plan first". The viewer is doing, not watching.
5. **The screen is the guide's screen.** Every click, route, and command is
   exactly what the guide's Codespace path (Option 1) says. Alternatives
   (SAM Desktop, web-UI upload paths) are shown and explained, not performed.

### Privacy rule (recording persona)

Nothing personal appears on screen, ever: the tracker registration form (found
in recon; it gates the workshop and sets up the AI API key) is filled with a
**demo persona and a masked email** (e.g. workshop.demo@solace.com), the
recording browser uses its own dedicated Chrome profile (no personal bookmarks,
accounts, or history), and any frame that would show a real email or account
identifier is reframed or the value replaced before recording.

### House rules (every in-Codespace chapter)

1. **The setup wait is part of the story.** Registration output, key fetch,
   `sam` starting, then the web UI. Compressed with a timelapse and an elapsed
   clock, never skipped; narration states the real duration.
2. **Registration gets you the key.** The register-then-key sequence
   (`register.sh` -> "Access confirmed." -> LiteLLM token applied) is narrated
   explicitly.
3. **The tracker is the only navigation.** Every section opens from the
   Workshop Tracker, works the guide as rendered in the Markdown preview, and
   ends on "Section complete", marked done in the tracker. Never the file
   explorer, never jumping ahead.
4. **Follow the guide verbatim.** Option 1 everywhere, no `--target desktop`,
   no shortcuts the guide does not take. A viewer following along must be able
   to replay every step.
5. **The wait convention (Giri, 2026-11-03).** For anything that takes longer
   than usual - Quick Build, codespace provisioning, every prompt-to-answer
   wait: start the action on camera, explain what is happening while it begins,
   hold a beat so the viewer sees it genuinely working, then bridge with
   "after some time..." and cut to the end state. Never a hard jump-cut from
   click to result, never real-time dead air.
6. **Every guide prompt runs on camera.** All specified prompts in guides 06,
   11, and 12 are executed and their output shown, plus the activity diagram
   (right panel -> Activity, Detail Mode) for each run. Talk through the flow
   in the diagram wherever it shows something new. Every run carries exactly
   one teaching point (see prompt inventory below); concepts are articulated
   once, at the run that demonstrates them best, and later runs reference
   back instead of repeating.

### Prompt inventory (all run on camera, one concept each)

| Run | Prompt (guide) | Concept it carries |
|---|---|---|
| 1 | Quick Build creation prompt (06) | Natural language -> agents; plan review; "deploys live" confirm; ADLC build stage |
| 2 | Top-10 companies research (06) | Dynamic orchestration with built-ins; agent cards; first full activity-timeline talk-through; Files tab artifacts |
| 3 | Flights SIN->Tokyo economy (11) | Custom agent + Postgres connector; @mention routing; LLM -> travel_sql_query in the diagram |
| 4 | Flights Bangalore->SFO business (11) | Error recovery + multi-hop search from the agent's instructions (city-name fallback, two-leg join) |
| 5 | Hotels Tokyo 5-star <$500 (11) | Same pattern, different database - said explicitly, kept brief |
| 6 | Hotels Phuket beachfront (11) | Rich filtering; montage pace |
| 7 | Local experiences Tokyo (11) | MCP connector vs SQL connector: find_restaurants / find_attractions tool nodes in the diagram |
| 8 | Weather Tokyo packing (11) | A2A proxy hop: mesh -> proxy -> LangChain -> Open-Meteo; External agent type |
| 9 | Singapore->Tokyo 5-day full (11) | Dynamic orchestration deep-dive: time tools, parallel fan-out to 4 specialists, Go tools compile_itinerary + calculate_budget; the big diagram talk-through |
| 10 | Nairobi->Buenos Aires route+cost (11) | Partial delegation: only the specialists it needs, budget done by the orchestrator itself |
| 11 | Bali beach holiday, no agent named (11) | Default routing: the Orchestrator decides who is involved |
| 12 | London->Paris via workflow (12) | Declarative DAG vs dynamic: workflow box in the diagram, parallel branches, LLM-free tool nodes, budget before itinerary, ~half the time |

---

## Chapters

Chapter = YouTube chapter = one segment (re-recordable alone). `[s#]` is the
tracker section it covers. Times are targets; the recon run calibrates them.

### Part 1 - before the Codespace

| # | Chapter | Covers | ~Time | What happens on screen |
|---|---------|--------|------:|------------------------|
| 0 | Welcome: how to use this video | - | 1:00 | The finished system (trip plan + agent hierarchy) as the destination; then the repo page. "Watch a chapter, pause, do it, continue." Prereqs from the README checklist: GitHub account, Codespaces access, AWS reachable, and the local DevContainer fallback named. |
| 1 | The intro deck: grounding on SAM | slides | 5:00 | The FULL GitHub Pages deck, presented as an instructor would, every slide: title, agenda, takeaways, 80/20 integration gap, operational challenges wall, ADLC's five stages with their SAM capabilities, lifecycle evolution (SDLC -> API-LC -> ADLC), non-determinism, what is SAM, three process types, broker vs HTTP, closing slide "Open your GitHub Codespace." |

### Part 2 - in the Codespace

| # | Chapter | Covers | ~Time | What happens on screen |
|---|---------|--------|------:|------------------------|
| 2 | Create your Codespace, and let it come up | README | 1:30 | Badge click, Create codespace, then the setup timelapse with elapsed clock: registration ("Access confirmed."), LLM key applied, `sam` CLI installed, broker up, `sam run` starting. Narration: "this takes a few minutes; let it finish." Ends when the simple browser / port 8800 preview appears. |
| 3 | Meet the Workshop Tracker · Getting Started | [s1] | 1:30 | The tracker panel, its 13 sections, the rhythm: open a section, the guide opens as a preview, finish, it's marked complete. Guide s1 walked: what the workshop covers (runtime, CLI, declarative config, entrypoints), the concepts table read through, the takeaways, the resources links. |
| 4 | The use case: multi-agent travel planning | [s2] | 2:00 | Guide s2 walked fully: the use-case diagram, the "without agents" hand-built pipeline and its five limitations, why the toolset exists (deterministic math vs LLM arithmetic), the five agents and the workflow, how a request flows, where everything runs (Codespace vs pre-deployed AWS), the sample Singapore-Tokyo prompt as the finish line. |
| 5 | Launch Solace Agent Mesh | [s3] | 1:30 | Guide s3, Option 1 (Codespace): the environment already did the work. Confirm it: simple browser Continue, PORTS tab, open 8800 in the browser, the Agent Mesh web UI, the agents list. Option 2 (SAM Desktop) shown and explained: installers, IP registration, model config, CLI alias, `--target desktop`. |
| 6 | The Agent Development Lifecycle | [s4] | 3:00 | Guide s4 walked fully: Gartner/MIT context, the SDLC -> API-LC -> ADLC evolution, then each of the five stages with its concerns (role/access/teamwork; evals and LLM-as-judge; promotion, triggers, access control; monitoring, HITL, escalation; feedback loop) and each stage's named Agent Mesh capabilities. |
| 7 | What is Solace Agent Mesh | [s5] | 3:30 | Guide s5 walked fully: three process types, the five tool forms, the operational challenges (state, recovery, distributed comms, artifacts, access control, reactive execution), why a broker (topics/wildcards, user properties, guaranteed delivery and checkpointing), the integration gap, additive to existing event mesh, Quick Build's four stages, then the four components: agents (loop, cards, delegation, external agents), tools (four kinds, STR isolation), connectors (four types), entrypoints (all seven). |
| 8 | Declarative SAM and the `sam` CLI | [s6] | 2:30 | Guide s6 walked fully: CLI capabilities (auth, config, toolset/skill packaging, tasks and evals, AI-assisted authoring, doctor), the config repo layout folder by folder, the manifest anatomy, plan/apply/pull each explained, the `--prune` warning, `${VAR}` secrets and `.env`, targets (`--url`, `--target`), toolset author vs mirror flows, `sam ai-assistance skill install`, and how the workshop's manifests are cumulative. |
| 9 | Hands-on: built-in tools with Quick Build | [s7] | 3:30 | Builder -> Quick Build, the four-agent prompt pasted and READ (roles and guardrails explained), the activity timeline, the plan on the canvas, Build & Activate, four agents built in parallel (wait: start shown, narrated, final state landed, duration stated). Then Agents tab + hierarchical view hint, New Chat, Orchestrator selected, the market-cap research prompt, the delegation timeline, artifacts in Files. Pause cue. |
| 10 | Hands-on: the custom Go toolset | [s8] | 2:30 | The toolset source tree walked (main.go, go.mod, manifest.yaml, build scripts), the 07 manifest fields explained, `sam config plan` output read, `sam config apply` (build-package-upload shown start to Ready), verify in Builder -> Toolsets with both tools. Option 2 shown and explained: `sam toolset package` + the Create Toolset upload form. The exec-format-error tip. Pause cue. |
| 11 | Hands-on: connectors | [s9] | 2:30 | All three connector YAMLs read (flights-db, hotels-db, places-mcp), the `${TRAVEL_DB_PASSWORD}` secret pattern, `export TRAVEL_DB_PASSWORD=travel123`, the 08 manifest, plan, apply, verify in Builder -> Connectors. Option 2 shown and explained: the three web-UI create-connector forms including the MCP tool-selection step. The health-check curl as the troubleshooting move. Pause cue. |
| 12 | Hands-on: the travel agents | [s10] | 3:30 | FlightSearchAgent built fully in the web UI: create manually, name and description, the long instructions pasted and UNPACKED (views, columns, connection search, error recovery, response format), attach flights-db, Create and Deploy. Then the three YAML agents read (connector bindings, orchestrator's toolsets and allowList + timeout), manifest 09 plan/apply, verify all four, hierarchical view. Pause cue. |
| 13 | Hands-on: the A2A proxy | [s11] | 1:45 | Health-check curl on the weather agent, Connect External Agent wizard step by step: URL, well-known URI, no auth, Fetch Agent Card, the card read (name, skill), display name kept, Connect and Deploy, verify Deployed. Pause cue. |
| 14 | Hands-on: run the system | [s12] | 4:30 | ALL the guide's tests, each in its own chat: both flight prompts (Singapore-Tokyo economy; Bangalore-San Francisco business, the connection case), both hotel prompts (Tokyo 5-star; Phuket beachfront), the local experiences prompt, the weather prompt. Then all three orchestrations: Singapore-Tokyo full plan (timeline fan-out, the two Go tools, the finished plan scrolled), Nairobi-Buenos Aires (the partial-combination path), and the no-@-mention Bali prompt (the default orchestrator deciding). Expected agent flow recapped. Pause cue. |
| 15 | Hands-on: workflows | [s13] | 3:30 | The workflow concept and the full workflow-vs-orchestration table walked, the DAG figure, the five nodes and their dependencies, the workflow YAML read (input_schema, output_schema_override, output_mapping, retries, fail_fast), the orchestrator's three routing paths, manifest 12 plan/apply (create + update), the canvas, the London-Paris run watched node by node, compared with chapter 14's dynamic run. Pause cue. |
| 16 | Wrap-up: your turn | - | 1:00 | Tracker all green. What was built, mapped back to the ADLC and to what was NOT covered today (test/observe/improve stages as next steps in the docs). The repo link, docs, community forum. End-screen room kept clear. |

---

## Production approach

1. **Capture-first for all hands-on chapters** (2, 9-15): record the real
   session (real builds, real agent runs), cut dead time, then write final
   narration to the cut. Narration claims only what is stable across runs and
   never reads model output aloud.
2. **Narration-first for the framing and concept chapters** (0, 1, 3-8):
   deterministic screens (repo, slides, guide previews), so the storming-tour
   method applies: script with `{marker}` cues, ElevenLabs one-take-per-chapter
   with character timestamps, actions fired on the narrator's word.
3. **Per-chapter staging.** Manifests are cumulative: chapter N's starting
   state is the previous manifest applied against a reset instance. Quick
   Build agents restorable via `sam config pull`/`apply`. Any chapter is
   re-recordable alone.
4. **Assembly**: segments -> 1920x1080 master, chapter atoms, captions,
   chapters file, script.md, YouTube package (below).

## Deliverables: the YouTube package

| Deliverable | Source | Notes |
|---|---|---|
| `workshop.mp4` | all segments, in order | 1920x1080 (16:9), H.264 + AAC, embedded chapter atoms |
| `description.txt` | title, summary, links + timestamps | the `M:SS Title` chapter lines (first at 0:00, titles under ~40 chars), repo link, docs, community |
| `captions.srt` | the narration script | uploaded caption track = written narration verbatim; YouTube's transcript panel derives from it |
| `thumbnail.jpg` | designed frame | 1280x720, under 2MB, legible small |
| `script.md` | the narration plan | human-readable transcript with chapter times, kept in this repo |
| Per-chapter clips (optional) | any segment | a clip per tracker section, embeddable in each guide later |

YouTube-first notes: frame for 16:9 from the first take; last ~20s keep
lower-right and center clear for end-screen cards; no burned-in captions;
narration normalized to about -14 LUFS.

## Open questions remaining

1. **Per-section clips now or later?** The single film is the deliverable;
   per-section clips can be cut from the same segments afterwards if wanted.
2. **Chapter 9 (Quick Build) demo prompt**: run the full market-cap research
   demo (minutes of real agent work, compressed) or show the build and only
   the start of the demo? Draft assumes the full demo, compressed.
3. **Thumbnail concept**: agent hierarchy view, the trip plan, or a title
   card over the web UI? To decide at assembly.

## Execution order (agreed)

1. ~~Lock decisions~~ (done, above)
2. **Script draft** -> `SCRIPT.draft.md` (this repo) for Giri's review
3. Recon run: full workshop end to end in a real Codespace, timing everything
4. Capture tooling: adapt the storming pipeline into `capture/`
5. Record Part 2 (chapters 2-16)
6. Record Part 1 (chapters 0-1; welcome uses Part 2 footage)
7. Voice (ElevenLabs) and assemble the YouTube package
8. Review cut -> amendments -> final render -> Giri uploads
