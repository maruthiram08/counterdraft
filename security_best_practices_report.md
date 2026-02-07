# Security Best Practices Report

## Executive Summary
I reviewed the Next.js (App Router) + React TypeScript codebase with a focus on high‑risk security patterns (authn/authz, SSRF, XSS, secrets handling, CSRF, CORS, and webhook verification). I found **1 Critical**, **3 High**, **3 Medium**, and **2 Low** findings. The most urgent issues are: committed secrets in `.env.local`, an unauthenticated SSRF/puppeteer endpoint, and unsanitized HTML rendering in the editor preview.

---

## Critical

### 1) [CRIT] Committed secrets in repo (.env.local)
- **Rule ID:** NEXT-SECRETS-001, REACT-CONFIG-001
- **Severity:** Critical
- **Location:**
  - `/Users/maruthi/Desktop/counterdraft/counterdraft/app/.env.local` (lines **1–32**)
  - `/Users/maruthi/Desktop/counterdraft/counterdraft/ops/.env.local` (lines **1–31**)
- **Evidence (redacted):**
  - `SUPABASE_SERVICE_ROLE_KEY=<redacted>`
  - `OPENAI_API_KEY=<redacted>`
  - `CLERK_SECRET_KEY=<redacted>`
  - `LINKEDIN_CLIENT_SECRET=<redacted>`
  - `RP_KEY_SECRET=<redacted>`
- **Impact:** Secrets in the repo can be exfiltrated by anyone with access (or by accidental sharing), enabling account takeover, data exfiltration, and paid‑API abuse.
- **Fix:** Remove `.env.local` files from the repo, rotate all exposed keys, and add `.env*` to `.gitignore`. Store secrets in a managed secret store or deployment environment variables.
- **Mitigation:** If rotation can’t happen immediately, revoke and scope keys, and audit for misuse.
- **False positive notes:** None. Files are present in repo and contain real key names.

---

## High

### 2) [HIGH] Unauthenticated SSRF + headless browser execution
- **Rule ID:** NEXT-SSRF-001, NEXT-DOS-001
- **Severity:** High
- **Location:** `/Users/maruthi/Desktop/counterdraft/counterdraft/app/src/app/api/utils/extract/route.ts` lines **9–105**
- **Evidence:**
  - `const response = await fetch(url, ...)` (line 21)
  - `await page.goto(url, ...)` (line 93)
  - No auth or URL validation before fetch/browser use
- **Impact:** Anyone can trigger server‑side fetches and headless browsing to arbitrary URLs, enabling SSRF (internal metadata hits) and expensive resource abuse.
- **Fix:** Require auth, add strict URL allowlisting + private IP blocking, enforce timeouts/redirect limits, and add rate limits. Consider moving to a queued job for puppeteer.
- **Mitigation:** Disable puppeteer path in production until controls are in place.
- **False positive notes:** None. The endpoint is public and accepts user‑controlled URLs.

### 3) [HIGH] Stored/Reflected XSS in editor preview
- **Rule ID:** REACT-XSS-001, REACT-MARKUP-001
- **Severity:** High
- **Location:** `/Users/maruthi/Desktop/counterdraft/counterdraft/app/src/components/editor/MainEditor.tsx` lines **677–705** and **1032–1036**
- **Evidence:**
  - Custom markdown parsing builds HTML from raw text without sanitization (lines 678–705)
  - Rendered via `dangerouslySetInnerHTML` (line 1035)
- **Impact:** If draft content includes HTML/JS payloads (or `javascript:` links), an attacker can execute scripts in the user’s session.
- **Fix:** Sanitize with a trusted sanitizer (e.g., DOMPurify) and enforce URL scheme allowlists (`http/https`). Consider a safe markdown renderer that disables raw HTML.
- **Mitigation:** Add CSP to reduce blast radius if sanitization fails.
- **False positive notes:** Assumes draft content is user‑controlled (which is typical in an editor).

### 4) [HIGH] Cookie‑auth POST endpoints lack explicit CSRF protection
- **Rule ID:** NEXT-CSRF-001
- **Severity:** High
- **Location (example):** `/Users/maruthi/Desktop/counterdraft/counterdraft/app/src/app/api/content/develop/route.ts` lines **21–28**
- **Evidence:**
  - Endpoint relies on Clerk cookie auth (`getOrCreateUser()`) with no Origin/Referer checks or CSRF token validation.
- **Impact:** A malicious site could potentially trigger state‑changing requests from an authenticated user (depends on cookie SameSite settings and browser behavior).
- **Fix:** Add CSRF tokens for cookie‑authenticated POST/PUT/PATCH/DELETE endpoints or enforce strict Origin/Referer checks on state‑changing routes.
- **Mitigation:** Ensure auth cookies are `SameSite=Lax` or `Strict`, but don’t rely on SameSite alone.
- **False positive notes:** If auth is not cookie‑based or if Clerk provides strict CSRF protection in your config, severity may reduce—verify at runtime.

