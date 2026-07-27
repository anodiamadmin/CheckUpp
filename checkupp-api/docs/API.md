# Checkupp API Documentation

This document describes the Checkupp backend API implemented in this repository.

Default local base URL:

```text
http://localhost:3090/api/v1
```

The prefix is controlled by `API_PREFIX` and defaults to `/api/v1`. Health endpoints are not prefixed.

## Response Format

Most successful responses use one of these shapes:

```json
{
  "success": true,
  "message": "Profile fetched",
  "data": {}
}
```

Paginated responses use:

```json
{
  "success": true,
  "message": "Wallet documents fetched",
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Validation failures return `400`:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["\"email\" must be a valid email"]
}
```

Application errors return:

```json
{
  "success": false,
  "message": "Missing Bearer token"
}
```

Common status codes:

| Status | Meaning |
| --- | --- |
| `200` | Request succeeded |
| `201` | Resource created |
| `202` | Accepted or processed asynchronously |
| `204` | No content |
| `400` | Validation or malformed request |
| `401` | Missing or invalid authentication |
| `403` | Authenticated but forbidden, disabled, or email not verified |
| `404` | Route or resource not found |
| `409` | Unique record conflict |
| `429` | Rate limit exceeded |
| `500` | Unhandled server error |

## Authentication

All endpoints after the auth router require authentication unless marked public. The production auth mode is JWT:

```http
Authorization: Bearer <accessToken>
```

Local development can use `AUTH_MODE=dev`. In dev mode, send one of:

```http
x-user-id: <uuid-or-dev-id>
x-user-email: demo@checkupp.local
```

Optional dev headers:

```http
x-user-role: PATIENT | CLINICIAN | ADMIN
x-user-name: Demo User
```

JWT auth returns an access token and a refresh token. The default lifetimes are:

| Env | Default |
| --- | --- |
| `ACCESS_TOKEN_TTL_MS` | `3600000` |
| `REFRESH_TOKEN_TTL_MS` | `2592000000` |

### Email Auth Behavior

Auth email links are app-aware. Endpoints that send an email require:

```json
{
  "appType": "mobile"
}
```

Allowed `appType` values:

| Value | Base URL env |
| --- | --- |
| `mobile` | `MOBILE_APP_URL`, default `healthpassport://` |
| `web` | `WEB_APP_URL`, default `http://localhost:3000` |

Verification emails use `/verify-email?email=<email>`. Reset emails use `/reset-password?email=<email>&code=<code>`.

Code expiry:

| Code type | Expiry |
| --- | --- |
| Register verification | 10 minutes |
| Password reset | 15 minutes |

Email delivery is controlled by `EMAIL_DELIVERY`:

| Value | Behavior |
| --- | --- |
| `log` | Prints a JSON payload to server logs with `to`, `subject`, `code`, `actionUrl`, and text |
| `smtp` | Sends email through SMTP; requires `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` |

If `AUTH_REQUIRE_EMAIL_VERIFICATION=true`, email/password sign-in fails until the user verifies their email. Social sign-in can mark email as verified when the provider confirms it.

### Validation Rules Used Globally

Joi validation runs with conversion enabled. Query strings such as `?page=1` are converted to numbers. Unknown fields are stripped from validated request segments.

Common primitives:

| Field | Validation |
| --- | --- |
| `email` | Valid email, lowercased, trimmed, required where listed |
| `password` | String, 8 to 128 chars |
| `code` | 6 numeric digits |
| `uuid` params | Valid UUID string |
| `page` | Integer, min `1`, default `1` |
| `pageSize` | Integer, min `1`, max `100`, default `20` |
| ISO date | ISO date or date-time string accepted by Joi |

## Public Endpoints

### GET `/healthz`

Health check. Does not require auth.

Example:

```bash
curl http://localhost:3090/healthz
```

Response:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "status": "healthy",
    "timestamp": "2026-05-25T00:00:00.000Z",
    "uptimeSeconds": 42
  }
}
```

### GET `/readyz`

Readiness check. Runs `SELECT 1` against the database.

Example:

```bash
curl http://localhost:3090/readyz
```

### GET `/api/v1/`

API root.

Example:

```bash
curl http://localhost:3090/api/v1/
```

Response:

```json
{
  "success": true,
  "message": "CheckUpp API online",
  "data": {
    "version": "v1"
  }
}
```

## Auth Endpoints

Auth routes are public. `logout` can optionally use the bearer access token to revoke the current access session.

For an auth-only reference with detailed flows, email behavior, social sign-in notes, and examples, see [`AUTH_API.md`](AUTH_API.md).

### POST `/auth/signup`

Creates a user and sends an email verification code. It does not issue tokens. Call `/auth/verify-user-code`, then `/auth/signin`.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `email` | Yes | Valid email, lowercased, trimmed |
| `password` | Yes | String, 8 to 128 chars |
| `name` | No | String, 2 to 120 chars, trimmed |
| `phoneNumber` | No | String, max 30, allows `""` or `null` |
| `role` | No | `PATIENT`, `CLINICIAN`, `ADMIN`; ignored unless `AUTH_ALLOW_ROLE_SIGNUP=true` |
| `appType` | Yes | `mobile` or `web` |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "StrongPass123",
    "name": "Patient Example",
    "phoneNumber": "+61400000000",
    "appType": "mobile"
  }'
```

Response:

```json
{
  "success": true,
  "message": "User created successfully. Please verify your account.",
  "data": {
    "user": {
      "id": "9c06d72f-3ad1-4f14-bd42-96ef83f2d1b2",
      "email": "patient@example.com",
      "name": "Patient Example",
      "role": "PATIENT",
      "avatarUrl": null,
      "phoneNumber": "+61400000000",
      "emailVerified": false
    },
    "requiresVerification": true
  }
}
```

Errors:

| Status | Message |
| --- | --- |
| `409` | `User with this email already exists` |

### POST `/auth/signin`

Signs in with email and password.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `email` | Yes | Valid email, lowercased, trimmed |
| `password` | Yes | String, 8 to 128 chars |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "StrongPass123"
  }'
