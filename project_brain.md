# CounterDraft – ProjectBrain

## About This Project
- **Elevator Pitch**: An AI-powered editorial workspace that helps users transform raw thoughts and LinkedIn history into structured "Beliefs" and polished thought leadership content.
- **Problem Solved**: Overcomes writer's block and "blank page" syndrome by extracting core beliefs from past content and suggesting directional ideas ("tensions") to write about.
- **Users**: Thought leaders, founders, and content creators who want to write with more depth and consistency.

---

## Architecture / Structure
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS.
- **Backend**: Next.js API Routes (Serverless functions).
- **Database**: PostgreSQL (Supabase) with `pgvector` for semantic search.
- **AI Engine**: Anthropic Claude 3.5 Sonnet (via API) for belief extraction and drafting.
- **Auth**: Clerk (or Supabase Auth - *currently using Clerk in code*).
- **Infrastructure**: Vercel (Hosting), Supabase (DB + Vector Store).

### Directory Structure
```
counterdraft/
├── app/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages & API routes
│   │   │   ├── api/          # Backend endpoints (/api/ingest, /api/content, etc.)
│   │   │   └── workspace/    # Main app view
│   │   ├── components/       # React components
│   │   │   ├── editor/       # MainEditor, Sidebar, etc.
│   │   │   ├── explore/      # ExplorerChat, Feed
│   │   │   ├── pipeline/     # CommandCenter, Kanban Board
│   │   │   └── thinking/     # BeliefCard, TensionCard
│   │   └── lib/              # Utilities, DB clients, hooks
│   ├── public/               # Static assets
│   ├── scripts/              # Helper scripts (migrations, seeds)
│   └── schema.sql            # Database schema definition
└── package.json
```

---

## Key Directories
- `app/src/app/api/`: **Backend Logic**. Contains specific endpoint handlers like `ingest`, `explore`, `content`.
- `app/src/components/thinking/`: **Core AI UI**. Components that display the "Brain" of the system (Beliefs, Tensions).
- `app/src/components/pipeline/`: **Workflow UI**. Command Center and Kanban board for managing the content lifecycle.
- `app/src/components/editor/`: **Drafting UI**. The writing surface and sidebars.

---

## Standards
- **Tech Stack**: TypeScript, Next.js 14, Tailwind CSS.
- **Styling**: Mobile-first responsive design. Use `bg-paper` for the textured background.
- **Code Style**: Functional React components. Use `lucide-react` for icons.
- **Data Fetching**: Server Actions or API routes fetched via `useEffect` (Client Components).
- **AI Prompting**: specific prompt engineering for "Belief Extraction" to avoid generic summaries.

---

## Common Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run database migrations (manual script usually)
# See scripts/ folder for specific utilities
```

---

## Standard Workflows
1.  **Ingestion**: User inputs raw text/LinkedIn URL -> `api/ingest` analyses -> Stores in `raw_posts`.
2.  **Belief Extraction**: AI analyzes `raw_posts` -> Extracts `beliefs` -> stored with embeddings.
3.  **Tension Detection**: AI compares beliefs -> Identifies contradictions (`tensions`).
4.  **Idea Generation**: User clicks "Suggest Ideas" -> AI proposes specific angles (`idea_directions`).
5.  **Drafting**: User selects an idea -> "Wizard" step-by-step drafting (Deep Dive -> Outline -> Draft).

---

## Notes & Special Rules
- **Responsive Design**: Critical. The "Bottom Sheet" pattern is used for AI tools on mobile (`MobileAgentSheet.tsx`).
- **Texture**: The app uses a specific "paper" noise texture defined in `globals.css` (.bg-paper).
- **Mobile Nav**: On mobile (<768px), the sidebar is hidden and replaced by `MobileBottomNav`.
- **Confidence Model**: Beliefs have a confidence score and "evidence" count linking back to source posts.
