# Local College Demonstration Guide

**Target duration:** approximately 4 minutes 40 seconds, within a 3–5 minute presentation.

**Evidence boundary:** The underlying API workflows have passed automated integration checks. The screen-by-screen sequence below is a planned demonstration, not a record of completed browser testing. Rehearse every click and transition before presenting. The owner's general report that the app works locally does not replace that rehearsal.

## 1. Preparation before starting the timer

1. Follow [Local setup](../README.md#local-setup) and start Express on 5001 and Vite on 5173. Confirm the public health endpoint responds. Keep private configuration and authentication response contents offscreen.
2. Prepare three isolated sessions: a creator/student session, a requester/student session, and an administrator session. Use three separate browser profiles, or two profiles plus an isolated private session; separate ordinary tabs share localStorage and are not independent identities.
3. Reserve a fresh disposable creator account for live registration. Prepare a different requester account in advance and leave its session ready for login. Use non-personal demonstration names and private, disposable credentials; do not place credentials in this guide or presentation.
4. Provision an existing disposable administrator account manually using the [README procedure](../README.md#manually-provisioning-an-administrator). Log in/reload to obtain the current profile. Admin setup is an **additional manual prerequisite**, not a public registration feature.
5. Create a separate, clearly labeled disposable moderation team before the presentation. Delete this team during the admin segment so the main approval/history demonstration remains visible.
6. Choose a hackathon date later than today, a brief description, comma-separated skills such as `React, CSS`, and a team size of 3. Prepare the words to type without including private account values in slides.
7. Optionally prepare extra disposable requests through the normal UI if you want to show all three status badges. One additional request can remain pending and another can be rejected by its creator. Do not rely on regression-suite records: that suite cleans them up.
8. Rehearse public browsing, login return navigation, confirmation dialogs, refresh buttons, and session switching. No screenshots are supplied; use the running local app rather than fabricated images.

## 2. Timed script

| Time | Screen/action | Suggested narration | Verification/setup note |
| --- | --- | --- | --- |
| 0:00–0:25 | Home | “Students may have a hackathon idea but struggle to find teammates with the right mix of skills. This project brings team discovery and membership decisions into one place.” | Problem statement; no result claim. |
| 0:25–0:50 | Architecture diagram from the architecture document | “React provides the interface, axios calls an Express API, and Mongoose stores users, teams, and join requests in MongoDB Atlas. The browser never talks directly to the database.” | Architecture confirmed from source; diagram is explanatory. |
| 0:50–1:20 | Register the fresh creator account; show Dashboard | “Registration creates a normal user. Authentication gives access to the workspace, while the backend checks permissions on every protected action.” | Registration API verified; live form interaction must be rehearsed. Do not show tokens. |
| 1:20–1:55 | Create Team | “I can publish a team with a future hackathon date, description, required skills, and maximum size. The creator automatically occupies the first slot.” | Creation/validation/API assignment verified. Use a future date and size 3. |
| 1:55–2:20 | Requester window, logged out: Browse Teams and open the new team | “Discovery is public. I can search the name or description, filter by a complete skill, and inspect the team's capacity and members.” | Search/filter/detail APIs verified. Use the newly created team, not hardcoded sample records. |
| 2:20–2:45 | Requester follows Login, logs in, submits an optional introduction | “Login returns me to the selected team. I can send one request, which is now pending. The creator must decide it.” | Login/submit APIs verified; intended-destination browser flow still needs rehearsal. Requester is a different prepared account. |
| 2:45–3:20 | Creator window: My Teams → Manage requests → Accept | “Only this team's creator can decide its requests. Acceptance adds the student and updates the request together. The member count changes from one to two.” | Acceptance/member consistency verified by integration tests. Refresh list/capacity if needed. |
| 3:20–3:45 | Requester window: My Requests → Refresh requests | “My Requests shows the team's name, my introduction, and the decision. Accepted and rejected requests cannot be decided again; a rejected request cannot be resubmitted.” | History API verified. Show Accepted; show prepared Pending/Rejected examples only if you actually created them. |
| 3:45–4:20 | Prepared administrator window: Admin → disposable moderation team → Delete Team → confirm | “An administrator can review and remove any team. The backend checks the current database role, and deletion also removes the team's requests.” | Admin listing/deletion/cascade verified. Requires prior manual promotion and a disposable team. Native dialog interaction must be rehearsed. |
| 4:20–4:40 | Return to overview or Dashboard | “The MVP covers the full discovery-to-membership flow, with ownership checks, duplicate protection, and transactional capacity enforcement. Automated API and non-browser frontend checks pass; browser evidence is documented separately.” | Do not claim chat, notifications, deployment, load-test results, or automated browser testing. |

## 3. Short answers for likely questions

- **Can a student join multiple teams?** Yes. Acceptance adds membership to the selected team without removing other memberships.
- **What if two approvals compete for the last slot?** A conditional database update inside a transaction protects capacity. The tested final-slot race produced one success and one conflict, leaving the unsuccessful request pending.
- **Can an admin approve everyone's requests?** No. Admin moderation is limited to listing/deleting any team. Request decisions remain creator-only.
- **Can rejected users try again on the same team?** No. The unique team/requester index applies to all statuses.
- **What does logout do?** It clears the local token/session. There is no token-revocation endpoint; signed tokens have a seven-day expiry.
- **How is admin access assigned?** An authorized maintainer edits an existing user's role privately in Atlas. Registration never assigns admin.
- **Are the screenshots or browser flows already verified?** No screenshots were supplied. API, transport/helper, route-structure, and server-rendering tests passed; actual browser rehearsal/evidence remains separate.

## 4. If the live demonstration encounters an issue

- For a connection problem, check the services and health response without displaying private configuration. Use the architecture and documented test evidence to explain what was verified; do not claim a failed live step succeeded.
- If a team is full or the requester already submitted, use another prepared disposable team/requester or explain the expected conflict instead of changing database rules.
- If Admin is absent, check manual provisioning and reload/login before the timed demo; never promote accounts through a fabricated public endpoint.
- If time is short, omit optional status examples and extra edits. Keep the main create → discover → request → approve → history sequence and briefly show admin moderation.

## 5. After the demonstration

Delete disposable demonstration teams using the creator/admin interface as appropriate. Deletion also removes their requests. There is no account-deletion UI; an authorized maintainer can remove only the identified disposable accounts in Atlas after their teams/requests are cleaned up. Revoke the temporary admin role if retaining that demo account is unnecessary.

Capture real screenshots and record manual browser outcomes only after actually performing the steps. The supplied ICTAK guide and internship template are mapped in [Submission Alignment](SUBMISSION_ALIGNMENT.md). One-project Vercel deployment is now prepared but has not been performed or cloud-verified; this script remains a local demonstration. Supply the missing cover details and evidence rather than claiming the guide's hosted-site checklist is complete.
