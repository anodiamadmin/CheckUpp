# Checkupp Auth API Documentation

This document covers only the authentication endpoints and auth behavior for the Checkupp backend.

Default local base URL:

```text
http://localhost:3090/api/v1
```

The prefix is controlled by `API_PREFIX` and defaults to `/api/v1`.

## Auth Endpoint Index

All auth endpoints are public unless noted. Protected API modules use the access token returned by sign-in, social sign-in, or refresh.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/auth/signup` | Create user and send register verification code |
| `POST` | `/auth/signin` | Sign in with email and password |
| `POST` | `/auth/social-signin` | Sign in with Google or Apple identity token |
| `POST` | `/auth/refresh` | Rotate access and refresh tokens |
| `POST` | `/auth/logout` | Revoke access and/or refresh session tokens |
| `POST` | `/auth/check-email` | Check whether an email exists and is verified |
| `POST` | `/auth/send-verification-code` | Send register verification code |
| `POST` | `/auth/verify-user-code` | Verify register code and mark email verified |
| `POST` | `/auth/forgot-password` | Send password reset code if account exists |
| `POST` | `/auth/verify-reset-code` | Check reset code without consuming it |
| `POST` | `/auth/reset-password` | Consume reset code and set a new password |

## Response Format

Successful auth responses usually use:

```json
{
  "success": true,
  "message": "Signed in successfully",
  "data": {}
}
```

Some simple success responses omit `data`:

```json
{
  "success": true,
  "message": "Signed out successfully"
}
```

Validation failures return `400`:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["\"code\" with value \"abc\" fails to match the required pattern: /^\\d{6}$/"]
}
```

Application errors return:

```json
{
  "success": false,
  "message": "Invalid refresh token"
}
```

## Auth Concepts

### Tokens

Email/password sign-in, social sign-in, and refresh return two tokens:

| Token | Usage |
| --- | --- |
| `token` | Access JWT. Send as `Authorization: Bearer <token>` to protected endpoints. |
| `refreshToken` | Refresh JWT. Send to `/auth/refresh` to rotate both tokens. |

Default token lifetimes:

| Env | Default |
| --- | --- |
| `ACCESS_TOKEN_TTL_MS` | `3600000` |
| `REFRESH_TOKEN_TTL_MS` | `2592000000` |

Access tokens are session-bound. The server stores token hashes in `AuthSession`; logout and reset password revoke matching or active sessions.

### Protected Endpoint Header

Use this header for authenticated API calls outside this auth router:

```http
Authorization: Bearer <access-jwt>
```

### Dev Auth Mode

When `AUTH_MODE=dev`, protected endpoints do not use JWT auth. Send one of:

```http
x-user-id: <uuid-or-dev-id>
x-user-email: demo@checkupp.local
```

Optional:

```http
x-user-role: PATIENT | CLINICIAN | ADMIN
x-user-name: Demo User
```

If the dev user does not exist, the middleware creates one.

### Email Verification Requirement

When `AUTH_REQUIRE_EMAIL_VERIFICATION=true`, `/auth/signin` rejects unverified email/password users with `403`.

The response includes details:

```json
{
  "success": false,
  "message": "Please verify your email before signing in",
  "details": {
    "code": "EMAIL_NOT_VERIFIED",
    "email": "patient@example.com"
  }
}
```

### Role Signup

`/auth/signup` accepts a `role`, but it is ignored unless:

```text
AUTH_ALLOW_ROLE_SIGNUP=true
```

When role signup is disabled, new users are created as `PATIENT`.

Allowed roles:

```text
PATIENT
CLINICIAN
ADMIN
```

### App-Specific Email Links

Endpoints that send auth emails require `appType`.

Allowed values:

| `appType` | URL base env | Default |
| --- | --- | --- |
| `mobile` | `MOBILE_APP_URL` | `healthpassport://` |
| `web` | `WEB_APP_URL` | `http://localhost:3000` |

