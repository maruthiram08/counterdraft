# 🔄 Ralph Loop Guide for Antigravity IDE

A guide to using iterative AI development loops in Antigravity IDE, inspired by the [Ralph Wiggum technique](https://ghuntley.com/ralph/).

---

## What is Ralph Loop?

Ralph Loop is an iterative development methodology where the AI agent:
1. Receives a task with clear completion criteria
2. Works on the task incrementally
3. Self-assesses progress after each iteration
4. Continues until ALL criteria are genuinely met

**Key Philosophy**: *"Iteration > Perfection"* - Let the loop refine the work rather than aiming for perfect on the first try.

---

## Quick Start

### Step 1: Invoke the Workflow

Type in Antigravity:
```
/ralph-loop
```

### Step 2: Provide Your Task

Use this template:

```markdown
## Task
Build a REST API for todo management

## Completion Criteria
- [ ] CRUD endpoints working (GET, POST, PUT, DELETE)
- [ ] Input validation in place
- [ ] All tests passing
- [ ] README with API documentation

## Max Iterations
20
```

### Step 3: Let It Run

The AI will:
1. Initialize a state file at `.ralph/loop-state.md`
2. Work on the task iteratively
3. Log progress after each iteration
4. Continue until all criteria are checked off

### Step 4: Completion

When done, you'll see:
```
✅ All completion criteria met!
<promise>COMPLETE</promise>
```

---

## Writing Good Prompts

### ❌ Bad Prompts

```
Make a todo app
```
*Problem: No clear success criteria, too vague*

```
Create a complete e-commerce platform
```
*Problem: Too large, no phases, overwhelming*

### ✅ Good Prompts

```markdown
## Task
Build a todo REST API with Express.js

## Completion Criteria
- [ ] GET /todos returns all todos
- [ ] POST /todos creates a new todo (validates: title required, max 100 chars)
- [ ] PUT /todos/:id updates a todo
- [ ] DELETE /todos/:id removes a todo
- [ ] Tests exist for all endpoints
- [ ] All tests pass when running `npm test`
- [ ] README.md documents all endpoints

## Max Iterations
15
```

### ✅ Phased Prompts (for larger tasks)

```markdown
## Task
Build user authentication system

## Phase 1 Criteria (complete first)
- [ ] User model with email/password
- [ ] Password hashing with bcrypt
- [ ] Registration endpoint working

## Phase 2 Criteria (after Phase 1)
- [ ] Login endpoint returns JWT
- [ ] JWT validation middleware
- [ ] Protected route example

## Phase 3 Criteria (after Phase 2)
- [ ] All auth tests passing
- [ ] API documentation complete

## Max Iterations
30
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `/ralph-loop` | Start a new iterative loop |
| `cat .ralph/loop-state.md` | Check current progress |
| `rm .ralph/loop-state.md` | Cancel active loop |

---

## State File Format

The loop creates `.ralph/loop-state.md`:

```yaml
---
iteration: 5
status: active
started_at: 2026-01-04T16:30:00Z
---

## Current Task
Build a REST API for todos

## Completion Criteria
- [x] GET endpoint working
- [x] POST endpoint working
- [ ] PUT endpoint working
- [ ] DELETE endpoint working
- [ ] Tests passing

## Progress Log
### Iteration 1
- Set up Express project structure
- Created basic server.js

### Iteration 2
- Implemented GET /todos endpoint
- Added in-memory storage

### Iteration 3
- Implemented POST /todos with validation
- Fixed JSON parsing middleware

### Iteration 4
- Started PUT implementation
- Discovered bug in ID handling

### Iteration 5
- Fixed ID bug
- PUT endpoint now working
- Moving to DELETE next
```

---

## Best Practices

### 1. Set Max Iterations
Always include a safety limit to prevent infinite loops on impossible tasks:
```markdown
## Max Iterations
20
```

### 2. Include Verification Steps
Add testable criteria:
```markdown
- [ ] `npm test` passes with 0 failures
- [ ] `curl localhost:3000/health` returns 200
```

### 3. Use Incremental Checkpoints
Break work into verifiable milestones:
```markdown
- [ ] Phase 1: Basic CRUD (iterations 1-5)
- [ ] Phase 2: Validation (iterations 6-10)
- [ ] Phase 3: Tests (iterations 11-15)
```

### 4. Include Escape Conditions
For tasks that might get stuck:
```markdown
## If Blocked After 10 Iterations
- Document what's blocking progress
- List approaches attempted
- Suggest alternative solutions
- Output: <promise>BLOCKED</promise>
```

---

## When to Use Ralph Loop

### ✅ Good For
- Well-defined tasks with clear success criteria
- Tasks requiring iteration (getting tests to pass)
- Greenfield projects you can walk away from
- Tasks with automatic verification (tests, linters)
- Refactoring with test coverage

### ❌ Not Good For
- Tasks requiring human judgment/design decisions
- One-shot operations (single file edits)
- Tasks with unclear success criteria
- Production debugging (use targeted debugging)
- Creative work needing feedback

---

## Troubleshooting

### Loop seems stuck
1. Check `.ralph/loop-state.md` for the iteration count
2. Review the progress log for patterns
3. Consider if criteria are achievable
4. Cancel and restart with modified criteria

### Criteria never met
1. Make criteria more specific and testable
2. Break into smaller phases
3. Add intermediate checkpoints
4. Reduce scope

### Loop completes too early
1. Make criteria more rigorous
2. Add verification commands
3. Include "AND passes tests" type criteria

---

## Example Sessions

### Example 1: Bug Fix

```markdown
## Task
Fix the authentication timeout bug in auth.js

## Completion Criteria
- [ ] Identified root cause of timeout
- [ ] Implemented fix
- [ ] `npm test auth` passes
- [ ] Manual test: login works within 2 seconds
- [ ] Added regression test for this bug

## Max Iterations
10
```

### Example 2: Feature Implementation

```markdown
## Task
Add dark mode toggle to the React app

## Completion Criteria
- [ ] Toggle component created
- [ ] Theme context provider implemented
- [ ] All components respect theme
- [ ] Preference persisted to localStorage
- [ ] `npm run build` succeeds
- [ ] No console errors in browser

## Max Iterations
15
```

### Example 3: Documentation

```markdown
## Task
Document the API endpoints in README.md

## Completion Criteria
- [ ] All 12 endpoints documented
- [ ] Each has: method, path, description, example request, example response
- [ ] Authentication requirements noted
- [ ] Error responses documented
- [ ] Markdown renders correctly (no syntax errors)

## Max Iterations
8
```

---

## Credits

Inspired by:
- [Geoffrey Huntley's Ralph technique](https://ghuntley.com/ralph/)
- [Claude Code's ralph-wiggum plugin](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum)
- [Ralph Orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)
