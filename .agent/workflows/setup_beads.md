---
description: Setup Beads (bd) agent memory tool
---

This workflow installs `bd` and initializes it for the current repository.

1. Install `bd` using Homebrew (macOS).
   // turbo
   ```bash
   brew install steveyegge/beads/bd
   ```

2. Initialize Beads in the current repository.
   // turbo
   ```bash
   bd init
   ```

3. Configure AGENTS.md with detailed instructions.
   // turbo
   ```bash
   cat <<EOF >> AGENTS.md

# Beads Task Tracking
This project uses \`beads\` (bd) for task tracking. You MUST use it to maintain state and context.

## Core Workflow for Agents
1. **Start of Session**:
   - ALWAYS run \`bd list\` immediately to see the current state of work.
   - Run \`bd show <id>\` on relevant tasks to get context.

2. **Picking a Task**:
   - If an issue is assigned or obvious, work on it.
   - If starting completely new work, create a task: \`bd create "Task Name" -p 1\`

3. **During Work ({EXECUTION} mode)**:
   - **Subtasks**: If a task is complex, break it down:
     \`bd create "Subtask name" -p 1\`
     \`bd dep add <subtask_id> <parent_id>\`
   - **Updates**: If you learn something crucial that shouldn't be lost, comment on the task:
     \`bd comment <id> "Discovered that API X requires payload Y"\`

4. **End of Session / Handoff**:
   - **NEVER** leave a session without updating Beads.
   - **If Complete**: \`bd close <id>\`
   - **If Incomplete**: \`bd comment <id> "Progress: ... Next steps: ..."\`
   - This ensures the next agent knows exactly where to pick up.

## Quick Reference
- List: \`bd list\`
- Show: \`bd show <id>\`
- Create: \`bd create "Title" -p <priority>\`
- Close: \`bd close <id>\`
- Comment: \`bd comment <id> "Message"\`
EOF
   ```

4. Verify installation.
   ```bash
   bd ready
   ```
