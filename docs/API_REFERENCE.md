# API Reference

## Conventions and shared types

**Local API base:** `http://localhost:5001/api`. The frontend calls `/api` through Vite's local proxy, or through same-origin routing in the prepared Vercel configuration. Business contracts come from baseline `547b8aa`; initialization/404 notes include the subsequent serverless adaptation of `server/index.js`. Controller success envelopes and the 16 business/health endpoints are preserved.

- Send JSON bodies with `Content-Type: application/json`.
- Protected endpoints require `Authorization: Bearer <token>`. The placeholder is notation, not an example token.
- `:id` is a team ObjectId string; `:requestId` is a join-request ObjectId string.
- Authentication verifies HS256 signature/expiry, then loads the current user and role from MongoDB. Deleted users are unauthorized.
- Creator authorization compares `Team.creator` to the authenticated ID. Admin authorization checks the **current database role**. An admin is not automatically authorized for another team's creator-only operations.
- JSON dates are ISO date-time strings; IDs are strings. Creation/update timestamps are supplied by Mongoose.
- Schema notation below, such as `{ team: Team }`, describes a response envelope rather than a literal JSON example.

### Response types

| Type | Fields |
| --- | --- |
| `SafeUser` | `id`, `name`, `email`, `skills`, `role`, `createdAt`, `updatedAt`. Used only for the authenticated user's profile. |
| `PublicUser` | `_id`, `name`, `skills`. No email or password hash. |
| `Team` | `_id`, `hackathonName`, `hackathonDate`, `description`, `skillsNeeded`, `maxTeamSize`, `creator`, `members`, `createdAt`, `updatedAt`; normal Mongoose document responses can include `__v`. Reference shapes depend on the endpoint, as listed below. |
| `TeamSummary` | `_id`, `hackathonName`. |
| `JoinRequest` | `_id`, `team`, `requester`, optional `message`, `status`, `createdAt`, `updatedAt`; normal document responses can include `__v`. Reference shapes depend on the endpoint. |

`creator` is an ID in team mutation responses and a `PublicUser` in populated reads. Missing populated references can be null after external database changes. Normal team deletion removes its associated requests rather than retaining dangling history. Capacity is computed from `members.length`; there is no separate `memberCount` API field.

### Common errors

Handled application errors use:

```json
{ "error": "Human-readable message" }
```

| Status | Meaning |
| --- | --- |
| 400 | Invalid input/ID or malformed JSON. |
| 401 | Missing, invalid, expired token, deleted account, or invalid login credentials. |
| 403 | Authenticated account lacks required ownership/admin permission. |
| 404 | Team or scoped request does not exist. |
| 409 | Duplicate registration/request, repeated decision, full-team conflict, or incompatible capacity edit. |
| 413 | Request body exceeds the JSON parser's size limit. |
| 500 | Unconfigured authentication or an unexpected server/database failure. |
| 503 | Database initialization is unavailable; retry later. |

Malformed JSON returns `Invalid JSON body.`; oversized input returns `Request body is too large.`; unexpected failures return `Internal server error.`. Missing `JWT_SECRET` in authentication paths returns `Authentication is not configured.`. No stack trace is returned.

Each endpoint lists its principal application errors below. Shared parser, configuration, and unexpected-failure responses also apply. Serverless preparation adds database initialization gating for the four API route families: failure returns 503 with `Database unavailable. Please try again later.`. Unknown API paths return JSON 404 with `API route not found.` and cannot fall through to React HTML. All 16 existing endpoint success envelopes remain unchanged.

## Health

### GET /api/health

- **Authentication/authorization:** None.
- **Request body:** None.
- **Success:** 200:

```json
{ "status": "ok", "app": "Hackathon Team Finder" }
```

- **Common errors:** No controller-specific validation errors. The server starts listening only after the initial database connection succeeds. This response is not a continuous database-readiness probe.

## Authentication

### POST /api/auth/register

- **Authentication/authorization:** None. Every successful registration creates role `user`, including the first account.
- **Request body:**

| Field | Type | Rules |
| --- | --- | --- |
| `name` | string | Required; non-empty after trimming. |
| `email` | string | Required; valid controller email format; trimmed/lowercased before lookup/storage. |
| `password` | string | Required; JavaScript length at least 8 and UTF-8 byte length at most 72. Values are intentionally not shown in this reference. |
| `skills` | string array | Optional; defaults to `[]`; all entries must be strings. |

Client role input cannot change the assigned role. Unknown fields are not copied into the created user.

- **Success:** 201, `{ token: string, user: SafeUser }`. The JWT expires after seven days; no token value is reproduced here.
- **Errors:** 400 for invalid registration data; 409 `An account with this email already exists.` for existing email or a duplicate-key race; shared 500 responses.

