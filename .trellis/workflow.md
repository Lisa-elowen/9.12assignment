# Development Workflow

---

## Core Principles

1. **Plan before code** — figure out what to do before you start
2. **Specs injected, not remembered** — guidelines are injected via hook/skill, not recalled from memory
3. **Persist everything** — research, decisions, and lessons all go to files; conversations get compacted, files don't
4. **Incremental development** — one task at a time
5. **Capture learnings** — after each task, review and write new knowledge back to spec

---

## Trellis System

### Developer Identity

On first use, initialize your identity:

```bash
python ./.trellis/scripts/init_developer.py <your-name>
```

Creates `.trellis/.developer` (gitignored) + `.trellis/workspace/<your-name>/`.

### Spec System

`.trellis/spec/` holds coding guidelines organized by package and layer.

- `.trellis/spec/<package>/<layer>/index.md` — entry point with **Pre-Development Checklist** + **Quality Check**. Actual guidelines live in the `.md` files it points to.
- `.trellis/spec/guides/index.md` — cross-package thinking guides.

```bash
python ./.trellis/scripts/get_context.py --mode packages   # list packages / layers
```

**When to update spec**: new pattern/convention found · bug-fix prevention to codify · new technical decision.

### Task System

Every task has its own directory under `.trellis/tasks/{MM-DD-name}/` holding `task.json`, `prd.md`, optional `design.md`, optional `implement.md`, optional `research/`, and context manifests (`implement.jsonl`, `check.jsonl`) for sub-agent-capable platforms.

```bash
# Task lifecycle
python ./.trellis/scripts/task.py create "<title>" [--slug <name>] [--parent <dir>]
python ./.trellis/scripts/task.py start <name>          # set active task (session-scoped when available)
python ./.trellis/scripts/task.py current --source      # show active task and source
python ./.trellis/scripts/task.py finish                # clear active task (triggers after_finish hooks)
python ./.trellis/scripts/task.py archive <name>        # move to archive/{year-month}/
python ./.trellis/scripts/task.py list [--mine] [--status <s>]
python ./.trellis/scripts/task.py list-archive

# Code-spec context (injected into implement/check agents via JSONL).
# `implement.jsonl` / `check.jsonl` are seeded (empty) on `task create` for sub-agent-capable
# platforms; the AI curates real spec + research entries during planning. `validate` fails
# and `start` refuses while a seeded manifest is still empty — sub-agents would run with
# zero spec context. Pass `start --allow-empty-context` when that is intentional.
python ./.trellis/scripts/task.py add-context <name> <action> <file> <reason>
python ./.trellis/scripts/task.py list-context <name> [action]
python ./.trellis/scripts/task.py validate <name>

# Task metadata
python ./.trellis/scripts/task.py set-branch <name> <branch>
python ./.trellis/scripts/task.py set-base-branch <name> <branch>    # PR target
python ./.trellis/scripts/task.py set-scope <name> <scope>

# Hierarchy (parent/child)
python ./.trellis/scripts/task.py add-subtask <parent> <child>
python ./.trellis/scripts/task.py remove-subtask <parent> <child>

# PR creation
python ./.trellis/scripts/task.py create-pr [name] [--dry-run]
```

> Run `python ./.trellis/scripts/task.py --help` to see the authoritative, up-to-date list.

**Current-task mechanism**: `task.py create` creates the task directory and (when session identity is available) auto-sets the per-session active-task pointer so the planning breadcrumb fires immediately. `task.py start` writes the same pointer (idempotent if already set) and flips `task.json.status` from `planning` to `in_progress`. State is stored under `.trellis/.runtime/sessions/`. If no context key is available from hook input, `TRELLIS_CONTEXT_ID`, or a platform-native session environment variable, there is no active task and `task.py start` fails with a session identity hint. `task.py finish` deletes the current session file (status unchanged). `task.py archive <task>` writes `status=completed`, moves the directory to `archive/`, and deletes any runtime session files that still point at the archived task.

### Workspace System

Records every AI session for cross-session tracking under `.trellis/workspace/<developer>/`.

- `journal-N.md` — session log. **Max 2000 lines per file**; a new `journal-(N+1).md` is auto-created when exceeded.
- `index.md` — personal index (total sessions, last active).

```bash
python ./.trellis/scripts/add_session.py --title "Title" --commit "hash" --summary "Summary"
```

### Context Script

