# Recon run - 2026-11-03

Fresh Codespace `sam-recon-4v6wrwjxx9cqxw7` (standardLinux32gb: 4 cpu / 16GB /
32GB), created on gvensan's account (personal billing), branch `sam-go`.
Purpose: time every wait, verify every guide step against the current UI, and
feed measured numbers back into SCRIPT.draft.md.

Giri's pre-existing codespace `super-fiesta-vrwq5q6xjjhp56w` (has local
changes) was left untouched.

## Timings (raw log in recon-timings.log)

| Phase | Start | End | Duration | Notes |
|---|---|---|---|---|
| `gh codespace create` returns | 17:57:07 | 17:57:13 | 6s | name allocated, provisioning continues |
| State = Available | 17:57:07 | 17:59:20 | 2m13s | postCreate (register + key) runs during this |
| VS Code web attach -> trust dialog | 18:08:45 | 18:09:44 | ~1m | workbench loads in Restricted Mode; trust click required |
| Trust click -> `sam run` starts | 18:09:44 | 18:09:47 | 3s | postAttach fires immediately on trust |
| `sam run` -> web UI responsive on 8800 | 18:09:47 | ~18:11:20 | ~90s | seed_prompts runs in the same hook |
| Quick Build: 4 agents | 18:24:59 | 18:27:59 | ~5.5min total | plan ~2min to confirm-modal, build+activate ~2.5-3min; done msg "Your build is ready!" |
| Built-in demo (top-10 companies research) | 18:33:02 | <18:37:03 | <4min | 5 artifacts (3 CSV + mermaid .md + report .md), "5 working files hidden" |
| Manifest 07 plan (Go toolset, cold build) | 18:11:35 | | 7.3s | `real 0m7.277s`, includes Go build + sdk vendoring |
| Manifest 07 apply | 18:12:28 | | 0.2s | build cache-hit; `travel-planner created` |
| Manifest 08 plan + apply (3 connectors) | 18:13:31 | | plan ~2s, apply 1.4s | flights-db, hotels-db, places-mcp created |
| Manifest 09 plan / apply (agents) | 18:33:36 | | 0.19s | 3 agents created AND auto-deployed ("deploy completed") |
| FlightSearchAgent web UI create | 18:38:41 | 18:42:14 | ~3.5min of UI steps | deploy itself ~4s; toast "Agent created and deployed successfully" |
| A2A proxy wizard (WeatherAdvisorAgent) | 18:42:46 | 18:44:50 | ~2min of UI steps | fetch card instant; toast "Remote agent connected and deployed successfully"; Type=External |
| FlightSearchAgent test query (SIN-TYO) | 18:45:52 | ~18:46:55 | ~60s | 8 direct flights, formatted table; chat auto-titled |
| WeatherAdvisorAgent test (Tokyo) | 18:47:15 | ~18:48:11 | ~55s | forecast table + packing tips via A2A/Open-Meteo |
| Full orchestration (Singapore-Tokyo) | 18:48:46 | ~18:51:05 | ~2m20s | tokyo_trip_plan.md 9.52 KB artifact; budget total ~$4,315 |
| Manifest 12 plan / apply (workflow) | 18:49:07 | | plan ~1s, apply 0.25s | TravelPlanningWorkflow created+deployed; TravelOrchestratorAgent deploy (update) |
| Workflow run (London-Paris) | 18:52:38 | <18:54:19 | ~90s | faster than dynamic orchestration; Grand Total ~$1,641.64; activity tree shows TravelPlanningWorkflow box (Start -> 3 agents parallel -> itinerary+budget -> Finish) alongside WeatherAdvisorAgent |

## Guide drift / issues found

- **No sshd in the workshop image**: `gh codespace ssh` / `logs` / `cp` all
  fail. There is no headless CLI access to a workshop codespace. Consequence
  for recording tooling: everything must be driven through VS Code web in the
  browser (terminal included), which matches what the video shows anyway.
