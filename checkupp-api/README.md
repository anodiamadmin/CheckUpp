# checkupp-api

Production-ready backend foundation for CheckUpp mobile + clinician web.

## Stack

- Node.js + TypeScript + Express 5
- Prisma ORM (PostgreSQL)
- Joi validation
- Firebase Admin token verification (or header-based dev auth)
- Security baseline: Helmet, CORS allowlist, rate limiting, audit logging

## Implemented Modules

- `Profile` (`/me/profile`)
- `Wallet` (`/me/wallet/*`)
- `Feedback` (`/me/feedback`)
- `Pregnancy` (`/me/pregnancy-plan`)
- `Screenings`
  - compatibility snapshots:
    - `/me/screenings/cancer-snapshot`
    - `/me/screenings/health-snapshot`
  - canonical domain:
    - `/me/screenings/definitions`
    - `/me/screenings/plans`
    - `/me/screenings/due-items`
    - `/me/screenings/records`
    - `/me/screenings/history/import`
- `Clinician` (`/clinician/*`)
  - clinician profile
  - patient linking
  - consent grant/revoke
  - patient timeline endpoint for web dashboard

## Health Endpoints

- `GET /healthz`
- `GET /readyz`

## API Documentation

Full endpoint documentation, including auth flows, request examples, validation rules, and response conventions, lives in [`docs/API.md`](docs/API.md).

Auth-only endpoint documentation lives in [`docs/AUTH_API.md`](docs/AUTH_API.md).

## Setup

1. Install dependencies:

```bash
yarn
```

1. Configure environment:

```bash
cp .env.example .env
```

1. Ensure PostgreSQL is running and reachable at `DATABASE_URL`.

2. Generate Prisma client:

```bash
yarn prisma:generate
```

1. Start dev server:

```bash
yarn dev
```

1. Build/typecheck:

```bash
yarn typecheck
yarn build
```

## Local Auth (Dev Mode)

When `AUTH_MODE=dev`, pass one of the headers:

- `x-user-id`
- `x-user-email`

Optional:

- `x-user-role: PATIENT | CLINICIAN | ADMIN`
- `x-user-name`

Example:

```bash
curl -H "x-user-email: demo@checkupp.local" \
  http://localhost:3090/api/v1/me/profile
```

## Prisma / Migrations

- Schema: `prisma/schema.prisma`
- Generated SQL migration scaffold: `prisma/migrations/20260315_init/migration.sql`

If local DB is up, run normal Prisma migration flow:

```bash
yarn prisma migrate dev --name init
```

## Appwrite -> Prisma Migration Scripts

Scripts are in `scripts/` and follow the migration plan:

- `yarn migrate:users`
- `yarn migrate:wallet`
- `yarn migrate:pregnancy`
- `yarn migrate:screenings`
- `yarn migrate:feedback`
- `yarn migrate:verify`

Required Appwrite env vars for scripts:

- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `APPWRITE_USER_COLLECTION_ID`
- `APPWRITE_FILE_COLLECTION_ID`
- `APPWRITE_FEEDBACK_COLLECTION_ID`
- `APPWRITE_NUTRITION_COLLECTION_ID`
- `APPWRITE_PREG_PLANNER_COLLECTION_ID`
- `APPWRITE_CANCER_SCREENING_COLLECTION_ID`

Migration reliability knobs:

- `MIGRATION_DB_MAX_ATTEMPTS` (default `8`)
- `MIGRATION_DB_RETRY_BASE_MS` (default `1000`)
- `MIGRATION_DB_RETRY_MAX_MS` (default `12000`)

For Neon-hosted Postgres, prefer:

- `sslmode=verify-full` (instead of `require`)
- optional: increase connection tolerance with `connect_timeout` and `pool_timeout`

## Notes

- Current `.env` uses encoded password characters for Postgres.
- API responses include compatibility fields (for transition from Appwrite shapes) where needed.
- Audit logs are written for sensitive read/write paths.
