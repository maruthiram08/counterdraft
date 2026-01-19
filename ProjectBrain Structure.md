Great — here’s how to structure a **projectbrain document** (like a CLAUDE.md or similar project-context file) based on the principles from the _Using CLAUDE.md files_ blog and related best practices. These documents are designed to give **Claude (or any AI tool)** consistent, persistent context about your project so it can assist more effectively without re-explaining everything each time. ([claude.com](https://www.claude.com/blog/using-claude-md-files?utm_source=chatgpt.com "Using CLAUDE.MD files: Customizing Claude Code for your ..."))

---

## 📌 **ProjectBrain Document — Recommended Structure**

> Think of this as the _central source of truth_ for your project. Each section helps Claude (or another AI) instantly understand your project’s **purpose, structure, standards, workflows, and special rules** — without repeating context in every prompt. ([claude.com](https://www.claude.com/blog/using-claude-md-files?utm_source=chatgpt.com "Using CLAUDE.MD files: Customizing Claude Code for your ..."))

---

### 1) 🧠 **Header / Title Block**

Start with a clear title and short description:

```md
# Project Name
Short one-line summary of what this project is and does.
```

---

### 2) 📖 **Project Overview**

Answer the “what” and “why”:

```md
## About This Project
- One-sentence elevator pitch
- What problem it solves
- Who the users/customers are
```

This helps Claude ground all future recommendations in the right **business/technical context**. ([Reddit](https://www.reddit.com/r/ClaudeAI/comments/1mecx5t/how_we_structure_our_claudemd_file_and_why/?utm_source=chatgpt.com "How we structure our CLAUDE.md file (and why) : r/ClaudeAI"))

---

### 3) 🗂 **Architecture & Key Components**

Explain how the project is organized:

```md
## Architecture / Structure
- High-level architecture (e.g., frontend, backend, services)
- Tech stack (languages, frameworks, databases)
- Deployment environment(s) / infrastructure
```

Include a simple directory structure tree if useful — this gives Claude an “orientation map.” ([claude.com](https://www.claude.com/blog/using-claude-md-files?utm_source=chatgpt.com "Using CLAUDE.MD files: Customizing Claude Code for your ..."))

```md
Example Directory Structure:
main/
├─ frontend/
├─ backend/
└─ infra/
```

---

### 4) 📁 **Key Directories & Files**

List important code areas with descriptions:

```md
## Key Directories
- `app/models/`: database models
- `app/api/`: REST endpoints
```

This lets the AI know _where things live_ and _what they mean_. ([claude.com](https://www.claude.com/blog/using-claude-md-files?utm_source=chatgpt.com "Using CLAUDE.MD files: Customizing Claude Code for your ..."))

---

### 5) 📐 **Standards & Conventions**

Detail the coding and documentation norms:

```md
## Standards
- Code style conventions (linting rules, formatting)
- Naming conventions
- Testing frameworks + expectations
- Versioning / branch strategy
```

These rules ensure consistent output and reduce the need to specify reminders in prompts. ([Steve Kinney](https://stevekinney.com/courses/ai-development/claude-dot-md?utm_source=chatgpt.com "CLAUDE.md | Developing with AI Tools"))

---

### 6) 🚀 **Common Commands**

Include commands you or the team run often:

````md
## Common Commands
```bash
npm install
npm test
npm run build
````

````

This helps Claude skip asking “how do I run tests?” every time. :contentReference[oaicite:6]{index=6}

---

### 7) ⚙️ **Developer Workflow & Processes**
Outline how typical tasks should run:

```md
## Standard Workflows
- Feature planning
- Code review process
- Deployment checklist
- Testing and QA steps
````

For example, if every feature needs a test plan first, document that explicitly. ([claude.com](https://www.claude.com/blog/using-claude-md-files?utm_source=chatgpt.com "Using CLAUDE.MD files: Customizing Claude Code for your ..."))

---

### 8) 🧪 **Testing & Quality Requirements**

What must pass before code is acceptable:

```md
## Testing / Quality Gates
- Must have unit test coverage ≥ 80%
- Integration tests run nightly
```

This guides Claude to not just write code but follow _your team’s quality practices_. ([claude.com](https://www.claude.com/blog/using-claude-md-files?utm_source=chatgpt.com "Using CLAUDE.MD files: Customizing Claude Code for your ..."))

---

### 9) 📌 **Project Specific Notes**

Any quirks, gotchas, or domain specifics that aren’t obvious:

```md
## Notes & Special Rules
- JWT tokens expire after 24 hrs
- All APIs use `/api/v1/` prefix
```

This prevents re-explaining these in every prompt. ([claude.com](https://www.claude.com/blog/using-claude-md-files?utm_source=chatgpt.com "Using CLAUDE.MD files: Customizing Claude Code for your ..."))

---

### 10) 📎 **Imports / Modular Files (Optional)**

If the doc grows large, break it into pieces:

```md
@intro.md
@standards.md
@workflow.md
```

This keeps things lean and organized. ([callmephilip.com](https://callmephilip.com/posts/notes-on-claude-md-structure-and-best-practices/?utm_source=chatgpt.com "Notes on CLAUDE.md Structure and Best Practices"))

---

## 🛠 **Tips for an Effective ProjectBrain Document**

✅ **Be concise but complete**  
Each piece should add _useful context_, not fluff. ([claude.com](https://www.claude.com/blog/using-claude-md-files?utm_source=chatgpt.com "Using CLAUDE.MD files: Customizing Claude Code for your ..."))

✅ **Iterate over time**  
As the project evolves, update this file with new learnings. ([claude.com](https://www.claude.com/blog/using-claude-md-files?utm_source=chatgpt.com "Using CLAUDE.MD files: Customizing Claude Code for your ..."))

✅ **Avoid sensitive data**  
Don’t include keys, credentials, or secrets. ([claude.com](https://www.claude.com/blog/using-claude-md-files?utm_source=chatgpt.com "Using CLAUDE.MD files: Customizing Claude Code for your ..."))

✅ **Keep structure consistent**  
Use clear headings and consistent markdown formatting so the AI can parse it easily. ([Steve Kinney](https://stevekinney.com/courses/ai-development/claude-dot-md?utm_source=chatgpt.com "CLAUDE.md | Developing with AI Tools"))

---

## 📄 Example Skeleton (Markdown)

```md
# Project X – Brain Doc

## About This Project
...

## Architecture / Structure
...

## Key Directories
...

## Standards
...

## Common Commands
...

## Standard Workflows
...

## Testing / Quality Gates
...

## Notes & Special Rules
...
```

This template acts like a **shared context layer** for AI — Claude will automatically ingest this before every session and use it to shape subsequent outputs. ([claude.com](https://www.claude.com/blog/using-claude-md-files?utm_source=chatgpt.com "Using CLAUDE.MD files: Customizing Claude Code for your ..."))

---

If you want, I can also generate a **starter ProjectBrain document** tailored to your specific project (e.g., your poker app roadmap). Just share a few details!