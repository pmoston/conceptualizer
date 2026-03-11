# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Conceptualizer** is a local-hosted portal for managing consulting concepts at Dataciders GmbH. It enables importing customers/contacts from HubSpot, managing projects with multilingual concept documents and supporting materials, and invoking AI agents to perform tasks on project content (reading materials, drafting, fact-checking, humanizing, corporate design review, etc.).

- All code, UI, and comments must be in **English**
- Project content (concepts, documents) is produced in the **project language** (German or English)
- Hosted locally in Docker; source maintained in this GitHub repo

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Database | PostgreSQL |
| File storage | Local filesystem (Docker volume) |
| AI agents | Claude API via Vercel AI SDK |
| Auth | Single-user, simple password protection |
| Deployment | Docker Compose (local) |

## Commands

```bash
# Development
npm run dev          # Start dev server at localhost:3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit

# Database
npm run db:migrate   # Run Prisma migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed initial data

# Docker
docker compose up -d         # Start all services (app + postgres)
docker compose down          # Stop services
docker compose logs -f app   # Follow app logs
```

## Architecture

```
src/
  app/                  # Next.js App Router pages and API routes
    (auth)/             # Login page (outside main layout)
    (portal)/           # Main portal layout with nav
      customers/        # HubSpot customer/contact management
      projects/         # Project CRUD and detail views
      projects/[id]/
        agents/         # Agent invocation UI for a project
    api/
      auth/             # Auth endpoints
      customers/        # HubSpot sync endpoints
      projects/         # Project CRUD endpoints
      agents/           # Agent execution endpoints
  components/           # Shared UI components (Dataciders-branded)
  lib/
    db.ts               # Prisma client singleton
    hubspot.ts          # HubSpot API client
    claude.ts           # Anthropic/Vercel AI SDK client
    auth.ts             # Session/password auth helpers
  agents/               # Individual agent definitions (draft, fact-check, etc.)
  types/                # Shared TypeScript types
prisma/
  schema.prisma         # DB schema
public/
  brand/                # Dataciders logos and fonts (copied from CI assets)
```

### Key Data Models

- **Customer** — synced from HubSpot, has many Contacts
- **Project** — belongs to a Customer, has a language (de/en), stores concept metadata
- **Document** — file attached to a Project (supporting materials, drafts, final output)
- **AgentRun** — record of an agent invocation on a project, including inputs, outputs, status

### Agent Pattern

Each agent in `src/agents/` exports a function that receives a project context and returns a streamed response via the Vercel AI SDK `streamText`. Agents are invoked through `POST /api/agents/[agentName]`.

## Corporate Identity

**Primary colors:**
- Dark navy: `#1c1e3b`
- Lime green: `#b3cc26`

**Typography:** Barlow (primary), Calibri (fallback)

**Logo assets** are located at:
`/Users/Philip.Moston/Library/CloudStorage/OneDrive-DatacidersGmbH/DC-Mediathek - Corporate Identity/`

Copy relevant SVG/PNG logos into `public/brand/` during project setup. Use `dataciders_primär_dunkel.svg` on light backgrounds, `dataciders_primär_weiß.svg` on dark backgrounds.

## HubSpot Integration

Import customers (companies) and contacts from HubSpot via the HubSpot API. Sync is triggered manually from the Customers section. Store HubSpot IDs alongside local records to avoid duplicates on re-sync.

## Environment Variables

```env
DATABASE_URL=postgresql://...
AUTH_PASSWORD=...          # Single password for portal access
AUTH_SECRET=...            # JWT/session secret
ANTHROPIC_API_KEY=...
HUBSPOT_API_KEY=...
```

## Git

- Remote: `git@github-pmoston:pmoston/conceptualizer.git`
- Always use SSH host alias `github-pmoston` for git operations
- Local identity: `user.name=pmoston`