```bash
python ./.trellis/scripts/get_context.py                            # full session runtime
python ./.trellis/scripts/get_context.py --mode packages            # available packages + spec layers
python ./.trellis/scripts/get_context.py --mode phase --step <X.Y>  # detailed guide for a workflow step
```

---

<!--
  WORKFLOW-STATE BREADCRUMB CONTRACT (read this before editing the tag blocks below)

  The [workflow-state:STATUS] blocks embedded in the ## Phase Index section
  below are the SINGLE source of truth for the per-turn `<workflow-state>`
  breadcrumb that every supported AI platform's UserPromptSubmit hook
  reads. inject-workflow-state.py (Python platforms) and
  inject-workflow-state.js (OpenCode plugin) only parse them — there is no
  fallback dict baked into the scripts after v0.5.0-rc.0.

  STATUS charset: [A-Za-z0-9_-]+. When the hook can't find a tag, it
  degrades to a generic "Refer to workflow.md for current step." line —
  intentionally visible so users notice and fix a broken workflow.md.

  INVARIANT (test/regression.test.ts):
    Every workflow-walkthrough step marked `[required · once]` must have a
    matching enforcement line in its phase's [workflow-state:*] block. The
    breadcrumb is the only per-turn channel; if a mandatory step isn't
    mentioned there, the AI silently skips it (Phase 1 planning gate
    skip and Phase 3.4 commit skip both manifested via this gap).

  TAG ↔ PHASE scoping:
    [workflow-state:no_task]      → no active task; before Phase 1
    [workflow-state:task_error]   → active task record is unreadable; repair it before continuing
    [workflow-state:planning]     → all of Phase 1 (status='planning')
    [workflow-state:planning-inline] → Codex inline variant of Phase 1
    [workflow-state:in_progress]  → Phase 2 + Phase 3.2-3.4
                                    (status stays 'in_progress' from
                                    task.py start until task.py archive)
    [workflow-state:in_progress-inline] → Codex inline variant of Phase 2/3
    [workflow-state:completed]    → currently DEAD: cmd_archive flips
                                    status and moves the dir in the same
                                    call, so the resolver loses the
                                    pointer (block kept for a future
                                    explicit in_progress→completed
                                    transition)

  Editing checklist:
    - When you change a [workflow-state:STATUS] block, also check the
      matching phase's `[required · once]` walkthrough steps for sync
    - Run `trellis update` after editing to push the new bodies to
      downstream user projects (block-level managed replacement)
    - Full runtime contract:
      .trellis/spec/cli/backend/workflow-state-contract.md
-->

## Phase Index

```
Phase 1: Plan    → classify, no consent gates, direct action (16-hour hackathon speed mode)
Phase 2: Execute → inline editing in main session, verify + commit each increment
Phase 3: Finish  → confirm pushed, walk the deliverable checklist before 24:00
```

### Request Triage (Hackathon Speed Mode)

- Default: NO Trellis task. Conversation, questions, small edits, quick fixes → just do it directly. Zero ceremony.
- Large independently-verifiable deliverables (e.g. "deploy to Vercel", "demo video script") MAY get a lightweight PRD-only task the AI creates itself — no consent gate, inform the user, keep moving.
- Never ask process questions ("should I create a task?"). Ask the user ONLY when a decision is genuinely user-owned: product direction, target user, scope tradeoffs, accounts, payments.
- Deadline awareness: everything serves the 24:00 submission. Prefer shipping a working loop over polishing.

### Planning Artifacts

- `prd.md` — requirements + acceptance criteria, kept SHORT (a few lines is fine). No technical design or checklists here.
- `design.md` / `implement.md` — optional, only when the AI judges a change is risky enough to need them.
- `implement.jsonl` / `check.jsonl` — not curated in speed mode. If you create a task, start it with `task.py start --allow-empty-context`.
- No review gate: task create → start → implement in one motion.

### Parent / Child Task Trees

Use a parent task when one user request contains several independently verifiable deliverables. The parent task owns the source requirement set, the task map, cross-child acceptance criteria, and final integration review; it normally should not be the implementation target unless it also has direct work.

Use child tasks for deliverables that can be planned, implemented, checked, and archived independently. Parent/child structure is not a dependency system: if one child must wait for another, write that ordering in the child `prd.md` / `implement.md` and keep each child's acceptance criteria testable.

