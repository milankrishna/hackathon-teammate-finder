# ICTAK Reference and Submission Alignment

## 1. Source and interpretation

The project owner supplied parsed PDF text and page images during documentation preparation:

1. **ICTAK — MERN Stack Project Guidelines and Reference Guide**, Student Reference Guide, supplied bundle pages **1–15**.
2. **ICT Academy of Kerala — Summer Internship Report**, sample cover and report structure, bundle pages **16–18**.

Page references in this document use the supplied bundle's page numbers. A physical PDF file was not found in the workspace, so there is no fabricated local download link or publication date. The sample cover's date is a template placeholder, not this project's verified internship period.

The guide describes itself as a reference and asks students to explain departures from its “should” guidance (§1, page 3). Its final submission checklist nevertheless contains concrete evidence items (§13, page 12). This document records those items honestly; it does not declare them waived or fully satisfied.

The owner initially requested a local-only capstone and subsequently requested preparation for **one Vercel project**. Deployment status is **PREPARED, NOT COMPLETED**: root configuration, a shared Node function, cached database initialization, SPA/API routing, and local compatibility checks are present. This status concerns deployment verification, independently of Git commits or pushes. No cloud deployment or history rewrite has been performed. Hosted-site/live-test checklist items remain outstanding until an authorized deployment is actually verified.

## 2. Project-definition and engineering guidance

