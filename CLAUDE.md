# CLAUDE.md — OncoInfo Codebase Guide

This file provides guidance for AI assistants working in this repository.

---

## Project Overview

**OncoInfo** is a medical/oncology drug information system built as a React Single-Page Application (SPA). It supports multi-hospital deployments, multilingual content, clinical trial integration, and AI-powered drug analysis.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18.3.1 + TypeScript 5.8.3 |
| Build tool | Vite 5.4.19 + SWC |
| UI components | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS 3.4.17 |
| Routing | React Router DOM 6 |
| Server state | TanStack React Query 5 |
| Forms | react-hook-form + Zod validation |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| i18n | i18next (nl, fr, de, en) |
| Testing | Vitest + Testing Library |
| Charts | Recharts |
| PDF export | jsPDF + html2canvas |

---

## Directory Structure

```
/
├── src/
│   ├── components/
│   │   ├── admin/       # Admin dashboard components
│   │   ├── auth/        # Authentication components
│   │   ├── drugs/       # Drug detail and listing components
│   │   ├── home/        # Home page components
│   │   ├── layout/      # Header, Footer, Layout wrappers
│   │   └── ui/          # shadcn/ui component library (do not edit directly)
│   ├── contexts/        # React Context providers (HospitalContext)
│   ├── hooks/           # Custom React hooks (see Hooks section)
│   ├── i18n/
│   │   └── locales/     # Translation files: nl.json, fr.json, de.json, en.json
│   ├── integrations/
│   │   └── supabase/    # Supabase client, generated types
│   ├── pages/           # Top-level route page components
│   ├── test/            # Vitest setup and test files
│   ├── types/           # Shared TypeScript interfaces (drug.ts)
│   ├── App.tsx          # Root component + routing
│   └── main.tsx         # Application entry point
├── supabase/
│   ├── functions/       # 22 Deno-based Edge Functions
│   └── migrations/      # SQL migrations (56 files, Jan–Feb 2026)
├── public/images/       # Static assets
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env                 # Supabase connection (not committed to production)
```

---

## Development Commands

```bash
npm run dev          # Start dev server on port 8080
npm run build        # Production build
npm run build:dev    # Dev-mode build
npm run lint         # ESLint
npm run test         # Run tests (Vitest, single run)
npm run test:watch   # Run tests in watch mode
npm run preview      # Preview production build locally
```

---

## Environment Variables

Defined in `.env` at the project root:

```
VITE_SUPABASE_PROJECT_ID=ynuggqeumqzwwuffrnnv
VITE_SUPABASE_URL=https://ynuggqeumqzwwuffrnnv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<JWT anon key>
```

All `VITE_` prefixed variables are inlined at build time by Vite and safe to expose to the browser.

---

## Routing

Routes are defined in `src/App.tsx`. Current pages:

| Route | Component | Description |
|---|---|---|
| `/` | `Home` | Drug search/listing |
| `/drugs/:id` | `DrugDetail` | Drug detail view |
| `/admin` | `Admin` | Admin dashboard |
| `/admin/users` | User management | |
| `/admin/hospitals` | Hospital management | |
| `/login` | `Login` | Currently bypassed for dev |
| `/manual` | `UserManualPage` | In-app documentation |

---

## Authentication & Authorization

- Supabase Auth handles sessions (JWT stored in localStorage).
- User roles: `admin` and `viewer` stored in the `profiles` table.
- `useAuth` hook exposes `user`, `profile`, `isAdmin`, `signIn`, `signOut`.
- Login is **currently disabled** (`Login` page bypassed in dev) — see recent commits.
- Row-Level Security (RLS) is enforced in Supabase on all sensitive tables.

---

## Key Custom Hooks

| Hook | Purpose |
|---|---|
| `useAuth` | Authentication state and user profile |
| `useDrugs` | Drug list fetching and caching |
| `useFavorites` | User drug favorites |
| `useMostUsed` | Track most-viewed drugs |
| `useSpecialtyOrder` | Specialty display ordering |
| `useUserDrugOrder` | Per-user custom drug ordering |
| `usePatientFolderContent` | Patient folder data (editable) |
| `useTranslatedDrug` | Drug content translation |
| `useTranslatedStrings` | UI string translations |
| `useUserManagement` | Admin user CRUD |
| `useMobile` | Responsive breakpoint detection |
| `useToast` | Sonner toast notifications |

---

## Context Providers

- **`HospitalContext`** (`src/contexts/`) — provides hospital-specific branding, configuration, and feature flags. Wrap any component needing hospital data with this context.

---

## Supabase Edge Functions

Located in `supabase/functions/`. Each function is a Deno TypeScript module. JWT verification is disabled for most functions (configured in `supabase/config.toml`).