Create new children with `task.py create "<title>" --slug <name> --parent <parent-dir>`. Link existing tasks with `task.py add-subtask <parent> <child>`, and unlink mistakes with `task.py remove-subtask <parent> <child>`.

<!-- Per-turn breadcrumb: shown when there is no active task (before Phase 1) -->

[workflow-state:no_task]
Hackathon speed mode. No active task — that's the norm here. Just do the work directly: implement, research, deploy, explain. Do NOT ask for task-creation consent.
Create a lightweight PRD-only task ONLY for large independently-verifiable deliverables; do it yourself without asking, then start it immediately (`task.py start --allow-empty-context`).
Ask the user only for genuinely user-owned decisions (product direction, target user, scope tradeoffs, accounts). Never process questions.
Deadline: 24:00 tonight. Budget time: leave ~1.5h at the end for the 3-min demo video + Product Memo + submission email.
[/workflow-state:no_task]

<!-- Per-turn breadcrumb: shown when the active task record cannot be read. -->

[workflow-state:task_error]
The active task record could not be read. Do not create or activate another task.
Inspect the task directory named above and repair its task.json. It must be a valid JSON object with a non-empty status.
Preserve existing task fields and artifacts. If the correct status cannot be determined safely, ask the user before reconstructing the record.
[/workflow-state:task_error]

### Phase 1: Plan (compressed — usually skipped entirely)
- 1.0 Create task `[optional · self-serve]` — only for large independently-verifiable deliverables; lightweight PRD-only; no consent gate
- 1.1 Requirement check `[as needed]` — one short question round ONLY if product direction / scope / user decisions are genuinely unresolved
- 1.2 Research `[optional · repeatable]` — main session direct; findings go to `{TASK_DIR}/research/` only if a task exists
- 1.3 Configure context `[skipped]` — no jsonl curation in speed mode; ad-hoc sub-agents get needed context inline in the dispatch prompt
- 1.4 Activate task `[required · once]` — only when 1.0 happened: `task.py start --allow-empty-context` immediately, no review gate
- 1.5 Completion criteria — prd.md with testable acceptance (a few lines) is enough

<!-- Per-turn breadcrumb: shown throughout Phase 1 (status='planning') -->

[workflow-state:planning]
Hackathon speed mode. Planning stays SHORT: `prd.md` is a few lines of requirements + acceptance. `design.md` / `implement.md` only if genuinely risky.
Do NOT load brainstorm ceremonies. One short question round only when product direction / scope / user decisions are unresolved; otherwise proceed.
No review gate: if a task was created, run `task.py start --allow-empty-context` immediately (jsonl manifests are intentionally empty in speed mode).
[/workflow-state:planning]

<!-- Per-turn breadcrumb: shown throughout Phase 1 when codex.dispatch_mode=inline.
     Codex-only opt-in alternate to [workflow-state:planning]. The main agent
     edits code directly in Phase 2, so jsonl curation is skipped —
     the inline workflow loads `trellis-before-dev` instead of injecting JSONL
     into a sub-agent. -->

[workflow-state:planning-inline]
Load `trellis-brainstorm`; stay in planning.
Lightweight: `prd.md` can be enough. Complex: finish `prd.md`, `design.md`, and `implement.md`; ask for review before `task.py start`.
Multi-deliverable scope: consider a parent task plus independently verifiable child tasks; dependencies must be written in child artifacts, not implied by tree position.
Inline mode: skip jsonl curation; Phase 2 reads artifacts/specs via `trellis-before-dev`.
[/workflow-state:planning-inline]

### Phase 2: Execute
- 2.1 Implement `[required · repeatable]` — main session edits directly (inline mode)
- 2.2 Verify + commit `[required · repeatable]` — quick build/lint/dev-server check, then commit the increment immediately
- 2.3 Rollback `[on demand]`

<!-- Per-turn breadcrumb: shown while status='in_progress'.
     Scope: all of Phase 2 + Phase 3.2-3.5 (status stays 'in_progress' from
     task.py start until task.py archive; only archive flips it). The body
     therefore must cover every required step from implementation through
     the deliverable checklist: 2.1 implement, 2.2 verify + commit,
     3.4 confirm committed + pushed, 3.5 deliverable checklist. -->

