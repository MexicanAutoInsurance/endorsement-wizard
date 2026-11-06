# Mexican Auto Insurance — Endorsement Wizard (Phase 1 MVP)

Staff-assisted multi-change endorsement intake for **Lewis and Lewis / MexicanAutoInsurance.com**.

## Run locally

```bash
cd endorsement-wizard
npm install
npm run dev
```

Open the URL Vite prints (usually `http://127.0.0.1:5173`).

## What it does

1. Identify policy (CRT #, name, phone, email, optional FoxPro before notes)
2. Stack change types (vehicle / towed / term) under one **$40** fee context
3. Forced towed Yes/No every session
4. Completeness gate before summary
5. Combined before → after summary
6. Confirmation email (mailto + copy)
7. FoxPro paste export block
8. Staff attestation + session status toggles

Sessions persist in browser `localStorage`. No FoxPro API, payment, or client magic-link (Phase 2+).

## Build

```bash
npm run build
npm run preview
```
