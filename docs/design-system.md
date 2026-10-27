# Counterdraft design system (draft v1)

Soft neumorphism on a cool grey canvas, white content cards, burnt orange accent, navy for emphasis. Font stays IBM Plex Sans. Tokens live in `app/src/app/globals.css` (`@theme`), so every one is a Tailwind utility (`bg-canvas`, `text-ink`, `shadow-raised`, `rounded-card`…).

## Mobile first (how we design every screen)

Most people open Counterdraft on a phone first: from a LinkedIn notification, a link a friend sent, or a spare five minutes. So we design for a 390px-wide phone first and let the layout grow into tablet and desktop, not the other way round.

**The thought process**

1. Start at 390 x 844 (iPhone 14/15). Decide what one thumb needs on this screen: usually one primary action and the content. Everything else is secondary and can live behind More, a sheet or a disclosure.
2. Write the base Tailwind classes for the phone, then add `md:` and `lg:` for bigger screens. A class list that starts with desktop sizes and patches phones with `max-md:` is a smell.
3. Check the screen at 390px before checking it at 1440px.

**Rules**

- Layout: one column on phones. Side padding 16px (`px-4`), 40px from `md`. Nothing may scroll sideways except deliberate swipe rows (`overflow-x-auto scrollbar-none`).
- Reach: primary actions sit in the bottom half of the screen (bottom nav, a sticky footer bar or a full-width button), never only in the top-right corner. Bottom bars use `safe-area-pb` so the iPhone home indicator never covers them.
- Touch targets: at least 44 x 44px for anything tappable (`h-11`/`w-11`, or padding that gets there). 40px (`h-10`) is the floor for dense rows of chips.
- No hover-only controls. Touch screens have no hover, so `opacity-0 group-hover:opacity-100` hides things for good. Use `[@media(hover:hover)]:opacity-0 group-hover:opacity-100` so phones always see them.
- Phone vs desktop is decided by CSS (`md:hidden`, `hidden md:block`), not by measuring `window.innerWidth` in an effect. CSS is right on the first paint; the effect paints the desktop layout first and then jumps.
- Type: reading text (drafts, research, posts) is 16px on phones, UI labels 14px, meta 12–13px. Fields (input, textarea, select) are 16px on phones, otherwise iOS zooms the page on focus; `globals.css` enforces this. Nothing smaller than 11px.
- Height: app shells use `h-dvh`, not `h-screen`. `100vh` on iOS Safari is taller than what you see, so the bottom of a `h-screen` page hides behind the browser toolbar.
- Floating things: only one thing floats on a phone screen (the bottom nav, or a single action pill above it). Toasts sit above the bottom nav. The feedback bubble is desktop only; phones reach feedback from More or the footer.
- Spacing: section padding shrinks on phones. Marketing sections use `py-16 md:py-32`, not `py-32`, so a phone doesn't scroll through empty space.
- Weight: every byte costs more on a phone. Use `next/image` for images, load third-party scripts only on the page that needs them (`next/script` with `lazyOnload`), and keep font files to the weights and styles we actually use.

**Checking**

The mobile preview harness (project files: `mobile/preview-harness/`) renders every screen at 390px with mocked sign-in and data. Before opening a PR that touches UI, look at the changed screens there, then at desktop width.

## Colour

| Token | Hex | Use |
|---|---|---|
| canvas | #ECEDF1 | App background, and the face of every neumorphic control |
| surface | #FFFFFF | Content cards |
| surface-muted | #F5F5F8 | Quiet fills |
| line | #E3E4EA | Hairlines |
| ink | #161C2D | Headings, emphasis pills, dark buttons |
| ink-soft | #4B5164 | Body text |
| ink-muted | #8B90A0 | Meta, captions |
| ember-500 / 600 / 700 | #D4592A / #B94A1F / #963B18 | Burnt orange: primary action, active icon, brand |
| ember-50 / 100 | #FDF2EC / #FBE2D5 | Tinted banners, soft badges |
| dusk-500 | #7B93C4 | Dusty blue, the complement to ember (Drafts) |
| sand-500 | #C49A62 | Warm neutral (In development) |
| sage-500 | #5F9470 | Success |

Stage colours: Ideas = ember, In development = sand, Drafts = dusk, Published = ink.

## Depth (neumorphism)

Light comes from the top left. Raised things get a white highlight up-left and a cool shadow down-right; pressed things invert it.

| Token | Use |
|---|---|
| shadow-card | White content cards and the big summary card |
| shadow-float | Hovered cards, the expanded sidebar |
| shadow-raised | Buttons, pills, count badges on canvas |
| shadow-pressed | Active nav item, selected tab, column trays, button `:active` |
| shadow-well | Chips inside cards (small inset) |
| shadow-ember | Primary orange button |