```

Response:

```json
{
  "success": true,
  "message": "Signed in successfully",
  "data": {
    "user": {
      "id": "9c06d72f-3ad1-4f14-bd42-96ef83f2d1b2",
      "email": "patient@example.com",
      "name": "Patient Example",
      "role": "PATIENT",
      "avatarUrl": null,
      "phoneNumber": "+61400000000",
      "emailVerified": true
    },
    "token": "<access-jwt>",
    "refreshToken": "<refresh-jwt>",
    "expiresAt": "2026-05-25T01:00:00.000Z",
    "refreshExpiresAt": "2026-06-24T00:00:00.000Z"
  }
}
```

Errors:

| Status | Message |
| --- | --- |
| `401` | `Invalid email or password` |
| `403` | `Please verify your email before signing in` |

### POST `/auth/social-signin`

Signs in or creates a user from a Google or Apple identity token. The backend verifies the token issuer, audience, expiry, and RSA signature using provider JWKS.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `provider` | Yes | `google` or `apple` |
| `idToken` | Yes | Provider identity token |
| `accessToken` | No | Accepted by validation but not used by the service |

Required env:

| Provider | Env |
| --- | --- |
| Google | `GOOGLE_OAUTH_CLIENT_IDS` |
| Apple | `APPLE_OAUTH_CLIENT_IDS` |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/social-signin \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "idToken": "<google-id-token>"
  }'
```

Response shape is the same as `/auth/signin`.

Errors:

| Status | Message |
| --- | --- |
| `400` | `Social identity token did not include an email` |
| `401` | Invalid, unsupported, expired, wrong issuer, wrong audience, or bad signature |
| `500` | Social auth audiences are not configured |
| `502` | Could not fetch provider signing keys |

### POST `/auth/refresh`

Rotates access and refresh tokens.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `refreshToken` | Yes | String |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "<refresh-jwt>" }'
```

Response shape is the same as `/auth/signin`.

Errors:

| Status | Message |
| --- | --- |
| `401` | `Invalid refresh token` |

### POST `/auth/logout`

Revokes a matching access token, refresh token, or both. If neither is supplied, the endpoint still returns success.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `refreshToken` | No | String |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/logout \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "<refresh-jwt>" }'
```

Response:

```json
{
  "success": true,
  "message": "Signed out successfully"
}
```

### POST `/auth/check-email`

Checks whether an email exists and whether it is verified.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `email` | Yes | Valid email, lowercased, trimmed |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/check-email \
  -H "Content-Type: application/json" \
  -d '{ "email": "patient@example.com" }'
```

Response:

```json
{
  "success": true,
  "message": "Email checked successfully",
  "data": {
    "email": "patient@example.com",
    "exists": true,
    "emailVerified": true
  }
}
```

### POST `/auth/send-verification-code`

Sends a new register verification code. Any previous unused register code for this user is invalidated.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `email` | Yes | Valid email, lowercased, trimmed |
| `appType` | Yes | `mobile` or `web` |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "appType": "web"
  }'
```

Response:

```json
{
  "success": true,
  "message": "Verification code sent successfully"
}
```

Errors:

| Status | Message |
| --- | --- |
| `400` | `User is already verified` |
| `404` | `User not found` |

### POST `/auth/verify-user-code`

Verifies a register code and marks the user email as verified. This endpoint does not issue tokens.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `email` | Yes | Valid email, lowercased, trimmed |
| `code` | Yes | Exactly 6 digits |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/verify-user-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "code": "123456"
  }'
```

Response:

```json
{
  "success": true,
  "message": "User verified successfully",
  "data": {
    "user": {
      "id": "9c06d72f-3ad1-4f14-bd42-96ef83f2d1b2",
      "email": "patient@example.com",
      "name": "Patient Example",
      "role": "PATIENT",
      "avatarUrl": null,
      "phoneNumber": "+61400000000",
      "emailVerified": true
    }
  }
}
```

Errors:

| Status | Message |
| --- | --- |
| `400` | `Invalid or expired verification code` |

### POST `/auth/forgot-password`

Sends a password reset code if the account exists. The response intentionally does not reveal whether the email exists.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `email` | Yes | Valid email, lowercased, trimmed |
| `appType` | Yes | `mobile` or `web` |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "appType": "mobile"
  }'
```

Response:

```json
{
  "success": true,
  "message": "If an account exists, a password reset code has been sent."
}
```

### POST `/auth/verify-reset-code`

Checks a password reset code without consuming it.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `email` | Yes | Valid email, lowercased, trimmed |
| `code` | Yes | Exactly 6 digits |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/verify-reset-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "code": "123456"
  }'
```

Valid response:

```json
{
  "success": true,
  "message": "Reset code verified successfully",
  "data": {
    "email": "patient@example.com",
    "codeValid": true
  }
}
```

Invalid response uses status `400`:

```json
{
  "success": false,
  "message": "Invalid or expired reset code",
  "data": {
    "email": "patient@example.com",
    "codeValid": false
  }
}
```

### POST `/auth/reset-password`

Consumes a reset code, updates the password, marks email as verified, and revokes active sessions for the user.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `email` | Yes | Valid email, lowercased, trimmed |
| `code` | Yes | Exactly 6 digits |
| `newPassword` | Yes | String, 8 to 128 chars |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "code": "123456",
    "newPassword": "NewStrongPass123"
  }'
```

Response:

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

Errors:

| Status | Message |
| --- | --- |
| `400` | `Invalid or expired reset code` |

## Profile Endpoints

All profile endpoints require auth.

Shared profile validation:

| Field | Validation |
| --- | --- |
| `email` | Valid email |
| `name` | String, 2 to 120 chars |
| `phoneNumber` | String, max 30, allows `""` or `null` |
| `gender` | `male`, `female`, `prefer not to say`, `unknown`, `MALE`, `FEMALE`, `PREFER_NOT_TO_SAY`, `UNKNOWN` |
| `dob` | ISO date, allows `null` |
| `avatarUrl` | URI, allows `""` or `null` |

POST and PATCH bodies must include at least one field.

### GET `/me/profile`

Example:

```bash
curl http://localhost:3090/api/v1/me/profile \
  -H "Authorization: Bearer <access-jwt>"
```

### POST `/me/profile`

Creates or replaces the current user's profile fields.

Example:

```bash
curl -X POST http://localhost:3090/api/v1/me/profile \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Patient Example",
    "gender": "female",
    "dob": "1990-01-01",
    "phoneNumber": "+61400000000"
  }'
```