Sub-agents are OPTIONAL in speed mode. Dispatch `trellis-research` / `trellis-implement` / `trellis-check` only when parallel work genuinely saves deadline time (e.g. research while coding). When dispatching, keep the convention: the dispatch prompt starts with `Active task: <task path from task.py current>` before role-specific instructions, and the spawned agent implements/checks directly without spawning further sub-agents.

[workflow-state:in_progress]
Hackathon speed mode. Edit code directly in the main session — do NOT dispatch implement/check sub-agents by default. Dispatch (`trellis-research` etc.) only when parallel work genuinely saves deadline time; spawned agents work directly and never spawn further sub-agents.
Loop per increment: implement -> quick verify (dev server / build / lint) -> commit immediately. Frequent commits are scored by the judges; no batched plans, no per-commit confirmation.
Context: `prd.md` first, then `design.md` / `implement.md` only if they exist. When a task exists and you dispatch, the dispatch prompt starts with `Active task: <task path from task.py current>`.
Before finishing the task: confirm `git status` is clean and everything is pushed (public repo is a required deliverable), then run the deliverable checklist (Phase 3.5).
[/workflow-state:in_progress]

<!-- Per-turn breadcrumb: shown while status='in_progress' when
     codex.dispatch_mode=inline. Codex-only opt-in alternate to
     [workflow-state:in_progress]. The main session edits code directly
     instead of dispatching sub-agents. -->

[workflow-state:in_progress-inline]
Flow: `trellis-before-dev` -> edit -> `trellis-check` -> validation -> `trellis-update-spec` -> commit (Phase 3.4) -> `/trellis:finish-work`.
Do not dispatch implement/check sub-agents in inline mode.
Read context: `prd.md` -> `design.md if present` -> `implement.md if present`, plus relevant spec/research loaded by skills.
[/workflow-state:in_progress-inline]

### Phase 3: Finish (deliverable checklist)
- 3.2 Debug retrospective `[on demand]` — repeated debugging → `trellis-break-loop`
- 3.3 Spec update `[optional]` — only if a lesson is genuinely worth recording; keep the sprint pace
- 3.4 Confirm committed + pushed `[required · once]` — work was committed incrementally in 2.2; verify clean + pushed
- 3.5 Deliverable checklist `[required · once]` — walk the submission checklist before 24:00

> Note: step 3.1 was folded into 2.2 (last-iteration full-scope check) and 3.4 (commit preamble). Numbering kept stable to avoid breaking external references.

<!-- Per-turn breadcrumb: shown while status='completed'.
     Currently DEAD in normal flow: cmd_archive writes status='completed' in
     the same call that moves the task dir to archive/, so the active-task
     resolver loses the pointer and the hook never fires on archived tasks.
     Block preserved for a future status-transition redesign (e.g. an
     explicit in_progress→completed command). Edit through the same spec
     channel as the live blocks. -->

[workflow-state:completed]
Submission wrapped. Run `/trellis:finish-work`; if anything is dirty or unpushed, return to Phase 3.4 first. If the 24:00 deadline has not passed, double-check the deliverable checklist.
[/workflow-state:completed]

### Rules

1. Speed first: default is direct action, no task, no ceremony. Deadline is 24:00 tonight.
2. `[required]` steps can't be skipped; `[as needed]` / `[optional]` steps run only when they add value right now.
3. Phases can roll back (e.g., a defect reveals a wrong product call → fix direction, re-enter Execute).
4. Only user-owned decisions go to the user: product direction, target user, scope tradeoffs, accounts. Everything else, decide and act.
5. Commit each working increment immediately (judges score commit history); no batched plans.

### Active Task Routing

When a user request matches one of these intents inside an active task, route first, then load the detailed phase step if needed.

[Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi, Oh My Pi, ZCode, Snow, Reasonix, Trae, Grok, Kimi Code]

- Unclear requirements -> give a concrete plan and start; `trellis-brainstorm` only for product-direction-level disagreement.
- `in_progress` implementation/check -> main session does it directly; dispatch `trellis-implement` / `trellis-check` only for genuine parallelism.
- Repeated debugging -> `trellis-break-loop`; spec updates -> `trellis-update-spec` (optional).

[/Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi, Oh My Pi, ZCode, Snow, Reasonix, Trae, Grok, Kimi Code]

[codex-inline, Kilo, Antigravity, Devin, DeepSeek Harness]

- Planning or unclear requirements -> `trellis-brainstorm`.
- Before editing -> `trellis-before-dev`; after editing -> `trellis-check`.
- Repeated debugging -> `trellis-break-loop`; spec updates -> `trellis-update-spec`.