Rule: neumorphic controls sit on `bg-canvas`; content that has to be read sits on white `surface` cards so text contrast never depends on a shadow.

## Shape and spacing

- Radius: `rounded-card` 28px (large cards, trays), `rounded-tile` 20px (content cards, banners), `rounded-full` for every button, chip and badge.
- Page: max width 1440px, 40px side padding (16px on mobile), 32px between sections.
- Card padding: 32px large, 20px content cards.

## Type (IBM Plex Sans)

| Role | Size / weight / tracking |
|---|---|
| Page title (app) | 32px / 500 / -0.02em |
| Display (marketing) | 56px / 500 / -0.03em |
| Big number | 36–48px / 500 / -0.03em |
| Card title | 24px / 500 / -0.02em |
| Item title | 17px / 500 / -0.01em |
| Body | 14–16px / 400 |
| Chip, button | 12–14px / 500, sentence case, no all-caps |

## Components

- Primary button: ember pill, 48px tall, white plus-in-a-circle icon, `shadow-ember`.
- Secondary button: canvas pill, `shadow-raised`, ember icon; `active:shadow-pressed`.
- Chip: canvas pill with `shadow-well`, 28px tall. Status chips: navy (high), ember-100 (medium), well (low).
- Count badge: round canvas `shadow-raised`.
- Nav item: round 44px; active is `shadow-pressed` with an ember icon.
- Stat strip: label, big number, row of thin tick bars filled in the stage colour (borrowed from the reference's Proposal Progress card).

## Class recipes (Tailwind, copy these)

Page shell: `h-full overflow-y-auto bg-canvas` > `max-w-[1440px] mx-auto px-4 md:px-10 pt-5 md:pt-7 pb-28 md:pb-12 flex flex-col gap-5`.
Page title (compact, screen real estate first): `text-2xl md:text-[32px] md:leading-tight font-medium tracking-[-0.02em] text-ink`; subtitle `mt-1 text-sm text-ink-soft`. Header actions use the `h-10` button size. The 56px display size is for the marketing site only.
Section title: `text-2xl font-medium tracking-[-0.02em] text-ink`. Eyebrow labels: `text-sm text-ink-muted` (no uppercase tracking-widest).
Large card: `bg-surface rounded-card shadow-card p-6 md:p-8`. Content card: `bg-surface rounded-tile shadow-card p-5`, hover `hover:shadow-float hover:-translate-y-0.5 transition-all`.
Tray / grouped area: `bg-canvas shadow-pressed rounded-card p-3`.
Primary button: `h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all` (smaller: `h-10 px-4`).
Secondary button: `h-12 px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all`.
Dark button: `rounded-full bg-ink text-white hover:bg-ink/90`.
Icon button: `w-10 h-10 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed`. Inside a white card, use plain `text-ink-muted hover:text-ink active:shadow-pressed` (no raised shadow).
Input / textarea / select: `bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200`. Or the `.input` class.
Chip: `h-7 px-3 rounded-full bg-canvas shadow-well text-ink-soft text-xs font-medium`. Selected chip/tab: `bg-canvas shadow-pressed text-ember-600`; unselected `bg-canvas shadow-raised text-ink-soft`.
Segmented control: wrapper `bg-canvas shadow-well rounded-full p-1 flex`, active segment `bg-surface shadow-raised rounded-full text-ink`, inactive `text-ink-muted`.
Badge emphasis: `bg-ink text-white rounded-full`. Soft accent: `bg-ember-100 text-ember-700`. Info: `bg-dusk-100 text-dusk-700`. Success: `bg-sage-100 text-sage-700`. Warning: `bg-sand-100 text-sand-700`. Error: `bg-rose-100 text-rose-700`.
Banner: `bg-ember-50 rounded-tile shadow-raised p-4` (info variant `bg-dusk-100`).
Modal: overlay `bg-ink/30 backdrop-blur-sm`; panel `bg-canvas rounded-card shadow-float p-6 md:p-8` holding white cards/inputs, or `bg-surface` for simple dialogs.
Dividers: prefer spacing; when needed `border-line`.
Colour mapping from the old UI: green/indigo/blue/purple primary accents -> ember; gray-900/black text -> ink; gray-500/600 -> ink-soft; gray-400 -> ink-muted; gray-50/100 fills -> canvas or surface-muted; gray-200 borders -> remove (use shadow) or `border-line`; red -> rose; amber/yellow -> sand; success green -> sage; blue info -> dusk. No `font-serif` in UI chrome (headings are Plex Sans medium); serif stays only for long-form reading text if it is clearly intentional.
