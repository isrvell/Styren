# Styren

Enterprise project management for modern teams. Start solo, scale to thousands.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js v5 (credentials, GitHub, Google)
- **API**: tRPC v11 (type-safe end-to-end)
- **UI**: Tailwind CSS v4 + Radix UI primitives + Lucide icons
- **Drag & Drop**: @hello-pangea/dnd
- **Billing**: Stripe (subscriptions + usage metering)

## Features

- **Multi-tenant organizations** with personal accounts
- **Workspace → Space → Project → Task** hierarchy
- **Kanban boards** with drag-and-drop
- **Scrum sprints** with planning and velocity tracking
- **Custom status pipelines** per project
- **Subtasks, labels, assignees, comments**
- **Time tracking** with billable/non-billable
- **Saved views** (personal and shared)
- **RBAC permissions** (6 system roles + custom roles)
- **Usage-based billing** with Stripe integration
- **GitHub integration** (PR/commit linking, auto status transitions)
- **Audit logging** for enterprise compliance
- **Dark mode** support

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your database URL and auth secrets

# Push database schema
npm run db:push

# Seed system roles
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | App URL (http://localhost:3000 for dev) |
| `NEXTAUTH_SECRET` | Yes | Random secret for session encryption |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth app client secret |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `STRIPE_SECRET_KEY` | No | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (app)/              # Authenticated app routes
│   │   ├── (dashboard)/    # Dashboard
│   │   └── org/[orgSlug]/  # Organization pages
│   │       ├── workspace/  # Workspace → Space → Project
│   │       ├── members/    # Member management
│   │       ├── settings/   # Org settings
│   │       └── billing/    # Billing & invoices
│   ├── auth/               # Login & registration
│   └── api/                # API routes (auth, tRPC, webhooks)
├── components/
│   ├── ui/                 # 24 shadcn-style primitives
│   ├── layout/             # App shell, sidebar, header
│   └── features/           # Feature-specific components
│       ├── boards/         # Kanban board + task cards
│       ├── tasks/          # Task detail, list, creation, time tracking
│       ├── projects/       # Project header + view switcher
│       ├── dashboard/      # Stats cards, activity feed
│       ├── settings/       # Members table
│       └── billing/        # Billing overview
├── server/
│   ├── auth/               # NextAuth configuration
│   ├── db/                 # Prisma client + seed script
│   ├── trpc/               # tRPC context + procedures
│   └── routers/            # 14 tRPC routers (auth, org, task, etc.)
├── lib/
│   ├── utils.ts            # Shared utilities (cn, slugify, formatDate)
│   ├── constants.ts        # Plans, statuses, priorities
│   ├── validators.ts       # Zod schemas
│   ├── trpc.ts             # tRPC React client
│   └── hooks/              # React hooks (useOrg, useHasPermission)
└── types/                  # TypeScript declarations
```

## Design System

**Clean Minimal** — Indigo accent, Inter + JetBrains Mono, 4px border-radius, 1px borders, lots of whitespace.

| Token | Light | Dark |
|---|---|---|
| Primary | `#6366F1` | `#818CF8` |
| Background | `#FAFAFA` | `#0F1117` |
| Surface | `#FFFFFF` | `#1A1D27` |
| Border | `#E5E7EB` | `#2A2D3A` |
| Success | `#22C55E` | `#22C55E` |
| Warning | `#EAB308` | `#EAB308` |
| Destructive | `#EF4444` | `#EF4444` |

## Database

The Prisma schema defines 25+ models. Key entities:

- `User`, `Organization`, `OrganizationMembership`
- `Workspace`, `Space`, `Project`, `ProjectMember`
- `Task`, `TaskAssignment`, `TaskLabel`, `TaskLink`
- `StatusDefinition`, `Sprint`, `Label`, `Comment`
- `TimeEntry`, `SavedView`, `Attachment`
- `Role` (RBAC), `AuditLogEntry`
- `BillingAccount`, `UsageRecord`, `Invoice`
- `GitHubInstallation`, `GitHubRepoLink`, `GitHubTaskLink`

## API

14 tRPC routers providing full CRUD + business logic:

- `auth` — register, getCurrentUser
- `organization` — CRUD, invite/remove members, role management
- `workspace` / `space` / `project` — hierarchy CRUD
- `task` — CRUD, bulk update, assign, label, subtasks, filtered list
- `status` — custom pipeline management with reordering
- `comment` — threaded comments
- `timeEntry` — time tracking with reports
- `sprint` — Scrum sprint lifecycle
- `label` — workspace/project-scoped labels
- `savedView` — personal and shared views
- `billing` — plans, usage, invoices
- `github` — repo linking, task linking

## License

Private.
