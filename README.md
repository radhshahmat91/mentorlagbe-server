# MentorLagbe — Server API

The REST API behind **MentorLagbe**, a smart tuition & mentorship platform: students discover and apply to tuitions, tutors post and manage them, and admins moderate the marketplace. Tutors and students can upgrade to a **Pro** plan through Stripe Checkout.

The Next.js front end lives in the sibling repository **`mentorlagbe-client`**.

| | |
|---|---|
| **Live API** | https://mentorlagbe-server-q3q2.onrender.com |
| **Live site** | https://mentorlagbe-client-seven.vercel.app |
| **Admin login** | `admin@mentorlagbe.com` / `Admin@123456` |
| **Tutor login** | `tutor@mentorlagbe.com` / `Tutor@123456` |
| **Student login** | `student@mentorlagbe.com` / `Student@123456` |

> These accounts exist after you run `npm run seed` (see below). Change `ADMIN_EMAIL` / `ADMIN_PASSWORD` before a real launch.

---

## Key features

- **Authentication with BetterAuth** (email + password) using the official **MongoDB adapter**. People choose `student` or `tutor` at sign-up; the server refuses any other role (nobody can self-register as admin) and always starts accounts on the `free` plan.
- **JWT + role middlewares.** `POST /api/jwt` turns a BetterAuth session into a short-lived JWT. Four composable guards protect the API: `verifyToken`, `verifyStudent`, `verifyTutor`, `verifyAdmin`. The user is re-read from MongoDB on every request, so a role or plan change takes effect immediately.
- **Exactly four business collections:** `users`, `tuitions`, `applications`, `payments`. (BetterAuth additionally keeps its own `session`, `account` and `verification` bookkeeping collections.)
- **Server-side search, filter, sort and pagination** on `GET /api/tuitions` — case-insensitive, regex-escaped search over title and subject, plus subject / class level / mode filters, four sort orders and `skip`/`limit` paging in MongoDB.
- **Moderation workflow.** New tuitions start as `pending`; only `approved` + `isActive` tuitions are public. Editing a rejected post sends it back to `pending`.
- **Free vs Pro rules.** Free tutors can create **2** tuitions (`403 PLAN_LIMIT` afterwards); Pro tutors are unlimited and get a verified badge. Applications from Pro students are flagged `isPriority` and listed first for tutors.
- **Applications.** Student-only apply, duplicate protection (unique index + `409 DUPLICATE_APPLICATION`), cancel while pending, tutor accept / reject, and one review per accepted application with automatic rating aggregation.
- **Stripe Checkout + webhook.** One shared, idempotent fulfilment function is used by both the signed webhook and the `GET /api/payments/verify` fallback, so a payment is recorded and the plan upgraded exactly once — even if both fire. Stripe failures are mapped to a friendly `502` (a wrong or restricted key is never passed on as `401`/`403`, which the web app would read as an expired login).
- **ImgBB uploads.** `POST /api/uploads/image` proxies images to ImgBB so the API key never reaches the browser (PNG / JPEG / WebP / GIF, 5 MB).
- **Bookmarks, reviews, public stats**, admin dashboard statistics (revenue and sign-ups for the last six months), health check and clean JSON errors (`422` validation errors come with a field map).
- **Secure by default:** helmet, strict CORS allow-list, 5 MB upload cap, zod validation on every body, secrets only in environment variables.
- **Seed script** with 12 tutors, 16 students, 22 tuitions in every moderation state, 38 applications, reviews and Pro payments.
- **16 integration tests** that run against a throwaway database with fake Stripe / ImgBB clients.

---

## Tech stack & npm packages

| Package | Why it is used |
|---|---|
| `express` (5) | HTTP server and routing (async errors reach the error handler automatically) |
| `mongodb` | Official MongoDB driver |
| `better-auth` | Authentication, sessions and the MongoDB adapter (`bearer` plugin for cross-domain use) |
| `jsonwebtoken` | Signs / verifies the API JWT used by the role middlewares |
| `stripe` | Checkout sessions and webhook signature verification |
| `zod` | Request validation with field-level error messages |
| `cors` | Origin allow-list (credentials + `set-auth-token` exposed) |
| `helmet` | Security headers |
| `morgan` | Request logging |
| `multer` | Multipart parsing for image uploads (memory storage, 5 MB) |
| `dotenv` | Loads `.env` in development |

Runtime: **Node 20+** (developed on Node 22), ES modules, no build step. Tests use the built-in `node:test` runner.

---

## Getting started

```bash
# 1. install
npm install

# 2. configure
cp .env.example .env        # then fill in real values (see "Environment variables")

# 3. (optional) load demo data — needs MongoDB running
npm run seed                # idempotent upsert
npm run seed -- --fresh     # wipe the four collections + BetterAuth data first

# 4. run
npm run dev                 # http://localhost:5000  (node --watch)
npm start                   # production mode
```