Verification email action URL:

```text
<base-url>/verify-email?email=<email>
```

Password reset email action URL:

```text
<base-url>/reset-password?email=<email>&code=<code>
```

If `MOBILE_APP_URL` ends with `://`, the backend appends the action path directly. Example:

```text
healthpassport://verify-email?email=patient%40example.com
```

### Verification Codes

| Code type | Endpoint that sends it | Endpoint that verifies or consumes it | Expiry |
| --- | --- | --- | --- |
| Register | `/auth/signup`, `/auth/send-verification-code` | `/auth/verify-user-code` | 10 minutes |
| Reset | `/auth/forgot-password` | `/auth/verify-reset-code`, `/auth/reset-password` | 15 minutes |

Register verification codes are consumed by `/auth/verify-user-code`.

Reset codes are checked but not consumed by `/auth/verify-reset-code`. They are consumed by `/auth/reset-password`.

Sending a new code deletes previous unused codes of the same type for that user.

### Email Delivery

`EMAIL_DELIVERY` controls delivery:

| Value | Behavior |
| --- | --- |
| `log` | Prints a JSON payload to server logs with `to`, `subject`, `code`, `actionUrl`, and plain text |
| `smtp` | Sends through SMTP |

SMTP mode requires:

```text
SMTP_HOST
SMTP_USER
SMTP_PASS
```

Optional SMTP/env fields:

```text
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_FROM=Checkupp <no-reply@checkupp.local>
```

### Social Auth

Supported providers:

```text
google
apple
```

The backend verifies:

| Check | Google | Apple |
| --- | --- | --- |
| JWKS URL | `https://www.googleapis.com/oauth2/v3/certs` | `https://appleid.apple.com/auth/keys` |
| Issuer | `accounts.google.com`, `https://accounts.google.com` | `https://appleid.apple.com` |
| Algorithm | `RS256` | `RS256` |
| Audience | Must match `GOOGLE_OAUTH_CLIENT_IDS` | Must match `APPLE_OAUTH_CLIENT_IDS` |
| Expiry | Required and must be in the future | Required and must be in the future |

Social sign-in links by provider user ID first. If no linked social account exists, it falls back to matching by email. If no user exists and the token contains an email, the backend creates a new `PATIENT` user.

Apple identities are treated as email verified by the current implementation. Google identities are email verified only when the token says `email_verified` is true.

## Validation Rules

Joi validation is configured with:

| Option | Value |
| --- | --- |
| `abortEarly` | `false` |
| `allowUnknown` | `false` |
| `stripUnknown` | `true` |
| `convert` | `true` |

Auth primitives:

| Field | Validation |
| --- | --- |
| `email` | Required valid email, lowercased and trimmed |
| `password` | Required string, min 8, max 128 |
| `newPassword` | Required string, min 8, max 128 |
| `code` | Required string matching exactly 6 digits |
| `appType` | Required, `mobile` or `web` |
| `provider` | Required, `google` or `apple` |
| `idToken` | Required string |
| `refreshToken` | Required string for refresh; optional for logout |

## Full Client Auth Flows

This section is the frontend playbook. It describes when each endpoint should be called, what screen usually calls it, what to store, and how to handle important responses.

### Frontend State To Store

After any successful token response from `/auth/signin`, `/auth/social-signin`, or `/auth/refresh`, store:

| Field | Source | Purpose |
| --- | --- | --- |
| `user` | `data.user` | Current signed-in user |
| `accessToken` | `data.token` | Bearer token for protected API calls |
| `refreshToken` | `data.refreshToken` | Token used to refresh the session |
| `expiresAt` | `data.expiresAt` | Access token expiry |
| `refreshExpiresAt` | `data.refreshExpiresAt` | Refresh token expiry |

Use the access token on protected endpoints:

```http
Authorization: Bearer <accessToken>
```

Recommended mobile storage:

