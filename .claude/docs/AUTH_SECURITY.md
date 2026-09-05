# FlyGACA Authentication Security

## Overview

FlyGACA implements a comprehensive, self-hosted authentication system replacing Firebase Auth. The system includes:

- **Email/password authentication** with scrypt hashing
- **OAuth 2.0** integration (Google, Apple)
- **Session management** with HttpOnly JWT cookies
- **Email verification** with time-limited tokens
- **Password reset** with email verification
- **Account lockout** protection against brute force
- **Audit trail** for PDPL compliance
- **Rate limiting** on credential endpoints

## Password Policy

All passwords must meet **ALL** four rules (enforced on both client and server):

1. **Length**: Minimum 8 characters
2. **Mixed case**: At least one uppercase AND one lowercase letter
3. **Digit**: At least one number (0-9)
4. **Special character**: At least one non-alphanumeric character (!, @, #, $, %, ^, &, *, etc.)

### Implementation

**Server:** `server/src/auth-core.ts` — `PASSWORD_RULES` and `meetsPasswordPolicy()`  
**Client:** `src/calc/app/passwordPolicy.ts` — Mirror implementation for UX validation

The implementations are synchronized and tested in `tests/client-server-mirrors.test.ts`.

## Authentication Flows

### Email/Password Sign-Up

```
POST /api/auth/register
├─ Validate email format
├─ Validate password against policy
├─ Check email not already in use
├─ Hash password with scrypt (16-byte salt, 64-byte key)
├─ Create user record
├─ Generate time-limited verification token (24 hours)
├─ Send verification email
├─ Establish session cookie
├─ Log audit event
└─ Return user to client
```

**Error codes:**
- `auth/invalid-email` — Invalid email format
- `auth/weak-password` — Password doesn't meet policy
- `auth/email-already-in-use` — Account exists

### Email/Password Sign-In

```
POST /api/auth/login
├─ Find user by email
├─ Verify password (constant-time comparison)
├─ Check if account is locked (too many failed attempts)
├─ Establish session cookie
├─ Record successful login (last_login_at)
├─ Log audit event
└─ Return user to client
```

**Protection mechanisms:**
- Identical error message for "no account" + "wrong password" (no enumeration)
- Rate limiting: 20 requests per 15 minutes per IP
- Account lockout: After N failed attempts, account locked for 30 minutes
- Failed attempt tracking for investigation

**Error codes:**
- `auth/invalid-credential` — Wrong email or password
- `auth/too-many-requests` — Account locked after failed attempts

### Email Verification

```
POST /api/auth/verify-email/resend
├─ Check user is authenticated
├─ Skip if email already verified
├─ Generate time-limited verification token (24 hours)
├─ Send verification email
└─ Log audit event

GET /api/auth/verify-email/confirm?token=...
├─ Consume one-time token (digest validation)
├─ Mark email as verified
├─ Establish session
└─ Redirect with status
```

**Token security:**
- Tokens are 32-byte random values (base64url encoded)
- Only SHA-256 digest is stored in database
- Database read cannot mint valid links
- Tokens are single-use (consumed on verification)

### Password Reset

```
POST /api/auth/password-reset
├─ Validate email format
├─ Find user (no-enumeration: always return 200)
├─ Generate time-limited reset token (1 hour TTL)
├─ Send password reset email
├─ Log audit event
└─ Return 200 (even if email doesn't exist)

POST /api/auth/password-reset/confirm
├─ Validate reset token
├─ Validate new password against policy
├─ Hash password with scrypt
├─ Mark email as verified (reset proves mailbox control)
├─ Establish session
├─ Log audit event
└─ Return success
```

**Design:**
- Short TTL (1 hour) for reset tokens
- Reset automatically verifies email
- Rate limited to prevent spam

### Google OAuth

```
GET /api/auth/google/start?returnTo=...
├─ Generate cryptographic state token (CSRF protection)
├─ Store state + return URL (5 minute TTL)
└─ Redirect to Google authorization

GET /api/auth/google/callback?code=...&state=...
├─ Validate state token
├─ Exchange code for access token
├─ Fetch user info (email, name, email_verified)
├─ Match on Google subject ID (stable across email changes)
├─ If not found, try email-based linking with verification checks
├─ Create or update user
├─ Establish session
├─ Log audit event (google-signin or google-link)
└─ Redirect to returnTo
```

**Email linking policy:**
- Matching by Google subject ID is primary (prevents conflicts)
- Email-based linking only allowed when:
  - Google has verified the email AND
  - The existing account either verified it too OR has no password
- Prevents account takeover via unverified emails

## Brute-Force Protection

### Account Lockout

After **20 failed login attempts in 15 minutes**, the account is locked for 30 minutes.

- **Tracking:** Per `user_id` in `auth_failures` table
- **Lockout storage:** `account_security.locked_until`
- **Check:** On each login attempt
- **Unlock:** Automatic when `locked_until` timestamp expires

### IP-Based Rate Limiting

- **Login/register/reset:** 20 requests per 15 minutes per IP (via `express-rate-limit`)
- **Failed attempts tracked:** Per IP in `auth_failures` table for investigation

### Implementation

See `server/src/audit-core.ts` for policy thresholds:

```ts
defaultBruteForcePolicy: {
  loginFailuresPerAccount: 20,       // Lock after 20 failures
  loginFailuresPerIp: 10,            // Warn after 10 per IP
  registrationAttemptsPerIp: 5,      // Track registration spam
  lockoutDurationMs: 30 * 60 * 1000, // 30 minute lockout
  windowMs: 15 * 60 * 1000,          // 15 minute window
}
```

## Audit Trail

All authentication events are logged in `auth_events` table with:

- `event_type` — register, login, logout, password-reset-request, password-reset-confirm, email-verify-request, email-verify-confirm, google-link, apple-link, oauth-google-signin, oauth-apple-signin
- `result` — success, failed, blocked
- `reason` — why (e.g., invalid-password, rate-limited, account-locked)
- `client_ip` — source IP
- `user_agent` — browser/app info
- `created_at` — event timestamp

### PDPL Compliance

- Audit trail is immutable (no DELETEs allowed by design)
- Can answer "who accessed this account and when"
- Failed attempts enable investigation of suspicious activity
- Last successful login tracked for user notification of new devices

## Session Management

### Cookie Security

- **HttpOnly:** Inaccessible to JavaScript (prevents XSS token theft)
- **Secure:** Only sent over HTTPS in production
- **SameSite:** 
  - `Lax` for same-domain apps
  - `None` (+ Secure) for cross-site SPAs
- **Expires:** Configurable TTL (default 30 days)
- **Path:** `/` (entire origin)

### Token Claims

JWT tokens contain only `sub` (user ID). All other data (email, roles, permissions) is loaded from the database on each request:

- Immediate revocation: Disabled accounts/sessions take effect instantly
- No stale data: Permissions checked fresh per request
- Reduced token size: Only 1 claim in addition to standard JWT fields

### Token Verification

Tokens must pass **all** three checks:

1. **Signature:** HS256 with server secret
2. **Issuer:** `iss: flygaca-api`
3. **Audience:** `aud: flygaca-app`

Prevents token reuse across services even if secrets are shared.

### Fallback for Legacy Tokens

During the Firebase→Express migration, legacy tokens without issuer/audience claims are accepted for 1 TTL period (30 days). After that, only new tokens with claims are valid.

## Security Best Practices

### What We Do

✅ **Parameterized queries** — All database interactions use prepared statements  
✅ **Constant-time password comparison** — Using `timingSafeEqual`  
✅ **No enumeration** — Same error codes for invalid email and wrong password  
✅ **Helmet.js** — CSP, HSTS, X-Frame-Options, etc.  
✅ **CORS allowlist** — Explicit origins, no wildcards  
✅ **Rate limiting** — Per IP, per account where applicable  
✅ **No logging secrets** — Tokens, passwords never in logs  
✅ **Audit trail** — All auth events for investigation  
✅ **Email verification** — Time-limited tokens, single-use  
✅ **HTTPS enforcement** — Secure flag in production  

### What We Don't Do

❌ **Storing tokens in localStorage** — Would be vulnerable to XSS  
❌ **Bearer tokens in frontend** — Web only uses cookies  
❌ **Wildcard CORS** — Explicit origin validation  
❌ **Password hints in error messages** — No "password must contain uppercase"  
❌ **Unlimited login attempts** — Rate limited + lockout  
❌ **SMS-based 2FA** — Carrier interception risk; could add TOTP if needed  

## Testing

Unit tests for auth logic:

```bash
npm --prefix server run test -- auth-core
```

Integration tests (requires local database):

```bash
npm --prefix server run test -- routes/auth
```

Client-server mirror tests (ensure password policy matches):

```bash
npm test -- client-server-mirrors
```

## Configuration

Environment variables:

```env
# Session
SESSION_SECRET=<32+ char random string>    # HS256 signing secret (Secret Manager)
SESSION_TTL_DAYS=30                         # JWT expiration
SESSION_COOKIE_NAME=__session               # HttpOnly cookie name
SESSION_COOKIE_DOMAIN=                      # Empty = cross-site SPA

# OAuth
GOOGLE_CLIENT_ID=<from Google Console>
GOOGLE_CLIENT_SECRET=<from Secret Manager>
APPLE_CLIENT_ID=<from Apple Developer>
APPLE_CLIENT_SECRET=<from Secret Manager>

# Email
MAIL_ENDPOINT=https://api.resend.com/emails
MAIL_API_KEY=<from Secret Manager>
MAIL_FROM=noreply@flygaca.com
```

## Monitoring & Alerts

### Key Metrics

- Failed login attempts per user (spike = targeted attack)
- Locked accounts (count of accounts in lockout)
- Registration velocity per IP (spike = spam)
- Email verification failures (technical issues?)
- OAuth failures by provider (integration problem?)

### Queries

```sql
-- Account lockout status
SELECT user_id, locked_until FROM account_security 
WHERE locked_until > now();

-- Failed login attempts (last 24 hours)
SELECT user_id, COUNT(*) as attempts, client_ip
FROM auth_failures 
WHERE event_type = 'login' AND attempt_at > now() - interval '24 hours'
GROUP BY user_id, client_ip
HAVING COUNT(*) > 10;

-- Password reset activity
SELECT COUNT(*) as resets
FROM auth_events 
WHERE event_type = 'password-reset-confirm' 
AND result = 'success'
AND created_at > now() - interval '24 hours';
```

## Future Enhancements

1. **TOTP multi-factor authentication** (NIST-approved, no SMS)
2. **Backup codes** for account recovery without email
3. **Device fingerprinting** (optional, for step-up auth)
4. **Suspicious activity detection** (multiple IPs, rapid location changes)
5. **Login notifications** (email when accessed from new device)
6. **Session management UI** (revoke sessions on other devices)
7. **Hardware security keys** (WebAuthn/FIDO2, if demand justifies)

## References

- [NIST SP 800-63B: Authentication & Lifecycle Management](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [RFC 6265: HTTP State Management Mechanism (Cookies)](https://tools.ietf.org/html/rfc6265)
- [RFC 7519: JSON Web Tokens (JWT)](https://tools.ietf.org/html/rfc7519)
