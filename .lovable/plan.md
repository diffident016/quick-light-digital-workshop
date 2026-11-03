# Growth Health Check — Build Plan

A light, fast assessment app: 10 Yes/No questions, a score out of 10, and a printable report that lists only the "No" weaknesses. Built exactly to the uploaded spec (questions, scoring, wording unchanged).

Note on stack: this project runs on React (TanStack Start) with Lovable Cloud as the database. Next.js isn't available here, but the result is the same: a React front end with a Postgres database, no extra setup.

## Pages

1. **Landing (/)** — title, one-line intro (structure, management, financial readiness, risk protection), "Start Assessment" button.
2. **Assessment (/assessment)** — one question at a time, large Yes / No buttons, "Question 3 of 10" + progress bar, Back / Next, answers kept while moving around. "Generate My Report" enabled only when all 10 are answered. Clear loading and error states.
3. **Report (/report/$id)** — "Growth Health Check Report", date, big score with a simple ring indicator, Yes/No totals, weakness cards (question number, title, description) for "No" answers only. Perfect-score message when 10/10. "Print / Save as PDF" button; navigation and buttons hidden when printing. Each report has a unique shareable link.

## Design

Clean consulting style: warm neutral background, deep navy/ink text, one restrained accent, serif headings with a clean sans body, subtle borders and shadows, no heavy animation. Mobile-friendly.

## Data (Lovable Cloud)

- `questions` (id 1–10, question, weakness_title, weakness_description) — seeded with the 10 provided items.
- `assessments` (id, score, total_yes, total_no, created_at) — score checked between 0 and 10.
- `assessment_answers` (id, assessment_id, question_id, answer true/false, created_at) — unique per assessment + question.
- No login. Visitors cannot read or write tables directly; everything goes through the server.

## Server logic

- **Submit**: validates exactly 10 answers, each question 1–10 once, each answer strictly yes/no. Computes score = 10 − No count on the server, saves the assessment and all answers in one database transaction (a single database function), returns the id.
- **Get report**: loads the assessment by id, joins "No" answers to the trusted weakness text from `questions`. Unknown id shows a friendly "report not found".
- Scoring and weakness-building live in a small shared module, independent of the UI.

## Tests

Automated tests for scoring and weakness generation covering the spec scenarios: 10/0 → 10/10 & 0 weaknesses, 8/2 → 8/10 & 2, 5/5 → 5/10 & 5, 2/8 → 2/10 & 8, 0/10 → 0/10 & 10; incomplete (9 answers), duplicate, or invalid answers rejected; each No maps to the right weakness and no Yes ever appears.

## Out of scope

Login, payments, AI, admin dashboard, extra questions — per the spec.

## Technical details

- Enable Lovable Cloud; one migration creates the 3 tables (with grants + RLS, no public policies), seeds questions, and adds a `submit_assessment(jsonb)` SQL function for the atomic insert.
- `src/lib/assessment.ts`: question list, Zod schema, `scoreAnswers()`, `buildWeaknesses()`.
- `src/lib/assessment.functions.ts`: `submitAssessment` and `getReport` server functions (admin client loaded inside handlers, after Zod validation).
- Routes: `index.tsx`, `assessment.tsx`, `report.$id.tsx` with their own page titles/descriptions; `@media print` rules in styles.
- Vitest tests in `src/test/assessment.test.ts`.
