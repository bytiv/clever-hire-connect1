# Clever Hire Connect — Frontend

A full-stack intelligent hiring platform built with **React + TypeScript + Vite**, backed by **Supabase** (auth, database, storage) and an external **ATS Scoring API**.

---

## Features

| Role | Capabilities |
|------|-------------|
| **Job Seeker** | Browse & search jobs, upload resume, apply with ATS scoring, save jobs for later, manage profile |
| **HR / Recruiter** | Post jobs, review applications, calculate ATS scores, accept/reject candidates, download resumes |

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **State Management**: TanStack React Query
- **Auth & Database**: Supabase (Auth, Postgres, Storage)
- **ATS Scoring**: External Python/Flask API (see `atsscore` repo)

---

## Project Structure

```
src/
├── components/          # UI components
│   ├── ui/              # shadcn/ui primitives
│   ├── ApplicationsViewer.tsx   # HR: view & manage applications
│   ├── JobBrowser.tsx           # Browse & apply to jobs
│   ├── JobPostForm.tsx          # HR: create job postings
│   ├── ProfileEditor.tsx        # Edit user profile
│   ├── ProtectedRoute.tsx       # Auth guard wrapper
│   ├── ResumeUploader.tsx       # Upload/manage resume
│   ├── SavedJobs.tsx            # View saved jobs
│   └── ThemeSettings.tsx        # Dark/light mode
├── contexts/
│   └── AuthContext.tsx          # Supabase auth provider
├── hooks/
│   ├── useApplications.tsx      # Apply to jobs + ATS scoring
│   ├── useHRApplications.ts     # HR application management
│   ├── useJobs.tsx              # CRUD jobs
│   ├── useProfile.tsx           # Profile management
│   ├── useResume.tsx            # Resume upload/download
│   ├── useSavedJobs.tsx         # Save/unsave jobs
│   └── useTheme.tsx             # Theme management
├── integrations/supabase/
│   ├── client.ts                # Supabase client (reads env vars)
│   └── types.ts                 # Database types
├── lib/
│   └── config.ts                # Centralized config (ATS API URL)
├── pages/
│   ├── Dashboard.tsx            # Main dashboard (role-based)
│   ├── Index.tsx                # Landing page
│   ├── Login.tsx                # Sign in
│   ├── Register.tsx             # Sign up (jobseeker or HR)
│   └── NotFound.tsx             # 404 page
└── App.tsx                      # Routes & providers
```

---

## Setup

### 1. Clone & install

```bash
git clone <your-repo-url>
cd clever-hire-connect
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ATS_API_URL=https://your-atsscore-api.up.railway.app
```

> **Where to find these:**
> - **Supabase URL & Anon Key**: Supabase Dashboard → Settings → API
> - **ATS API URL**: Your Railway deployment URL for the `atsscore` repo

### 3. Set up the database

Go to your Supabase Dashboard → **SQL Editor** and run the entire contents of:

```
supabase/schema.sql
```

This creates all tables, views, RLS policies, triggers, storage buckets, and indexes in one shot.

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:8080

---

## Deployment

### Vercel

```bash
npm run build
```

`vercel.json` is included for SPA routing. Set environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ATS_API_URL`

### Netlify

The `public/_redirects` file is included for SPA routing. Set the same env vars in Netlify dashboard.

### GitHub Actions / CI

Add the three `VITE_*` variables as repository secrets, then reference them in your build step.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `VITE_ATS_API_URL` | Yes | URL of the ATS scoring API |

> `VITE_SUPABASE_ANON_KEY` is the **public anon key**, safe for client-side use. Never expose your service role key.

---

## How It Works

### Authentication

1. User signs up at `/register` selecting **Job Seeker** or **HR/Recruiter**
2. Supabase creates the auth user; a DB trigger auto-creates the `profiles` row
3. User signs in at `/login` → redirected to `/dashboard`
4. Dashboard is role-based: seekers see job browsing/applications, HR sees posting/review

### ATS Scoring

1. Job seeker uploads a resume (PDF) → stored in Supabase Storage
2. Seeker clicks "Apply" on a job listing
3. The frontend downloads the resume from Storage, sends it + job description to the ATS API
4. API returns `ats_score`, `predicted_category`, `confidence`
5. Results are saved to the `applications` row and displayed in the UI

### Key Bugs Fixed in This Version

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| 404 on page refresh | No SPA fallback; Dashboard not using ProtectedRoute | Added `_redirects` + `vercel.json`; wrapped Dashboard in `<ProtectedRoute>` |
| ATS score never calculated | `JobBrowser` called `applyToJob(id)` without `jobDescription` | Now passes `applyToJob(id, description)` |
| ATS API couldn't read file | `FormData.append(blob)` had no filename — Flask ignores it | Added filename: `append('resume_file', blob, 'resume.pdf')` |
| Hardcoded secrets | Supabase URL/key and API URL in source code | Moved to `VITE_*` env vars |
| Login page duplication | Two identical forms for jobseeker/HR tabs | Merged into single form |
| DB schema mismatch | Types missing `cover_letter`, `ats_score`, etc. | Updated types + provided complete `schema.sql` |
# clever-hire-connect