| Data | Storage |
| --- | --- |
| `accessToken`, `refreshToken` | Secure storage/keychain |
| `user`, expiry timestamps | Secure storage or app state hydrated from secure storage |

Do not store the password. Do not store verification or reset codes after the flow is complete.

### App Startup / Restore Session

When the app opens:

1. Read `accessToken`, `refreshToken`, `expiresAt`, and `refreshExpiresAt` from storage.
2. If there is no refresh token, show the signed-out stack.
3. If `refreshExpiresAt` is in the past, clear stored auth and show the signed-out stack.
4. If the access token exists and `expiresAt` is still valid, show the signed-in app.
5. If the access token is missing or expired but refresh token is still valid, call `POST /auth/refresh`.
6. If refresh succeeds, replace all stored auth values and show the signed-in app.
7. If refresh returns `401`, clear stored auth and show the signed-out stack.

Refresh request:

```json
{
  "refreshToken": "<refreshToken>"
}
```

Refresh success gives a full token response:

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "user": {},
    "token": "<new-access-jwt>",
    "refreshToken": "<new-refresh-jwt>",
    "expiresAt": "2026-05-26T13:00:00.000Z",
    "refreshExpiresAt": "2026-06-25T12:00:00.000Z"
  }
}
```

### Signup With Email And Password

Used by the signup/register screen.

1. User enters email, password, optional name, optional phone number.
2. Client calls `POST /auth/signup`.
3. Backend creates the user with `emailVerified=false`.
4. Backend sends a 6-digit register verification code to email.
5. Client navigates to the email verification screen.
6. Client keeps the email in local screen state so the user does not need to type it again.

Signup request:

```json
{
  "email": "patient@example.com",
  "password": "StrongPass123",
  "name": "Patient Example",
  "phoneNumber": "+61400000000",
  "appType": "mobile"
}
```

Use `appType` based on the client:

| Client | `appType` |
| --- | --- |
| Mobile app | `mobile` |
| Web app | `web` |

Signup success:

```json
{
  "success": true,
  "message": "User created successfully. Please verify your account.",
  "data": {
    "user": {
      "email": "patient@example.com",
      "emailVerified": false
    },
    "requiresVerification": true
  }
}
```

What the frontend should do:

| Response | Frontend action |
| --- | --- |
| `201` | Navigate to verify email screen |
| `400` validation | Show field errors or a generic validation message |
| `409 User with this email already exists` | Send user to sign-in or forgot password |
| `500` email delivery/config | Show "Could not send verification email" and allow retry |

Important: signup does not return auth tokens. The user must verify their email, then sign in.

### Verify Email After Signup

Used by the verification code screen after signup.

1. User enters the 6-digit code from email.
2. Client calls `POST /auth/verify-user-code`.
3. Backend verifies and consumes the register code.
4. Backend marks `emailVerified=true`.
5. Client can either call `POST /auth/signin` automatically using the email/password still in memory, or navigate to the sign-in screen.

Verify request:

```json
{
  "email": "patient@example.com",
  "code": "123456"
}
```

Verify success:

```json
{
  "success": true,
  "message": "User verified successfully",
  "data": {
    "user": {
      "email": "patient@example.com",
      "emailVerified": true
    }
  }
}
```

What the frontend should do:

| Response | Frontend action |
| --- | --- |
| `200` | Continue to sign-in or auto sign-in |
| `400 Validation failed` | Code is not exactly 6 digits |
| `400 Invalid or expired verification code` | Show invalid/expired code and offer resend |

### Resend Verification Code

Used from the verification screen when the user taps "Resend code".

Call `POST /auth/send-verification-code`.

Request:

```json
{
  "email": "patient@example.com",
  "appType": "mobile"
}
```

What happens:

1. Backend deletes any previous unused register code for that user.
2. Backend creates a new 6-digit code.
3. Backend sends the new code by email.
4. The old code no longer works.

What the frontend should do:

| Response | Frontend action |
| --- | --- |
| `200` | Show "New code sent" |
| `400 User is already verified` | Move user to sign-in |
| `404 User not found` | Ask the user to go back and sign up again |

### Sign In With Email And Password

Used by the login screen.

1. User enters email and password.
2. Client calls `POST /auth/signin`.
3. If successful, store auth state and enter the signed-in app.

Signin request:

```json
{
  "email": "patient@example.com",
  "password": "StrongPass123"
}
```

Signin success:

```json
{
  "success": true,
  "message": "Signed in successfully",
  "data": {
    "user": {
      "email": "patient@example.com",
      "emailVerified": true
    },
    "token": "<access-jwt>",
    "refreshToken": "<refresh-jwt>",
    "expiresAt": "2026-05-26T13:00:00.000Z",
    "refreshExpiresAt": "2026-06-25T12:00:00.000Z"
  }
}
```

What the frontend should do:

| Response | Frontend action |
| --- | --- |
| `200` | Store tokens and user, then enter signed-in app |
| `400 Validation failed` | Show validation message |
| `401 Invalid email or password` | Show generic invalid credentials message |
| `403 EMAIL_NOT_VERIFIED` | Navigate to verify email screen and offer resend |

Unverified user response:

```json
{
  "success": false,
  "message": "Please verify your email before signing in",
  "details": {
    "code": "EMAIL_NOT_VERIFIED",
    "email": "patient@example.com"
  }
}
```

Recommended handling for `EMAIL_NOT_VERIFIED`:

1. Store `details.email` in screen state.
2. Call `POST /auth/send-verification-code` if the user taps resend.
3. Let the user enter the code.
4. Call `POST /auth/verify-user-code`.
5. Send the user back to sign-in, or retry sign-in if the password is still in memory.

### Check Email Before Login Or Signup

This endpoint is optional. It is useful when the UI wants to decide whether to show sign-in, signup, or verification prompts before asking for a password.

Call `POST /auth/check-email`.

Request:

```json
{
  "email": "patient@example.com"
}
```

Possible results:

| `exists` | `emailVerified` | Meaning | Frontend action |
| --- | --- | --- | --- |
| `false` | `false` | No active account | Continue signup |
| `true` | `false` | Account exists but email is unverified | Show verify email or resend code |
| `true` | `true` | Account exists and can sign in | Show password field |

Do not use this endpoint as security. It is only a UX helper.

### Forgot Password

Used when the user taps "Forgot password?".

1. User enters email.
2. Client calls `POST /auth/forgot-password`.
3. Backend sends a reset code if an active password account exists.
4. The response is always success so the API does not reveal whether the account exists.
5. Client navigates to reset code/new password screen.

Forgot password request:

```json
{
  "email": "patient@example.com",
  "appType": "mobile"
}
```

Success response:

```json
{
  "success": true,
  "message": "If an account exists, a password reset code has been sent."
}
```

What the frontend should do:

| Response | Frontend action |
| --- | --- |
| `200` | Always show the reset-code screen or "check your email" message |
| `400 Validation failed` | Show email/app type validation message |

Important: do not show "email not found" for this flow. The backend intentionally hides that.

### Verify Reset Code Before New Password

This step is optional but recommended when the reset UI has separate screens:

1. User enters the 6-digit reset code.
2. Client calls `POST /auth/verify-reset-code`.
3. If valid, show the new password form.
4. If invalid, keep the user on the code screen.

Request:

```json
{
  "email": "patient@example.com",
  "code": "123456"
}
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