Check it is alive: `curl http://localhost:5000/api/health` → `{"status":"ok","db":"up"}`.

### Tests

```bash
npm test
```

Needs a MongoDB reachable at `MONGODB_URI` (default `mongodb://127.0.0.1:27017`). Every run creates and drops its own `mentorlagbe_test_<timestamp>` database. Stripe and ImgBB are replaced by in-memory fakes (webhook payloads are signed locally with the real Stripe helper), so no network or real keys are needed.

### Demo accounts created by the seed

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | `admin@mentorlagbe.com` | `Admin@123456` | also created automatically on first boot |
| Tutor (Free) | `tutor@mentorlagbe.com` | `Tutor@123456` | 2 approved posts — already at the free limit |
| Tutor (Pro) | `protutor@mentorlagbe.com` | `Tutor@123456` | verified badge, unlimited posts |
| Student (Free) | `student@mentorlagbe.com` | `Student@123456` | applications in every status, saved tuitions |
| Student (Pro) | `prostudent@mentorlagbe.com` | `Student@123456` | priority applications |

All other seeded accounts use `Demo@123456`.

---

## Environment variables

Copy `.env.example` to `.env`. **Never commit `.env`.**

| Variable | Purpose |
|---|---|
| `PORT` | Local port (default `5000`) |
| `NODE_ENV` | `development` / `production` (production switches auth cookies to `SameSite=None; Secure`) |
| `MONGODB_URI` | MongoDB connection string (Atlas in production) |
| `MONGODB_DB` | Database name |
| `CLIENT_URL` | Front-end origin(s), comma separated, no trailing slash. Used for CORS, BetterAuth `trustedOrigins`, and (first entry) Stripe success / cancel redirects |
| `BETTER_AUTH_URL` | Public URL of **this** server |
| `BETTER_AUTH_SECRET` | 32+ random characters |
| `JWT_SECRET` | 32+ random characters (different from the one above) |
| `JWT_EXPIRES_IN` | JWT lifetime, default `1d` |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`) |
| `IMGBB_API_KEY` | ImgBB API key |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin account created on first boot and by the seed |

Generate secrets with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

---

## How authentication works

The API is designed to work when the client and the server live on **different domains** (for example two `*.vercel.app` projects) without depending on third-party cookies.

1. The client signs up / in through BetterAuth (`/api/auth/*`). Because the `bearer` plugin is enabled, the response carries a `set-auth-token` header with the session token.
2. The client calls `POST /api/jwt` with `Authorization: Bearer <session token>` and receives `{ token, expiresIn, user }` — a signed JWT.
3. Every protected request sends `Authorization: Bearer <JWT>`. The middleware verifies the signature, then loads the current user from MongoDB and checks the role.
4. On `401` the client can exchange its session token for a fresh JWT once and retry.

| Guard | Allows |
|---|---|
| `verifyToken` | any signed-in user |
| `verifyStudent` | role `student` |
| `verifyTutor` | role `tutor` |
| `verifyAdmin` | role `admin` |

`403` means “signed in but wrong role”, `401` means “missing / invalid / expired token”. BetterAuth's own `/update-user` endpoint is disabled so nobody can change their role or plan through it; profile edits go through `PATCH /api/users/me`, which only accepts `name`, `phone`, `bio` and `image`.

---

## API overview

Base path `/api`. Paginated responses look like `{ items, total, page, limit, totalPages }`. Errors look like `{ message, code?, errors? }`.

### Public
| Method & path | Description |
|---|---|
| `GET /` · `GET /api/health` | Service info · health check |
| `GET /api/stats/public` | Counts, average rating and top subjects for the home page |
| `GET /api/tuitions` | Browse — `search`, `subject`, `classLevel`, `mode`, `sort` (`latest`, `fee-asc`, `fee-desc`, `rating`), `page`, `limit` |
| `GET /api/tuitions/featured?limit=6` | Latest approved tuitions |
| `GET /api/tuitions/:id` | Details with tutor summary, reviews and (when signed in) viewer state |

### Auth & account (any signed-in user)
| Method & path | Description |
|---|---|
| `/api/auth/*` | BetterAuth (`sign-up/email`, `sign-in/email`, `sign-out`, `get-session`, …) |
| `POST /api/jwt` | Exchange a BetterAuth session for the API JWT |
| `GET /api/users/me` · `PATCH /api/users/me` | Read / update own profile |
| `POST /api/uploads/image` | Upload an image to ImgBB (multipart field `image`) |
| `GET /api/payments/mine` | Own payment history |
| `POST /api/payments/checkout` | Start Stripe Checkout (Pro Tutor $15 / Pro Student $10) |
| `GET /api/payments/verify?session_id=` | Confirm a paid session and upgrade the plan (webhook fallback) |
| `POST /api/payments/webhook` | Stripe webhook (no auth, signature verified, raw body) |

### Student (`verifyStudent`)
`GET /api/student/stats` · `GET|POST /api/student/applications` · `DELETE /api/student/applications/:id` (pending only) · `PUT /api/student/applications/:id/review` (accepted only) · `GET /api/student/bookmarks` · `GET /api/student/bookmarks/ids` · `PUT|DELETE /api/student/bookmarks/:tuitionId`

### Tutor (`verifyTutor`)
`GET /api/tutor/stats` · `GET|POST /api/tutor/tuitions` · `GET|PATCH|DELETE /api/tutor/tuitions/:id` · `PATCH /api/tutor/tuitions/:id/status` (active toggle) · `GET /api/tutor/applicants` · `PATCH /api/tutor/applicants/:id/status` (accept / reject)

### Admin (`verifyAdmin`)
`GET /api/admin/stats` · `GET /api/admin/users` · `PATCH /api/admin/users/:id/role` · `GET /api/admin/tuitions` · `PATCH /api/admin/tuitions/:id/approval` · `GET /api/admin/transactions`

---

## Data model (4 collections)

| Collection | Key fields |
|---|---|
| `users` | `name`, `email` (unique), `image`, `role` (`student` \| `tutor` \| `admin`), `plan` (`free` \| `pro`), `phone`, `bio`, `savedTuitions[]`, `createdAt` |
| `tuitions` | `title`, `subject`, `classLevel`, `mode`, `location`, `monthlyFee`, `daysPerWeek`, `schedule`, `bannerImage`, `description`, `tutorName`, `tutorEmail`, `approvalStatus`, `isActive`, `ratingAvg`, `ratingCount` |
| `applications` | `tuitionId`, `tutorEmail`, `studentEmail`, `studentPhone`, `preferredSchedule`, `studentNote`, `status`, `isPriority`, optional `review { rating, feedback }` — unique on `{ tuitionId, studentEmail }` |
| `payments` | `userEmail`, `userName`, `userRole`, `planName`, `amount`, `currency`, `transactionId`, `stripeSessionId` (unique), `paymentStatus`, `paidAt` |

Indexes are created idempotently at start-up and never block requests.

---

## Stripe

1. Put your **test** secret key in `STRIPE_SECRET_KEY`.
2. Local webhook testing with the [Stripe CLI](https://stripe.com/docs/stripe-cli):
   ```bash
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```
   Copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET` and restart the server.
3. In production add an endpoint `https://<your-server>/api/payments/webhook` in the Stripe dashboard listening to `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and use its signing secret.
4. Pay with the test card `4242 4242 4242 4242`, any future date, any CVC.

Even without the webhook, the success page calls `GET /api/payments/verify`, so the upgrade still completes — and it can never be applied twice.

## Deploying to Vercel

The repo is ready for a serverless deployment: `api/index.js` exports the Express app and `vercel.json` rewrites every path to it.

1. Import the repository in Vercel (framework preset **Other**).
2. Add every variable from the table above. Set `NODE_ENV=production`, `BETTER_AUTH_URL=https://<this-server>.vercel.app` and `CLIENT_URL=https://<your-client>.vercel.app`.
3. In MongoDB Atlas, allow network access from anywhere (`0.0.0.0/0`) — Vercel uses dynamic IPs.
4. Run `npm run seed` once from your machine against the Atlas URI to load demo data.
5. Add the Stripe webhook endpoint and set `STRIPE_WEBHOOK_SECRET`.
6. Put the server URL into the client's `NEXT_PUBLIC_API_URL`.

Because authentication relies on `Authorization` headers rather than cookies, there are no cross-site cookie problems, and CORS is restricted to the origins in `CLIENT_URL`.

---

## Project structure

```
src/
  config/       env parsing, MongoDB client + indexes
  lib/          BetterAuth, JWT, Stripe, ImgBB, zod schemas, serializers, constants
  middleware/   verifyToken / verifyStudent / verifyTutor / verifyAdmin, error handling
  routes/       public, account, student, tutor, admin
  services/     idempotent payment fulfilment, admin bootstrap
  app.js        createApp({ stripe, uploadImage }) — dependency-injected for tests
  server.js     local entry point
api/index.js    Vercel entry point
scripts/        seed-data.js, seed.js
test/           integration tests (node:test)
```

## License

Built as an assignment project (Assignment 9 · Category 001 — MentorLagbe).