- **SAM starts on attach**: `postAttachCommand` runs `sam run --embedded`, so
  the platform is NOT running until a VS Code client attaches. The video's
  "wait for the web UI" moment therefore happens after opening the codespace
  in the browser, not during provisioning. Provisioning to state=Available
  was 2m13s; the attach-to-UI wait is measured separately below.
- **Trust dialog not in the guides**: on first attach, VS Code web shows
  "Do you trust the authors of the files in this folder?" and stays in
  Restricted Mode (blocking postAttach, i.e. blocking SAM) until
  "Trust Folder & Continue" is clicked. Must be a scripted beat in chapter 2.
- **Registration form gates the workshop**: the Workshop Tracker opens with a
  "Welcome to the workshop" lead form (name, business email, company, job
  title, country, expectations) and a "Register to start workshop" status-bar
  button; it says registering sets up the AI API key. Not mentioned in any
  guide. Recording uses a demo persona with a masked email (privacy rule in
  FLOW.md). Script chapter 3 updated.
- **Guide prompts are pre-seeded**: `seed_prompts.sh` creates saved prompts
  (06a/06b, 11a/11b/11c, 12a) at attach; the chat hints "Type '/' to insert a
  prompt". The video can use the prompt library instead of pasting; guides say
  paste. Decide one way for the script (currently: paste, mention the library).
- **Small on-screen facts for the script**: `sam config` prints an "Early
  Access" warning banner on every run; the first plan vendors `_sdk/` into
  the toolset source (dirties the git tree, explains the branch asterisk);
  a port-8090 toast ("application running on port 8090") pops alongside the
  expected 8800; the Ports badge reads 4.

- **Demo chart rendering fails in codespace**: the built-in research demo notes
  "Chart image rendering requires a Chromium browser installed on the host
  server, which is currently unavailable" - the Mermaid diagram lands as a
  `.md` artifact, not a rendered image. Narration should set expectations.
- **Create Agent UI differs slightly from guide 09 wording**: the guide's
  single form is actually (a) an AI-generate dialog with a "Create Manually"
  link, (b) a Name+Description dialog with Continue, (c) a full-page editor
  with sections. The editor pre-attaches the "Artifact Tools" toolset and the
  "general" model (openai/claude-sonnet-4-6). Connectors flow: Add Connectors
  -> + Add Connector modal (checkbox) -> Close -> Apply, then Create and
  Deploy. All guide values work verbatim.
- **A2A wizard has two auth dropdowns** (agent-card fetch auth in step 1 and
  task-invocation auth in step 2); the guide's two "No Authentication" rows map
  to these. Fetch Agent Card banner: "Successfully fetched agent card:
  WeatherAdvisorAgent". Review page shows the skill "Weather Forecast &
  Activity Advisor". WeatherAdvisorAgent lists with Type=External.
- **Agent Management vs Agents**: Agent Management (Builder) is a table with
  Deployed/Undeployed tabs; the Agents page (top nav) has Cards/Table/
  Hierarchical layouts. Guides always mean Builder -> Agent Management.
- **Activity tab is the money shot** for orchestration runs: right panel ->
  Activity shows the delegation tree (User -> Orchestrator ->
  TravelOrchestratorAgent -> 4 specialists in parallel with their LLM + tool
  calls) plus a Detail Mode toggle; builds live during a run.
- **Workflows page carries an "Early Access" badge**; canvas matches guide
  12's DAG exactly (Start -> 3 agent nodes -> calculate_budget +
  compile_itinerary -> End), zoom controls, "Open Workflow Details".
- **Chat input quirks**: multi-line prompts grow the box (send arrow moves);
  chats auto-title themselves after the first answer; each answer gets
  thumbs-up/down + copy actions; the orchestrator streams status lines
  ("delegating to TravelOrchestratorAgent...") before content.
- **Toolsets page**: travel-planner is the only Custom row (Agent Usage 1,
  created by sam@dev.local) among 10 built-ins - clean verify shot for 07.
- **Recording-order note**: in this recon manifest 12 was applied while the
  guide-11 orchestration was still streaming (harmless, but the orchestrator
  shows "deploy (update)"). In the real recording keep strict guide order:
  finish 11's runs before applying 12.