| Function | Purpose |
|---|---|
| `manage-users` | User CRUD |
| `login-with-username` | Username-based auth |
| `fetch-pubmed` / `fetch-pubmed-data` | PubMed article retrieval |
| `fetch-trial-results` | Clinical trial data |
| `generate-analysis` | AI-powered analysis |
| `generate-patient-pdf` | Patient info PDF export |
| `generate-drug-patient-info` | Drug-specific patient PDF |
| `generate-favorites-pdf` | Favorites PDF export |
| `search-regimens` | Therapy regimen search |
| `analyze-pdf-drug` / `extract-pdf` | PDF parsing for drug info |
| `scrape-article` | Web scraping for literature |
| `update-trials` / `auto-update-therapies` | Background data sync |
| `fetch-ctgov-data` | ClinicalTrials.gov API |
| `translate-drug-content` | Content translation |
| `lookup-hospital` | Hospital lookup |
| `refresh-trial-results` | Trial result refresh |
| `seed-trial-data` | Development data seeding |

---

## Database Schema (Key Tables)

| Table | Description |
|---|---|
| `profiles` | User profiles; roles: `admin` / `viewer` |
| `drugs` | Oncology drug library |
| `trials` | Clinical trials with full metadata |
| `arms` | Trial arms |
| `endpoints` | Trial endpoints (HR, CI, p-value, survival) |
| `ai_summaries` | AI-generated summaries with versioning |
| `hospitals` | Hospital configurations and branding |
| `regimens` | Therapy regimens |
| `favorites` | Per-user drug favorites |
| `patient_folders` | Patient clinical notes/folders |

Migrations live in `supabase/migrations/` (56 files). Always create a new migration file for schema changes — never edit existing migrations.

---

## Internationalization (i18n)

- Configured via i18next in `src/i18n/`.
- Four locales: **nl** (Dutch), **fr** (French), **de** (German), **en** (English).
- Language persisted in `localStorage`.
- Translation files: `src/i18n/locales/<lang>.json` (~40 KB each).
- Always add keys to all four locale files when adding new UI text.

---

## UI Component Conventions

- Components in `src/components/ui/` are **shadcn/ui components**. Do not edit them directly — re-generate with the shadcn CLI or extend via wrapper components.
- Use `cn()` utility from `@/lib/utils` for conditional Tailwind class merging.
- Icons come from `lucide-react`.
- Use `Sonner` (via `useToast`) for user-facing notifications.
- Dark mode is supported via `next-themes`; use Tailwind `dark:` variants.

---

## TypeScript Conventions

- Path alias `@/` maps to `src/` — use this for all internal imports.
- Strict mode is **off**; `noImplicitAny` is **off**. Nevertheless, prefer explicit types in new code.
- Core domain types are in `src/types/drug.ts` (`Drug`, `DosingInfo`, `SideEffects`, filter interfaces).
- Supabase-generated types are in `src/integrations/supabase/types.ts` — regenerate with `supabase gen types typescript` after schema changes.

---

## Testing

- Framework: **Vitest** with jsdom environment.
- Utilities: `@testing-library/react`, `@testing-library/user-event`.
- Test files live in `src/test/` or co-located as `*.test.tsx`.
- Run all tests: `npm run test`.
- Setup file: `src/test/setup.ts`.

---

## Code Quality

- ESLint config: `eslint.config.js` (flat config, ESLint 9).
- React Hooks lint rules enabled; unused-vars rule disabled.
- Run `npm run lint` before committing.
- No Prettier configured — respect existing formatting style.

---

## Database Migrations

- Files: `supabase/migrations/<timestamp>_<description>.sql`
- **Never edit existing migrations.** Always create a new file.
- Apply locally: `supabase db reset` (resets and re-applies all migrations).
- After schema changes, regenerate types: `supabase gen types typescript --local > src/integrations/supabase/types.ts`

---

## Git Workflow

- Main branch: `master`
- Feature branches use the pattern `claude/<description>-<session-id>`
- Commit messages are imperative, present tense (e.g., "Add drug archiving feature").
- The project integrates with **Lovable IDE** — component changes made in Lovable auto-commit to git.

---

## Known State / Active Development Notes

- **Login is currently bypassed** for development (`Login` page temporarily disabled — see commit `a910cdf`).
- 56 database migrations have been applied from Jan 15 – Feb 18, 2026; the schema is actively evolving.
- `lovable-tagger` is used for component identification in the Lovable IDE — do not remove `data-lovable-id` attributes.

---

## Common Gotchas

1. **Supabase types** go stale after migrations — always regenerate after schema changes.
2. **RLS policies** may block queries unexpectedly; check `supabase/migrations/` for the relevant policy.
3. **Edge Functions** run in Deno, not Node — use Deno-compatible APIs and imports.
4. **Translation keys** must be added to all four locale files or the app will fall back silently.
5. **shadcn/ui components** in `src/components/ui/` are auto-generated — put custom logic in wrapper components, not inside the `ui/` directory.
6. The dev server runs on port **8080**, not the default 5173.