### PATCH `/me/profile`

Partially updates profile fields.

Example:

```bash
curl -X PATCH http://localhost:3090/api/v1/me/profile \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "avatarUrl": "https://example.com/avatar.png" }'
```

### DELETE `/me/profile`

Soft-deletes the current user profile.

Example:

```bash
curl -X DELETE http://localhost:3090/api/v1/me/profile \
  -H "Authorization: Bearer <access-jwt>"
```

Response:

```json
{
  "success": true,
  "message": "Profile deleted",
  "data": {
    "id": "9c06d72f-3ad1-4f14-bd42-96ef83f2d1b2",
    "isDeleted": true
  }
}
```

## Wallet Endpoints

All wallet endpoints require auth.

Wallet document fields:

| Field | Validation |
| --- | --- |
| `title` | String, 1 to 255 chars |
| `description` | String, max 2000, allows `""` or `null` |
| `documentType` | String, 1 to 120 chars |
| `fileType` | `FILE`, `IMAGE`, `LINK`, `file`, `image`, `link` |
| `objectKey` | String, allows `""` or `null` |
| `publicUrl` | URI, allows `""` or `null` |
| `externalUrl` | URI, allows `""` or `null` |
| `mimeType` | String, max 120, allows `""` or `null` |
| `sizeBytes` | Integer, min `0` |
| `legacyAppwriteStorageId` | String, allows `""` or `null` |

### GET `/me/wallet/documents`

Lists wallet documents.

Query validation:

| Query | Validation |
| --- | --- |
| `page` | Integer, min `1`, default `1` |
| `pageSize` | Integer, 1 to 100, default `20` |
| `documentType` | Optional string |
| `fileType` | `FILE`, `IMAGE`, `LINK`, `file`, `image`, `link` |

Example:

```bash
curl "http://localhost:3090/api/v1/me/wallet/documents?page=1&pageSize=20&fileType=FILE" \
  -H "Authorization: Bearer <access-jwt>"
```

### GET `/me/wallet/documents/search`

Searches wallet documents.

Query validation:

| Query | Validation |
| --- | --- |
| `q` | Required string, min 1 char |
| `page` | Integer, min `1`, default `1` |
| `pageSize` | Integer, 1 to 100, default `20` |

Example:

```bash
curl "http://localhost:3090/api/v1/me/wallet/documents/search?q=pathology" \
  -H "Authorization: Bearer <access-jwt>"
```

### GET `/me/wallet/documents/:id`

Path validation: `id` must be a UUID.

Example:

```bash
curl http://localhost:3090/api/v1/me/wallet/documents/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2 \
  -H "Authorization: Bearer <access-jwt>"
```

### POST `/me/wallet/uploads/presign`

Creates a local upload intent.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `fileName` | Yes | String, min 1 |
| `mimeType` | Yes | String, min 1 |
| `fileSize` | No | Integer, min 1 |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/me/wallet/uploads/presign \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "blood-test.pdf",
    "mimeType": "application/pdf",
    "fileSize": 123456
  }'
```

### PUT `/me/wallet/uploads/pending?objectKey=...`

Uploads raw file bytes to a pending object key. The body must be non-empty raw bytes. `Content-Type` is stored as the file MIME type.

Query validation:

| Query | Required | Validation |
| --- | --- | --- |
| `objectKey` | Yes | String, 1 to 500 chars |

Example:

```bash
curl -X PUT "http://localhost:3090/api/v1/me/wallet/uploads/pending?objectKey=wallet/example.pdf" \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/pdf" \
  --data-binary "@blood-test.pdf"
```

Response:

```json
{
  "success": true,
  "message": "File uploaded",
  "data": {
    "objectKey": "wallet/example.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 123456,
    "publicUrl": "http://localhost:3090/uploads/wallet/example.pdf",
    "externalUrl": "http://localhost:3090/uploads/wallet/example.pdf"
  }
}
```

### POST `/me/wallet/documents`

Creates a wallet document. Required fields are `title`, `documentType`, and `fileType`.

Example:

```bash
curl -X POST http://localhost:3090/api/v1/me/wallet/documents \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Blood test",
    "description": "March pathology result",
    "documentType": "pathology",
    "fileType": "FILE",
    "objectKey": "wallet/example.pdf",
    "publicUrl": "http://localhost:3090/uploads/wallet/example.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 123456
  }'
```

### PATCH `/me/wallet/documents/:id`

Path validation: `id` must be a UUID. Body must include at least one wallet document field.

Example:

```bash
curl -X PATCH http://localhost:3090/api/v1/me/wallet/documents/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2 \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Updated blood test" }'
```

### POST `/me/wallet/links`

Creates a wallet document of type link.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `title` | Yes | String, 1 to 255 chars |
| `description` | No | String, max 2000, allows `""` or `null` |
| `documentType` | Yes | String, 1 to 120 chars |
| `link` | Yes | URI |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/me/wallet/links \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Health Record",
    "documentType": "external",
    "link": "https://example.com/record"
  }'
```

### DELETE `/me/wallet/documents/:id`

Path validation: `id` must be a UUID.

Example:

```bash
curl -X DELETE http://localhost:3090/api/v1/me/wallet/documents/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2 \
  -H "Authorization: Bearer <access-jwt>"
```

## Feedback Endpoints

All feedback endpoints require auth.

### POST `/me/feedback`

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `feedback` | Yes | String, 3 to 4000 chars |
| `rating` | No | Integer, 1 to 5, allows `null` |
| `submittedAt` | No | ISO date |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/me/feedback \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "feedback": "The app is easy to use.",
    "rating": 5,
    "submittedAt": "2026-05-25T10:00:00.000Z"
  }'
```

### GET `/me/feedback`

Query validation: `page`, `pageSize`.

Example:

```bash
curl "http://localhost:3090/api/v1/me/feedback?page=1&pageSize=20" \
  -H "Authorization: Bearer <access-jwt>"
```

### DELETE `/me/feedback/:id`

Path validation: `id` must be a UUID.

Example:

```bash
curl -X DELETE http://localhost:3090/api/v1/me/feedback/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2 \
  -H "Authorization: Bearer <access-jwt>"