### POST /api/auth/login

- **Authentication/authorization:** None.
- **Request body:** Required string `email` and non-empty string `password`. Email is trimmed/lowercased. Passwords over 72 UTF-8 bytes are rejected as invalid credentials.
- **Success:** 200, `{ token: string, user: SafeUser }`.
- **Errors:** 401 `Invalid email or password.` for missing/invalid credentials, unknown email, or incorrect password; shared 500 responses.
- **Implementation note:** Login explicitly selects `passwordHash` for bcrypt comparison, but the response always uses the safe profile.

### GET /api/auth/me

- **Authentication:** Required Bearer JWT.
- **Authorization:** Current authenticated account only.
- **Request body:** None.
- **Success:** 200, `{ user: SafeUser }`, including the account's current database role.
- **Errors:** 401 `Unauthorized.` for invalid/missing/expired tokens or a deleted account; shared 500 responses.

There is no logout, refresh-token, password-reset, or public role-assignment endpoint. Logout is a frontend action that clears local credentials.

## Teams

### POST /api/teams

- **Authentication:** Required.
- **Authorization:** Any authenticated user.
- **Request body:**

| Field | Type | Rules |
| --- | --- | --- |
| `hackathonName` | string | Required, trimmed, non-empty. |
| `hackathonDate` | string | Required valid future ISO-style date/date-time with a real calendar day. |
| `description` | string | Required, trimmed, non-empty. |
| `skillsNeeded` | string array | Optional, defaults to `[]`; entries are trimmed. |
| `maxTeamSize` | number | Required safe integer, at least 2. Includes the creator. |

The server sets `creator` to the authenticated ID and `members` to an array initially containing that ID. Client-supplied creator/member values are not used.

- **Success:** 201, `{ team: Team }`; `creator` is an ID and `members` is an ID array.
- **Errors:** 400 for missing/invalid team fields or a non-object body; 401 without valid authentication; shared 500 responses.

### GET /api/teams

- **Authentication/authorization:** None.
- **Request body:** None.
- **Query parameters:**

| Parameter | Default | Behavior |
| --- | --- | --- |
| `search` | No filter | Trimmed literal substring search over `hackathonName` OR `description`, ignoring case. Regex metacharacters are escaped. |
| `skill` | No filter | Trimmed full-skill match over `skillsNeeded`, ignoring case. Regex metacharacters are escaped. |
| `page` | `1` | Positive integer string. |
| `limit` | `10` | Positive integer string; maximum effective limit 50. Unsafe integer/pagination values are rejected. |

Search and skill filters combine. Empty/whitespace filters are ignored. Sorting is `createdAt` descending, then `_id` descending.

- **Success:** 200, `{ teams: Team[], page: number, limit: number, total: number, totalPages: number }`.
- **Reference shapes:** Each `creator` is a `PublicUser`; `members` remains an ID array.
- **Empty result:** `teams: []`, `total: 0`, `totalPages: 0`. An out-of-range page can also return an empty array while retaining the matching total.
- **Errors:** 400 for non-string filters, invalid page/limit, or unsafe pagination; shared 500 responses.

### GET /api/teams/mine

- **Authentication:** Required.
- **Authorization:** Current account's created teams only.
- **Request body:** None. No pagination/filter parameters are implemented for this endpoint.
- **Success:** 200, `{ teams: Team[] }`, newest first. `creator` is a `PublicUser`; `members` is an ID array.
- **Errors:** 401 without valid authentication; shared 500 responses.
- **Meaning:** This is not a list of every team the user belongs to. `/mine` is registered before the team-ID route.

### GET /api/teams/:id

- **Authentication/authorization:** None.
- **Request body:** None.
- **Success:** 200, `{ team: Team }`. Both `creator` and each entry in `members` are populated with public user fields.
- **Errors:** 400 `Invalid team ID.`; 404 `Team not found.`; shared 500 responses.

### PATCH /api/teams/:id

- **Authentication:** Required.
- **Authorization:** Team creator only.
- **Request body:** A non-empty object containing only provided changes among `hackathonName`, `hackathonDate`, `description`, `skillsNeeded`, and `maxTeamSize`. Types/validation match creation when a field is supplied.
- **Rules:** Unknown fields, including direct creator/member updates, are rejected. Changing the date requires a valid future date; omitting it leaves it unchanged. Capacity cannot be below the current database member count.
- **Success:** 200, `{ team: Team }`; creator/members are ID references.
- **Errors:** 400 for malformed ID, invalid fields, empty update, or unsupported fields; 401 without valid authentication; 403 `Only the team creator may edit this team.`; 404 `Team not found.`; 409 `Team changed or maxTeamSize is below the current member count.`; shared 500 responses.