[/codex-inline, Kilo, Antigravity, Devin, DeepSeek Harness]

### Guardrails

- No task-creation consent gates; tasks are self-serve and optional.
- PRD-only is the default; `design.md` + `implement.md` only when the AI judges the risk warrants them.
- Every increment is verified (build/lint/dev server) before its commit; never report done without a green check.
- Everything serves the 24:00 deadline; reserve ~1.5h for demo video + Product Memo + submission.

### Loading Step Detail

At each step, run this to fetch detailed guidance:

```bash
python ./.trellis/scripts/get_context.py --mode phase --step <step>
# e.g. python ./.trellis/scripts/get_context.py --mode phase --step 1.1
```

---

## Phase 1: Plan (compressed — usually skipped)

Goal: get to code in minutes, not hours. Only user-owned decisions stop you.

#### 1.0 Create task `[optional · self-serve]`

Only for large independently-verifiable deliverables (e.g. "deploy to Vercel", "record demo video"). No consent gate — decide yourself, tell the user, keep moving:

```bash
python ./.trellis/scripts/task.py create "<task title>" --slug <name> --description "<one line>"
```

`task.py create` requires a non-empty `--description`. Do **not** include the `MM-DD-` date prefix in `--slug`; it is added automatically.

Skip when `python ./.trellis/scripts/task.py current --source` already points to a task.

#### 1.1 Requirement check `[as needed]`

If the request is clear, skip this. If a genuinely user-owned decision is open (product direction, target user, scope tradeoffs), ask ONE short question with your recommendation, then proceed. Never ask process questions.

#### 1.2 Research `[optional · repeatable]`

Research in the main session with whatever tools are available (web search, docs, MCP). Persist findings to `{TASK_DIR}/research/` only when a task exists; otherwise keep them in the conversation and act. Don't spend a sub-agent round-trip on something you can look up directly.

#### 1.3 Configure context `[skipped]`

No `implement.jsonl` / `check.jsonl` curation in speed mode. If you dispatch a sub-agent ad hoc, pass the needed context directly in the dispatch prompt.

#### 1.4 Activate task `[required · once]` (only when 1.0 happened)

```bash
python ./.trellis/scripts/task.py start <task-dir> --allow-empty-context
```

Empty jsonl manifests are intentional in speed mode. No review gate between create and start.

If `task.py start` errors with a session-identity message (no context key from hook input, `TRELLIS_CONTEXT_ID`, or platform-native session env), follow the hint in the error to set up session identity, then retry.

#### 1.5 Completion criteria

| Condition | Required |
|------|:---:|
| `prd.md` exists with testable acceptance (a few lines) | ✅ (only when a task exists) |
| `task.py start` has been run (status = in_progress) | ✅ (only when a task exists) |

---

## Phase 2: Execute

Goal: working increments, each verified and committed, racing the 24:00 deadline.

#### 2.1 Implement `[required · repeatable]`

Edit code directly in the main session. Read `{TASK_DIR}/prd.md` first when a task exists, then `design.md` / `implement.md` only if present.

Sub-agents are on-demand only: dispatch `trellis-research` / `trellis-implement` / `trellis-check` when parallel work genuinely saves deadline time. Dispatch prompt starts with `Active task: <task path from task.py current>`; the spawned agent works directly and never spawns further sub-agents.

#### 2.2 Verify + commit `[required · repeatable]`

After each working increment:

1. Quick verification: dev server / build / lint / type-check — whatever the project has, run it
2. Fix what breaks, re-verify until green
3. Commit immediately (judges score frequent, clear commits):

```bash
git add <files> && git commit -m "<conventional message>"
```

No batched commit plans, no per-commit confirmation. Push regularly so the public repo stays current. If the repo has no remote yet (public GitHub repo is a required deliverable), create one early — ask the user only for the GitHub account step, nothing else.

#### 2.3 Rollback `[on demand]`

- Check reveals a wrong product call → return to Phase 1, fix direction, redo 2.1
- Implementation went wrong → revert the code, redo 2.1
- Need more research → research in the main session, write findings to `research/` if a task exists

---

## Phase 3: Finish (deliverable checklist)

Goal: confirm the submission is complete before 24:00.

#### 3.2 Debug retrospective `[on demand]`