Invalid response:

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

What the frontend should do:

| Response | Frontend action |
| --- | --- |
| `200` and `codeValid=true` | Show new password form |
| `400` and `codeValid=false` | Show invalid/expired code, allow retry or resend |

This endpoint does not consume the reset code. The same code must still be sent to `/auth/reset-password`.

### Reset Password

Used after the user has the reset code and enters a new password.

1. User enters reset code and new password.
2. Client calls `POST /auth/reset-password`.
3. Backend consumes the reset code.
4. Backend updates the password.
5. Backend marks the email as verified.
6. Backend revokes all active sessions for that user.
7. Client clears any stored auth for that account.
8. Client sends user to sign-in with the new password.

Reset request:

```json
{
  "email": "patient@example.com",
  "code": "123456",
  "newPassword": "NewStrongPass123"
}
```

Success response:

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

What the frontend should do:

| Response | Frontend action |
| --- | --- |
| `200` | Clear stored auth and navigate to sign-in |
| `400 Validation failed` | Show password/code validation message |
| `400 Invalid or expired reset code` | Show invalid/expired code and offer resend |

Important: reset password does not return tokens. The user signs in again after reset.

### Social Sign-In

Used by "Continue with Google" or "Continue with Apple" buttons.

1. Client uses the platform provider SDK to authenticate the user.
2. Provider SDK returns an `idToken`.
3. Client calls `POST /auth/social-signin`.
4. Backend verifies provider issuer, audience, expiry, and signature.
5. Backend links to an existing social account, matches by email, or creates a new `PATIENT` user.
6. Backend returns the normal token response.
7. Client stores auth state and enters the signed-in app.

