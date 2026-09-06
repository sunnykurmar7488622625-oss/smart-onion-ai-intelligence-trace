# ONIONAI — Product Requirements & Progress

**Tagline:** Smart Quality. Trusted Trade.
**Positioning:** AI-powered Onion Quality Intelligence & Traceability Platform.
**Core USP:** One-time inspection + continuous storage monitoring + standardized digital evidence.

## Original problem statement (summary)
Build a real, working, premium, farmer-friendly full-stack web app for AI-assisted onion quality assessment at procurement centers: camera/image inspection, Grade A / URS / defect estimation, batch management, standardized digital quality reports (PDF/print), day-wise storage monitoring with deterioration alerts, batch digital passport (timeline), pre-dispatch verification, and public buyer verification. Two roles: farmer/supplier and buyer. JWT auth. Configurable AI vision provider via env; no keys in frontend. Demo seed data clearly separated. Smart India Hackathon demo quality.

## User choices
- Backend: FastAPI (Node/Express not supported in this environment; user also mentioned Flask — FastAPI used, same REST shape).
- AI vision: GPT-5.4 via Emergent Universal Key (default), Gemini 3.1 Pro selectable via env, deterministic local image-processing fallback when no key.
- Images: compressed JPEG base64 stored in MongoDB.
- Reports: server-generated PDF (reportlab) + print-ready HTML.
- Code delivered as project files.

## Architecture
- `backend/server.py` routes: /api/auth/*, /api/dashboard/stats, /api/batches (+/:id, /:id/passport), /api/inspections/analyze, /api/inspections, /api/inspections/:batchId, /api/inspections/one/:id, /api/inspections/:id/verify, /api/storage/:batchId (GET/POST), /api/dispatch/:batchId (verify/complete), /api/reports (+/:batchId, /:batchId/pdf), /api/verify/:code (public), /api/system/ai-status
- `backend/vision_service.py`: provider abstraction (`AI_PROVIDER`=openai|gemini|local, `AI_MODEL`), GPT-5.4 structured JSON detections, local colour/texture fallback, metric computation (Grade A = good; URS = under+oversize; Defective = damaged+rotten+sprouted; status thresholds).
- `backend/auth.py`: bcrypt + PyJWT Bearer tokens, role dependency, brute-force lockout.
- `backend/seed.py`: idempotent demo data (ON-2026-001/002/003, `is_demo: true`) + owner/buyer accounts.
- `backend/report_pdf.py`: reportlab PDF.
- Frontend: React 19 + Tailwind + shadcn + recharts + lucide; pages in `frontend/src/pages`, shared components in `frontend/src/components`, `useInspectionFlow` hook for analyze→save.
- Collections: users, batches, inspections, storage_records, dispatch_verifications, reports, pending_analyses (TTL), counters, login_attempts.

## Personas
- Farmer/Supplier: registers batches, scans/uploads, monitors storage, approves dispatch, shares Verification ID.
- Buyer: views inspected batches, verifies records by Batch/Verification ID.

## Implemented (2026-06 — MVP, tested by testing agent iteration_1: all pass)
- Landing, Login, Register (role cards), Dashboard (live stats, quality trend, storage deterioration, alerts, recent batches, quick actions)
- Batch management: list/search, create (auto ID ON-YYYY-NNN), passport timeline
- AI inspection: image upload + camera vision (capture→analyze→save), detection overlays, Grade A/URS/defect breakdown, human verification
- Storage monitoring: day-wise records, trend chart, decline alert, notes
- Pre-dispatch verification: approve / reinspection / mark dispatched
- Reports: list, print-ready view, PDF download, Verification ID
- Public buyer verification page
- Profile (edit name/org, AI engine status), role-based UI & API authorization, responsive mobile bottom nav

## Backlog
- P1: Edit batch UI (PUT /api/batches/:id exists, no form yet); batch QR code for verification; report sharing link
- P1: Per-onion size in mm using a reference object; multi-language (Hindi/Marathi) UI
- P2: Email/SMS alerts on storage decline; buyer↔supplier batch authorization list; export CSV
- P2: Gemini provider quality tuning; batch photos gallery

## Test credentials
See `/app/memory/test_credentials.md`.
