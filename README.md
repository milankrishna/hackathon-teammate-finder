# Hackathon Team Finder

Hackathon Team Finder is a college MERN capstone project that helps students connect with potential teammates for hackathons based on their skills and interests. Students can create and discover teams, submit and track join requests, and manage requests for teams they create. Administrators can review and delete teams.

## Technology stack

- MongoDB Atlas with Mongoose
- Express and Node.js (JavaScript)
- React with Vite and plain CSS

## Current status

MVP implemented and verified locally. Browser interaction testing remains outstanding.

## Local setup

Use a compatible Node.js release (Node.js 24 LTS recommended) and npm. Run these commands from the project root:

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