Request:

```json
{
  "provider": "google",
  "idToken": "<provider-id-token>"
}
```

Success handling is the same as email/password sign-in:

| Response | Frontend action |
| --- | --- |
| `200` | Store tokens and user, then enter signed-in app |
| `400 Social identity token did not include an email` | Show provider account cannot be used |
| `401` token errors | Ask user to retry provider sign-in |
| `500 Social auth audiences are not configured` | Backend/provider config problem |
| `502 Could not fetch social provider signing keys` | Provider/backend network problem, allow retry |

Provider configuration must match the client:

| Client | Env that must contain its client ID |
| --- | --- |
| Google web/iOS/Android | `GOOGLE_OAUTH_CLIENT_IDS` |
| Apple bundle/service ID | `APPLE_OAUTH_CLIENT_IDS` |

### Access Token Expired During An API Call

When a protected API call returns `401` because the access token is missing, expired, revoked, or invalid:

1. If the client has no refresh token, clear auth and show sign-in.
2. If a refresh request is already in progress, wait for it instead of starting another one.
3. Call `POST /auth/refresh` with the refresh token.
4. If refresh succeeds, store the new tokens.
5. Retry the original failed request once with the new access token.
6. If refresh fails with `401`, clear auth and show sign-in.

Do not retry endlessly. Retry the original request only once after a successful refresh.

### Logout

Used when the user taps "Log out".

1. Client calls `POST /auth/logout`.
2. Send the access token in the `Authorization` header if available.
3. Send the refresh token in the body if available.
4. Backend revokes any matching session token hashes.
5. Client clears local auth storage.
6. Client returns to signed-out navigation.

Request:

```http
POST /auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "refreshToken": "<refreshToken>"
}
```

Success response:

```json
{
  "success": true,
  "message": "Signed out successfully"
}
```

Client should clear local auth even if logout fails due to network issues, because the user's intent is to leave the session on this device. If logout fails, the server-side session may remain valid until expiry or a later successful logout/reset.

### Endpoint Usage By Screen

| Screen/action | Endpoint |
| --- | --- |
| Signup submit | `POST /auth/signup` |
| Verify signup code submit | `POST /auth/verify-user-code` |
| Resend signup verification code | `POST /auth/send-verification-code` |
| Login submit | `POST /auth/signin` |
| Optional email pre-check | `POST /auth/check-email` |
| Google/Apple button submit | `POST /auth/social-signin` |
| Forgot password submit email | `POST /auth/forgot-password` |
| Reset password code check | `POST /auth/verify-reset-code` |
| Reset password submit | `POST /auth/reset-password` |
| App startup/session restore | `POST /auth/refresh` when access token is expired |
| API request receives `401` | `POST /auth/refresh`, then retry original request once |
| Logout button | `POST /auth/logout` |

