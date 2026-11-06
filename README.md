# Endorsement Wizard (Phase 2)

Staff-assisted Mexican Auto Insurance endorsement intake with **client magic-link fill-out**.

## Live

https://endorsement-wizard.apps.grok.bot

## Run locally

```bash
npm install
STAFF_ACCESS_CODE=local-dev env -u DATABASE_URL npm run dev
```

Open http://127.0.0.1:3000 (staff) — unlock with `local-dev`. Client links at `/client/:token`.

Local runs use in-memory PGlite (migrations applied on first query). Published apps use Postgres via `DATABASE_URL`.

## Staff access

Staff APIs **fail closed**: if `STAFF_ACCESS_CODE` is unset, all staff routes deny access. Set that secret in Cursor (or locally in the env), then enter the same value on the unlock screen. Client magic links do **not** need Cursor login or the staff code.

## Phase 2 flow

1. Staff: CRT #, insured name, email (phone optional); optional change types.
2. **Send client fill-out link** → mailto / copy email with `/client/:token`.
3. Client: towed Yes/No + helper, change details, fee + missed-info acknowledgments (no waive).
4. Staff: review submitted answers, edit, before→after summary, confirmation email, FoxPro export.