| Supplied reference | Project evidence | Status or explained difference |
| --- | --- | --- |
| §2, pages 3–4: problem, target users, MVP, user stories, acceptance criteria | [README](../README.md), [SRS](SRS.md#6-use-cases-and-user-stories) | Written from the implemented scope; success/error/empty criteria are explicit. |
| §2: wireframes including mobile | Route/access table in [Architecture](ARCHITECTURE.md); screen flow in [Demo Guide](DEMO_GUIDE.md) | Original wireframes are not supplied. These technical descriptions are not substituted for original design artifacts or mobile evidence. |
| §2/§3: data model, API contract, request flow | [Architecture](ARCHITECTURE.md), [API Reference](API_REFERENCE.md) | Actual model fields, references, HTTP methods, envelopes, and errors are documented. |
| §4, page 5: consistent separated projects | `client/` and `server/`; architecture code-organization table | Server uses direct responsibility folders and `index.js` instead of the illustrative `server/src/` layout. |
| §4/§7.2: API client and service separation | `client/src/services/api.js` | Base URL/headers/errors are centralized; endpoint invocations still occur in pages/forms/hooks, not exclusively service functions. |
| §5, page 6: Git, ignore rules, meaningful progress | Existing `d78ee0d` initialization and `547b8aa` MVP commits; `.gitignore`; lockfiles and test sources | Two meaningful commits exist. Per-feature branches, pull requests, steady milestone pushes, and remote reviewer access are not evidenced. Do not manufacture or rewrite progress history. |
| §6, pages 6–7: validation, models, authentication, ownership, pagination | Controllers, models, middleware, API reference, and audit suites | Implemented for core operations; public discovery is paginated. Personal and admin lists are unpaginated. Unique email/request indexes exist; no search/sort performance claim is made. |
| §6.5: private environment values and safe examples | `server/.env.example`, ignored private environment, README setup | Actual variable is `MONGO_URI`, alongside `JWT_SECRET` and `PORT`. Real values are not documented. |
| §7.2: environment-based API URL | Relative `/api`, with Vite's 5001 proxy locally and same-origin rewrites prepared for Vercel | No `VITE_API_URL` setting is read. Same-origin routing works without putting backend configuration in frontend variables. |
| §7.3/§7.4: screen states, responsive UI, accessibility | Shared PageState/forms/layout, plain-CSS breakpoints, static/render checks | Implemented source features are documented; real browser/keyboard/mobile evidence remains outstanding. |
| §7.4/§10: CORS, least privilege, session trade-offs, sensitive endpoints | Current-user role checks, safe projections, bcrypt/JWT, same-origin deployment CORS, documented localStorage trade-off | Deployed cross-origin permission is disabled; direct local browser permission is limited to the Vite origin. Authentication rate limiting and token revocation remain unimplemented. |
| §8, pages 8–9: API/database/integration/regression evidence | [Testing](TESTING.md) and two audit suites | Local automated evidence exists. The suites are not automated browser or live-host end-to-end tests. |
| §9/§12: deployment and production verification | Root Vercel config, shared exported Express function, cached MongoDB promise and local official-runtime check | **PREPARED, NOT COMPLETED**. No hosted URL exists. Vercel account/project linking, environment scopes, Atlas cloud network access, and actual Preview verification remain required. |

## 3. Final submission checklist from §13

| Guide checklist item | Current evidence/status | Outstanding action |
| --- | --- | --- |
| Reviewer-accessible GitHub repository URL | Complete local application commit exists. No shared repository URL was supplied; remote access is not verified. | Owner supplies the actual repository URL and confirms reviewer access. No URL is invented. |
| Hosted application URL | **PREPARED, NOT COMPLETED**; one-project Vercel preparation requested and implemented locally. | Owner authorizes/configures a Preview deployment, verifies it, and records the real URL. |
| README with project/features/stack/setup/environment names/live links | README covers local setup and exact prepared Vercel settings. No live link exists. | Add only an actual verified deployment URL; do not substitute localhost. |
| Key-screen and mobile screenshots | Placeholder capture list only. | Capture actual screens with disposable data after browser testing. |
| Core flows tested on the live site | Local API/Atlas, lifecycle, and official local Node function-runtime checks pass. The owner reports manual local tests passed; no detailed browser log or cloud run is supplied. | Record actual Preview/browser evidence after an authorized deployment. |
| `.env` excluded and safe `.env.example` included | Verified at repository finalization; real credentials excluded and a credential-free backend template included. | Continue preserving the ignore rules and private setup. |
| No secrets, test passwords, or personal data in code/history/screenshots | Configured credential scans passed. However, authentication test sources contain **synthetic test credential strings**, also present in the existing implementation commit. These are not real account credentials, but the guide explicitly includes test passwords in its prohibition. | This strict item is **not fully satisfied**. Ask the evaluator/maintainer how test fixtures should be handled. No fixture values are reproduced here, and this documentation task does not change tests or rewrite history. |
| History shows steady progress | Initialization and MVP commits are visible; finer-grained development/PR evidence is unavailable. | Describe the actual history honestly; do not fabricate earlier commits or reviews. |
| Honest limitations and later improvements | README and SRS contain both; testing boundaries are explicit. | Keep these consistent with later verified changes. |

The status of the prior source/credential audit should not be confused with certification against this subsequently supplied, stricter checklist.

## 4. Internship report template mapping

The supplied pages 16–18 provide the following headings. These are the actual template headings, not additional invented mandatory sections. The current requested documentation can support a later formatted report as follows:

| Template element | Available project material | Information still needed |
| --- | --- | --- |
| Cover: project/program title, team-member names, institution, date | Project name and MERN/React implementation are known. | Actual names, institution, internship period, and required submission date/format. The sample year/date must not be copied as fact. |
| Executive Summary | README overview/objectives, implemented feature list, and verified testing summary. | Owner-approved report wording and any institution-specific length requirement. |
| Introduction | README problem statement; SRS introduction/scope. | Any genuine internship/site background and prior-work references the owner wishes to include. No literature study is fabricated. |
| Objectives | README objectives and SRS stories. | Personal learning objectives, if required, must come from the student. |
| Scope and Deliverables | SRS scope, README features, documentation index, and prepared Vercel configuration. | Distinguish deployment preparation from a completed/verified hosted deliverable. |
| Methodology | Architecture layers, request flow, controller validation, transaction design, and testing approach. | No agile ceremonies, research process, or team responsibilities are assumed. |
| Project Activities | Implemented account/team/request/admin work; actual Git log; audit findings/fixes. | Dated activity diary, individual contributions, internship attendance/duration, and mentor details if requested. These are not inferred from code. |
| Results & Findings | Recorded build/lint/test outcomes; race/cascade results; fixed byte-length/date-validation defects. | Real screenshots/mobile evidence and any additional measured outcomes. No graphs or benchmark values are invented. |
| Conclusion | Implemented local MVP and clearly stated limitations. | Student-authored learning/reflection and supervisor feedback, if applicable. |
| Appendix | SRS, architecture diagrams, API contract, test commands/results, demo guide, and original references if later added as permitted files. | Actual screenshot files and a stable copy/reference for the supplied guide, if required. |

These files are technical project documentation, not a signed or fully formatted internship report. The student can use the mapping to prepare the requested institutional report without inventing identity, dates, contributions, or results.

## 5. Owner/evaluator follow-up

1. Authorize and complete actual Vercel verification when ready; the current status remains PREPARED.
2. Provide the actual GitHub URL and reviewer access information.
3. Record real browser, keyboard, and mobile checks; capture screenshots and provide any original wireframes.
4. Resolve the strict test-credential/history checklist item without silently claiming compliance or altering established history during this documentation task.
5. Supply report cover details, personal learning/contribution information, and any further evaluator-specific formatting instructions.

Serverless lifecycle and routing preparation does not close the outstanding cloud-deployment/evidence gaps or add application features.
