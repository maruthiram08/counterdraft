# Counterdraft — Product Requirements Document (v2)

> **Counterdraft is a belief explorer that helps knowledge creators clarify, sharpen, and evolve their thinking before it becomes content.**

---

## 1. Problem

Knowledge creators don't lack ideas. They lack:
- Clarity on what they *actually* believe
- Awareness of repetitive patterns in their thinking
- Ability to surface and resolve internal tensions
- Direction on which idea is worth expressing next

Existing tools optimize for **content output**, not **thinking quality**.

---

## 2. Target Users (MVP)

**Primary ICP**
- Founders, operators, consultants, PMs
- Post consistently on LinkedIn
- Care about authority, not virality
- Have opinions (not news curators)

**Explicitly Out of Scope**
- Meme creators, growth hackers, content farms

---

## 3. Core Job-to-be-Done

> *"Help me understand what I actually believe, where my thinking is shallow or repetitive, and what idea is worth expressing next."*

---

## 4. Product Principles

1. **Beliefs > Posts** — We develop thinking, not drafts
2. **Judgment > Generation** — Surfacing over producing
3. **Restraint > Volume** — Less posting, sharper ideas
4. **Longitudinal > Session-based** — Thinking evolves over time
5. **Trust > Virality** — Private, editorial, calm

---

## 5. Canonical Object: Creator Belief Graph

The belief graph is the **single source of truth** for a creator's intellectual identity.

| Node Type | Description |
|-----------|-------------|
| Core Beliefs | Strongly held, repeatedly expressed |
| Rejected Beliefs | Explicitly contradicted or abandoned |
| Overused Beliefs | High repetition, diminishing insight |
| Emerging Beliefs | New direction, low frequency |
| Tensions | Conflicting beliefs or unresolved tradeoffs |

All outputs are projections of this graph.

---

## 6. MVP Scope

### 6.1 Input: Content Ingestion

**V1 Sources**
- Manual copy-paste of LinkedIn posts (50-100 posts)
- Optional: Notes, drafts, saved inspirations

**Cold Start (New Creators)**
- Share inspiration posts from creators they admire
- System extracts beliefs → User confirms alignment
- Prevents "belief cosplay" via explicit confirmation

### 6.2 Core Engine: Belief Extraction

System extracts:
- **5-7 Core Beliefs** — Plain language, opinionated
- **3 Overused Angles** — Repetition risk signals
- **2-3 Tensions** — With classification UX (see below)
- **1 Emerging Thesis** — Directional belief evolution

### 6.3 Tensions UX (Key Differentiator)

When system detects potential contradictions:

```
System: "You've said 'Move fast' and 'Quality over speed'. 
         How do you hold these?"

User classifies:
  ❌ Inconsistency — I've evolved past one of these
  ✅ Intentional Nuance — I hold both contextually  
  🤔 Explore This — I'm unsure, help me think
```

User classification feeds eval system.

### 6.4 Output: Idea Directions

**Flow**: Belief Graph → Underexplored Themes → Specific Topics

System provides:
- Top 3 ideas worth expressing next
- Which belief it strengthens
- What tension it explores
- What belief it risks weakening
- Optional: One suggested opening line

**Explicitly NOT Provided (V1)**
- Full post drafts
- Formatting, emojis, hooks

### 6.5 Human-in-Loop Confirmation

At every stage:
1. Beliefs extracted → User confirms/edits
2. Tensions surfaced → User classifies
3. Idea directions → User picks or rejects

---

## 7. UX Principles

- Editorial, calm, private
- Feels like a thinking notebook
- No dashboards, feeds, gamification
- Minimal controls, intentional friction

---

## 8. MVP Non-Goals

- ❌ Scheduling
- ❌ Analytics  
- ❌ Multi-platform publishing
- ❌ Virality scoring
- ❌ Daily prompts
- ❌ Cross-user learning (V1)

---

## 9. Success Metrics

**Primary (Qualitative)**
> Users describe product as: "An editor for my thinking"

**Secondary**
- Repeat usage after week 2
- Users referencing belief insights in their writing
- Tension → Explore → Post pipeline completion

---

## 10. Phased Roadmap

| Phase | Scope |
|-------|-------|
| **V1 (MVP)** | Belief extraction, tensions, idea directions |
| **V1.5** | Belief-anchored drafting (not full drafts, structured starters) |
| **V2** | Multi-platform content adaptation |
| **V3** | Longitudinal belief evolution, Opt-in cross-user patterns |

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Generic output | Aggressive belief deduplication + user confirmation |
| User distrust | Editorial tone + restraint + transparency |
| Over-automation | Human-in-loop at every stage |
| Feature creep | Hard MVP scope lock |
| Belief cosplay (cold start) | Explicit "do you align?" confirmation |

---

## 12. Business Model

- **Monetization**: Subscription
- **Distribution**: ProductHunt, LinkedIn organic, referral loops