### Complete Email Signup Sequence

```text
User fills signup form
  -> POST /auth/signup
  <- 201 user created, verification email sent
Show verify email screen
User enters code
  -> POST /auth/verify-user-code
  <- 200 emailVerified=true
Sign user in
  -> POST /auth/signin
  <- 200 token + refreshToken + user
Store auth state
Enter signed-in app
```

### Complete Password Reset Sequence

```text
User taps forgot password
User enters email
  -> POST /auth/forgot-password
  <- 200 generic success
Show reset code screen
User enters code
  -> POST /auth/verify-reset-code
  <- 200 codeValid=true
Show new password form
User submits new password
  -> POST /auth/reset-password
  <- 200 password reset
Clear local auth state
Show sign-in screen
User signs in with new password
  -> POST /auth/signin
  <- 200 token + refreshToken + user
```

### Complete Social Sign-In Sequence

```text
User taps Continue with Google/Apple
Client opens provider SDK
Provider returns idToken
  -> POST /auth/social-signin
  <- 200 token + refreshToken + user
Store auth state
Enter signed-in app
```

## Shared Auth Response Objects

### Public User

Auth endpoints return this user shape:

```json
{
  "id": "9c06d72f-3ad1-4f14-bd42-96ef83f2d1b2",
  "email": "patient@example.com",
  "name": "Patient Example",
  "role": "PATIENT",
  "avatarUrl": null,
  "phoneNumber": "+61400000000",
  "emailVerified": true
}
```

### Token Response

Returned by `/auth/signin`, `/auth/social-signin`, and `/auth/refresh`.

```json
{
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
  "expiresAt": "2026-05-26T13:00:00.000Z",
  "refreshExpiresAt": "2026-06-25T12:00:00.000Z"
}
```

## Endpoints

### POST `/auth/signup`

Creates a user and sends a register verification code. This endpoint does not issue tokens.

Request body:

| Field | Required | Validation | Notes |
| --- | --- | --- | --- |
| `email` | Yes | Valid email, lowercased, trimmed | Stored normalized |
| `password` | Yes | String, 8 to 128 chars | Stored as password hash |
| `name` | No | String, 2 to 120 chars, trimmed | Defaults to email local part |
| `phoneNumber` | No | String, max 30, allows `""` or `null` | Empty value becomes `null` |
| `role` | No | `PATIENT`, `CLINICIAN`, `ADMIN` | Only honored when `AUTH_ALLOW_ROLE_SIGNUP=true` |
| `appType` | Yes | `mobile` or `web` | Controls email action link |

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

Success response: `201`

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

| Status | Message | Why |
| --- | --- | --- |
| `400` | `Validation failed` | Invalid email, password too short, missing `appType`, etc. |
| `409` | `User with this email already exists` | Email is already registered |
| `500` | SMTP/config error | Email delivery failed in SMTP mode |

### POST `/auth/signin`

Signs in with email and password. If `AUTH_REQUIRE_EMAIL_VERIFICATION=true`, the user must be verified first.

Request body:

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

Success response: `200`

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
    "expiresAt": "2026-05-26T13:00:00.000Z",
    "refreshExpiresAt": "2026-06-25T12:00:00.000Z"
  }
}
```

Errors:

| Status | Message | Why |
| --- | --- | --- |
| `400` | `Validation failed` | Invalid email or password shape |
| `401` | `Invalid email or password` | User not found, deleted, or password mismatch |
| `403` | `Please verify your email before signing in` | Email verification is required and user is not verified |

### POST `/auth/social-signin`

Signs in with a Google or Apple identity token. Creates a user if needed.

Request body:

| Field | Required | Validation | Notes |
| --- | --- | --- | --- |
| `provider` | Yes | `google` or `apple` | Provider names are lowercase |
| `idToken` | Yes | String | Provider identity token |
| `accessToken` | No | String | Accepted by validation, currently not used by service |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/social-signin \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "idToken": "<google-id-token>"
  }'
```