### DELETE /api/teams/:id

- **Authentication:** Required.
- **Authorization:** Team creator only.
- **Request body:** None.
- **Success:** 204, no response body. The team and its associated JoinRequest documents are removed in a transaction.
- **Errors:** 400 for malformed ID; 401 without valid authentication; 403 `Only the team creator may delete this team.`; 404 `Team not found.`; shared 500 responses.

## Join requests

### POST /api/teams/:id/requests

- **Authentication:** Required.
- **Authorization:** Logged-in user must not be the creator or a current member, and the team must have available capacity.
- **Request body:** Optional object with optional string `message`, at most 300 characters. `{}` or an empty message is accepted. Null/non-object bodies and non-string messages are invalid.
- **Rules:** The server sets `requester` from the authenticated ID and status to `pending`. A unique `(team, requester)` index applies across all statuses; previously rejected requests cannot be resubmitted. Membership in a different team does not prevent a request.
- **Success:** 201, `{ request: JoinRequest }`; `team` and `requester` are ID references.
- **Errors:** 400 for malformed team ID or invalid message/body; 401 without valid authentication; 404 `Team not found.`; 409 for creator/member submission, `Team is full.`, or `You have already requested membership in this team.`; shared 500 responses.

### GET /api/teams/:id/requests

- **Authentication:** Required.
- **Authorization:** Team creator only.
- **Request body:** None.
- **Success:** 200, `{ requests: JoinRequest[] }`, newest first. `requester` is populated as `PublicUser`; `team` remains an ID reference. Includes all statuses, not only pending requests.
- **Errors:** 400 for malformed team ID; 401 without valid authentication; 403 `Only the team creator may view these requests.`; 404 `Team not found.`; shared 500 responses.

### PATCH /api/teams/:id/requests/:requestId

- **Authentication:** Required.
- **Authorization:** Team creator only. A request must belong to the specified team, be pending, and not be the creator's own membership request.
- **Request body:** One of the following target statuses:

```json
{ "status": "accepted" }
```

```json
{ "status": "rejected" }
```

- **Success:** 200, `{ request: JoinRequest }`; team/requester are ID references. Acceptance atomically adds the requester to members and updates request status. Rejection updates only the request status.
- **Conflict behavior:** If capacity is unavailable, acceptance returns 409 without committing membership or request-status changes. A pending request stays pending. Existing memberships in other teams remain unchanged.
- **Errors:** 400 for invalid team/request ID or unsupported status; 401 without valid authentication; 403 `Only the team creator may decide these requests.`; 404 for a missing team or `Join request not found for this team.`; 409 for already-decided requests, creator self-decision, full capacity, or a requester already in the team; shared 500 responses.

### GET /api/requests/mine

- **Authentication:** Required.
- **Authorization:** Only requests submitted by the current user.
- **Request body:** None. No pagination/filter parameters are implemented.
- **Success:** 200, `{ requests: JoinRequest[] }`, newest first. `team` is populated with `TeamSummary`; `requester` remains the current user's ID. Messages, statuses, and timestamps remain present as stored; `message` can be absent if omitted on submission.
- **Errors:** 401 without valid authentication; shared 500 responses.
- **History semantics:** These are current records. Deleting a team also removes its requests from this list. Requesters cannot change status themselves.

## Administrator moderation

### GET /api/admin/teams

- **Authentication:** Required.
- **Authorization:** Current database role must be `admin`.
- **Request body:** None. No pagination/filter parameters are implemented.
- **Success:** 200, `{ teams: Team[] }`, newest first across all creators. Selected fields are `_id`, `hackathonName`, `hackathonDate`, `description`, `skillsNeeded`, `maxTeamSize`, `creator`, `members`, `createdAt`, and `updatedAt`. Creator is populated as `PublicUser`; members remain IDs. Version metadata is not selected.
- **Errors:** 401 without valid authentication; 403 `Admin access required.`; shared 500 responses.

### DELETE /api/admin/teams/:id

- **Authentication:** Required.
- **Authorization:** Current database role must be `admin`; team ownership is not required.
- **Request body:** None.
- **Success:** 204, no response body. Deletes the team and all its JoinRequest documents in a transaction.
- **Errors:** 400 `Invalid team ID.`; 401 without valid authentication; 403 `Admin access required.`; 404 `Team not found.`; shared 500 responses.

There are no admin user-management, role-assignment, or global request-decision endpoints. Use the manual, private provisioning procedure in the [README](../README.md#manually-provisioning-an-administrator).