```

## Immunisation Endpoints

All immunisation endpoints require auth.

Shared fields:

| Field | Validation |
| --- | --- |
| `performedAt` | Forbidden in create and patch |
| `wasNormal` | Boolean, allows `null` |
| `outcomeStatus` | `NORMAL`, `ABNORMAL`, `INCONCLUSIVE`, `NOT_DONE`, `PENDING` plus lowercase variants |
| `resultSummary` | String, max 1000, allows `""` or `null` |
| `notes` | String, max 10000, allows `""` or `null` |
| `source` | `MOBILE_FORM`, `MOBILE_IMPORT`, `CLINICIAN`, `MIGRATION` plus lowercase variants |
| `providerName` | String, max 200, allows `""` or `null` |
| `facilityName` | String, max 200, allows `""` or `null` |
| `structuredData` | Object, array, string, or `null` |
| `vaccineName` | String, 1 to 255 chars |
| `vaccineType` | `ROUTINE`, `TRAVEL`, `OCCUPATIONAL`, `CATCH_UP`, `BOOSTER`, plus lowercase and `catch-up` |
| `brand` | String, max 255, allows `""` or `null` |
| `batchNumber` | String, max 100, allows `""` or `null` |
| `doseNumber` | Integer, min `1` |
| `totalDoses` | Integer, min `1` |
| `administrationSite` | `LEFT_ARM`, `RIGHT_ARM`, `LEFT_THIGH`, `RIGHT_THIGH`, `ORAL`, `NASAL`, lowercase, or hyphenated lowercase |
| `clinic` | String, max 255, allows `""` or `null` |
| `location` | String, max 255, allows `""` or `null` |
| `nextDueDate` | ISO date, allows `null` |
| `sideEffectsNone` | Boolean |
| `sideEffectsMild` | Boolean |
| `sideEffectsModerate` | Boolean |
| `sideEffectsSevere` | Boolean |
| `sideEffectsDescription` | String, max 4000, allows `""` or `null` |
| `isTravel` | Boolean |
| `travelDestination` | String, max 255, allows `""` or `null` |
| `departureDate` | ISO date, allows `null` |

Business validation:

| Rule |
| --- |
| `doseNumber` cannot be greater than `totalDoses` |
| If `doseNumber < totalDoses`, `nextDueDate` is required |
| If `isTravel=true`, both `travelDestination` and `departureDate` are required |

### POST `/me/immunisations`

Required fields: `vaccineName`, `vaccineType`, `doseNumber`, `totalDoses`, `administrationSite`.

Example:

```bash
curl -X POST http://localhost:3090/api/v1/me/immunisations \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "vaccineName": "Hepatitis B",
    "vaccineType": "ROUTINE",
    "doseNumber": 1,
    "totalDoses": 3,
    "administrationSite": "LEFT_ARM",
    "nextDueDate": "2026-07-25",
    "clinic": "Example Clinic",
    "sideEffectsNone": true,
    "isTravel": false
  }'
```

### GET `/me/immunisations`

Query validation: `page`, `pageSize`.

Example:

```bash
curl "http://localhost:3090/api/v1/me/immunisations?page=1&pageSize=20" \
  -H "Authorization: Bearer <access-jwt>"
```

### GET `/me/immunisations/upcoming`

Query validation:

| Query | Validation |
| --- | --- |
| `daysAhead` | Integer, 1 to 365, default `30` |
| `page` | Integer, min `1`, default `1` |
| `pageSize` | Integer, 1 to 100, default `20` |

Example:

```bash
curl "http://localhost:3090/api/v1/me/immunisations/upcoming?daysAhead=60" \
  -H "Authorization: Bearer <access-jwt>"
```

This response includes `data`, `pagination`, and `meta`.

### GET `/me/immunisations/summary`

Query validation:

| Query | Validation |
| --- | --- |
| `daysAhead` | Integer, 1 to 365, default `30` |

Example:

```bash
curl "http://localhost:3090/api/v1/me/immunisations/summary?daysAhead=30" \
  -H "Authorization: Bearer <access-jwt>"
```

### GET `/me/immunisations/:id`

Path validation: `id` must be a UUID.

Example:

```bash
curl http://localhost:3090/api/v1/me/immunisations/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2 \
  -H "Authorization: Bearer <access-jwt>"
```

### PATCH `/me/immunisations/:id`

Path validation: `id` must be a UUID. Body must include at least one immunisation field.

Example:

```bash
curl -X PATCH http://localhost:3090/api/v1/me/immunisations/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2 \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "doseNumber": 2,
    "totalDoses": 3,
    "nextDueDate": "2026-09-25"
  }'
```

### DELETE `/me/immunisations/:id`

Path validation: `id` must be a UUID.

Example:

```bash
curl -X DELETE http://localhost:3090/api/v1/me/immunisations/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2 \
  -H "Authorization: Bearer <access-jwt>"
```

## Pregnancy Plan Endpoints

All pregnancy endpoints require auth.

### GET `/me/pregnancy-plan`

Example:

```bash
curl http://localhost:3090/api/v1/me/pregnancy-plan \
  -H "Authorization: Bearer <access-jwt>"
```

Returns `404` if no plan exists.

### PUT `/me/pregnancy-plan`

Creates or updates the current pregnancy plan.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `conceptionDate` | Conditional | ISO date, allows `null` |
| `lmpDate` | Conditional | ISO date, allows `null` |
| `expectedDueDate` | Conditional | ISO date, allows `null` |
| `estimatedCheckupDates` | Yes | Array, string, or object |

At least one of `conceptionDate`, `lmpDate`, or `expectedDueDate` must be present.

If `estimatedCheckupDates` is an array, each item must contain:

| Field | Validation |
| --- | --- |
| `name` | Required string, min 1 |
| `date` | Required string |
| `completed` | Required boolean |

Unknown fields are allowed inside checkup items.

Example:

```bash
curl -X PUT http://localhost:3090/api/v1/me/pregnancy-plan \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "lmpDate": "2026-01-15",
    "expectedDueDate": "2026-10-22",
    "estimatedCheckupDates": [
      {
        "name": "First trimester checkup",
        "date": "2026-03-01",
        "completed": false
      }
    ]
  }'
