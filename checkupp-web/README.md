# CheckUpp Clinician Web

Clinician-facing web platform for viewing patient timelines, managing patient relationships, and handling consent-driven access to health data.

This app consumes `checkupp-api` and is designed to stay aligned with the mobile auth model (Firebase in phase 1).

## Stack

- Next.js (App Router) + TypeScript
- TanStack Query (server-state)
- Zustand (session/local UI state)
- Zod (API response validation)
- Tailwind CSS + shadcn/ui + Sonner
- Firebase Auth (email/password + Google)

## Core Features

- Secure sign-in (`/auth/sign-in`)
- Role-gated clinician shell (`CLINICIAN` / `ADMIN`)
- Clinician dashboard (`/app`)
- Clinician profile management (`/app/profile`)
- Patient list with linking and consent actions (`/app/patients`)
- Patient timeline (`/app/patients/[patientId]/timeline`) with:
  - access state (relationship + consent)
  - screening due items and records
  - snapshots
  - pregnancy summary
  - wallet documents
  - feedback

## Prerequisites

- Node.js 20+
- Yarn 4+
- Running `checkupp-api` instance (default: `http://localhost:5555/api/v1`)
- Firebase project configured for web auth

## Quick Start

1. Install dependencies:

```bash
yarn install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Fill required env values (see table below).

4. Start dev server:

```bash
yarn dev
```

5. Open:

`http://localhost:3000`

## Environment Variables

Copy from `.env.example` and set values:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Base URL for `checkupp-api` (include `/api/v1`). |
| `NEXT_PUBLIC_APP_ENV` | Yes | `development` or `production`. |
| `NEXT_PUBLIC_DEV_USER_ROLE` | Dev only | Fallback role in development when token claims are absent. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase web config. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase web config. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase web config. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase web config. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase web config. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Optional | Firebase web config. |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Optional | Firebase web config. |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Optional | Firebase web config. |
| `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Optional | Google sign-in support. |
| `NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Optional | Parity field with mobile env set. |
| `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Optional | Parity field with mobile env set. |

## Scripts

- `yarn dev` - start local dev server
- `yarn build` - production build
- `yarn start` - run production server
- `yarn lint` - run ESLint
- `yarn typecheck` - run TypeScript checks

## Auth and Access Model

- Firebase session is bootstrapped in `src/components/auth/auth-bootstrap.tsx`.
- Route protection for app pages is handled by `src/proxy.ts` plus `AuthGuard`.
- In development, a lightweight session cookie is used to support routing guards.
- API requests attach bearer tokens and (in dev mode) optional helper headers from `src/lib/api/client.ts`.

Production note:

- Set `NEXT_PUBLIC_APP_ENV=production`.
- Ensure role claims are issued in Firebase custom claims and enforced by `checkupp-api`.
- Do not rely on dev fallback role behavior in production.

## API Expectations

This app expects the clinician endpoints from `checkupp-api`, including:

- `GET /clinician/profile`
- `PUT /clinician/profile`
- `GET /clinician/patients`
- `POST /clinician/patients/:patientId/link`
- `DELETE /clinician/patients/:patientId/link`
- `POST /clinician/patients/:patientId/consent/request`
- `POST /clinician/patients/:patientId/consent/revoke`
- `GET /clinician/patients/:patientId/timeline`

## Troubleshooting

### "Failed to load patient timeline"

Common causes:

- no active patient link
- consent is not active
- expired consent

Confirm in API response that:

- relationship is active
- consent status is `ACTIVE`

### Sign-in issues

- verify Firebase env vars are set
- verify the account has clinician/admin role claims for portal access
- verify `NEXT_PUBLIC_API_BASE_URL` points to a reachable API instance

## Project Structure

```text
src/
  app/
    auth/sign-in/
    app/
      profile/
      patients/
  components/
    auth/
    layout/
    providers/
    ui/
  lib/
    api/
    firebase/
    query/
    state/
```

## Related Repositories

- `checkupp-api` - backend APIs, auth enforcement, consent and timeline data
- `checkupp-mobile` - patient mobile app sharing the same backend + Firebase identity
