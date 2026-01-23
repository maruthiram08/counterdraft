# CounterDraft

**CounterDraft** is an AI-powered content pipeline and writing assistant that helps thought leaders create distinctive, belief-driven content.

## Getting Started

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Architecture Overview

### Core Components

| Component | Purpose |
|-----------|---------|
| **Command Center** | Kanban-style content pipeline (Ideas → Drafts → Published) |
| **Your Mind** | AI-extracted beliefs and tensions from your content |
| **Explore** | Topic discovery and inspiration feed |
| **Library** | Draft editor with AI refinement sidebar |

### Key UI Components

#### Global Sidebar (`GlobalSidebar.tsx`)
- **Overlay Pattern**: Sidebar expands over content (not pushing it) for zero layout shift
- **Collapsed by Default**: 64px width, expands to 256px on hover
- **Responsive**: Hidden on mobile (bottom nav takes over)

#### Skeleton Loading
- **CommandCenter**: `SkeletonCard` placeholders during data fetch
- **YourMind**: `SkeletonBeliefCard` and `SkeletonTensionCard` for beliefs/tensions tabs
- Uses `animate-pulse` for modern loading UX

### Data Flow

```
User Content → AI Extraction → Beliefs/Tensions → Content Ideas → Drafts → Published
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Clerk
- **AI**: Anthropic Claude / OpenAI

## Recent Updates (Jan 2026)

### 🎨 Smart Studio (Sprint 21-22)
- ✅ **Auto-Carousel**: Turn any draft into a 10-slide carousel automatically.
- ✅ **Semantic Shuffle**: AI intelligently remixes quotes and points.
- ✅ **Visual Production**: Integrated Satori for server-side image generation.

### 🧠 Deep Drafts (Sprint 23)
- ✅ **Expanded Depth**: No character limits for "Thought Leadership" pieces.
- ✅ **Repurpose Modal V2**: Wide-screen layout with clear "Strategy" vs "Visuals" flow.

### UI Polish Sprint
- ✅ Skeleton loading for Command Center and Your Mind pages
- ✅ Overlay sidebar (no layout shift on hover)
- ✅ Smooth CSS transitions with staggered delays
- ✅ Default collapsed sidebar state

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

## Deployment

Deploy on [Vercel](https://vercel.com) with automatic preview builds on PR.

```bash
npm run build
```
