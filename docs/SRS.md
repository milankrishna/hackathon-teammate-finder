# Software Requirements Specification

## 1. Introduction and scope

**Project:** Hackathon Team Finder, a college MERN capstone.

The application addresses the difficulty of finding hackathon collaborators and tracking team membership decisions. It provides a browser-based interface for discovering teams, creating teams, requesting membership, and moderating teams.

This specification describes the implemented MVP at source baseline `547b8aa`. It is derived from the actual models, controllers, routes, React pages, and regression suites. The owner subsequently supplied the ICTAK project guide and internship-report template as parsed PDF text. This specification follows their project-definition guidance; [Submission Alignment](SUBMISSION_ALIGNMENT.md) distinguishes supporting evidence from outstanding checklist items.

### In scope

- Account registration/login and JWT-based access control.
- Public team discovery and details.
- Team creation and creator-owned management.
- Join-request submission, approval/rejection, and personal status history.
- Admin team listing and deletion.

### Outside the implemented scope

Chat, notifications, uploads, automatic teammate recommendations, password reset, email verification, self-service account deletion, request cancellation, leaving a team, and public administrator assignment are not implemented. A subsequent owner request prepares a one-project Vercel deployment; an actual deployment and hosted verification have not been performed.

## 2. User roles

| Actor | Description and permitted operations |
| --- | --- |
| Visitor | Unauthenticated person who can browse teams and read details, register, or log in. |
| User | An authenticated account with stored role `user`; can create teams, submit requests to eligible teams, and view its own requests. |
| Team creator | An authenticated account referenced by `Team.creator`; can edit/delete that team and list/decide its requests. |
| Administrator | An account with current stored role `admin`; has normal authenticated capabilities plus viewing/deleting all teams through admin endpoints. |

Creator status is not a third value in `User.role`. Admin status alone does not permit editing another creator's team or deciding its requests. A creator already belongs to their own team and cannot request membership in it.

## 3. Functional requirements

| ID | Implemented requirement | Primary implementation |
| --- | --- | --- |
| FR-01 | Register a user with name, normalized unique email, password, and optional skills; always assign role `user`. | `authController.register`, Register page |
| FR-02 | Authenticate credentials and return a seven-day JWT and safe user profile. | `authController.login` |
| FR-03 | Restore a stored session using the authenticated profile endpoint; clear local credentials on logout or an applicable 401 response. | AuthProvider, axios interceptors |
| FR-04 | Let visitors browse teams with literal case-insensitive search, exact case-insensitive skill filtering, pagination, and newest-first ordering. | `teamController.browseTeams`, Browse Teams |
| FR-05 | Display team information, safe creator/member profiles, date, skills, and capacity publicly. | `teamController.getTeam`, Team Details |
| FR-06 | Let an authenticated user create a team, setting its creator and initial membership from the authenticated identity. | `teamController.createTeam`, Create Team |
| FR-07 | List teams created by the current user in My Teams. | `teamController.myTeams` |
| FR-08 | Permit only the creator to edit allowed fields; reject capacity below the current membership count. | `teamController.updateTeam`, Edit Team |
| FR-09 | Permit the creator to delete their team and its join requests transactionally, with a UI confirmation. | `teamController.deleteTeam`, DeleteTeamDialog |
| FR-10 | Allow an eligible authenticated user to send one request per team with an optional introduction. | `joinRequestController.createRequest` |
| FR-11 | Reject requests from creators/members, requests to full teams, and duplicate requests, including previously rejected requests. | Creation checks and unique compound index |
| FR-12 | Permit only the team creator to view its requests with safe requester fields. | `joinRequestController.teamRequests` |
| FR-13 | Permit a creator to transition a pending request to accepted or rejected exactly once. | `joinRequestController.decideRequest` |
| FR-14 | On acceptance, add the requester only when capacity remains and commit membership/status changes together. A failed full-team acceptance leaves the request pending. | Transaction and conditional team update |
| FR-15 | Preserve a user's other team memberships when accepting a new request. | `$addToSet` on the specified team only |
| FR-16 | Show the logged-in user's current requests, team names, submission dates, messages, and statuses without decision controls. | `myRequests`, My Requests page |
| FR-17 | Permit only current database-role admins to list and delete any team; deletion also removes its requests transactionally. | Admin middleware/controller/page |
| FR-18 | Protect authenticated pages, restrict creator/admin controls, and preserve recognized local destinations when logging in. | Route guards and navigation helper |
| FR-19 | Provide a public health response and handle application errors without returning stack traces or credentials. | Express entry point and controllers |

