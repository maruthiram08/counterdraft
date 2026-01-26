---
description: Execute Ralph Loop iterative development
---

This workflow guides you through the process of running a Ralph Loop for iterative development.

1. **Understand the Ralph Loop Method**
   The Ralph Loop is an iterative development methodology where you:
   - Receive a task with clear completion criteria.
   - Work on the task incrementally.
   - Self-assess progress after each iteration.
   - Continue until ALL criteria are met.
   - **Key Philosophy**: "Iteration > Perfection".

2. **Prepare Your Task Prompt**
   Use this template to define your work:
   ```markdown
   ## Task
   [Describe the task clearly]

   ## Completion Criteria
   - [ ] [Criterion 1]
   - [ ] [Criterion 2]
   - [ ] [Criterion 3]

   ## Max Iterations
   [e.g., 20]
   ```

3. **Initiate the Loop**
   Create a state file at `.ralph/loop-state.md` to track your progress.
   // turbo
   ```bash
   mkdir -p .ralph && touch .ralph/loop-state.md
   ```

4. **Iterate**
   - Perform a unit of work (write code, run tests, etc.).
   - Update `.ralph/loop-state.md` with your progress log and verify criteria.
   - **Repeat** until all criteria are checked.

5. **Completion**
   When all criteria are met, output:
   `✅ All completion criteria met!`

For detailed guidance and examples, refer to `ralph-loop-guide.md`.