```

### PATCH `/me/pregnancy-plan/checkups/:name`

Updates a checkup completion state. The `name` path segment is decoded with `decodeURIComponent`, so URL-encode names with spaces.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `name` path | Yes | String, min 1 |
| `completed` | No | Boolean |
| `cascadeMode` | No | `single` or `current_and_prior`, default `current_and_prior` |

Example:

```bash
curl -X PATCH "http://localhost:3090/api/v1/me/pregnancy-plan/checkups/First%20trimester%20checkup" \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "completed": true,
    "cascadeMode": "single"
  }'
```

### DELETE `/me/pregnancy-plan`

Deletes the plan. Returns `204` if there was no existing plan.

Example:

```bash
curl -X DELETE http://localhost:3090/api/v1/me/pregnancy-plan \
  -H "Authorization: Bearer <access-jwt>"
```

## Screening Endpoints

All screening endpoints require auth. The seed endpoint also requires `ADMIN`.

Shared enum validation:

| Concept | Allowed values |
| --- | --- |
| `domain` | `CANCER`, `HEALTH`, `cancer`, `health` |
| `outcomeStatus` | `NORMAL`, `ABNORMAL`, `INCONCLUSIVE`, `NOT_DONE`, `PENDING`, lowercase variants |
| `source` | `MOBILE_FORM`, `MOBILE_IMPORT`, `CLINICIAN`, `MIGRATION`, lowercase variants |
| `valueType` | `NUMBER`, `TEXT`, `BOOLEAN`, `DATE`, `CODED`, `JSON`, lowercase variants |
| `severity` | `INFO`, `WARNING`, `CRITICAL`, lowercase variants |

### POST `/internal/screenings/seed`

Admin-only. Seeds or initializes the screening catalog.

Example:

```bash
curl -X POST http://localhost:3090/api/v1/internal/screenings/seed \
  -H "Authorization: Bearer <admin-access-jwt>"
```

Response status: `202`.

### GET `/me/screenings/definitions`

Query validation:

| Query | Validation |
| --- | --- |
| `domain` | Optional screening domain |

Example:

```bash
curl "http://localhost:3090/api/v1/me/screenings/definitions?domain=CANCER" \
  -H "Authorization: Bearer <access-jwt>"
```

### GET `/me/screenings/plans`

Query validation:

| Query | Validation |
| --- | --- |
| `domain` | Optional screening domain |

Example:

```bash
curl "http://localhost:3090/api/v1/me/screenings/plans?domain=HEALTH" \
  -H "Authorization: Bearer <access-jwt>"
```

### PUT `/me/screenings/plans/:screeningCode`

Path validation: `screeningCode` is required and min 1 char.

Body validation:

| Field | Validation |
| --- | --- |
| `neverScreened` | Boolean |
| `lastScreeningDate` | ISO date, allows `null` |
| `dataCalculated` | Boolean |
| `source` | `SYSTEM`, `USER_OVERRIDE`, `CLINICIAN_OVERRIDE`, lowercase variants |
| `intervalMonths` | Number, min `0.25`, max `240` |
| `recalculateDueItem` | Boolean, default `true` |

Body must include at least one field.

Example:

```bash
curl -X PUT http://localhost:3090/api/v1/me/screenings/plans/bowel_cancer \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "neverScreened": false,
    "lastScreeningDate": "2025-05-01",
    "source": "USER_OVERRIDE",
    "intervalMonths": 24
  }'
```

### GET `/me/screenings/due-items`

Query validation:

| Query | Validation |
| --- | --- |
| `status` | `all`, `upcoming`, `overdue`, `completed`, default `all` |
| `domain` | Optional screening domain |
| `screeningCode` | Optional string |
| `page` | Integer, min `1`, default `1` |
| `pageSize` | Integer, 1 to 100, default `20` |

Example:

```bash
curl "http://localhost:3090/api/v1/me/screenings/due-items?status=overdue&page=1" \
  -H "Authorization: Bearer <access-jwt>"
```

### GET `/me/screenings/cancer-snapshot`

Returns `data: null` when no snapshot exists.

Example:

```bash
curl http://localhost:3090/api/v1/me/screenings/cancer-snapshot \
  -H "Authorization: Bearer <access-jwt>"
```

### PUT `/me/screenings/cancer-snapshot`

Validation:

| Field | Validation |
| --- | --- |
| `age` | Integer, 0 to 130, allows `null` |
| `gender` | Profile gender values, allows `null` |
| `calculatedScreeningDates` | Object, array, string, or `null` |
| `testResults` | Object map of screening result entries or `null` |
| `lastScreeningDate` | ISO date, allows `null` |

Body must include at least one field.

Screening result map entries:

| Field | Required | Validation |
| --- | --- | --- |
| `date` | Yes | ISO date string |
| `result` | Yes | String |
| `bookingStatus` | No | `required`, `started`, `confirmed` |
| `bookingChannel` | No | `hotdoc`, `phone`, `email` |
| `bookingUpdatedAt` | No | ISO date string |
| `bookingConfirmedAt` | No | ISO date string |
| `appointmentAt` | No | ISO date string |
| `bookedAt` | No | ISO date string |
| `providerName` | No | String, max 255, allows `""` |
| `notes` | No | String, max 2000, allows `""` |

Example:

```bash
curl -X PUT http://localhost:3090/api/v1/me/screenings/cancer-snapshot \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 45,
    "gender": "female",
    "lastScreeningDate": "2025-05-01",
    "testResults": {
      "breast_cancer": {
        "date": "2025-05-01",
        "result": "normal"
      }
    }
  }'
```

### DELETE `/me/screenings/cancer-snapshot`

Returns `204` if no snapshot existed.

Example:

```bash
curl -X DELETE http://localhost:3090/api/v1/me/screenings/cancer-snapshot \
  -H "Authorization: Bearer <access-jwt>"
```

### GET `/me/screenings/health-snapshot`

Returns `data: null` when no snapshot exists.

Example:

```bash
curl http://localhost:3090/api/v1/me/screenings/health-snapshot \
  -H "Authorization: Bearer <access-jwt>"
```

### PUT `/me/screenings/health-snapshot`

Validation:

| Field | Validation |
| --- | --- |
| `age` | Integer, 0 to 130, allows `null` |
| `gender` | Profile gender values, allows `null` |
| `checkupDates` | Object, array, string, or `null` |
| `healthResults` | Object map of screening result entries or `null` |
| `lastCheckupDate` | ISO date, allows `null` |

Body must include at least one field.

Example:

```bash
curl -X PUT http://localhost:3090/api/v1/me/screenings/health-snapshot \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 45,
    "checkupDates": { "blood_pressure": "2026-06-01" },
    "lastCheckupDate": "2025-06-01"
  }'
