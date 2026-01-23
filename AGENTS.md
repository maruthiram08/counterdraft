# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds


# Beads Task Tracking
This project uses `beads` (bd) for task tracking. You MUST use it to maintain state and context.

## Core Workflow for Agents
1. **Start of Session**:
   - ALWAYS run `bd list` immediately to see the current state of work.
   - Run `bd show <id>` on relevant tasks to get context.

2. **Picking a Task**:
   - If an issue is assigned or obvious, work on it.
   - If starting completely new work, create a task: `bd create "Task Name" -p 1`

3. **During Work ({EXECUTION} mode)**:
   - **Subtasks**: If a task is complex, break it down:
     `bd create "Subtask name" -p 1`
     `bd dep add <subtask_id> <parent_id>`
   - **Updates**: If you learn something crucial that shouldn't be lost, comment on the task:
     `bd comment <id> "Discovered that API X requires payload Y"`

4. **End of Session / Handoff**:
   - **NEVER** leave a session without updating Beads.
   - **If Complete**: `bd close <id>`
   - **If Incomplete**: `bd comment <id> "Progress: ... Next steps: ..."`
   - This ensures the next agent knows exactly where to pick up.

# Beads Task Tracking
This project uses `beads` (bd) for task tracking. You MUST use it to maintain state and context.

## Core Workflow for Agents
1. **Start of Session**:
   - ALWAYS run `bd list` immediately to see the current state of work.
   - Run `bd show <id>` on relevant tasks to get context.

2. **Picking a Task**:
   - If an issue is assigned or obvious, work on it.
   - If starting completely new work, create a task: `bd create "Task Name" -p 1`

3. **During Work ({EXECUTION} mode)**:
   - **Subtasks**: If a task is complex, break it down:
     `bd create "Subtask name" -p 1`
     `bd dep add <subtask_id> <parent_id>`
   - **Updates**: If you learn something crucial that shouldn't be lost, comment on the task:
     `bd comment <id> "Discovered that API X requires payload Y"`

4. **End of Session / Handoff**:
   - **NEVER** leave a session without updating Beads.
   - **If Complete**: `bd close <id>`
   - **If Incomplete**: `bd comment <id> "Progress: ... Next steps: ..."`
   - This ensures the next agent knows exactly where to pick up.

## Quick Reference
- List: `bd list`
- Show: `bd show <id>`
- Create: `bd create "Title" -p <priority>`
- Close: `bd close <id>`
- Comment: `bd comment <id> "Message"`
