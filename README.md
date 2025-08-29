# Agentic Trades Voice Agent (Production-Ready)

**Date:** 2025-08-29

A Fastify + TypeScript voice scheduling API for HVAC/trades businesses, integrated with Twilio, Stripe, and AWS CloudWatch. Includes pricing engine, scheduling optimizer, analytics, compliance/webhooks, and PostGIS-enabled dispatch logic.

## Features
- Twilio PSTN <Stream> -> WebSocket bridge (stubbed transport for OpenAI Realtime)
- Pricing engine with after-hours/emergency logic
- Booking + deposit checkout via Stripe Checkout (hosted link)
- Postgres + PostGIS schema (migrations) with rich analytics
- Business dashboards and KPI endpoints
- Dispatch optimization recommendations
- Secure webhooks (Stripe raw body + Twilio signature validation)
- Rate-limiting, CORS, env validation
- Docker + docker-compose for local dev

## Quickstart
```bash
cp .env.example .env
docker compose up -d db
npm i
npm run migrate
npm run dev
```

### Seed sample data
Edit `migrations/002_schema.sql` sample inserts or add your own seed script.

## Key Endpoints
- `POST /api/bookings/create-manual` → creates job + Stripe Checkout link
- `GET /api/realtime-summary`
- `GET /api/jobs/today`
- `GET /api/analytics/customers`
- `GET /api/analytics/voice-performance?days=7`
- `GET /api/analytics/competitive-position`
- `POST /webhooks/stripe` (raw body required)

## Twilio Setup
- Point Voice webhook to `POST /incoming`
- Twilio will `<Connect><Stream url="wss://your-domain/media" /></Connect>`
- If using signature validation, set `TWILIO_VALIDATE_SIGNATURE=true` and ensure the public URL matches

## Stripe Setup
- Set webhook to `/webhooks/stripe` with your endpoint signing secret in `.env`
- We use **Checkout Sessions** for public deposit links (safer than exposing PaymentIntent client secrets)

## Database
- Postgres (with `postgis` + `pgcrypto` extensions)
- Run migrations:
```bash
npm run migrate
```

## Repo Structure
- `src/` — server, routes, services
- `migrations/` — SQL migrations (001_init.sql enables extensions; 002_schema.sql contains business schema)
- `docs/` — PDFs: Architecture, Design, Runbook

## Production Notes
- Put the API behind HTTPS (ALB/Nginx) for Twilio/Stripe
- Use a queue for SMS/email if volumes grow
- Lock down CORS, add auth (JWT) for admin endpoints
- Add retries/backoff for all external calls
- Observability: add request id, distributed tracing, SLOs

---

© Agentic Trades

## CI/CD (AWS)
- See `infra/README.md` for Terraform and GitHub Actions setup.
- Production deploys target **AWS ECS Fargate** behind an **ALB** with **RDS Postgres**.


---

## AWS Deployment
See **README_AWS_DEPLOY.md** for an end-to-end ECS + RDS setup (Terraform, GitHub OIDC, Secrets/KMS, autoscaling).

## KPIs & Metrics
KPIs are exported via OpenTelemetry counters/histograms in `src/lib/metrics.ts`.
Suggested dashboards are documented in `admin/README_DASHBOARDS.md`.

## Cost Controls
Use env keys `MODEL_TIER`, `STT_MODE`, `TTS_TIER`. Estimate per-call spend with:
```bash
ts-node scripts/cost_estimator.ts --minutes 6 --model realtime-small --tts premium --stt streaming --retry 0.05
```