If the same issue was fixed multiple times, load `trellis-break-loop` to classify the root cause and capture the lesson — but don't let it eat deadline time.

#### 3.3 Spec update `[optional]`

Only if a lesson is genuinely worth recording for future sessions, load `trellis-update-spec`. Speed mode: skip unless it clearly pays off.

#### 3.4 Confirm committed + pushed `[required · once]`

Work was already committed incrementally in 2.2. At wrap-up:

1. `git status --porcelain` — confirm clean
2. Confirm the branch is pushed to the public GitHub repo
3. Anything dirty or unpushed → commit/push now

#### 3.5 Deliverable checklist `[required · once]`

Before 24:00, walk the submission checklist with the user:

1. **Demo video (3 min, one take)** — wow moment in the first 30 seconds; pain point → design tradeoffs → core loop demo
2. **Public product link** — deployed (e.g. Vercel); test account documented if login required; API-key/limit notes included
3. **Product Memo (1–2 pages)** — the 5 questions: target user & pain points, design & deliberate non-features, iteration record, next steps, AI tool usage
4. **Public GitHub repo** — README (intro / how to run / tech stack), clear commit history, not a silent one-shot dump

Submission: email before ~23:30 (server timestamp, don't race 23:59). Reserve ~1.5h total for video + Memo.

Remind the user they can run `/trellis:finish-work` to wrap up the Trellis task afterwards.

---

## Customizing Trellis (for forks)

This section is for developers who want to modify the Trellis workflow itself. All customization is done by editing this file; the scripts are parsers only.

### Changing what a step means

Edit the corresponding step's walkthrough body in the Phase 1 / 2 / 3 sections above. Critical invariants:
- No active task must triage first and ask for task-creation consent before creating a Trellis task.
- Planning must distinguish lightweight PRD-only tasks from complex tasks that require `prd.md`, `design.md`, and `implement.md` before start.
- Every required execution path must keep the Phase 3.4 commit reminder reachable before `/trellis:finish-work`.

All tag blocks live in the `## Phase Index` section above, immediately after each phase summary:

| Scope | Corresponding tag |
|---|---|
| No active task (before Phase 1) | `[workflow-state:no_task]` (after the Phase Index ASCII art) |
| Active task record unreadable | `[workflow-state:task_error]` (repair the existing task before continuing) |
| All of Phase 1 (task created → ready for implementation) | `[workflow-state:planning]` (after Phase 1 summary) |
| Codex inline Phase 1 | `[workflow-state:planning-inline]` |
| Phase 2 + Phase 3.2–3.4 (implementation + check + wrap-up) | `[workflow-state:in_progress]` (after Phase 2 summary) |
| Codex inline Phase 2 + Phase 3.2–3.4 | `[workflow-state:in_progress-inline]` |
| After Phase 3.5 (archived) | `[workflow-state:completed]` (after Phase 3 summary; **currently DEAD**) |

### Changing the per-turn prompt text

Directly edit the body of the corresponding `[workflow-state:STATUS]` block. After editing, run `trellis update` (if you're a template maintainer) or restart your AI session (if you're customizing your own project) — no script changes required.

### Adding a custom status

Add a new block:

```
[workflow-state:my-status]
your per-turn prompt text
[/workflow-state:my-status]
```

Constraints:
- STATUS charset: `[A-Za-z0-9_-]+` (underscores and hyphens allowed, e.g. `in-review`, `blocked-by-team`)
- A lifecycle hook must write `task.json.status` to your custom value, otherwise the tag is never read
- Lifecycle hooks live in `task.json.hooks.after_*` and bind to one of `after_create / after_start / after_finish / after_archive`

### Adding a lifecycle hook

Add a `hooks` field to your `task.json`:

```json
{
  "hooks": {
    "after_finish": [
      "your-script-or-command-here"
    ]
  }
}
```

Supported events: `after_create / after_start / after_finish / after_archive`. Note that `after_finish` ≠ a status change (it only clears the active-task pointer); use `after_archive` for "task is done" notifications.

### Full contract

For the workflow state machine's runtime contract, the locations of all status writers, pseudo-statuses (`no_task` / `stale_<source_type>`), the hook reachability matrix, and other deep details, see:

- `.trellis/spec/cli/backend/workflow-state-contract.md` — runtime contract + writer table + test invariants
- `.trellis/scripts/inject-workflow-state.py` — actual parser (reads workflow.md only, no embedded text)