---

## Medium

### 5) [MED] Over‑permissive CORS for Chrome extensions
- **Rule ID:** NEXT-CORS-001
- **Severity:** Medium
- **Location:** `/Users/maruthi/Desktop/counterdraft/counterdraft/app/src/middleware.ts` lines **16–22**
- **Evidence:**
  - Any `chrome-extension://*` origin is allowed with credentials
- **Impact:** Any installed extension could make authenticated requests with user cookies, expanding the attack surface to any extension origin.
- **Fix:** Allowlist specific extension IDs rather than all chrome‑extension origins.
- **Mitigation:** Limit CORS to specific paths or use a dedicated endpoint for extension traffic.
- **False positive notes:** If you control an extension and expect broad access, document and isolate it.

### 6) [MED] Public wishlist endpoint can expose pending/private requests
- **Rule ID:** NEXT-AUTH-001
- **Severity:** Medium
- **Location:** `/Users/maruthi/Desktop/counterdraft/counterdraft/app/src/app/api/wishlist/route.ts` lines **5–29**
- **Evidence:**
  - `status` query param is applied directly with admin client (lines 15–16)
  - Public GET uses `select('*')` (line 12) and no auth
- **Impact:** Anyone can request `/api/wishlist?status=pending` and see private/pending requests (including user IDs).
- **Fix:** Require auth for non‑public statuses or enforce a strict allowlist of public statuses in the API.
- **Mitigation:** Limit fields returned for public requests.
- **False positive notes:** If pending data is intentionally public, document it and strip PII.

### 7) [MED] Webhook verification uses JSON.stringify rather than raw body
- **Rule ID:** NEXT-WEBHOOK-001
- **Severity:** Medium
- **Location:** `/Users/maruthi/Desktop/counterdraft/counterdraft/app/src/app/api/webhooks/clerk/route.ts` lines **29–44**
- **Evidence:**
  - `const payload = await req.json(); const body = JSON.stringify(payload);` (lines 30–31)
  - `wh.verify(body, ...)` (lines 39–44)
- **Impact:** Signature verification may be unreliable if JSON re‑serialization changes whitespace/order, potentially causing false negatives or edge‑case bypasses.
- **Fix:** Verify using the raw request body (`await req.text()`), and parse JSON only after successful verification.
- **Mitigation:** None beyond fixing verification.
- **False positive notes:** If Clerk/Svix guarantees canonical JSON, impact is reduced—verify with Clerk’s docs.

---

## Low

### 8) [LOW] No security headers configured in app code
- **Rule ID:** NEXT-HEADERS-001, REACT-HEADERS-001
- **Severity:** Low
- **Location:** `/Users/maruthi/Desktop/counterdraft/counterdraft/app/next.config.ts` lines **1–5**
- **Evidence:** No headers or CSP configured in Next config.
- **Impact:** Missing CSP and baseline headers reduces defense‑in‑depth against XSS/clickjacking.
- **Fix:** Add CSP + standard headers in Next config or at the edge (preferred). Start in report‑only for CSP.
- **Mitigation:** If headers are set at CDN/edge, document and verify.
- **False positive notes:** If your hosting platform adds headers, this may be already covered.

### 9) [LOW] Sensitive user content logged to disk
- **Rule ID:** NEXT-LOG-001
- **Severity:** Low
- **Location:**
  - `/Users/maruthi/Desktop/counterdraft/counterdraft/app/src/lib/trace.ts` lines **4–25**
  - `/Users/maruthi/Desktop/counterdraft/counterdraft/app/src/app/api/content/develop/route.ts` lines **78–80**
- **Evidence:**
  - `TraceLogger` writes payloads to `trace.log` (lines 4–25)
  - API logs prompt context (line 78)
- **Impact:** User data/PII can end up in log files and persist on disk.
- **Fix:** Disable detailed logging in production or redact sensitive fields. Route logs to secure storage with retention controls.
- **Mitigation:** Ensure `trace.log` is not exposed and is excluded from deployments.
- **False positive notes:** If logging is dev‑only and disabled in prod, impact is lower.

---

## Notes on Code Quality (Non‑Security)
- Several endpoints accept complex JSON payloads without schema validation (e.g., `/api/content/develop`). Consider zod or valibot to prevent runtime errors and improve error quality.
- `api/utils/extract` uses puppeteer inline in a request handler; this is fragile for serverless environments and likely to increase cold‑start time. Consider moving to a queued worker.

---

If you want, I can start fixing these one‑by‑one (highest priority: secrets cleanup, SSRF controls, XSS sanitization).  
