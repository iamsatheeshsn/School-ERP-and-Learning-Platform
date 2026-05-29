# ScholarOS

AI-powered School ERP and Learning Platform — a modern full-stack web application for admins, teachers, parents, and students.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Actions, TypeScript strict)
- **UI:** Tailwind CSS v4, shadcn/ui, Framer Motion
- **Database:** Prisma ORM + Prisma Postgres (local dev via `prisma dev`)
- **Auth:** NextAuth.js v5 (credentials, role-based access)
- **AI:** Google Gemini (`@google/generative-ai`)
- **Files:** UploadThing
- **Live updates:** SSE (`/api/messages/stream`) for instant message delivery
- **Email:** Resend
- **Payments:** Razorpay (stub interface)
- **Charts:** Recharts
- **PDF:** @react-pdf/renderer

## Prerequisites

- Node.js 20+
- npm
- API keys (optional for local demo): Gemini, Resend, UploadThing, Razorpay

> **Note:** ScholarOS runs as a Node.js app (`npm run dev`). It does not run through Apache/XAMPP directly.

## Setup

### 1. Clone and install

```bash
cd school-erp-platform
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Prisma CLI reads **`.env`**; Next.js reads **`.env.local`**. Keep `DATABASE_URL` and `DIRECT_URL` in sync in both files.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Prisma Postgres connection (from `npm run db:dev` output) |
| `DIRECT_URL` | Same direct URL (used for migrations) |
| `NEXTAUTH_SECRET` | Random secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | `http://localhost:3000` |
| `GEMINI_API_KEY` | Google Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)) |
| `GEMINI_MODEL` | Optional — default `gemini-2.0-flash` |
| `RESEND_API_KEY` | Email delivery (optional) |
| `UPLOADTHING_TOKEN` | UploadThing V7 token ([uploadthing.com/dashboard](https://uploadthing.com/dashboard)) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payment stub (optional) |

### 3. Start Prisma Postgres & sync schema

**Terminal 1** — start the local database (keep running):

```bash
npm run db:dev
```

Copy the `DATABASE_URL` from the output into `.env` and `.env.local` if ports differ from the defaults in `.env.example`.

**Terminal 2** — push schema and seed:

```bash
npx prisma db push
npm run db:seed
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Credentials

Password for all accounts: **`password123`**

| Role | Email |
|------|-------|
| Admin | `admin@scholaros.demo` |
| Teacher | `teacher1@scholaros.demo` |
| Parent | `parent1@scholaros.demo` |
| Student | `student1@scholaros.demo` |

## Features

### Homework + AI
- Teachers create assignments with file attachments
- Students submit homework; Gemini auto-generates formative feedback
- **AI Tutor:** Socratic chat scoped to each assignment (streaming)
- **AI Worksheet Generator:** Teachers draft assignments from topic + difficulty

### Parent Communication
- Threaded teacher ↔ parent messaging (SSE realtime + Prisma storage)
- AI draft assist for weekly updates
- School/class broadcast announcements (email + in-app)

### Attendance
- Bulk keyboard-friendly attendance grid (P/A/L/E)
- Calendar heatmaps and class summaries
- Auto-alert parents on absence (email + notification)
- Threshold flags for students below 75% attendance

### AI Report Cards
- Aggregate grades, attendance, homework completion
- Gemini generates encouraging narratives (teacher edits before publish)
- Branded PDF report cards via `/api/report-cards/[id]/pdf`

### Fee Tracking
- Fee structures per class, auto-generated invoices
- Parent portal with pay button (Razorpay stub)
- Admin collection dashboard and overdue reminders

### Student Analytics
- Per-student grade trends, attendance, homework completion, subject radar
- Class cohort analytics with at-risk flagging
- AI-generated cohort insights

## Project Structure

```
src/
├── app/                  # App Router pages + API routes
├── actions/              # Server Actions (domain logic)
├── components/
│   ├── ui/               # shadcn components
│   ├── layout/           # Sidebar, header, command palette
│   ├── shared/           # StatCard, DataTable, etc.
│   └── dashboard/        # Role-specific client components
├── lib/
│   ├── ai/               # Claude client, prompts, services
│   ├── auth/             # NextAuth config
│   ├── db/               # Prisma singleton
│   ├── rbac/             # Permissions + guards
│   ├── payments/         # Razorpay provider
│   ├── realtime/         # Polling helpers
│   └── pdf/              # Report card PDF generation
└── hooks/
prisma/
├── schema.prisma
└── seed.ts
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run db:dev` | Start local Prisma Postgres |
| `npm run db:push` | Sync schema to database |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## RBAC

Roles: **Admin**, **Teacher**, **Parent**, **Student**

Enforced at:
1. Middleware (route prefixes)
2. Server Actions (`requireRole`, `requirePermission`)
3. DB queries (scoped by role)

## License

Private — Greenwood International School demo project.
# School-ERP-and-Learning-Platform
