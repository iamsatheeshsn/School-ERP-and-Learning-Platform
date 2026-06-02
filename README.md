# ScholarOS

AI-powered School ERP and Learning Platform — a modern full-stack web application for admins, teachers, parents, and students.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Actions, TypeScript strict)
- **UI:** Tailwind CSS v4, shadcn/ui, Framer Motion
- **Database:** Google Cloud Firestore (Firebase Admin SDK on server)
- **Auth:** Firebase Authentication (email/password, session cookies, role claims)
- **Storage:** Firebase Cloud Storage
- **AI:** Google Gemini (`@google/generative-ai`)
- **Live updates:** SSE (`/api/messages/stream`) for instant message delivery
- **Email:** Resend
- **Payments:** Razorpay (stub interface)
- **Charts:** Recharts
- **PDF:** @react-pdf/renderer

## Prerequisites

- Node.js 20+
- npm
- A Firebase project ([Firebase Console](https://console.firebase.google.com))
- API keys (optional for local demo): Gemini, Resend, Razorpay

> **Note:** ScholarOS runs as a Node.js app (`npm run dev`). It does not run through Apache/XAMPP directly.

## Firebase project setup

1. Create a Firebase project (e.g. `scholaros-dev`).
2. Enable **Authentication** → **Get started** → **Sign-in method** → turn on **Email/Password** → Save.
3. Create a **Firestore** database (test mode is fine for initial seed).
4. Enable **Cloud Storage** (default bucket).
5. Register a **Web app** and copy the client config values.
6. Generate a **service account** private key (Project settings → Service accounts).

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

Fill in Firebase client and admin credentials in `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_*` | Web app config from Firebase Console |
| `FIREBASE_ADMIN_PROJECT_ID` | Service account project ID |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account client email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service account private key (escape newlines as `\n`) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Optional — default `gemini-2.0-flash` |
| `RESEND_API_KEY` | Email delivery (optional) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payment stub (optional) |

Optional: use the [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite) for offline dev by setting `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, and `FIREBASE_STORAGE_EMULATOR_HOST` in `.env.local`.

### 3. Deploy Firestore rules (optional but recommended)

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 4. Seed demo data

```bash
npm run db:seed
```

This creates Firebase Auth users and Firestore documents for Greenwood International School.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Netlify

Login on Netlify requires Firebase env vars **before** the site is built. `NEXT_PUBLIC_*` values are baked into the client JavaScript at build time — changing them later without redeploying will not fix login.

### 1. Netlify environment variables

In **Site settings → Environment variables**, add every value from `.env.example`:

| Variable | Scope |
|----------|--------|
| `NEXT_PUBLIC_FIREBASE_*` (all 6) | Build + runtime |
| `FIREBASE_ADMIN_PROJECT_ID` | Runtime |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Runtime |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Runtime — paste the key with `\n` for line breaks, wrapped in quotes |
| `NEXT_PUBLIC_APP_URL` | Build — set to `https://your-site.netlify.app` |

Optional: `GEMINI_API_KEY`, `RESEND_*`, `RAZORPAY_*` for full feature parity.

After adding or changing variables, trigger **Deploy → Trigger deploy → Clear cache and deploy site**.

### 2. Firebase authorized domains

Firebase Console → **Authentication** → **Settings** → **Authorized domains** → add:

- `school-erp-and-learning-platform.netlify.app` (or your Netlify subdomain)
- `localhost` (for local dev)

### 3. Seed production data

Run the seed against the same Firebase project used in Netlify env vars:

```bash
npm run db:seed
```

Use a local `.env.local` with the production Firebase credentials, or set the same variables in your shell before seeding.

### 4. Verify deployment

Open `https://your-site.netlify.app/api/health` — both `firebaseClient.configured` and `firebaseAdmin.configured` should be `true`.

Then sign in with a seeded demo account (e.g. `admin@scholaros.demo` / `password123`).

### PWA (parents)

ScholarOS includes a web app manifest (`/manifest.json`). On mobile, open the parent dashboard in Chrome/Safari and use **Add to Home Screen** for an app-like experience. Push notifications require Firebase Cloud Messaging setup (not included in this MVP).

### Multi-school SaaS

The current deployment is **single-tenant** (one school per Firebase project). Multi-school isolation (`schoolId` on all records, subdomain routing, billing) is planned as a later phase.

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
- Teachers create assignments with file attachments (Firebase Storage)
- Students submit homework; Gemini auto-generates formative feedback
- **AI Tutor:** Socratic chat scoped to each assignment (streaming)
- **AI Worksheet Generator:** Teachers draft assignments from topic + difficulty

### Parent Communication
- Threaded teacher ↔ parent messaging (SSE realtime + Firestore storage)
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

### Exams & Gradebook
- Admin schedules exams by class, subject, and term
- Teachers enter marks in bulk; admin publishes results
- Class ranks, grade letters, and sync to the gradebook
- Student and parent portals for published results

### Library
- Book catalog with copies and availability
- Issue/return workflow with overdue fines (₹10/day)
- Student and parent loan history

### Transport
- Bus routes with stops and pickup times
- Student route assignments
- Parent and student route views

### Staff HR
- Teachers submit leave requests
- Admin approve/reject workflow with notifications

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
│   ├── ai/               # Gemini client, prompts, services
│   ├── auth/             # Firebase session helpers
│   ├── db/               # Firestore data layer
│   ├── firebase/         # Firebase client + admin init
│   ├── rbac/             # Permissions + guards
│   ├── payments/         # Razorpay provider
│   ├── realtime/         # SSE helpers
│   └── pdf/              # Report card PDF generation
scripts/
└── seed.ts               # Demo data seed
firestore.rules
storage.rules
firebase.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run db:seed` | Seed Firestore + Firebase Auth demo data |

## RBAC

Roles: **Admin**, **Teacher**, **Parent**, **Student**

Enforced at:
1. Middleware (route prefixes via Firebase session claims)
2. Server Actions (`requireRole`, `requirePermission`)
3. DB queries (scoped by role)

## License

Private — Greenwood International School demo project.
