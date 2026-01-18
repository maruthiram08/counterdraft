# Counterdraft Frontend Design Plan

## Design Reference Analysis

Based on the brandkit and reference design:

![Reference Design](/Users/maruthi/.gemini/antigravity/brain/701db49a-cd43-4ce2-9f83-4d5039b7e4c0/uploaded_image_1768671833028.png)

---

## Design System

### Colors & Posture
**Editorial Gravity**: The design must feel like a serious tool for thinking, not a SaaS for growth hacking.

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#FFFFFF` | Main background |
| `--foreground` | `#171717` | Primary text |
| `--surface` | `#FAFAFA` | Cards, elevated surfaces |
| `--surface-dark` | `#171717` | Hero, CTA, featured sections |
| `--accent` | `#22C55E` | **Primary Commitment Actions ONLY** (e.g., "Begin analysis", "Accept direction"). |
| `--accent-hover` | `#16A34A` | Button hover state |
| `--muted` | `#6B7280` | Secondary text |
| `--border` | `#E5E7EB` | Card borders |

**Note on Color**: Use green sparingly. If an action isn't a "commitment", use neutral greys. This increases the weight of the primary actions.

### Typography
- **Font**: Inter (primary), system fallbacks
- **Weights**: 400 (body), 500 (medium), 600 (semibold), 700 (bold)
- **Sizes**: 
  - Hero: 48-56px
  - H2: 32-40px 
  - H3: 24px
  - Body: 16px
  - Small: 14px

---

## Page Structure

### 1. Landing Page (`/`) - The Editorial Manifesto
*Goal: Repel the wrong users (growth hackers), attract the right users (thinkers).*

```
┌──────────────────────────────────────────────────────┐
│ HEADER (light)                                       │
│ Logo                                         [Login] │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│ HERO (dark background)                               │
│                                                      │
│   Know what you believe           [Single Abstract   │
│   before you write it.             UI Concept]       │
│                                                      │
│   [Start Thinking →]                                 │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│ THE PROBLEM (Provocative)                            │
│                                                      │
│   "Most creators repeat themselves                   │
│    without realizing it."                            │
│                                                      │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│ WHAT COUNTERDRAFT DOES (Editorial Framing)           │
│   - Finds your beliefs                               │
│   - Surfaces your contradictions                     │
│   - Tells you what *not* to write next               │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│ ONE SCREENSHOT ONLY                                  │
│   [Belief + Tension card side-by-side]               │
│   Caption: "See where your thinking breaks."         │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│ WHO THIS IS NOT FOR (Critical)                       │
│   "If you want AI to write for you, go elsewhere."   │
│   "If you want viral hooks, go elsewhere."           │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│ CTA SECTION (dark)                                   │
│   Ready to do the hard work?                         │
│   [Begin Analysis →]                                 │
└──────────────────────────────────────────────────────┘
```

### 2. Onboarding (`/onboarding`)
- **Vibe**: "This is serious. Sit down. Think."
- **Flow**:
    1.  Full-screen intro.
    2.  Large Paste Area (The "Thinking Act").
    3.  Analysis State (No quick loader, make it feel weighty).

### 3. Workspace (`/workspace`) - The Thinking Flow
*Consolidated single-page app experience. Thinking is nonlinear.*

**Sections (Not Routes):**
1.  **Beliefs**: The foundation.
2.  **Tensions**: The conflict.
3.  **Directions**: The resolution.

*User flows smoothly between these states without full page reloads.*

---

## Components

### Component Architecture
```
components/
├── primitives/       # Basic building blocks (dumb)
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   └── Input.tsx
├── thinking/         # Domain-specific "Thinking" objects
│   ├── BeliefCard.tsx
│   ├── TensionCard.tsx
│   └── DirectionCard.tsx
└── layout/           # Structure
    ├── Header.tsx
    └── Footer.tsx
```

### Thinking Components (Detailed Requirements)

#### 1. BeliefCard
*Role: The foundation of the user's worldview.*
- **Content**: The core belief statement.
- **Metadata**: 
    - "Supported by X posts" (toggle to reveal source snippets).
    - Confidence Indicator (Low/Medium/High) - subtle UI.
- **Interaction (The "Assert" Pattern)**:
    - **Do NOT**: Allow freeform editing.
    - **DO**: Allow assertion.
        - 👍 "This is accurate"
        - 👎 "This misses something"
        - 💬 "Clarify"

#### 2. TensionCard
*Role: The emotional hook. Where the user contradicts themselves.*
- **Content**: The two conflicting beliefs or statements.
- **Labels**: 
    - "This tension is unresolved"
    - "You’ve avoided this publicly" (Microcopy)
- **Action**: Acknowledge or Explore.

#### 3. DirectionCard (formerly IdeaCard)
*Role: The path forward. Not "content generation".*
- **Title**: "What to explore"
- **Subtitle**: "Why this matters now"
- **Footer**: "Belief strengthened" / "Belief weakened"
- **NO**: "Generate post" buttons. Keep it directional.

---

## Animations (The "Thinking" Pace)
- **Fade in**: Elements animate up 4px + fade (250ms) - smooth, not jumpy.
- **Hover states**: Subtle scale (1.01) - nothing too bouncy.
- **Transitions**: Cross-fades between workspace sections.

---

## Two-Week Execution Plan

### Week 1: Foundation & Editorial Core
**Goal**: Lock the "posture" of the app.
- [ ] **Landing Page**: Implement the "Manifesto" layout. Lock copy (exclusionary/provocative).
- [ ] **Onboarding**: Build the full-screen paste + analysis flow.
- [ ] **Workspace Skeleton**: Build the `/workspace` shell with static mock data for Beliefs/Tensions/Directions.

### Week 2: The Thinking Loop
**Goal**: Make the thinking tools functional.
- [ ] **Belief Confirmation**: Implement the "Assert" (Accurate/Clarify) loop.
- [ ] **Tension Surfacing**: Implement inline tension cards within the flow.
- [ ] **Direction Cards**: Display directions without generation actions.

**Explicitly Out of Scope**:
- Analytics / Metrics
- Scheduling / Posting
- Multi-platform support