```

### DELETE `/me/screenings/health-snapshot`

Returns `204` if no snapshot existed.

Example:

```bash
curl -X DELETE http://localhost:3090/api/v1/me/screenings/health-snapshot \
  -H "Authorization: Bearer <access-jwt>"
```

### GET `/me/screenings/practice-contacts`

Example:

```bash
curl http://localhost:3090/api/v1/me/screenings/practice-contacts \
  -H "Authorization: Bearer <access-jwt>"
```

### PUT `/me/screenings/practice-contacts`

Creates or updates a default or screening-specific practice contact.

Validation:

| Field | Validation |
| --- | --- |
| `screeningName` | String, max 255, allows `null` |
| `isDefault` | Boolean, default `false` |
| `hotdocUrl` | URI, allows `""` or `null` |
| `practicePhone` | Digits, plus, parentheses, hyphen, spaces, max 50, allows `""` or `null` |
| `practiceEmail` | Valid email, allows `""` or `null` |

Rules:

| Rule |
| --- |
| At least one of `hotdocUrl`, `practicePhone`, or `practiceEmail` is required |
| `screeningName` is required when `isDefault=false` |

Example:

```bash
curl -X PUT http://localhost:3090/api/v1/me/screenings/practice-contacts \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "screeningName": "Breast cancer screening",
    "practicePhone": "+61 2 9000 0000",
    "practiceEmail": "clinic@example.com"
  }'
```

### DELETE `/me/screenings/practice-contacts`

Validation:

| Field | Validation |
| --- | --- |
| `screeningName` | String, max 255, allows `null` |
| `isDefault` | Boolean, default `false` |

Rule: `screeningName` is required when `isDefault=false`.

Example:

```bash
curl -X DELETE http://localhost:3090/api/v1/me/screenings/practice-contacts \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "screeningName": "Breast cancer screening" }'
```

### POST `/me/screenings/records`

Creates a canonical screening record.

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `screeningCode` | Conditional | String |
| `screeningDefinitionId` | Conditional | UUID |
| `screeningDueItemId` | No | UUID or `null` |
| `performedAt` | Yes | ISO date |
| `wasNormal` | No | Boolean or `null` |
| `outcomeStatus` | No | Screening outcome enum |
| `resultSummary` | No | String, max 1000, allows `""` or `null` |
| `notes` | No | String, max 10000, allows `""` or `null` |
| `source` | No | Record source enum |
| `enteredByUserId` | No | UUID or `null` |
| `providerName` | No | String, max 200, allows `""` or `null` |
| `facilityName` | No | String, max 200, allows `""` or `null` |
| `legacyPayloadAvailable` | No | Boolean |
| `structuredData` | No | Object, array, string, or `null` |
| `measurements` | No | Array, default `[]` |
| `flags` | No | Array, default `[]` |
| `attachments` | No | Array, default `[]` |
| `details` | No | Object with allowed keys listed below |
| `dueItemCompletion` | No | Boolean, default `true` |

At least one of `screeningCode` or `screeningDefinitionId` is required.

Measurement validation:

| Field | Required | Validation |
| --- | --- | --- |
| `code` | Yes | String, 1 to 120 chars |
| `displayName` | No | String, max 255, allows `""` or `null` |
| `valueType` | Yes | Value type enum |
| `valueNumber` | No | Number |
| `valueText` | No | String, max 5000, allows `""` or `null` |
| `valueBoolean` | No | Boolean |
| `valueDate` | No | ISO date, allows `null` |
| `valueCode` | No | String, max 255, allows `""` or `null` |
| `valueJson` | No | Object, array, or string |
| `unit` | No | String, max 64, allows `""` or `null` |
| `referenceLow` | No | Number |
| `referenceHigh` | No | Number |
| `abnormalFlag` | No | Boolean |
| `interpretation` | No | String, max 2000, allows `""` or `null` |

Flag validation:

| Field | Required | Validation |
| --- | --- | --- |
| `severity` | Yes | Severity enum |
| `code` | Yes | String, 1 to 120 chars |
| `message` | Yes | String, 1 to 1000 chars |

Attachment validation:

| Field | Validation |
| --- | --- |
| `walletDocumentId` | UUID |
| `objectKey` | String, max 500, allows `""` or `null` |
| `fileName` | String, max 255, allows `""` or `null` |
| `mimeType` | String, max 120, allows `""` or `null` |

Allowed `details` keys: `cancer`, `cardiovascular`, `diabetes`, `vision`, `dental`, `mentalHealth`. Each value may be an object with unknown nested fields.

Example:

```bash
curl -X POST http://localhost:3090/api/v1/me/screenings/records \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "screeningCode": "blood_pressure",
    "performedAt": "2026-05-25T09:30:00.000Z",
    "wasNormal": false,
    "outcomeStatus": "ABNORMAL",
    "resultSummary": "Elevated blood pressure",
    "source": "MOBILE_FORM",
    "measurements": [
      {
        "code": "systolic",
        "displayName": "Systolic",
        "valueType": "NUMBER",
        "valueNumber": 145,
        "unit": "mmHg",
        "abnormalFlag": true
      }
    ],
    "flags": [
      {
        "severity": "WARNING",
        "code": "high_bp",
        "message": "Blood pressure is above target range"
      }
    ]
  }'
```

### GET `/me/screenings/records`

Query validation:

| Query | Validation |
| --- | --- |
| `domain` | Optional screening domain |
| `screeningCode` | Optional string |
| `from` | ISO date |
| `to` | ISO date |
| `page` | Integer, min `1`, default `1` |
| `pageSize` | Integer, 1 to 100, default `20` |

Example:

```bash
curl "http://localhost:3090/api/v1/me/screenings/records?from=2026-01-01&to=2026-12-31" \
  -H "Authorization: Bearer <access-jwt>"
```

### GET `/me/screenings/records/:recordId`

Path validation: `recordId` must be a UUID.

Example:

```bash
curl http://localhost:3090/api/v1/me/screenings/records/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2 \
  -H "Authorization: Bearer <access-jwt>"
