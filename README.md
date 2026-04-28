<div align="center">

<br />

<img src="public/logo.svg" alt="Novaris Logo" width="72" height="72" />

# Novaris

**The connected workspace where better, faster work happens.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Convex](https://img.shields.io/badge/Convex-1.15-EE342F?style=flat-square)](https://convex.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?style=flat-square&logo=clerk&logoColor=white)](https://clerk.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)

<br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/logo-dark.svg" />
  <img alt="Novaris workspace preview" src="public/logo.svg" width="120" />
</picture>

<br /><br />

[✨ Features](#-features) · [🚀 Quick Start](#-quick-start) · [🏗 Architecture](#-architecture) · [⚙️ Environment Variables](#️-environment-variables) · [🤖 AI Features](#-ai-features) · [🎨 Whiteboard](#-whiteboard) · [📦 Tech Stack](#-tech-stack) · [🗂 Project Structure](#-project-structure) · [🚢 Deployment](#-deployment)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📝 Rich Document Editor
- Block-based editing powered by **BlockNote**
- Headings, paragraphs, lists, tables, code blocks
- Syntax-highlighted code with 10+ languages
- Drag-and-drop block reordering
- Cover images & emoji icons per document
- Per-document font selection (Inter, Lora, JetBrains Mono)
- Real-time auto-save

</td>
<td width="50%">

### 🤖 AI Writing Assistant
- Inline AI actions on any block via side menu
- **Improve Writing** — grammar, clarity, tone
- **Summarize** — concise content summaries
- **Extract Action Items** — auto-creates tasks
- **Explain Code** — plain-English code breakdowns
- **Optimize Code** — performance suggestions
- **Calculate Totals** — number extraction & sums
- **Categorize Items** — logical grouping
- Table-aware analysis & summarization
- Powered by **OpenRouter** (nvidia/nemotron)

</td>
</tr>
<tr>
<td width="50%">

### 🎨 Infinite Whiteboard
- Canvas-based drawing per document
- Tools: Pen, Eraser, Rectangle, Ellipse, Pan
- Zoom, fit-to-view, viewport reset
- Color picker & stroke size controls
- Persisted to Convex in real-time
- Keyboard shortcuts for all tools
- Optimistic updates with rollback on failure

</td>
<td width="50%">

### 📋 Task Planner
- Right-sidebar task manager (visible on xl+)
- Calendar date picker
- Custom task categories
- Create tasks with Enter key
- Toggle complete / delete
- AI-generated action items auto-populate
- Filtered views per category

</td>
</tr>
<tr>
<td width="50%">

### 🗂 Document Management
- Infinite nested document tree
- Drag-and-drop reordering in sidebar
- Favorites with dedicated section
- Soft-delete with Trash & restore
- Publish documents publicly (no auth required)
- Full-text search with `Ctrl+K`
- Table of contents with scroll progress

</td>
<td width="50%">

### 🔐 Auth & Settings
- Authentication via **Clerk** (sign up / sign in)
- Per-user settings (font, theme)
- Light / Dark / System theme
- Responsive layout — mobile sidebar collapse
- Resizable sidebar (240px – 480px)
- Keyboard shortcut `Ctrl+\` to toggle sidebar

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| npm / bun | latest |
| Convex account | [convex.dev](https://convex.dev) |
| Clerk account | [clerk.com](https://clerk.com) |
| EdgeStore account | [edgestore.dev](https://edgestore.dev) |
| OpenRouter API key | [openrouter.ai](https://openrouter.ai) *(optional — for AI features)* |

### 1. Clone & Install

```bash
git clone https://github.com/your-username/novaris.git
cd novaris
npm install
```

### 2. Set Up Convex

```bash
npx convex dev
```

This will prompt you to log in and create a project. Copy the deployment URL shown.

### 3. Configure Environment Variables

Create a `.env.local` file in the root:

```env
# Convex
CONVEX_DEPLOYMENT=dev:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=https://your-clerk-domain.clerk.accounts.dev

# EdgeStore (file uploads)
EDGE_STORE_ACCESS_KEY=your_access_key
EDGE_STORE_SECRET_KEY=your_secret_key

# OpenRouter (AI features — optional)
OPENROUTER_API_KEY=sk-or-v1-...
```

> See [⚙️ Environment Variables](#️-environment-variables) for full details on obtaining each key.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you're live.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Landing     │  │  Main App    │  │  Public      │  │
│  │  (/)         │  │  (/docs/*)   │  │  (/preview)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                           │                             │
│              ┌────────────┼────────────┐                │
│              ▼            ▼            ▼                │
│         BlockNote     Whiteboard    RightSidebar        │
│         Editor        Canvas        Planner             │
└──────────────────────────┬──────────────────────────────┘
                           │ Convex React SDK
┌──────────────────────────▼──────────────────────────────┐
│                    Convex Backend                        │
│                                                         │
│  documents   userSettings   whiteboards   actionItems   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Convex Actions (AI)                 │   │
│  │         generateText · suggestAction             │   │
│  └──────────────────┬───────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────┘
                      │ fetch
              ┌───────▼────────┐
              │   OpenRouter   │
              │  (nvidia/      │
              │  nemotron)     │
              └────────────────┘
```

### Data Flow

1. **Auth** — Clerk issues a JWT; Convex validates it via `auth.config.js`
2. **Documents** — stored in Convex, queried reactively via `useQuery`
3. **File Uploads** — cover images go through EdgeStore (`/api/edgestore`)
4. **AI** — Convex Actions call OpenRouter server-side (API key never exposed to client)
5. **Whiteboard** — canvas objects serialized and stored per-document in Convex

---

## ⚙️ Environment Variables

| Variable | Where to get it | Required |
|----------|----------------|----------|
| `CONVEX_DEPLOYMENT` | Auto-set by `npx convex dev` | ✅ |
| `NEXT_PUBLIC_CONVEX_URL` | Convex dashboard → project settings | ✅ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys | ✅ |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys | ✅ |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk dashboard → JWT Templates → Issuer | ✅ |
| `EDGE_STORE_ACCESS_KEY` | EdgeStore dashboard → Access Keys | ✅ |
| `EDGE_STORE_SECRET_KEY` | EdgeStore dashboard → Access Keys | ✅ |
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) | ⚡ AI only |

### Clerk Setup Notes

1. Create a new Clerk application
2. Go to **JWT Templates** → create a template named `convex`
3. Copy the **Issuer** URL → set as `CLERK_JWT_ISSUER_DOMAIN`
4. In your Convex dashboard, add the same domain under **Auth Providers**

---

## 🤖 AI Features

AI actions are available on every block in the editor via the **✦ sparkle button** in the side menu.

### Available Actions

| Action | What it does |
|--------|-------------|
| ✨ Improve Writing | Rewrites for clarity, grammar, and tone |
| 📄 Summarize | Condenses content into a brief summary |
| 📋 Extract Action Items | Pulls tasks and adds them to your planner |
| 🤖 Explain Code | Plain-English explanation of any code block |
| ↕️ Optimize Code | Performance and readability suggestions |
| 🔢 Calculate Totals | Finds numbers and computes sums |
| 🗂 Categorize Items | Groups list items into logical categories |
| 📊 Analyze Table *(tables only)* | Insights and trends from table data |
| 📝 Summarize Table *(tables only)* | Converts table to written paragraph |

### How It Works

```
User hovers block → clicks ✦ → selects action
        ↓
Block text exported to Markdown (BlockNote)
        ↓
Convex Action called (server-side)
        ↓
OpenRouter API → nvidia/nemotron-3-super-120b
        ↓
Response parsed → inserted as new blocks after current block
```

> **Note:** If `OPENROUTER_API_KEY` is not set, AI actions will gracefully return empty results without crashing.

---

## 🎨 Whiteboard

Each document has a dedicated **Whiteboard tab** — an infinite canvas for sketching, diagramming, and visual thinking.

### Tools

| Key | Tool |
|-----|------|
| `V` | Pan |
| `B` | Pen |
| `E` | Eraser |
| `R` | Rectangle |
| `O` | Ellipse |
| `F` | Fit content to view |
| `Ctrl + +` | Zoom in |
| `Ctrl + -` | Zoom out |
| `Ctrl + 0` | Reset zoom |
| `Space` (hold) | Temporary pan |

### Navigation

- **Zoom** — `Ctrl/Cmd + Scroll`
- **Pan** — Middle mouse drag, `Alt + drag`, or `Space + drag`
- **Scroll** — pans the viewport (no modifier needed)

### Persistence

Whiteboard data is stored per-document in the `whiteboards` Convex table. Objects are saved in world coordinates, making the canvas effectively infinite. Erase and clear operations use optimistic updates with rollback on failure.

---

## 📦 Tech Stack

<table>
<tr><th>Layer</th><th>Technology</th><th>Purpose</th></tr>
<tr><td>Framework</td><td>Next.js 16 (App Router)</td><td>SSR, routing, API routes</td></tr>
<tr><td>Language</td><td>TypeScript 5</td><td>Type safety throughout</td></tr>
<tr><td>Backend</td><td>Convex</td><td>Realtime DB, mutations, actions</td></tr>
<tr><td>Auth</td><td>Clerk</td><td>Authentication & user management</td></tr>
<tr><td>Editor</td><td>BlockNote 0.47</td><td>Block-based rich text editor</td></tr>
<tr><td>Styling</td><td>Tailwind CSS 4</td><td>Utility-first styling</td></tr>
<tr><td>UI Components</td><td>shadcn/ui + Radix UI</td><td>Accessible component primitives</td></tr>
<tr><td>File Storage</td><td>EdgeStore</td><td>Cover image uploads</td></tr>
<tr><td>AI</td><td>OpenRouter (nvidia/nemotron)</td><td>Text generation & analysis</td></tr>
<tr><td>Drag & Drop</td><td>dnd-kit</td><td>Document reordering</td></tr>
<tr><td>State</td><td>Zustand</td><td>Modal & UI state</td></tr>
<tr><td>Animations</td><td>tw-animate-css</td><td>Transition utilities</td></tr>
<tr><td>Icons</td><td>Lucide React</td><td>Icon system</td></tr>
<tr><td>Fonts</td><td>Inter, Lora, JetBrains Mono</td><td>Editor font options</td></tr>
</table>

---

## 🗂 Project Structure

```
novaris/
├── app/
│   ├── (landing)/              # Public landing page
│   │   ├── _components/        # Heading, Navbar, Heroes, Footer, Logo
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── (main)/                 # Authenticated workspace
│   │   ├── (routes)/
│   │   │   └── documents/
│   │   │       ├── page.tsx            # Empty state
│   │   │       └── [documentId]/
│   │   │           └── page.tsx        # Document editor + whiteboard
│   │   ├── _components/        # Navigation, Navbar, Sidebar, etc.
│   │   └── layout.tsx
│   ├── (public)/               # Public document preview
│   ├── api/edgestore/          # EdgeStore API route
│   ├── globals.css
│   └── layout.tsx              # Root layout with all providers
│
├── components/
│   ├── ai/                     # AiSideMenuButton
│   ├── modals/                 # Confirm, CoverImage, Settings modals
│   ├── providers/              # Convex, Modal, Theme, Toaster providers
│   ├── templates/              # TemplateGallery
│   ├── ui/                     # shadcn/ui components
│   ├── whiteboard/             # Whiteboard canvas component
│   ├── editor.tsx              # BlockNote editor wrapper
│   ├── toolbar.tsx             # Document title + icon toolbar
│   ├── cover.tsx               # Cover image component
│   ├── search-command.tsx      # Ctrl+K search palette
│   └── table-of-contents.tsx  # Scroll-aware TOC
│
├── convex/
│   ├── schema.ts               # Database schema
│   ├── documents.ts            # Document CRUD + favorites + archive
│   ├── ai.ts                   # AI actions (generateText, suggestAction)
│   ├── actionItems.ts          # Task management
│   ├── whiteboard.ts           # Whiteboard persistence
│   ├── userSettings.ts         # Font & category preferences
│   └── auth.config.js          # Clerk JWT config
│
├── hooks/                      # useSearch, useSettings, useCoverImage, etc.
├── lib/                        # utils, edgestore client, font map
├── public/                     # SVG logos and illustrations
└── docs/                       # UI redesign & whiteboard guides
```

---

## 🗃 Database Schema

```typescript
// Documents — the core entity
documents: {
  title: string
  userId: string
  isArchived: boolean
  parentDocument?: Id<"documents">   // enables nesting
  content?: string                   // BlockNote JSON
  coverImage?: string
  icon?: string                      // emoji
  isPublished: boolean
  order?: number                     // drag-and-drop position
  isFavorite?: boolean
  editorFont?: string
}

// Per-user preferences
userSettings: {
  userId: string
  editorFont?: string
  categories?: string[]              // custom task categories
}

// Whiteboard canvas data per document
whiteboards: {
  documentId: Id<"documents">
  data: any                          // array of stroke/shape objects
  updatedAt: number
}

// Tasks — global or document-linked
actionItems: {
  documentId?: Id<"documents">
  userId?: string
  title: string
  description?: string
  category?: string
  isCompleted: boolean
  createdAt: number
}
```

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
# 1. Build locally to verify
npm run build

# 2. Push to GitHub, then import in Vercel
# 3. Add all environment variables in Vercel project settings
# 4. Deploy
```

### Convex Production

```bash
# Deploy Convex backend to production
npx convex deploy
```

> Make sure to update `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` to your production values.

### Pre-deployment Checklist

- [ ] `npm run lint` passes (TypeScript check)
- [ ] `npm run build` succeeds with no errors
- [ ] All environment variables set in hosting platform
- [ ] Clerk JWT issuer domain matches Convex auth config
- [ ] EdgeStore keys are production keys
- [ ] `OPENROUTER_API_KEY` set if AI features are needed
- [ ] Smoke test: auth flow, document create/edit, whiteboard, AI actions

---

## 🧑‍💻 Development Scripts

```bash
npm run dev      # Start Next.js dev server (with Turbopack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # TypeScript type check (tsc --noEmit)
npx convex dev   # Start Convex dev backend (run alongside npm run dev)
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch — `git checkout -b feat/your-feature`
3. Commit your changes — `git commit -m 'feat: add your feature'`
4. Push to the branch — `git push origin feat/your-feature`
5. Open a Pull Request

Please make sure `npm run lint` and `npm run build` pass before submitting.

---

## 📄 License

All rights reserved
Copyright (c) 2026 Aryan, Avaris Labs (https://www.avarislabs.in/)

---

<div align="center">

Built with ❤️ using Next.js, Convex, and BlockNote

<br />

<img src="public/logo.svg" width="32" alt="Novaris" />

**Novaris** — Your Ideas, Documents & Plans. All in one place.

</div>