Detailed request and response contracts are in [API Reference](API_REFERENCE.md).

## 4. Non-functional requirements

| Area | Implemented behavior and verification boundary |
| --- | --- |
| Data integrity | Unique email and `(team, requester)` indexes; transaction-backed acceptance and deletion; atomic capacity predicates. |
| Security | Password hashes, signed expiring tokens, current-user lookup, ownership/role checks, explicit update fields, and safe public projections. |
| Usability | Labeled forms, feedback states, disabled duplicate submissions, status badges, and human-readable dates. |
| Responsive design | Plain-CSS grids and navigation adapt at defined breakpoints. Visual behavior still requires manual browser verification. |
| Accessibility | Source includes labels, focus-visible styles, skip navigation, status/alert regions, and a labeled native modal. No WCAG certification is claimed. |
| Maintainability | Separate client/server projects; CommonJS backend controllers/routes/middleware/models; centralized frontend HTTP and auth logic. |
| Reproducibility | Package lockfiles, a safe environment template, documented setup, and Node-based regression suites. |
| Query bounds | Public browse defaults to 10 teams and limits each page to 50. Personal and admin lists are not paginated. |

No numerical response-time, concurrency-load, or uptime service-level guarantee has been measured.

## 5. System constraints

- JavaScript only; React/Vite, React Router, axios, and plain CSS on the frontend.
- Node.js/Express, CommonJS, Mongoose, and MongoDB Atlas on the backend.
- No TypeScript, Tailwind, or component UI library.
- Local ports are 5173 for Vite and 5001 for Express. Frontend requests use `/api` and the development proxy.
- MongoDB transactions require a transaction-capable deployment; the configured target is Atlas.
- The server awaits the initial MongoDB connection before listening. Its existing DNS workaround selects `8.8.8.8`.
- In the prepared Vercel runtime the app is exported without listening; database-dependent requests await cached initialization and receive controlled 503 errors if it fails. Static frontend and API routing share one project. This preparation is not proof of cloud connectivity.
- Private server configuration is supplied through environment variables; the browser receives no Atlas configuration.
- Current role provisioning is a manual Atlas operation by an authorized maintainer; see the [README](../README.md#manually-provisioning-an-administrator).

## 6. Use cases and user stories

The following stories implement the guide's user-centered definition and testable acceptance-criteria approach (supplied guide §2, bundle pages 3–4). API criteria have automated evidence where described in [Testing](TESTING.md); screen-level criteria remain subject to browser verification.

| Story | Testable acceptance criteria |
| --- | --- |
| US-01: As a visitor, I want to register/log in so that I can use a personal workspace. | Valid registration returns 201 with a safe profile and user role; invalid details return 400; duplicate email returns 409; valid login returns 200 and incorrect credentials return 401. |
| US-02: As a student, I want to search/filter teams so that I can find an opportunity matching my interests. | Name/description search ignores case; a full-skill filter ignores case; page/limit metadata accompanies results; no matches produce an empty list and a frontend next step. |
| US-03: As a creator, I want to publish/edit a team so that others know its goals and available capacity. | Creation assigns the creator as the first member; blank required fields, impossible/past dates, and non-integer sizes are rejected; another user cannot edit it; reducing capacity below current membership returns 409. |
| US-04: As a student, I want to request membership so that a team creator can consider my skills. | An eligible submission returns 201 with Pending; messages over 300 are rejected; duplicate, full-team, and current-member submissions conflict; the UI shows existing request status rather than another submission form. |
| US-05: As a creator, I want to decide pending requests so that I can assemble a team within capacity. | Only the creator may list/decide requests; acceptance updates membership and status together; rejection leaves membership unchanged; repeat decisions return 409; competing final-slot approvals cannot both succeed. An empty request list has a clear next step. |
| US-06: As a requester, I want to track outcomes so that I know whether I joined a team. | My Requests returns only my records, newest first, with team names and statuses; no history displays an empty state; no requester decision controls are provided. |
| US-07: As an admin, I want to remove a team so that I can perform minimal moderation. | Normal users receive 403; an admin can list/delete another creator's team; deletion returns 204 and removes associated requests; a missing team returns 404; empty moderation results are handled. |

| Use case | Actor and preconditions | Successful flow | Alternatives |
| --- | --- | --- | --- |
| UC-01 Register/log in | Visitor; valid account details or existing account. | Submit credentials; receive safe profile/token; enter Dashboard or the intended team destination. | Validation, duplicate email, and incorrect credentials produce clear errors. |
| UC-02 Discover a team | Any visitor. | Search/filter Browse Teams, change pages, open details. | Empty search and invalid/missing team states are displayed. |
| UC-03 Create/manage a team | Logged-in user; creator ownership for edits/deletion. | Create a team, view My Teams, edit fields, or confirm deletion. | Non-creators are denied; invalid data and capacity conflicts are reported. |
| UC-04 Request membership | Logged-in non-creator/non-member; available capacity; no existing request for the pair. | Open details, optionally introduce oneself, submit, see Pending. | Full, duplicate, rejected-before, and invalid-message cases are rejected. |
| UC-05 Decide a request | Team creator; request belongs to that team and is pending. | Accept or reject; refresh list/capacity. | Full-team acceptance returns conflict and remains pending; repeated decisions conflict. |
| UC-06 Track outcomes | Logged-in requester. | Open My Requests and read current statuses and team links. | No requests yields an empty state. Team deletion removes associated history records. |
| UC-07 Moderate teams | Logged-in admin with current database role `admin`. | Open Admin, review teams, confirm deletion of a selected team. | Non-admins receive forbidden responses; missing teams are reported. |

## 7. Validation rules

### Accounts

- `name`: required string, non-empty after trimming.
- `email`: required string matching the controller's email-format check; trimmed/lowercased before lookup and storage; unique.
- Registration password: `password.length >= 8` and at most 72 UTF-8 bytes. Login rejects empty/non-string/over-limit passwords and reports invalid credentials generically.
- Optional `skills`: array containing only strings; defaults to `[]`.
- Client-supplied role cannot override registration's `user` assignment.

### Teams

- `hackathonName` and `description`: required non-empty trimmed strings on creation; the same checks apply when provided in edits.
- `hackathonDate`: valid calendar date in an ISO-style date/date-time string, strictly later than the server's current time when created or changed. Impossible dates are rejected.
- The date-only frontend converts the chosen date to UTC midnight. An unchanged past date is omitted from an edit PATCH so other fields can still be updated.
- `skillsNeeded`: optional string array on creation, default `[]`; provided entries are trimmed.
- `maxTeamSize`: required safe integer of at least 2; when edited it cannot be below the latest member count.
- Creator/members are set by the server. PATCH permits only the five editable team fields and rejects empty/unknown-field updates.
- Team/request IDs must be valid MongoDB ObjectId strings.
- Browse `page`/`limit`: positive integer strings, defaults 1/10, limit capped at 50, unsafe pagination values rejected.
- Search/skill query values must be strings; regex metacharacters are escaped. Skill filtering matches a complete skill, not a substring.

### Join requests

- Optional `message`: string of at most 300 characters as enforced by JavaScript/Mongoose length checks; the React form also sets a 300-character limit.
- New requests always have `status: pending` and the authenticated requester ID.
- One request per `(team, requester)` across all statuses.
- Only `pending → accepted` and `pending → rejected` are allowed. The decision body accepts only these two target status values.
- Request and team IDs must refer to the same team. Creators cannot decide their own membership requests.
- A full-team acceptance cannot change status or membership.

## 8. Security requirements

1. Persist only password hashes, using bcrypt with 10 salt rounds; exclude `passwordHash` from normal model selection and all API profiles.
2. Sign/verify HS256 JWTs using private `JWT_SECRET`, with a seven-day expiry and only ID/role application claims plus standard timestamps.
3. Validate Bearer tokens and reload the current user/role from MongoDB; reject deleted users.
4. Enforce ownership/admin permission on the backend, independent of frontend controls or token role claims.
5. Allowlist team updates and construct queries from validated values; do not accept arbitrary query operators from clients.
6. Return public user references with only `_id`, `name`, and `skills`; authenticated users may see their own safe profile including email.
7. Keep secrets, dependencies, build output, and temporary artifacts out of Git; retain only the credential-free environment template.
8. Keep acceptance and deletion operations consistent through MongoDB transactions.

## 9. Assumptions and limitations

- Atlas authentication/network access and the required private environment variables are configured locally.
- Application business-rule changes occur through the API; direct database edits can bypass controller validation. Manual admin provisioning edits only the role field.
- Skills are self-reported text. There is no identity, email, or skill-verification workflow.
- Logout is client-side credential clearing; there is no refresh-token service or token-revocation endpoint.
- Teams are not automatically closed or archived after the hackathon date.
- Request history contains current records, not a permanent audit timeline. Team deletion removes those records.
- Automated API and non-browser frontend checks have passed; detailed browser interaction evidence, screenshots, and institutional guideline alignment remain outstanding.

See [Testing](TESTING.md) for evidence boundaries and [Demo Guide](DEMO_GUIDE.md) for the planned local demonstration.
