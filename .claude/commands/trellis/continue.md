# Continue Current Task

Resume work on the current task — pick up at the right phase/step in `.trellis/workflow.md`.

---

## Step 1: Load Current Context

```bash
python ./.trellis/scripts/get_context.py
```

Confirms: current task, git state, recent commits.

## Step 2: Load the Phase Index

```bash
python ./.trellis/scripts/get_context.py --mode phase
```

Shows the Phase Index (Plan / Execute / Finish) with routing + skill mapping.

## Step 3: Decide Where You Are

`get_context.py` shows the active task's `status` field. Route by `status` + artifact presence. This command replaces the user needing to remember the Trellis flow; it does not itself approve implementation.

- `status=planning` + no `prd.md` → **1.1** (one short requirement check only if a user-owned decision is open; otherwise write a few-line `prd.md` and move on)
- `status=planning` + `prd.md` exists → **1.4** (`task.py start --allow-empty-context` immediately, no review gate)
- `status=in_progress` + implementation not started → **2.1** (edit directly in the main session)
- `status=in_progress` + an increment is done → **2.2** (verify + commit immediately)
- `status=in_progress` + work finished → **3.3** (optional spec update) → **3.4** (confirm committed + pushed) → **3.5** (deliverable checklist)
- `status=completed` (rare; usually archived immediately) → archive flow

Phase rules (full detail in `.trellis/workflow.md`):

1. Speed mode: default is direct action; `[required]` steps must not be skipped
2. `prd.md` is the only planning artifact in speed mode; `design.md` / `implement.md` are optional
3. You may go back to an earlier phase if discoveries require it

## Step 4: Load the Specific Step

Once you know which step to resume at:

```bash
python ./.trellis/scripts/get_context.py --mode phase --step <X.X> --platform claude
```

Follow the loaded instructions. After each `[required]` step completes, move to the next.

---

## Reference

Full workflow and detailed phase steps live in `.trellis/workflow.md`. This command is only an entry point — the canonical guidance is there.
