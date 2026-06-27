# ApplyPilot AI

ApplyPilot AI is an agentic job application assistant portfolio project. It helps job seekers compare a resume against a target job, review skill and keyword gaps, approve stronger resume bullets, draft a cover letter opening, and track active applications.

## Current Phase

- Next.js app foundation
- Responsive dashboard
- Resume and job description input flow
- Gemini-ready analysis API route
- Demo fallback when no API key is configured
- Agent command center with plan, tool outputs, and approval gates
- Resume bullet approval workflow before tracker save
- Application tracker board
- Supabase auth and application persistence when configured
- Smoke test for homepage, API error paths, and analysis result shape

## Planned Phases

1. Save full analysis history per user.
2. Add resume file parsing and export actions.
3. Add screenshots, architecture notes, and deployment notes.
4. Record a short demo video for the portfolio case study.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Run the smoke test against a running server:

```bash
npm run test:smoke
```

## AI Setup

The app runs without an API key by returning demo analysis data from `/api/analyze`.

To enable live Gemini analysis, create `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Then restart the dev server.

## Supabase Setup

The app runs in local tracker mode until Supabase is configured.

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run the SQL in `supabase/schema.sql`.
4. Add these values to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_or_publishable_key
```

5. Restart the Next.js server.

Supabase may label this as a publishable key in the dashboard. Only use the anon/publishable key in the browser. Do not add a Supabase service-role key to this app.