Success response: `200`

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
      "avatarUrl": "https://example.com/avatar.png",
      "phoneNumber": null,
      "emailVerified": true
    },
    "token": "<access-jwt>",
    "refreshToken": "<refresh-jwt>",
    "expiresAt": "2026-05-26T13:00:00.000Z",
    "refreshExpiresAt": "2026-06-25T12:00:00.000Z"
  }
}
```

Errors:

| Status | Message | Why |
| --- | --- | --- |
| `400` | `Social identity token did not include an email` | New user cannot be created without email |
| `401` | `Invalid social identity token` | Token cannot be decoded or is malformed |
| `401` | `Unsupported social identity token` | Token algorithm or key id is unsupported |
| `401` | `Invalid social identity token issuer` | `iss` does not match provider |
| `401` | `Invalid social identity token audience` | `aud` is not configured in env |
| `401` | `Expired social identity token` | `exp` is in the past |
| `401` | `Social identity token key was not found` | Token `kid` is absent from provider JWKS |
| `401` | `Invalid social identity token signature` | RSA signature verification failed |
| `403` | `User is disabled` | Matched user is soft-deleted |
| `500` | `Social auth audiences are not configured` | Provider client ID env is empty |
| `502` | `Could not fetch social provider signing keys` | Provider JWKS request failed |

### POST `/auth/refresh`

Rotates the current refresh token into a new access token and refresh token.

Request body:

| Field | Required | Validation |
| --- | --- | --- |
| `refreshToken` | Yes | String |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh-jwt>"
  }'
```

Success response: `200`

```json
{
  "success": true,
  "message": "Token refreshed successfully",
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
    "token": "<new-access-jwt>",
    "refreshToken": "<new-refresh-jwt>",
    "expiresAt": "2026-05-26T13:00:00.000Z",
    "refreshExpiresAt": "2026-06-25T12:00:00.000Z"
  }
}
```

Errors:

| Status | Message | Why |
| --- | --- | --- |
| `400` | `Validation failed` | Missing `refreshToken` |
| `401` | `Invalid refresh token` | Invalid JWT, wrong token type, revoked session, expired refresh token, hash mismatch, missing user, or deleted user |

### POST `/auth/logout`

Revokes a matching access token, refresh token, or both. This route does not require authentication middleware, but it can read the bearer token if sent.

Request headers:

| Header | Required | Notes |
| --- | --- | --- |
| `Authorization` | No | `Bearer <access-jwt>`; used to revoke matching access session |

Request body:

| Field | Required | Validation |
| --- | --- | --- |
| `refreshToken` | No | String |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/logout \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh-jwt>"
  }'
```

Success response: `200`

```json
{
  "success": true,
  "message": "Signed out successfully"
}
```

Notes:

| Behavior |
| --- |
| If both bearer token and `refreshToken` are omitted, nothing is revoked and the endpoint still succeeds. |
| If either token matches a stored session token hash, that session is marked revoked. |

### POST `/auth/check-email`

Checks whether an email belongs to a non-deleted user and whether it is verified.

Request body:

| Field | Required | Validation |
| --- | --- | --- |
| `email` | Yes | Valid email, lowercased, trimmed |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/check-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com"
  }'
```

Success response: `200`

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

If the user does not exist or is deleted:

```json
{
  "success": true,
  "message": "Email checked successfully",
  "data": {
    "email": "missing@example.com",
    "exists": false,
    "emailVerified": false
  }
}
```

### POST `/auth/send-verification-code`

Sends a new register verification code. Any previous unused register code for that email/user is invalidated.

Request body:

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

Success response: `200`

```json
{
  "success": true,
  "message": "Verification code sent successfully"
}
```

Errors:

