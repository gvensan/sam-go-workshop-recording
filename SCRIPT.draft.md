# Workshop walkthrough: narration draft for review (v2, thorough coverage)

Solace Agent Mesh workshop, a complete follow-along walkthrough, 2026-11-03.
Voiced by the storming-tour narrator (Eric, eleven_multilingual_v2). Each
chapter is one continuous take. Brackets say what is on screen at that moment;
they are not spoken. Times are targets; the recon run and the voice set the
real ones. Durations of waits ("a few minutes") are placeholders until the
recon run measures them.

Coverage rule (user call 2026-11-03): every tracker section walked thoroughly.
Concept guides are presented properly, hands-on guides show every step, and
where a guide offers two options the recommended one is performed and the
alternative is shown and explained. Waits are the one thing compressed: show
the start, narrate what is happening, land on the final state, state the real
duration. The slides chapter walks the FULL deck; timing is not a constraint.

Style: instructional, second person, present tense. The viewer watches a
chapter, pauses, does that section in their own Codespace, and continues.

---

## 0. Welcome: how to use this video (1:00)

[The finished system: the Agent Mesh web UI scrolling a completed Singapore to
Tokyo trip plan; then the hierarchical agent view: the orchestrator, four
specialists, the workflow. Cut to the GitHub repo page on the sam-go branch;
the README's Required Resources checklist held.]

This is the Solace Agent Mesh workshop, and this is where it ends: one prompt,
and a team of agents plans a complete trip. Flights and hotels from a real
database, restaurants from a live API, weather from an agent built in another
framework, and the itinerary and budget computed in Go. By the end of the
workshop, you will have built all of it.

This video walks the whole workshop with you, every section, every step. Watch
a chapter, pause, do that section in your own environment, and continue. The
chapters match the workshop's sections one for one, so you can always jump to
exactly where you are.

Everything lives in one repository. Before you start, check the README's
required resources: a GitHub account, access to GitHub Codespaces, and a
network that can reach AWS, because the workshop's backing services run there.
You do not need an AWS login. And if Codespaces is not available to you, the
README documents running the same environment locally with Docker, VS Code,
and the Dev Containers extension; everything in this video works the same way
there.

First, the theory. The workshop opens with a short deck, and it is worth your
time, because it explains why this platform is shaped the way it is.

## 1. The intro deck: grounding on SAM (5:00)

[The GitHub Pages slide deck, full screen, every slide in order, advancing as
narrated. Slide 1: title.]

Welcome to the workshop: building enterprise agentic systems that scale, with
Solace Agent Mesh. It is written for developers, architects, and technical
practitioners, and its premise is on the title slide: a structured engineering
approach to AI agents. Build, test, deploy, observe, improve.

[Slide 2: agenda.]

The agenda in one look: an introduction and the takeaways, then why agents
need a new lifecycle, what Solace Agent Mesh is, the real challenges that kill
production agents, and why event-driven is the answer to the coordination
problem agents actually have.

[Slide 3: takeaways.]

And what you will walk away with: you will be able to explain the agent
development lifecycle and map its stages to Agent Mesh capabilities, stand up
an Agent Mesh environment and apply declarative configuration, define an
agent, give it tools, and connect it to an external system, evaluate agent
behavior in a structured way, and reason about the operational and governance
concerns that show up at production scale. Five skills, one complete picture.

[Slide 4: the 80/20 iceberg.]

Now the ground truth behind all of it. Across enterprise AI deployments, about
twenty percent of the difficulty sits above the surface: model quality. GPT,
Claude, Gemini: they all produce strong results on well-scoped tasks. The
model question is largely solved. The other eighty percent is below the
surface: connecting agents to enterprise data, systems, and events, reliably
and at scale. Context pipelines, routing, observability, failure handling.
That is where teams actually get stuck.

[Slide 5: the operational challenges wall.]

And when you name that eighty percent, it looks like this. Take a moment with
this wall: over-permissioned agents, data silos, prompt injection, behavioral
drift, hallucinations, agent sprawl, audit trails, token cost, framework
churn. Every word on this slide is a real engineering problem some team is
facing in production right now. Not model problems. Operations problems.

[Slide 6: ADLC overview.]

The answer this workshop proposes is discipline: the Agent Development
Lifecycle, five stages from idea to continuous improvement. Build: with a
guided quick build, plain YAML, or vibe-coded with a coding assistant. Test:
datasets, experiments, and evaluators, because agents need scoring, not just
assertions. Deploy: configuration as code, with pass-rate gates wired into
CI/CD. Observe: a visualizer, OpenTelemetry traces and metrics, one trace ID
across every component. And improve: comparing evaluation runs, offline and in
real time. The arrow at the bottom is the point: every production signal feeds
the next build. It is a loop, not a line.

[Slide 7: lifecycle evolution.]

If a new lifecycle sounds dramatic, remember the industry has done this twice
before. In the early eighties, the SDLC structured deterministic, rule-based
software. Around 2013, MuleSoft's API-led lifecycle addressed integration-
first software: versioned contracts, rate limits, schema governance. And now
agents, which are not deterministic at all, get theirs. Same pattern, new
paradigm, new process.

[Slide 8: non-determinism.]

Here is the core of why. Traditional software is deterministic: same input,
same output, and a unit test proves correctness. The failure mode is clear:
it works, or it crashes. An AI agent is probabilistic: the same input can
produce different outputs, a distribution of answers rather than a single
value. Unit tests can pass while the agent answers a customer incorrectly in
production. The agent runs, responds confidently, and may still be wrong.
Silent failure. That single property is why the old methodology is not enough.

[Slide 9: what is SAM.]

So, the platform. Solace Agent Mesh is a Go-based agent development and
runtime platform. Four things to hold onto: an event-driven runtime, where
agents run as always-on workers embedded in your event-driven architecture,
not endpoints you poll. CLI tooling, for scaffolding, declarative push and
pull, and lifecycle management. Declarative configuration, so agents, tools,
and integrations are defined as code, version-controlled and repeatable. And
entrypoint integrations, the gateway layer that connects the outside world to
the mesh.

[Slide 10: three process types.]

Architecturally it decomposes into three independently deployable processes.
The agent-workflow executor hosts agents, workflows, and proxy adapters, and
scales with LLM workload. The entrypoint executor bridges external clients in,
and scales with inbound connections. The secure tool runtime executes tools as
isolated subprocesses, and scales with tool throughput. And notice what is
missing: no component talks directly to another. No HTTP between them, no
gRPC. The Solace message broker is the nervous system, and everything crosses
it.

[Slide 11: broker vs HTTP.]

Why insist on that? Because of the coordination problem agents actually have.
An agent task is long and non-linear: multiple model turns, tool calls that
block on external APIs, delegations to other agents. Coordinate that over
synchronous HTTP and you hold connections open for minutes, reimplement retry
logic at every layer, and lose the task when anything restarts. A broker
solves it structurally: the publisher sends and moves on, the subscriber
receives when ready, delivery guarantees are a property of the infrastructure,
and checkpointing means another instance resumes where a dead one left off.
Solace has run exactly that infrastructure for over twenty years, in financial
trading, logistics, and industrial IoT, where losing a message has real
consequences.

[Slide 13: closing.]

That is the grounding. The closing slide says the rest: you're ready, the
runtime is already waiting, open your GitHub Codespace. Let's do it.

## 2. Create your Codespace, and let it come up (1:30)

[The repo README. The pointer clicks the "Open in GitHub Codespaces" badge;
the create page; "Create codespace". Then a timelapse of the build with an
elapsed clock in the corner; the terminal scrolls through the setup output;
key lines are held: "Codespace Registration...", "Access confirmed.", the sam
CLI install, the broker starting, "sam run". Ends on the simple browser
preview opening the Agent Mesh web UI.]

On the repository's front page, click Open in GitHub Codespaces, and create
the codespace. Now let it work: the environment sets itself up, and from
click to a working Agent Mesh it is about five minutes: two for the machine
to provision, and the rest after you open it. Let it finish before you touch
anything.

Here is what it is doing, because it is worth knowing. First, registration: a
script registers your codespace with the workshop's services on AWS and waits
for access to be confirmed. That registration is what fetches your language
model key and applies it, so your agents can think without you configuring
anything. Then the sam command line tool is installed, a local Solace broker
starts in Docker, and Agent Mesh itself comes up.

When a browser tab opens inside VS Code asking you to trust the traffic, click
Continue. That is the Agent Mesh web UI on port 8800, and it means your
environment is ready. If you ever wonder whether yours is done, this is the
sign to wait for. Pause here until you see it.

## 3. Meet the Workshop Tracker · Getting Started (1:45)

[The Workshop Tracker tab, which opened on its own: the "Welcome to the
workshop" registration form. The demo persona typed in; "Register to start
workshop" clicked in the status bar; the tracker's section list appears:
thirteen sections, the first highlighted. Clicking section 1 opens the Getting
Started guide as a rendered Markdown preview. The four platform items; the
concepts table scrolled slowly; the takeaways; the resources links; back to
the tracker, section 1 marked complete.]

When the editor opens, so does the Workshop Tracker, and it starts with a
short registration form. Fill it in and click register: this is more than a
sign-in sheet, it finishes setting up the AI API key your agents use all day,
so complete it before anything else.

With that done, the tracker shows the workshop itself: thirteen sections, in
order. Some are concepts, some are marked hands-on. You open a section from
the tracker, its guide opens as a rendered page, you work through it, and when
you close it the tracker marks it complete. That is the rhythm for the whole
workshop, and it is how we navigate in this video too: always through the
tracker, never jumping ahead.

Open the first section, Getting Started. It names the platform you will work
with: Agent Mesh provides an event-driven runtime, CLI tooling, a declarative
configuration model, and entrypoint integrations; you will touch all four.
Then the concepts table, which is really the syllabus: the lifecycle, the
architecture, the components, quick build, declarative configuration and the
CLI, built-in tools, custom tools, connectors, multi-agent orchestration, the
A2A proxy, and workflows. Everything in that table gets its own section today.
The takeaways list is the same promise from the deck, now concrete, and the
resources at the bottom link the product page and the documentation for
afterwards.

Close the guide, and the tracker ticks it off. One down.

## 4. The use case: multi-agent travel planning (2:00)

[Section 2 opened from the tracker. The use-case diagram; the "without agents"
numbered pipeline and its challenges table; the toolset comparison table; the
agents table held long enough to read; the request-flow list; the
where-everything-runs table; the sample query at the bottom.]

Section two is the use case, and it is worth reading slowly, because every
hands-on section builds a piece of it.

You are building a travel planning system the way a travel agency would staff
it. But start where the guide starts: without agents. You could hand-build the
same five capabilities: parse a rigid form, call a flights API, a hotels API,
a places API, a weather API, and hand-roll the budget math. The guide's table
says what that costs you: every new data source is another hand-maintained
connector, the call order is frozen at build time, there is no natural-
language front door, every change is a redeploy, and your reasoning and your
integration glue live tangled in one codebase. Keep that picture; it is what
the rest of the workshop is an answer to.

Now the agent version. Each specialist owns one domain and one data source. A
flight search agent and a hotel search agent query a real Postgres database on
AWS. A local experiences agent finds restaurants and attractions through the
Foursquare Places API, over MCP. A weather advisor exists outside Agent Mesh
entirely; it is a LangChain agent, and it joins through an A2A proxy. Above
them, an orchestrator takes the traveler's request, decides who to involve,
and assembles the answer. And one more piece: itineraries and budgets are
arithmetic, not judgment. Ask a language model to add up fares and the same
trip can price differently twice. So those two jobs, compile itinerary and
calculate budget, run as compiled Go functions in a custom toolset. The agent
reasons; the code computes.

Note where everything runs: Agent Mesh and your agents live in your codespace;
the database, the places server, and the weather agent are pre-deployed on AWS
for you. You deploy no backends today. And notice the finish line at the
bottom: one prompt asking for a five day trip from Singapore to Tokyo, with
flights, hotels, restaurants, weather, and a full budget. You will send it in
section twelve.

## 5. Launch Solace Agent Mesh (1:30)

[Section 3 opened from the tracker. The guide's two options visible. Option 1:
the simple browser Continue prompt; the PORTS tab; the Solace Agent Mesh row,
port 8800; the open-in-browser icon; the web UI in a full browser tab; the
Agents view. Then a scroll through Option 2: the installers, the register
command, the model configuration table, the CLI paths, --target desktop.]

Section three is your first hands-on, and in a codespace most of it already
happened: option one is the codespace, and the setup you watched earlier did
the work. What is left is to confirm it.

If the simple browser opened inside VS Code, trust the traffic and click
Continue. For a better working surface, open the PORTS tab, find Solace Agent
Mesh on port 8800, and click the browser icon to open it in a full tab. There
it is: the Agent Mesh web UI, with a built-in orchestrator already deployed.
This is where you will spend most of the workshop.

Scroll through option two before you move on, because it is the path you will
use later at your own desk: SAM Desktop. You download the installer for your
platform, register your IP address with the workshop services, because they
only accept registered traffic, configure the general and planning models with
an API key and the model endpoint, clone the repository, put the bundled sam
CLI on your path, and add target desktop to every config command so the CLI
finds the running app. The guides flag that desktop difference at every step,
so nothing later will surprise you. Today, the codespace has done all of it.
Pause, confirm your web UI opens, and mark the section complete.

## 6. The Agent Development Lifecycle (3:00)

[Section 4 opened from the tracker. The Gartner and MIT bullets; the ADLC
evolution figure; the five-stage diagram; then a slow scroll through each
stage, pausing on its bullets and on each "Agent Mesh capabilities" line.]

Section four returns to the lifecycle, now in depth, and it opens with the
numbers that explain the urgency. Gartner forecasts that more than forty
percent of agentic AI projects will be canceled by the end of 2027, for rising
costs, unproven value, and inadequate risk controls. MIT's study of enterprise
GenAI found ninety five percent of pilots produced no measurable return, and
its diagnosis was not the models: the organizations lacked the integration,
feedback discipline, and operational structure to reach production. This is a
process problem, and the fix is a repeatable process.

Walk the five stages with the guide. Build is three concerns: role, access,
and teamwork. Role means a well-specified system prompt with guardrails and
skills; an agent with a vague role duplicates work or oversteps. Access means
connections to databases, APIs, MCP servers, and other agents, with least
privilege as the rule: too many tools overloads the context, too few starves
the decision. Teamwork is the choice you will live all day: deterministic
workflows when the steps are known, dynamic orchestration when an LLM should
plan at runtime. In Agent Mesh, this stage is quick build, YAML, AI-assisted
authoring, connectors, A2A proxies, peer delegation, and workflows.

Test: agents do not ship on vibes. Offline evals run the agent against a
defined suite with expected outputs and expected tool use, and an LLM can be
the judge where exact match is impossible. And testing is not a gate you pass
once; running evals regularly is how you notice drift. Agent Mesh gives you
datasets, evaluators, experiments, and a task visualizer for debugging.

Deploy: the configuration you built and tested is promoted unchanged from
environment to environment, and deployment decides triggers, a chat message,
an event, an API call, an email, and access: role-based control, single sign-
on, and delegated access, where the agent inherits the permissions of the user
it acts for. That is sam config plan and apply, secrets as placeholders, and
the entrypoints.

Observe: autonomy without oversight is operational risk, so oversight is
proportional to stakes. Dashboards for the routine, human-in-the-loop
checkpoints designed in, not bolted on, for the high-stakes, and agents that
escalate on their own when confidence is low. The visualizer, logs,
OpenTelemetry metrics, one trace ID across components, and approval on any
tool call.

And improve: deployment is day one. Gather execution data, run online evals
against the agent's original purpose, collect human feedback, thumbs up or
down and why, and feed all of it into the next build. A loop, not a line. Read
this one fully; you will touch build and deploy directly today, and you will
know exactly where the other three live.

## 7. What is Solace Agent Mesh (3:30)

[Section 5 opened from the tracker. The runtimes figure; the three-process
table; the tool-types figure; the challenges list expanded; the non-linear
task figure; the broker-vs-HTTP figure; the Solace advantage expanded; the
integration-gap figure; the Quick Build stages; then the components: the agent
loop, agent cards, external agents, the tools table, the connectors list, the
entrypoints table, the closing fit-together paragraph.]

Section five is the architecture. Take it in three passes.

First, the shape. Agent Mesh is a Go-based platform decomposed into three
independently deployable processes: the agent-workflow executor hosts agents,
workflows, and proxies and scales with LLM workload; the entrypoint executor
bridges external clients and scales with connections; and the secure tool
runtime executes tools as isolated subprocesses and scales with throughput.
They communicate only through the Solace broker. Tools reach an agent in five
forms: built-in Go functions in process, Python or Go tools in the secure
runtime, MCP servers, peer agents, and remote A2A proxies, and every form
presents the same interface to the calling agent. The runtime owns the whole
LLM loop: streaming, parallel tool dispatch, context compaction, session
persistence.

Second, why a broker. Expand the challenges and read them; they are the eighty
percent from the deck made specific. State that survives restarts. Tool calls
that fail mid-flight and need checkpoints, so a different instance can resume.
Delegation between agents that cannot be a blocking HTTP call, because either
side can die. Tool results too large for a context window, which need an
artifact store and references. Access control that propagates when agent A
delegates to agent B calling tool C for user D. And reactive execution,
because the highest-value agents are triggered by events, not chat. The broker
answers these structurally, and Solace adds the specifics: hierarchical topics
with wildcards, so instances load-balance and a monitor can watch everything
without touching delivery; metadata on messages, so routing never means
parsing payloads; and guaranteed delivery with precise acknowledgment, which
is what makes checkpoint-and-resume actually correct. If your organization
already runs Solace, agents join the mesh you have; nothing is forklifted.

Third, the vocabulary you will use all day. An agent is a role, a model, and
tools, described in configuration, and every task runs the same loop: model
decides, tools run, results feed back, until an answer. Every agent publishes
a card, a live resume of its skills; an orchestrator registers permitted
peers as callable tools and the card's description becomes the routing rule,
so write it as "when to hand off to me". External agents join through an A2A
proxy and look like any other peer. Tools come in four kinds: built-in, MCP,
OpenAPI, and custom code, which always runs isolated in the secure runtime.
Connectors are named, credentialed bindings that surface a database, an MCP
server, an API, or a knowledge base as tools, defined once, assigned by name.
And entrypoints are the front doors: web UI, Slack, Teams, email, MCP, event
mesh, webhook, several at once, all pointing at the same agents.

And Quick Build, which you will use first: describe what you want, review the
plan it lays on the canvas, refine it in conversation, and build and activate.
It is experimental, and it is the fastest way to feel the platform. Read this
guide at your own pace, then come back; the rest of the workshop is doing.

## 8. Declarative SAM and the sam CLI (2:30)

[Section 6 opened from the tracker. The capabilities list; split view with the
editor's file tree expanded on sample_configuration: manifests, models,
agents, connectors, toolsets, skills, entrypoints, workflows; a manifest YAML
open; the plan/apply/pull table; the --prune warning held; the secrets
paragraph; the targets table; the toolset flows; the AI-assistance tip; the
workshop pattern at the bottom.]

Section six introduces the second way of working, the one production teams
live by. The sam CLI handles the platform's whole lifecycle: authentication
with cached logins, declarative configuration, packaging toolsets and skills,
sending tasks to agents from the terminal, running evaluations, calling the
REST API directly, and a doctor command that checks your setup. And one
capability worth a special mention: it ships AI-assisted authoring skills,
schema-accurate knowledge your coding assistant can install with one command,
so Claude Code or Codex can write valid Agent Mesh YAML without guessing
field names.

The heart of it is declarative configuration. You describe the desired state
of the platform as plain YAML in a repository, and the CLI reconciles the
running platform to match. This repository already contains that config repo,
under sample configuration: look at the layout. One folder per resource kind:
models, agents, connectors, toolsets, skills, entrypoints, workflows, plus
datasets, evaluators, and experiments for the test stage, and rbac for roles.
On top, manifests: the entry point of every operation. A manifest names the
target platform and lists which resources to manage, by name; only what is
listed is touched.

Three commands carry everything. Sam config plan shows the creates, updates,
and deletes a manifest would make, without changing anything. Sam config apply
makes them. Plan before apply, every time, like a code review for your
platform; applying the same manifest twice is safe. And sam config pull is the
reverse: it exports a running platform into a ready-to-apply repo, the usual
way to adopt declarative config after starting in the web UI. One warning, in
red, and it matters today: do not use the prune flag. It deletes everything
not in the manifest, including the built-in orchestrator.

Secrets never sit in files: any value can be a placeholder resolved from
environment variables at apply time, and a local env file loads automatically.
Targets are flexible: a URL, a named platform you logged into, or target
desktop for the desktop app. Custom toolsets live in the repo as source, built
on apply, or as a pre-built zip. And the workshop's own pattern, at the bottom
of the guide: each hands-on section has a manifest named for its guide, and
each one includes everything from the earlier steps, so you can apply any of
them safely. Two commands, repeated: plan, then apply.

## 9. Hands-on: built-in tools with Quick Build (3:30)

[Section 7 opened from the tracker. The web UI: Builder, Quick Build. The
four-agent prompt pasted from the guide and held while narrated; send; the
activity timeline working; the plan with four components on the canvas; Build
& Activate; the parallel build: start shown, clock, cut to "Finalising
manifest and running full validation". Then: Agents tab, the four new agents;
the hierarchical view; New Chat; the Orchestrator selected; the research
prompt pasted; the delegation timeline (start shown, fan-out held, cut to the
answer); the Files tab with the artifacts.]

Now you build. Section seven creates four general-purpose agents without
writing a line of configuration, using the built-in tools the runtime ships:
web research, data analysis, image work, diagramming, document conversion.

In the web UI, go to Builder, then Quick Build, and paste the prompt from the
guide. Read it before you send it, because its shape is the lesson. Four
agents, each with a role and guardrails: a web researcher that only reports
verifiable information from fetched sources and never fabricates citations; a
data analyst that only analyzes data it was actually given and describes the
dataset before drawing conclusions; an image analyst for visual and audio
work; and a diagram generator that always shows its Mermaid source and asks
before guessing intent. Roles and guardrails, exactly as the lifecycle's
build stage prescribed. Send it.

Quick Build reads the descriptions, designs the agents, and lays them out on
the canvas as a plan. You could keep chatting to rename or reshape them;
today, review the plan, click Build and Activate, and confirm: the dialog
reminds you this deploys the agents live. The four agents build in parallel.
In a real session the whole thing, plan and build together, takes five to six
minutes, so let it work while you watch the activity feed. After some time,
it says your build is ready. There they are.

Now make them work together. Open the Agents tab: four new specialists beside
the orchestrator, and the guide's hint is worth taking: click the
hierarchical view to see how they relate. Start a new chat, select the
Orchestrator, and paste the research prompt: the ten most valuable public
companies, saved as a structured dataset, analyzed by industry and country,
and visualized as a diagram. One request, three different specialties, and
nobody tells the orchestrator which agents to use. Watch the activity
timeline: it reads the agent cards, lays out a four step plan, researches
first, then saves, analyzes, and visualizes in parallel. After some time,
under four minutes in our run, the answer arrives with key insights, and the
Files tab holds the artifacts made along the way: the dataset, the analysis
summaries, the diagram as a Mermaid file you can render anywhere.

Four agents, one paragraph, zero YAML. Pause here, run this section yourself,
and when the tracker shows it complete, continue to the custom toolset.

## 10. Hands-on: the custom Go toolset (2:30)

[Section 8 opened from the tracker. The toolset tree in the editor:
travel-planner.yaml, src with main.go, go.mod, manifest.yaml, build scripts;
a glance into main.go. The 07 manifest open. A terminal: sam config plan, the
output read; sam config apply, the build-package-upload lines (start shown,
cut to completion). Builder, Toolsets: travel-planner, Ready, two tools
listed. Then Option 2 shown: the sam toolset package command, the Create
Toolset form with the upload field. The exec-format-error tip held.]

Section eight adds the first piece of the travel system: the travel planner
toolset, two tools written in Go. Compile itinerary turns search results into
a day-by-day plan; calculate budget adds up flights, hotels, meals, and
activities. Exact, repeatable arithmetic in compiled code, so the same trip
never prices differently twice.

Look at what a toolset is, in the editor. A YAML file names and describes it,
and a source folder carries main.go with the two functions, the go module,
build scripts for both platforms, and a manifest that tells the secure tool
runtime how to run the binary. You do not modify any of it today; you ship
it. Open the zero seven manifest: it manages exactly one resource, the
toolset, and its target is your local instance.

In the terminal, from the repository root, run sam config plan with that
manifest. The CLI compiles the Go source for your platform, Go is already
installed in the codespace, and reports one resource to create. That is the
review. Now sam config apply: it builds, packages the binary with its
manifest into a zip, uploads it, and waits until the runtime has discovered
the tools. Verify in the web UI: Builder, Toolsets, and travel planner shows
Ready, with compile itinerary and calculate budget listed.

The guide's option two does the same thing through the web UI: sam toolset
package writes the zip yourself, and the Create Toolset form takes the name,
the description from the guide, and the file. Useful when someone else built
the toolset and handed you the artifact. Either way, one tip to remember: if
the status sticks at Discovering or says exec format error, the binary was
built for the wrong architecture; rebuild with the right URL or target.
Pause, apply it yourself, and continue.

## 11. Hands-on: connectors (2:30)

[Section 9 opened from the tracker. The guide's connector table; the three
YAMLs expanded one by one, the password placeholder highlighted. Terminal:
the export line, plan, apply (compressed). Builder, Connectors: three rows.
Then Option 2 shown: the PostgreSQL create-connector form filled, the Remote
MCP form, the tool-selection step with find_restaurants and find_attractions.
The health-check curl last.]

Section nine connects the agents' data sources, and this is the part of
agentic systems that usually means writing integration code. Here it is three
YAML files.

Read them. Flights and hotels are Postgres connectors pointing at the travel
database the workshop runs for you on AWS: same host, same database, same
user, different descriptions, because the description is what an agent's
model reads when deciding how to use it. The third is a remote MCP connector
to the places server, over server-sent events, no authentication, and it will
surface find restaurants and find attractions as tools. And notice the
password field: it is a placeholder, not a value. Secrets stay out of files
and come from the environment at apply time.

So first, export the database password; the guide gives it. Then the same two
commands with the zero eight manifest: plan shows three connectors to create
and the toolset from last section untouched, and apply creates them. Verify
in Builder, Connectors: all three listed.

Option two builds the same three through the web UI, and it is worth seeing
once: create connector, apps, PostgreSQL, the form with host, port, database,
and credentials; and for the MCP connector, the wizard actually connects to
the server and shows you the tools it found, find restaurants and find
attractions, before you confirm. If a connector cannot reach its service, the
guide gives the move: curl the health endpoint, and on SAM Desktop,
re-register your IP. Pause here, wire up your three connectors, and continue
to the agents that will use them.

## 12. Hands-on: the travel agents (3:30)

[Section 10 opened from the tracker. The guide's four-agent table. The web
UI: Builder, Agent Management, Add Agent, Create New Agent, Create Manually.
Name and description typed; Add Instruction; the long instruction pasted,
scrolled slowly while narrated; Apply; Add Connectors, flights-db, Apply;
Create and Deploy. Then the editor: HotelSearchAgent.yaml and
LocalExperiencesAgent.yaml glanced, TravelOrchestratorAgent.yaml held on
toolsets and the allowList block; terminal: plan and apply with manifest 09;
Agent Management with all four agents; the hierarchical view.]

Section ten creates the four travel agents, and you build them both ways on
purpose: one in the web UI, three from YAML, so you can feel which one your
team would choose.

First, the flight search agent, manually. Builder, Agent Management, Add
Agent, Create New Agent, Create Manually. Name it exactly as the guide says,
because other agents will refer to it by name, and give it the description,
because that description becomes its card. Then add its instructions, pasted
from the guide, and take a moment to scroll them, because this is the real
lesson of the section: what a production agent role actually contains. It
names the one database view to query and forbids the others. It lists the
exact columns that exist, so the model never invents one. It gives the search
process: direct flights first, then connections with a sensible layover
window, and even how to recover when a city is stored under a different name.
It defines error recovery, fix the query once, then say so, never invent
flights, and the response format, down to a JSON summary of the
recommendation, which the workflow will rely on later. Not a vibe, a
contract. Apply the instructions, attach the flights connector under
Connectors, and Create and Deploy.

The other three live as YAML in the config repo. Open them: the hotel agent
binds the hotels connector, the local experiences agent binds the places
connector, and the travel orchestrator is the interesting one. It carries the
travel planner toolset and the built-in time tools, so it can turn "ten days
from today" into a date, and one block worth reading: inter-agent
communication with an allow list of star, meaning it may delegate to every
agent on the mesh, with a three minute timeout. That list is the
orchestrator's reach; a specialist that should stay focused keeps its list
empty. Plan and apply with the zero nine manifest: three agents to create,
everything else unchanged.

Verify in Agent Management: all four deployed. Flip to the hierarchical view
and the shape of the system appears: the orchestrator above its specialists.
Pause and build yours; next, the one agent that was never built here at all.

## 13. Hands-on: the A2A proxy (1:45)

[Section 11 opened from the tracker. Terminal: the health curl, the JSON
reply with the agent's name. The wizard: Builder, Agent Management, Add
Agent, Connect External Agent; the URL pasted; well-known URI; no auth;
Fetch Agent Card; the card with WeatherAdvisorAgent; the display-name step;
the review step showing the Weather Forecast & Activity Advisor skill;
Connect and Deploy; Agent Management with WeatherAdvisorAgent Deployed.]

Section eleven brings in the outsider. The weather advisor is a LangChain
agent, running on AWS, built by someone else in a different framework. The
mesh takes it anyway, through an A2A proxy, and this whole section is a
wizard.

First check the agent is reachable: curl its health endpoint from the
terminal, and it answers with its name. Then, in the web UI: Builder, Agent
Management, Add Agent, and this time Connect External Agent. Paste the
agent's URL from the guide, leave the card location on the well-known URI,
no authentication, and click Fetch Agent Card. The wizard reads the agent's
self-description over the open A2A protocol: there it is, WeatherAdvisorAgent.
Keep the default display name, because the orchestrator will call it by that
name, step through to the review, and confirm the card shows its skill:
weather forecast and activity advisor. That card is how every other agent
will know when to hand work to it. Connect and Deploy.

Check Agent Management: five agents now, and the external one looks exactly
like the others. The proxy fetches its card, handles authentication, and
translates between A2A over HTTPS outside and A2A over Solace inside. That is
the point of a protocol. Pause, connect yours, and then it is time to run the
whole thing.

## 14. Hands-on: run the system (4:30)

[Section 12 opened from the tracker. Every guide prompt runs on camera, each
in its own new chat, each following the wait convention: send, explain, hold
a beat, "after some time...", end state. For every run, two things are shown:
the output, and the Activity panel (right side, Detail Mode on). The first
flights prompt gets the full diagram read: agent node, LLM, travel_sql_query
calls. The second flights prompt holds its two legs and the layover. Hotels
one and two at montage pace, their diagrams flashed, not re-read. The local
experiences diagram held on find_restaurants / find_attractions - MCP tools,
not SQL. The weather diagram held on the External agent node. Then the three
orchestrations: Singapore to Tokyo with the deep diagram talk-through
(fan-out held live, cut forward, then the completed tree walked top to
bottom: time tools, four parallel specialists, compile_itinerary,
calculate_budget); Nairobi to Buenos Aires and its smaller tree; the Bali
prompt with no agent named, its tree compared side by side. The guide's
expected-flow list last.]

Section twelve is the payoff, and the guide is disciplined about it: test the
specialists first, one new chat each, directly at the agent.

Ask the flight search agent for economy flights from Singapore to Tokyo.
After some time, real options arrive with the cheapest, fastest, and best
value called out. But the answer is only half the lesson: open the activity
panel on the right and read the flow once, properly. Your message, routed by
the mention to the agent; the agent's language model deciding what to do; and
travel sql query calls going through the flights connector to the database.
That shape - agent, model, tool, connector - is the shape of everything you
will see today. Then the second prompt, business class from Bangalore to San
Francisco, chosen to stress it: there may be no direct flight, so watch it
recover - the city stored under a different name, the two-leg search from
its instructions - and still end with its JSON recommendation. The hotel
agent gets both its prompts the same way, and the diagrams look identical,
which is exactly the point: same pattern, different database, nothing new to
learn. Two runs that do teach something new: the local experiences agent's
diagram shows find restaurants and find attractions - not SQL, but tools an
MCP server advertises, called the same way. And the weather advisor's
diagram shows an external node: the request leaving the mesh through the
proxy you just built, to a LangChain agent on AWS, and coming back as if it
were local. About a minute each, and you know every part works before you
compose them.

Now the real test. New chat, and paste the full prompt from the guide: a five
day trip from Singapore to Tokyo for two people, departure ten days from
today, with flights, hotels, restaurants, weather, and a full budget. Send
it, and watch the activity panel rather than the answer, because this diagram
is the whole workshop in one picture. The tree starts building live: the
orchestrator converts the relative dates with its time tools, then fans out
to all four specialists at once - and nobody told it to; it read their cards
and decided. Hold on that fan-out a moment: four branches working in
parallel, each running the same agent-model-tool shape you read earlier.
After some time, the results flow back up and the orchestrator calls the Go
tools: compile itinerary, then calculate budget - deterministic math, no
model in the loop. And then the plan arrives: the recommended flight, the
hotel with nightly rate, a day by day itinerary with the restaurants placed
on it, the forecast with packing tips, and a budget with every line item,
saved as an artifact in the Files tab. A real run takes about two and a half
minutes end to end; the video compresses the waiting, never the steps.

The guide gives two more orchestrations, and each run shows a different
decision. Nairobi to Buenos Aires, best route and estimated total cost: a
partial request, and the diagram proves it - only the specialists it needed,
and the budget computed by the orchestrator itself. And the Bali prompt
names no agent at all: send it to the default orchestrator and watch the
diagram show who it chose to involve, compared side by side with the first
two. Three prompts, three different trees, one system. When you have run all
of them, check your diagram against the guide's expected flow: orchestrator,
four specialists, two tools, one plan. Pause here and run every prompt in
your own mesh; when you come back, we make the process deterministic.

## 15. Hands-on: workflows (3:30)

[Section 13 opened from the tracker. The workflow-vs-orchestration table
scrolled slowly; the ASCII DAG; the node table; the orchestrator's three
routing paths. The editor: TravelPlanningWorkflow.yaml walked: input_schema,
the parallel agent nodes, depends_on, an output_schema_override, the tool
nodes, output_mapping. Terminal: plan and apply with manifest 12, the plan
showing one create and one update. Builder, Workflows, the DAG on the canvas.
A new chat: the London to Paris prompt; the timeline: workflow and weather in
parallel, three searches in parallel inside, budget firing before itinerary;
the finished plan.]

One thing might bother you about that last section: the orchestrator decided
the steps itself, and it could decide differently tomorrow. For a
conversation, that flexibility is the feature. For a known process, you want
the same steps every time. That is section thirteen: workflows.

The guide's comparison table is the heart of it, so read it line by line. In
a workflow, you decide the steps when you write it; in dynamic orchestration,
the LLM decides at runtime. Parallelism is declared through dependencies, not
discovered. Data between steps is typed, each node declares the fields it
returns, instead of free text in a conversation. Tool steps call the tool
directly, no LLM involved. Retries and timeouts are configured per node. And
every node's input and output is recorded, which is what auditability means.
The two approaches are not rivals: the orchestrator handles the conversation
and decides whether a request needs the full process; the workflow runs that
process identically every time.

Now read the workflow itself in the editor. An input schema declares what it
expects: origin, destination, dates, travelers, cabin, preferences. Three
agent nodes, flights, hotels, and local, have no dependencies between them,
so they run in parallel. Each one carries an output schema override, the
typed fields it must return, which is why you built the specialists to end
with JSON. A budget node depends only on flights and hotels; an itinerary
node waits for all three. Both are tool nodes: they execute the Go functions
directly, no model call. Each agent node retries once, and if one search
fails the other branches still run. To the rest of the mesh, the deployed
workflow publishes a card and looks like any other agent.

Plan and apply with the twelve manifest: it creates the workflow and updates
the orchestrator, whose instructions now route complete trip plans to it,
keep focused questions with the single specialists, and handle partial
combinations itself. Verify under Builder, Workflows, and open the canvas:
the graph you just read, drawn.

Then run it. New chat, the London to Paris prompt from the guide. On the
timeline: the orchestrator calls the workflow and the weather agent together;
inside the workflow the three searches light up at once; budget fires the
moment flights and hotels are done, itinerary when all three are; and the
orchestrator folds the forecast into the final plan, in about half the time
the free-form run took. Same system as section twelve, two coordination
styles, and you now know when to use each. Pause and run yours; this is the
last build of the workshop.

## 16. Wrap-up: your turn (1:00)

[The tracker, all thirteen sections complete. The hierarchical agent view one
last time; the workflow canvas; then the repo page with the Codespaces badge.
Lower right and center kept clear for end-screen cards.]

And that is the workshop: thirteen sections, and look what they add up to.
Agents built four ways: described to Quick Build, assembled in the web UI,
written as YAML, and adopted from another framework over A2A. Tools of every
kind: built in, compiled from Go source, and discovered from a database and
an MCP server through connectors. An orchestrator that improvises, and a
workflow that never does. All of it coordinated over a Solace broker, and all
of it declarative, planned and applied like any other production change.

In lifecycle terms, you lived the build and deploy stages today. Test,
observe, and improve, the evals, the visualizer, the feedback loop, are
waiting in the same platform, and the documentation linked from the first
guide is the next step.

The workshop is self-paced: the repository link is below, one click starts
the codespace, and the tracker takes you the rest of the way. If you get
stuck, the Solace Community forum is the place to ask. Happy building.