```

### POST `/me/screenings/history/import`

Imports legacy or bulk screening history. Body must include at least one of `records`, `cancerHistory`, or `healthHistory`.

Validation:

| Field | Validation |
| --- | --- |
| `source` | `LOCAL_ASYNCSTORAGE`, `APPWRITE_SNAPSHOT`, `CSV`, lowercase variants, default `LOCAL_ASYNCSTORAGE` |
| `records` | Array of canonical import records |
| `cancerHistory` | Object map of arrays of legacy history entries |
| `healthHistory` | Object map of arrays of legacy history entries |

Import record validation:

| Field | Required | Validation |
| --- | --- | --- |
| `screeningCode` | No | String |
| `screeningName` | No | String |
| `domain` | No | Screening domain enum |
| `performedAt` | Yes | ISO date |
| `outcomeStatus` | No | Outcome enum |
| `wasNormal` | No | Boolean or `null` |
| `resultSummary` | No | String, allows `""` or `null` |
| `notes` | No | String, allows `""` or `null` |
| `structuredData` | No | Object, array, string, or `null` |
| `measurements` | No | Measurement array, default `[]` |
| `flags` | No | Flag array, default `[]` |
| `details` | No | Object with unknown fields |

Legacy history entry validation:

| Field | Required | Validation |
| --- | --- | --- |
| `date` | Yes | String |
| `result` | No | String, allows `""` or `null` |
| `wasNormal` | No | Boolean |
| `notes` | No | String, allows `""` or `null` |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/me/screenings/history/import \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "CSV",
    "records": [
      {
        "screeningCode": "blood_pressure",
        "domain": "HEALTH",
        "performedAt": "2026-05-25",
        "outcomeStatus": "NORMAL",
        "resultSummary": "Normal"
      }
    ]
  }'
```

Response status: `202`.

## Consent Endpoints

Patient consent endpoints require a user with role `PATIENT` or `ADMIN`.

Consent scope validation:

| Field | Validation |
| --- | --- |
| `accessLevel` | `READ_ONLY` or `READ_WRITE`, default `READ_ONLY` |
| `domains` | Required unique array with at least one of `screenings`, `documents`, `pregnancy`, `feedback`, `profile` |
| `includeHistory` | Boolean, default `true` |
| `note` | String, max 500, allows `""` or `null` |

### GET `/me/consents/requests`

Query validation:

| Query | Validation |
| --- | --- |
| `page` | Integer, min `1`, default `1` |
| `pageSize` | Integer, 1 to 100, default `20` |
| `status` | `REQUESTED`, `ACTIVE`, `DECLINED`, `REVOKED`, `EXPIRED` |

Example:

```bash
curl "http://localhost:3090/api/v1/me/consents/requests?status=REQUESTED" \
  -H "Authorization: Bearer <patient-access-jwt>"
```

### POST `/me/consents/:consentId/approve`

Path validation: `consentId` must be a UUID.

Body validation:

| Field | Validation |
| --- | --- |
| `scope` | Consent scope object or `null` |
| `expiresAt` | ISO date, allows `null` |
| `responseReason` | String, max 500, allows `""` or `null` |

Body is optional.

Example:

```bash
curl -X POST http://localhost:3090/api/v1/me/consents/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2/approve \
  -H "Authorization: Bearer <patient-access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": {
      "accessLevel": "READ_ONLY",
      "domains": ["screenings", "documents"],
      "includeHistory": true
    },
    "expiresAt": "2026-12-31T23:59:59.000Z"
  }'
```

### POST `/me/consents/:consentId/decline`

Path validation: `consentId` must be a UUID.

Body validation:

| Field | Validation |
| --- | --- |
| `reason` | String, max 500, allows `""` or `null` |

Body is optional.

Example:

```bash
curl -X POST http://localhost:3090/api/v1/me/consents/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2/decline \
  -H "Authorization: Bearer <patient-access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Not now" }'
```

### POST `/me/consents/:consentId/revoke`

Path validation: `consentId` must be a UUID. Body validation is the same as decline.

Example:

```bash
curl -X POST http://localhost:3090/api/v1/me/consents/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2/revoke \
  -H "Authorization: Bearer <patient-access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Changed my mind" }'
```

## Clinician Endpoints

All clinician endpoints require role `CLINICIAN` or `ADMIN`.

### GET `/clinician/profile`

Example:

```bash
curl http://localhost:3090/api/v1/clinician/profile \
  -H "Authorization: Bearer <clinician-access-jwt>"
```

### PUT `/clinician/profile`

Body must include at least one field.

Validation:

| Field | Validation |
| --- | --- |
| `organizationId` | UUID or `null` |
| `licenseNumber` | String, max 120, allows `""` or `null` |
| `specialty` | String, max 120, allows `""` or `null` |
| `isActive` | Boolean |

Example:

```bash
curl -X PUT http://localhost:3090/api/v1/clinician/profile \
  -H "Authorization: Bearer <clinician-access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "licenseNumber": "AHPRA-12345",
    "specialty": "General Practice",
    "isActive": true
  }'
```

### GET `/clinician/patients`

Query validation:

| Query | Validation |
| --- | --- |
| `page` | Integer, min `1`, default `1` |
| `pageSize` | Integer, 1 to 100, default `20` |
| `search` | String, allows `""` or `null` |
| `includeInactive` | Boolean, default `false` |

Example:

```bash
curl "http://localhost:3090/api/v1/clinician/patients?search=patient&page=1" \
  -H "Authorization: Bearer <clinician-access-jwt>"
```

### POST `/clinician/patients/link-by-email`

Validation:

| Field | Required | Validation |
| --- | --- | --- |
| `patientEmail` | Yes | Valid email |
| `relationshipType` | No | String, max 64, default `PRIMARY` |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/clinician/patients/link-by-email \
  -H "Authorization: Bearer <clinician-access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "patientEmail": "patient@example.com",
    "relationshipType": "PRIMARY"
  }'
```

### POST `/clinician/patients/:patientId/link`

Path validation: `patientId` must be a UUID.

Body validation:

| Field | Validation |
| --- | --- |
| `relationshipType` | String, max 64, default `PRIMARY` |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/clinician/patients/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2/link \
  -H "Authorization: Bearer <clinician-access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "relationshipType": "PRIMARY" }'
```

