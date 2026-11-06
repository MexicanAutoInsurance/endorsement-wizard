# Endorsement Wizard (Phase 2)

Staff-assisted Mexican Auto Insurance endorsement intake with **client magic-link fill-out**.

## Live

https://endorsement-wizard.apps.grok.bot

## Run locally

```bash
npm install
env -u DATABASE_URL npm run dev
```

Open http://127.0.0.1:3000 (staff) — client links at `/client/:token`.

Local runs use in-memory PGlite (migrations applied on first query). Published apps use Postgres via `DATABASE_URL`.

## Staff access

Published staff APIs require the `STAFF_ACCESS_CODE` app secret. Enter the same value on the staff unlock screen. Client magic links do **not** need Cursor login or the staff code.

## Phase 2 flow

1. Staff: CRT #, insured name, email (phone optional); optional change types.
2. **Send client fill-out link** → mailto / copy email with `/client/:token`.
3. Client: towed Yes/No + helper, change details, fee + missed-info acknowledgments (no waive).
4. Staff: review submitted answers, edit, before→after summary, confirmation email, FoxPro export.