| Status | Message | Why |
| --- | --- | --- |
| `400` | `Validation failed` | Missing or invalid `email` or `appType` |
| `400` | `User is already verified` | User no longer needs register verification |
| `404` | `User not found` | Email has no active user |

### POST `/auth/verify-user-code`

Verifies a register verification code, consumes the code, and marks the user email as verified. This endpoint does not issue tokens.

Request body:

| Field | Required | Validation |
| --- | --- | --- |
| `email` | Yes | Valid email, lowercased, trimmed |
| `code` | Yes | Exactly 6 numeric digits |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/verify-user-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "code": "123456"
  }'
```

Success response: `200`

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

| Status | Message | Why |
| --- | --- | --- |
| `400` | `Validation failed` | Code is not exactly 6 digits |
| `400` | `Invalid or expired verification code` | No matching unused register code or code expired |

### POST `/auth/forgot-password`

Sends a password reset code if an active user with a password exists. The response intentionally does not reveal whether the email exists.

Request body:

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

Success response: `200`

```json
{
  "success": true,
  "message": "If an account exists, a password reset code has been sent."
}
```

Notes:

| Behavior |
| --- |
| If the email does not exist, the endpoint still returns success. |
| If the user is deleted, the endpoint still returns success. |
| If the user has no password hash, the endpoint still returns success and sends no code. |

### POST `/auth/verify-reset-code`

Checks whether a reset code is valid. This does not consume the reset code.

Request body:

| Field | Required | Validation |
| --- | --- | --- |
| `email` | Yes | Valid email, lowercased, trimmed |
| `code` | Yes | Exactly 6 numeric digits |

Example:

```bash
curl -X POST http://localhost:3090/api/v1/auth/verify-reset-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "code": "123456"
  }'
```

Valid response: `200`

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

Invalid response: `400`

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

Consumes a reset code, updates the password, marks the email as verified, and revokes all active sessions for the user.

Request body:

| Field | Required | Validation |
| --- | --- | --- |
| `email` | Yes | Valid email, lowercased, trimmed |
| `code` | Yes | Exactly 6 numeric digits |
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

Success response: `200`

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

Errors:

| Status | Message | Why |
| --- | --- | --- |
| `400` | `Validation failed` | Invalid email, code, or new password |
| `400` | `Invalid or expired reset code` | No matching unused reset code or code expired |

## Auth Environment Reference

```text
AUTH_MODE=jwt
JWT_SECRET=change-me-with-openssl-rand-hex-32
REFRESH_JWT_SECRET=change-me-with-a-different-openssl-rand-hex-32
ACCESS_TOKEN_TTL_MS=3600000
REFRESH_TOKEN_TTL_MS=2592000000
AUTH_REQUIRE_EMAIL_VERIFICATION=true
AUTH_ALLOW_ROLE_SIGNUP=false

EMAIL_DELIVERY=log
EMAIL_FROM=Checkupp <no-reply@checkupp.local>
WEB_APP_URL=http://localhost:3000
MOBILE_APP_URL=healthpassport://
FRONTEND_URL=http://localhost:8081

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-login
SMTP_PASS=your-smtp-key

GOOGLE_OAUTH_CLIENT_IDS=your_google_web_client_id,your_google_ios_client_id,your_google_android_client_id
APPLE_OAUTH_CLIENT_IDS=com.app.healthpassport
```

## Quick Test Commands

Signup:

```bash
curl -X POST http://localhost:3090/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@example.com","password":"StrongPass123","appType":"web"}'
```

Verify code:

```bash
curl -X POST http://localhost:3090/api/v1/auth/verify-user-code \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@example.com","code":"123456"}'
```

Sign in:

```bash
curl -X POST http://localhost:3090/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@example.com","password":"StrongPass123"}'
```

Refresh:

```bash
curl -X POST http://localhost:3090/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh-jwt>"}'
```

Logout:

```bash
curl -X POST http://localhost:3090/api/v1/auth/logout \
  -H "Authorization: Bearer <access-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh-jwt>"}'
```