### DELETE `/clinician/patients/:patientId/link`

Path validation: `patientId` must be a UUID.

Example:

```bash
curl -X DELETE http://localhost:3090/api/v1/clinician/patients/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2/link \
  -H "Authorization: Bearer <clinician-access-jwt>"
```

### POST `/clinician/patients/:patientId/consent/request`

Requests patient consent.

Path validation: `patientId` must be a UUID.

Body validation:

| Field | Validation |
| --- | --- |
| `scope` | Consent scope object or `null` |
| `expiresAt` | ISO date, allows `null` |
| `requestMessage` | String, max 500, allows `""` or `null` |

Body is optional.

Example:

```bash
curl -X POST http://localhost:3090/api/v1/clinician/patients/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2/consent/request \
  -H "Authorization: Bearer <clinician-access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": {
      "accessLevel": "READ_ONLY",
      "domains": ["screenings", "documents"],
      "includeHistory": true,
      "note": "Initial review"
    },
    "requestMessage": "Please approve access for your care team."
  }'
```

### POST `/clinician/patients/:patientId/consent/revoke`

Revokes active or requested consent.

Path validation: `patientId` must be a UUID.

Body validation:

| Field | Validation |
| --- | --- |
| `reason` | String, max 500, allows `""` or `null` |

Body is optional.

Example:

```bash
curl -X POST http://localhost:3090/api/v1/clinician/patients/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2/consent/revoke \
  -H "Authorization: Bearer <clinician-access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "No longer treating this patient" }'
```

### GET `/clinician/patients/:patientId/timeline`

Path validation: `patientId` must be a UUID.

Query validation:

| Query | Validation |
| --- | --- |
| `screeningLimit` | Integer, 1 to 200, default `50` |
| `dueItemLimit` | Integer, 1 to 200, default `50` |
| `documentLimit` | Integer, 1 to 200, default `50` |
| `feedbackLimit` | Integer, 1 to 200, default `20` |

Example:

```bash
curl "http://localhost:3090/api/v1/clinician/patients/2f44c212-cb4d-4fb4-a83d-f6b2a8e09ed2/timeline?screeningLimit=25&documentLimit=25" \
  -H "Authorization: Bearer <clinician-access-jwt>"
```

## Endpoint Index

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/healthz` | Public |
| GET | `/readyz` | Public |
| GET | `/api/v1/` | Public |
| POST | `/auth/signup` | Public |
| POST | `/auth/signin` | Public |
| POST | `/auth/social-signin` | Public |
| POST | `/auth/refresh` | Public |
| POST | `/auth/logout` | Public |
| POST | `/auth/check-email` | Public |
| POST | `/auth/send-verification-code` | Public |
| POST | `/auth/verify-user-code` | Public |
| POST | `/auth/forgot-password` | Public |
| POST | `/auth/verify-reset-code` | Public |
| POST | `/auth/reset-password` | Public |
| GET | `/me/profile` | User |
| POST | `/me/profile` | User |
| PATCH | `/me/profile` | User |
| DELETE | `/me/profile` | User |
| GET | `/me/wallet/documents` | User |
| GET | `/me/wallet/documents/search` | User |
| GET | `/me/wallet/documents/:id` | User |
| POST | `/me/wallet/uploads/presign` | User |
| PUT | `/me/wallet/uploads/pending` | User |
| POST | `/me/wallet/documents` | User |
| PATCH | `/me/wallet/documents/:id` | User |
| POST | `/me/wallet/links` | User |
| DELETE | `/me/wallet/documents/:id` | User |
| POST | `/me/feedback` | User |
| GET | `/me/feedback` | User |
| DELETE | `/me/feedback/:id` | User |
| POST | `/me/immunisations` | User |
| GET | `/me/immunisations` | User |
| GET | `/me/immunisations/upcoming` | User |
| GET | `/me/immunisations/summary` | User |
| GET | `/me/immunisations/:id` | User |
| PATCH | `/me/immunisations/:id` | User |
| DELETE | `/me/immunisations/:id` | User |
| GET | `/me/pregnancy-plan` | User |
| PUT | `/me/pregnancy-plan` | User |
| PATCH | `/me/pregnancy-plan/checkups/:name` | User |
| DELETE | `/me/pregnancy-plan` | User |
| POST | `/internal/screenings/seed` | Admin |
| GET | `/me/screenings/definitions` | User |
| GET | `/me/screenings/plans` | User |
| PUT | `/me/screenings/plans/:screeningCode` | User |
| GET | `/me/screenings/due-items` | User |
| GET | `/me/screenings/cancer-snapshot` | User |
| PUT | `/me/screenings/cancer-snapshot` | User |
| DELETE | `/me/screenings/cancer-snapshot` | User |
| GET | `/me/screenings/health-snapshot` | User |
| PUT | `/me/screenings/health-snapshot` | User |
| DELETE | `/me/screenings/health-snapshot` | User |
| GET | `/me/screenings/practice-contacts` | User |
| PUT | `/me/screenings/practice-contacts` | User |
| DELETE | `/me/screenings/practice-contacts` | User |
| POST | `/me/screenings/records` | User |
| GET | `/me/screenings/records` | User |
| GET | `/me/screenings/records/:recordId` | User |
| POST | `/me/screenings/history/import` | User |
| GET | `/me/consents/requests` | Patient/Admin |
| POST | `/me/consents/:consentId/approve` | Patient/Admin |
| POST | `/me/consents/:consentId/decline` | Patient/Admin |
| POST | `/me/consents/:consentId/revoke` | Patient/Admin |
| GET | `/clinician/profile` | Clinician/Admin |
| PUT | `/clinician/profile` | Clinician/Admin |
| GET | `/clinician/patients` | Clinician/Admin |
| POST | `/clinician/patients/link-by-email` | Clinician/Admin |
| POST | `/clinician/patients/:patientId/link` | Clinician/Admin |
| DELETE | `/clinician/patients/:patientId/link` | Clinician/Admin |
| POST | `/clinician/patients/:patientId/consent/request` | Clinician/Admin |
| POST | `/clinician/patients/:patientId/consent/revoke` | Clinician/Admin |
| GET | `/clinician/patients/:patientId/timeline` | Clinician/Admin |
