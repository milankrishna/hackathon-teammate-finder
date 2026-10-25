# Hackathon Team Finder

Hackathon Team Finder is a college MERN capstone project that helps students connect with potential teammates for hackathons based on their skills and interests. Students can create and discover teams, submit and track join requests, and manage requests for teams they create. Administrators can review and delete teams.

## Problem statement

Students often have a hackathon idea but cannot easily identify collaborators with complementary skills. Team details and membership requests can become scattered across informal conversations, making it difficult to know which teams need members and whether a request was accepted.

## Objectives

- Help students discover teams by hackathon name, description, and required skill.
- Let students create teams and manage their own team details and membership requests.
- Make request outcomes visible to the requester.
- Enforce authentication, creator permissions, team capacity, and duplicate-request rules on the backend.
- Provide a minimal administrator workflow for reviewing and removing teams.

## MVP scope and user stories

The implemented must-have scope is accounts, public discovery, creator-owned team management, membership requests and outcomes, and minimal admin moderation. The following feature list describes that completed scope. Later improvements are separated below and are not presented as implemented functionality.

User stories and testable success/error/empty acceptance criteria are recorded in the [SRS](docs/SRS.md#6-use-cases-and-user-stories). For example: **As a student, I want to request membership so that a creator can consider my skills.** A valid eligible request becomes Pending; duplicate/full-team requests are rejected; the creator can accept or reject it, and the requester can read the outcome.

## Key features

- Registration, login, JWT session restoration, and logout.
- Public team discovery with search, exact skill filtering, and pagination.
- Team details showing the creator, members, required skills, date, and capacity.
- Authenticated team creation, editing, deletion, and a My Teams workspace.
- Join requests with an optional introduction, creator approval/rejection, and My Requests status history.
- Transactional acceptance to protect the final available team slot during concurrent approvals.
- Admin-only team listing and deletion, with associated requests removed consistently.
- Plain-CSS responsive layouts, accessible labels, and loading/error/empty states.

## User roles and permissions

| Actor | Permissions |
| --- | --- |
| Visitor | View Home, browse teams, view team details, register, and log in. |
| Authenticated user (`user`) | Use Dashboard, create teams, request membership in other teams, and view personal request history. |
| Team creator | Edit/delete their own team and view/decide its requests. This is an ownership relationship, not a separate stored role. |
| Administrator (`admin`) | Normal authenticated capabilities plus listing and deleting any team through the admin workspace. |

Admin status does not grant permission to edit another creator's team or decide its membership requests through creator-only endpoints. Registration always assigns `user`; administrator provisioning is manual.

## Technology stack

- MongoDB Atlas with Mongoose
- Express and Node.js using JavaScript/CommonJS
- React with Vite, React Router, axios, and plain CSS
- bcryptjs for password hashing; jsonwebtoken for JWT signing/verification
- dotenv and cors for server configuration and middleware
- nodemon for backend development; Oxlint and Node's built-in test runner for verification

No TypeScript, Tailwind, or component UI framework is used.

## System architecture

The React single-page application calls a centralized axios client with the base URL `/api`. During local development, Vite on port **5173** proxies those requests to Express on port **5001**. Express validates input and permissions, then uses Mongoose to read/write MongoDB Atlas. The browser never connects directly to Atlas.

```text
Browser / React → axios /api → Vite development proxy → Express → Mongoose → MongoDB Atlas
```

The data model consists of `User`, `Team`, and `JoinRequest`. A team has one creator and multiple members; a join request connects one user to one team. See [Architecture](docs/ARCHITECTURE.md) for diagrams and transaction details.

## Documentation

| Document | Purpose |
| --- | --- |
| [Software Requirements Specification](docs/SRS.md) | Scope, requirements, use cases, validation, and constraints. |
| [Architecture](docs/ARCHITECTURE.md) | Components, data relationships, authentication, and concurrency protection. |
| [API Reference](docs/API_REFERENCE.md) | Implemented endpoints, request fields, responses, and errors. |
| [Testing](docs/TESTING.md) | Commands, verified results, coverage, and manual browser checklist. |
| [Demo Guide](docs/DEMO_GUIDE.md) | A 3–5 minute local college demonstration and preparation steps. |
| [ICTAK Submission Alignment](docs/SUBMISSION_ALIGNMENT.md) | Supplied guide/template references, evidence mapping, deviations, and outstanding submission items. |

## Current status

MVP implemented and verified locally. The owner reports local automated/manual tests have passed; detailed browser evidence has not been supplied, and no automated browser testing is claimed. **Vercel deployment: PREPARED, NOT DEPLOYED OR CLOUD-VERIFIED.**

## Local setup

Prerequisites: a compatible Node.js release (Node.js 24 LTS recommended), npm, and access to a MongoDB Atlas application database. The commands below use a macOS/Linux-style shell. From a fresh checkout, open a terminal at the project root and install the locked dependencies:

```bash
npm --prefix server ci
npm --prefix client ci
```

For a fresh checkout, create the private server environment file without overwriting an existing one:

```bash
cp -n server/.env.example server/.env
```

Fill in `MONGO_URI` with your MongoDB Atlas application-database connection URI and `JWT_SECRET` with an independently generated random secret of at least 32 bytes. Keep `PORT=5001` for the existing development proxy. Atlas database credentials and network access must permit this machine to connect. The existing MongoDB DNS workaround uses Google's DNS server at `8.8.8.8`.

`server/.env` is ignored by Git. Only the credential-free `.env.example` belongs in the repository. No client environment file is required.

| Variable | Purpose | Configuration |
| --- | --- | --- |
| `MONGO_URI` | Private Atlas database connection configuration. | Required; fill in privately in `server/.env`. |
| `JWT_SECRET` | Signs and verifies authentication tokens. | Required for authentication; use a random value of at least 32 bytes. |
| `PORT` | Express listening port. | Defaults to `5001`; the supplied example sets `5001`. |

Start the backend in one terminal:

```bash
npm --prefix server run dev
```

Start the frontend in another terminal:

```bash
npm --prefix client run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to the Express server at **http://localhost:5001**. Check backend health with:

```bash
curl -i http://localhost:5001/api/health
```

## Verification

From the project root:

```bash
node --test server/tests/audit.test.js
node --test client/tests/audit.test.js
npm --prefix client run lint
npm --prefix client run build
```

The backend command above runs local regression checks and skips the live Atlas suite by default. To run the full API integration suite against your configured Atlas database:

```bash
RUN_ATLAS_TESTS=1 node --test server/tests/audit.test.js
```

The live suite creates uniquely named temporary accounts, teams, and join requests, starts an isolated backend on a temporary port, and verifies cleanup afterward. Frontend checks cover transport, route configuration, validation, and server-rendered markup; they do not replace browser interaction testing.

Serverless lifecycle checks and the same Atlas suite through the exported function are available without deployment:

```bash
node --test server/tests/serverless.test.js
RUN_ATLAS_TESTS=1 AUDIT_SERVERLESS=1 node --test server/tests/audit.test.js
```

Latest verified baseline: commit `547b8aa`, checked during repository finalization on 24 October 2026. The frontend suite reported **6 passes**, the full backend suite reported **8 passing test entries**, and frontend build/lint and backend syntax checks passed. See [Testing](docs/TESTING.md) for the exact scope and limitations of these results.

## Vercel deployment preparation

### Architecture and prerequisites

One Vercel project serves the built React files from `client/dist/` and a single Node.js Function at `api/handler.js`. That entry exports the existing Express app from `server/index.js`. `/api/*` is rewritten to the function while Express retains the original API URL; React routes are rewritten to `index.html`. Static assets remain static, and missing assets do not become React HTML. No separate API hosting service is needed.

Preparation follows current official [Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), [Express exports](https://vercel.com/docs/frameworks/backend/express), [project configuration](https://vercel.com/docs/project-configuration/vercel-json), and [rewrite](https://vercel.com/docs/routing/rewrites) guidance. It uses root `api/` discovery and modern `functions`/`rewrites` settings, with no legacy `builds` array or legacy builders.

Before an authorized deployment, the owner needs a Vercel account/project, repository access, an Atlas database supporting the existing transactions, and Atlas network access that permits the Vercel function's outbound connections. A successful connection from this local machine does not verify cloud network access. Prefer a separate test database for Preview verification. Choose a function region suitable for the Atlas region and the available Vercel plan.

### Exact project settings

Use the **repository root**, not `client/` or `server/`, as the Vercel Root Directory. The root `vercel.json` contains these build settings:

| Setting | Value |
| --- | --- |
| Root Directory | Repository root (`.`) |
| Framework Preset | Other (`framework: null`) |
| Node.js Version | `24.x`, pinned by the root `package.json` |
| Install Command | `npm --prefix client ci && npm --prefix server ci --omit=dev` |
| Build Command | `npm run build` (runs `npm --prefix client run build`) |
| Output Directory | `client/dist` |
| Function | `api/handler.js`, automatically using the Node runtime |
| Function maximum duration | 60 seconds, subject to the account/plan configuration |

The root manifest only provides build/runtime metadata; application dependencies remain locked in the existing client/server manifests and lockfiles. No workspaces or new runtime dependencies were introduced. The function imports the backend's installed dependencies; official local dependency tracing was checked. Local development still uses the two commands in [Local setup](#local-setup).

Routing checks the filesystem before rewrites. The first rewrite maps `/api/:path*` to `/api/handler`; the SPA rewrite explicitly excludes the `api` namespace, `assets` namespace, and file-like paths. Unknown API routes return JSON 404 from Express rather than HTML. Database-dependent routes await a shared connection promise and return controlled JSON 503 when initialization fails; `/api/health` retains its existing response and is not a database-readiness probe.

### Vercel environment variables

Configure these privately in the Vercel project's applicable **Preview** and **Production** environment scopes before requesting a deployment:

| Name | Required? | Scope/use |
| --- | --- | --- |
| `MONGO_URI` | Yes | Server-only Atlas connection configuration, including the intended database. |
| `JWT_SECRET` | Yes | Server-only JWT signing/verification; use a strong independently generated value. |
| `NODE_ENV` | No application-specific setting needed | Vite's build command produces the production build; application routing/configuration does not require a custom `NODE_ENV` value. |

Do not add backend configuration with a `VITE_` prefix. The frontend only needs relative `/api`, so no client API URL variable is required. `PORT` is for local Express listening and is not required by the function. Vercel supplies its own `VERCEL` flag: in that environment the app does not load a local `.env` or start an HTTP listener. `.env` files are excluded from Git, Vercel uploads, and function tracing; only an empty-credential example is committed.

### Serverless behavior and limits

- Importing the app does not call `listen()`. Direct local execution still awaits MongoDB and listens on port 5001 by default.
- Each warm function instance reuses one connection promise and a driver pool of at most 10 connections, with a zero minimum. Concurrent cold requests share the initial promise. A failed initial connection resets the promise for retry; established-pool reconnection is managed by the driver.
- Each scaled instance has its own pool. Atlas connection limits and function concurrency must be considered together; this is not a global ten-connection limit.
- Initial server selection/connect timeouts are 10 seconds. Function duration is bounded; the browser axios timeout remains 15 seconds, so a slow operation can outlast the client even before the function's limit.
- Existing transaction callbacks remain awaited. Approval/capacity updates and request/team deletion still use MongoDB transactions; no transaction logic was removed.
- APIs send `Cache-Control: no-store`. Deployed requests are same-origin, so cross-origin CORS permission is disabled. Direct local browser access is limited to the Vite origin; the usual local proxy workflow is unchanged.
- Cold starts, Atlas/DNS availability, region latency, platform limits, and the existing Google DNS workaround still require verification on an actual Preview deployment. No cloud availability or load-performance guarantee is claimed.

### Local production-oriented verification

The new lifecycle suite and existing API regression suite pass against the exported handler. An additional opt-in test uses separately installed official `@vercel/node`, `@vercel/routing-utils`, and `@vercel/nft` tooling, compiled rewrite rules, the real built frontend, and temporary Atlas records:

```bash
# VERCEL_TOOLING_DIR points to an external tooling directory with those packages.
VERCEL_TOOLING_DIR=/absolute/path/to/vercel-tools node --test server/tests/vercel-runtime.test.js
```

That check passed locally, including the full API audit through the official function development runtime and verified fixture cleanup. It is not a cloud deployment or browser interaction test. The local host used Node 26; Vercel is pinned to its supported Node 24 runtime and still needs an actual Preview check.

Vercel CLI 65.2.0 was checked in temporary tooling. `vercel build` stopped with `project_settings_required` because this checkout is not linked to a Vercel project. No project was automatically linked or deployed. Once the owner has authorized and configured a project, `vercel pull --environment=preview` retrieves its settings locally, `vercel build` checks the platform build, and `vercel dev` can run the linked local environment. Keep `.vercel/` and downloaded private environment files out of Git.

### Deployment verification checklist — not yet completed

- [ ] Owner authorizes a Preview deployment and configures the project settings/environment scopes above.
- [ ] Preview build completes on Node 24 and bundles the shared function with its backend dependencies.
- [ ] Homepage, built JS/CSS/images, and refreshed React deep links render correctly over HTTPS.
- [ ] `/api/health` returns its existing JSON; an unknown API path returns JSON 404; missing static assets do not return HTML.
- [ ] Registration/login, JWT persistence and protected pages work without leaking hashes or secrets.
- [ ] Creator-only team edits/deletes, request decisions/history, and server-side admin checks work against the intended Atlas database.
- [ ] Concurrent final-slot approvals and deletion cascades remain consistent in the deployed runtime.
- [ ] Warm requests reuse connectivity; a controlled initialization failure returns JSON 503 and later requests can recover.
- [ ] Temporary Preview records are cleaned up and evidence/actual URLs are recorded.

None of these boxes implies a deployment has already occurred. Deployment remains unverified until an authorized Preview deployment is tested; Git commits or pushes alone do not complete this checklist.

## Manually provisioning an administrator

Registration always creates a normal application user, including the first account. There is no public API for assigning administrator roles.

An authorized project maintainer can promote an existing application user through MongoDB Atlas:

1. Have the intended administrator register through the application normally.
2. Sign in to the Atlas project using your existing authorized Atlas account. Open the cluster's **Browse Collections / Data Explorer** and select the application's database and `users` collection.
3. Filter by the existing account's normalized email, for example `{ "email": "existing-user@example.com" }`. Replace the example with the intended account's actual email and verify its `_id` and identity before editing.
4. Edit only that document's `role` field, changing the string `"user"` to `"admin"`, and save the update. Do not insert another account or modify `passwordHash`, email, or other account fields.
5. Have the user reload the app or log out and log in again so their profile displays the **Admin** navigation link. Open `/admin` to review teams.

To revoke access, change that same document's `role` back to `"user"`. Backend authorization reads the current database role on every authenticated request, so an old JWT containing an admin claim does not retain administrator privileges. Reloading the app updates its navigation.

The application `role` field is separate from Atlas database access roles. This workflow requires no connection strings, passwords, JWTs, or secrets in source control, and does not require editing `.env` or the registration endpoint.

## Known limitations

- No automated browser testing has been performed. Interactive navigation, form behavior, dialog focus/Escape handling, and visual responsiveness still need a recorded manual check.
- JWTs are stored in localStorage for this college MVP. Logout clears the local session; already issued tokens remain valid until their seven-day expiry unless their user is deleted. Current database roles still govern admin access.
- The application requires Atlas connectivity; there is no offline mode.
- My Teams contains teams the user **created**, not every team they joined. My Requests shows the current request records, not an immutable event log; deleting a team removes its associated requests.
- A rejected request cannot be resubmitted to the same team. There are no request-cancellation, team-leaving, password-reset, email-verification, chat, notification, or upload features.
- Past hackathons are not automatically archived. Admin listing is not paginated, and no load-test or accessibility-conformance certification is claimed.
- The client uses relative `/api` with the local proxy or Vercel's same-origin routing, not an environment-based API URL. CORS is now limited for the local/same-origin deployment design. Authentication rate limiting is not implemented; these choices remain documented in the alignment document.

### Later improvements (not implemented)

1. Complete recorded browser/keyboard/mobile verification and capture real screen evidence.
2. Add pagination to personal/admin lists and measure performance before choosing additional query indexes.
3. Review separate-origin API configuration, authentication rate limiting, and token revocation if the project scope expands further.

## Screenshots

No application screenshots were available when this documentation was prepared. The entries below are capture placeholders, not evidence of completed browser testing. Use disposable demonstration data and keep credentials and token storage out of screenshots.

| Planned capture | Status |
| --- | --- |
| Home and public Browse Teams | Not yet supplied |
| Create/Edit Team and My Teams | Not yet supplied |
| Team details and pending join confirmation | Not yet supplied |
| Creator request management and My Requests | Not yet supplied |
| Admin team moderation | Not yet supplied |
| Mobile view of navigation, cards, and forms | Not yet supplied |

## Submission reference status

The project owner supplied the parsed **ICTAK MERN Stack Project Guidelines and Reference Guide** (bundle pages 1–15) and **Summer Internship Report** template (pages 16–18) during documentation preparation. No local PDF copy was found; citations in the [alignment document](docs/SUBMISSION_ALIGNMENT.md) refer to that supplied text.

The guide includes hosted-site, screenshot, steady-progress history, and browser-test checklist items. The owner has now requested one-project Vercel preparation: deployment is **PREPARED, NOT COMPLETED**, and hosted/live-site items remain outstanding. No repository URL, screenshots, original wireframes, detailed browser log, or internship cover details were supplied. Synthetic authentication test strings also require review against the guide's strict prohibition on test passwords in code/history. This documentation does not claim the complete ICTAK checklist has been satisfied.
