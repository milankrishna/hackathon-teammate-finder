# Testing and Verification

## 1. Evidence and scope

The earlier verified application baseline is **commit `547b8aa`**, finalized on **24 October 2026**. Sections 1–8 preserve the preceding audit/repository-finalization evidence from Node.js **26.8.2** and npm **12.0.2**. Section 9 records the additional checks actually executed during the subsequent Vercel preparation; no historical result is presented as cloud deployment evidence.

There has been **no automated browser testing**. Node-based transport tests and server-rendered React markup checks do not execute real browser clicks, navigation, native dialogs, or CSS layout.

## 2. Prerequisites and command locations

- Install dependencies and configure the private server environment as described in the [README](../README.md#local-setup).
- Unless stated otherwise, run commands from the project root in a macOS/Linux-style shell.
- No test framework installation is needed: both suites use Node's built-in `node:test` and assertions.
- The live backend suite requires reachable Atlas configuration, permissions to create/delete its temporary records and initialize indexes, and the existing DNS workaround to function.

## 3. Automated frontend tests

```bash
node --test client/tests/audit.test.js
```

Source: `client/tests/audit.test.js`.

| Test area | What is checked |
| --- | --- |
| Session transport | `/api` base URL, token storage helpers, automatic Bearer header, logout clearing. |
| Authentication failure handling | Protected-request 401 clears credentials once; failed login does not discard an existing session; normalized errors omit Axios request configuration. |
| Stale-response race | An older unauthorized response cannot erase a newer session token. |
| Login destinations | Known local destinations are accepted; external/unknown paths fall back to Dashboard. |
| Team form validation | Impossible dates, capacity below membership, non-integer size, comma-separated skills, and changed-fields-only edits. |
| Route/render structure | Protected/admin route configuration, static creation route precedence, public discovery, NotFound, role-aware navigation, register labels, and read-only request-history badges/links. |

The suite substitutes in-memory storage and an axios adapter for transport tests. Its rendered-markup checks load the real components through Vite in middleware mode and render with React's server renderer. These are deliberate test fixtures; the application itself uses the real backend.

Additional frontend checks:

```bash
npm --prefix client run lint
npm --prefix client run build
```

Oxlint is the configured frontend check. The Vite build produces ignored `client/dist/` output.

## 4. Automated backend regression tests

```bash
node --test server/tests/audit.test.js
```

Without the live-test flag, this runs two standalone validation regression tests and skips the Atlas parent suite:

1. Reject passwords over bcrypt's 72-byte UTF-8 boundary, including multi-byte text, before database operations.
2. Reject impossible calendar dates before creating a team.

To syntax-check every backend JavaScript source/test file, run this block from **`server/`**:

```bash
for file in index.js config/*.js controllers/*.js middleware/*.js models/*.js routes/*.js tests/*.js; do
  node --check "$file" || exit 1
```

The loop performs syntax checks only; it does not connect to Atlas or start the application.

## 5. Atlas integration suite

```bash
RUN_ATLAS_TESTS=1 node --test server/tests/audit.test.js
```

Source: the opt-in parent test in `server/tests/audit.test.js`. It reads private configuration from `server/.env` without printing credential values. It uses the existing DNS workaround, connects to Atlas, initializes the three model indexes, and starts a child Express process on a temporary port. Existing development servers do not need to be stopped.

### Live coverage

| Group | Verified behavior |
| --- | --- |
| Authentication | Registration/login, email normalization, role forced to user, valid password-byte boundaries, safe profiles, bcrypt rounds, JWT claim/expiry checks, duplicate email, incorrect credentials, invalid/missing/expired tokens. |
| Team management/discovery | Authenticated creation, creator/member assignment, invalid input, literal search, exact skill filter, pagination/limit cap, safe populated detail, invalid/missing IDs, My Teams ownership, creator editing and non-creator denial. |
| Join requests/history | Submission, duplicate-submission race, optional/overlong message handling, creator-only request access/decisions, scoped request IDs, acceptance, rejection, blocked resubmission, capacity conflict, multiple-team membership, and Pending/Accepted/Rejected personal history. |
| Concurrent approvals | Two pending requests compete for one final slot: one 200 and one 409; member count stays within capacity and stored membership/statuses agree. |
| Admin/deletion | Normal-user denial, manual promotion of a temporary user, access based on database role rather than old token role, immediate demotion denial, ID errors, creator/admin deletion cascades, and deleted-user token rejection. |

### Temporary records and cleanup

The suite uses uniquely named accounts under the reserved `example.invalid` domain, tracks its created records, and registers cleanup through the test runner. It removes its associated requests, teams, and users, disconnects Mongoose, and terminates its child server. A successful run prints a cleanup-verification diagnostic without credential values.

The verified runs confirmed zero remaining temporary records. A forcefully interrupted process may not finish cleanup; if that happens, an authorized maintainer should identify the interrupted run's uniquely prefixed fixture records before removing them. Do not use this suite's temporary accounts as permanent demo accounts: normal cleanup deletes them.

## 6. Latest verified results

| Check | Latest recorded result | Qualification |
| --- | --- | --- |
| Full backend runner with Atlas enabled | **8 passing test entries; 0 failed, 0 skipped** | Includes two standalone tests, the Atlas parent, and its five live subtests; the parent is included in the runner's total. |
| Frontend regression runner | **6 passed; 0 failed, 0 skipped** | Transport, helpers, route structure, and server rendering; not browser automation. |
| Frontend lint | **Passed; 0 warnings/errors** | Oxlint. |
| Frontend build | **Passed** | Vite production bundle. |
| Backend syntax | **Passed** | All backend source/test JavaScript. |
| Development proxy smoke check | **Passed** | Actual 5173-to-5001 proxy: health, listing shape, API error, and HTML deep-link delivery; HTTP-level verification only. |
| Production dependency audits | **0 vulnerabilities reported** | `npm audit --omit=dev` run separately in client/server during the final audit; not a timeless vulnerability guarantee. |
| Repository finalization review | **Passed; working tree clean after commit** | All essential files indexed, safe template included, staged whitespace checks passed, and no configured credentials/secret patterns found in the indexed/history review at that time. |
| Atlas test cleanup | **Verified** | No temporary records remained after the verified full runs. |

The audit also reproduced and fixed bcrypt suffix truncation risk and acceptance of impossible calendar dates. Regression tests cover both fixes. See the source for exact assertions; no load-test, code-coverage percentage, or accessibility certification was produced.

## 7. Manual browser workflow reported by the owner

The project owner reported that **“the application works locally”** and subsequently reported that automated and manual tests have passed. No detailed browser/version record, per-step outcome log, screenshots, or recordings were supplied. Those statements are retained as owner reports, not converted into independently verified browser test results.

The following is a **recommended manual workflow to record**, based on the implemented UI. Each item is outstanding until a tester records an actual result.

| Workflow | Expected observation | Recorded status |
| --- | --- | --- |
| Register, log out, and log in | Validation/errors are visible; successful authentication opens the workspace; logout clears local access. | Not recorded |
| Reload and protected access | A stored valid session restores; a logged-out protected visit opens Login; recognized return destination is preserved. | Not recorded |
| Public discovery | Search/filter/page values follow the URL, browser Back/Forward updates them, and cards open details. | Not recorded |
| Create/edit/delete | Forms validate and save; only the creator sees management controls; deletion requires confirmation and returns to My Teams. | Not recorded |
| Request membership | Eligible user sees the form, one submission becomes Pending, and repeat/full/member cases show the appropriate state. | Not recorded |
| Decide and track | Creator acceptance increases capacity display; rejection leaves membership unchanged; requester refreshes history to see outcomes. | Not recorded |
| Admin moderation | Provisioned admin sees Admin navigation; a normal user sees forbidden; confirmed deletion refreshes the list. | Not recorded |
| Keyboard and modal | Labels/feedback are usable; focus is visible; modal focus, Escape, and focus restoration work as intended. | Not recorded |
| Narrow/wide layouts | Navigation, cards, forms, messages, and pagination remain readable without unintended overflow. | Not recorded |

Use separate browser profiles or a normal/private window for simultaneous identities; ordinary tabs share localStorage, and the app synchronizes storage changes.

Record tester, date, browser/version, screen size, steps, observed result, and any screenshot reference after carrying out these checks. Never include token storage, authentication response values, private configuration, or personal data in evidence.

## 8. Remaining verification gaps

- Browser reload/redirect/click behavior, modal keyboard behavior, cross-browser compatibility, and visual responsiveness have not been independently tested in a browser.
- Screenshots and detailed owner browser evidence are not available.
- No performance/load benchmark or formal accessibility audit is available.
- Some fixed future-date fixtures will need maintenance as their dates approach; the full suite must remain a deliberately enabled Atlas operation.
- The ICTAK guide and internship template were supplied after the application audit. Their screenshot, live-site, test-fixture, and submission-evidence gaps are now recorded in [Submission Alignment](SUBMISSION_ALIGNMENT.md); the prior audit is not proof of complete guideline compliance.

The [Demo Guide](DEMO_GUIDE.md) provides a rehearsal plan rather than additional test evidence.

## 9. Vercel preparation verification

Deployment remains **PREPARED, NOT COMPLETED**. No cloud URL or browser automation is claimed. During preparation the frontend build/lint and six frontend regressions passed; backend syntax checks passed, and the full Atlas API suite passed through the exported function with cleanup verified.

```bash
node --test server/tests/serverless.test.js
RUN_ATLAS_TESTS=1 AUDIT_SERVERLESS=1 node --test server/tests/audit.test.js
```

The new lifecycle suite reports **4 passes**: shared in-flight/warm connections, safe failure/retry without exiting, import/request gating and JSON errors, and the deployment config's API/asset separation.

The opt-in `server/tests/vercel-runtime.test.js` reports **1 pass** when `VERCEL_TOOLING_DIR` identifies separately installed official `@vercel/node`, `@vercel/routing-utils`, and `@vercel/nft` tools. It compiles the actual rewrite rules, traces backend dependencies excluding `.env` files, serves the real production-built frontend with a local routing model, and forwards API requests to Vercel's official local Node function runtime. Homepage/deep links, static/missing assets, health/API errors, and the full existing Atlas audit through that runtime passed; fixture cleanup was verified. This is stronger than a hand-written function mock but is not a full Vercel cloud/platform build or deployment.

Vercel CLI 65.2.0 `vercel build` was attempted locally and stopped with `project_settings_required`; the checkout has no linked project settings. No automatic pull/link/deployment was performed. The tests ran on local Node 26; the configured Vercel target is supported Node 24 and must be verified in an authorized Preview build. See the [README](../README.md#vercel-deployment-preparation) for exact project settings, variables, limits, and the outstanding checklist.
