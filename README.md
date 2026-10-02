# FGI Loan Management System

Admin portal for a community microfinance service: members and groups, weekly loans, payment
collection with SMS receipts, and a dashboard. Live at https://fgiloans.lk.

| Part | Stack |
|---|---|
| Frontend | React 19, Vite, React Router, Recharts, installable PWA (`vite-plugin-pwa`) |
| Backend | Node.js, Express 4, Sequelize 6, MySQL / MariaDB, zod validation |
| Hosting | cPanel (LiteSpeed + Passenger). The frontend is in `public_html/`, the API in `backend/`, served under `/api` |

## Project layout

```
src/                  React app (pages/, components/, api/client.js)
public/               Static files copied into the build (.htaccess, icons, favicon)
server/
  index.js            Express app: security middleware, routes under /api
  controllers/        Request handlers
  services/loanMath.js  All loan and payment maths (pure functions, unit-tested)
  models/             Sequelize models
  validators/         zod schemas for request bodies and queries
  migrations/         numbered schema changes, applied by `npm run migrate` (db/migrator.js)
  scripts/            migrate, sync-overdue and retry-sms (cron jobs), check-loans (loan health check)
  tests/              Unit tests: npm test
```

## Running locally

Requirements: Node.js 20+ and a MySQL or MariaDB database.

```bash
# Backend
cd server
cp .env.example .env        # fill in MYSQL_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD …
npm install
npm run migrate             # applies pending migrations (creates and updates tables)
npm run dev                 # http://localhost:5000

# Frontend (second terminal, project root)
npm install
npm run dev                 # http://localhost:5173
```

## Checks

```bash
npm run lint                # ESLint, frontend and backend
npm run build               # production build into dist/
cd server && npm test       # unit tests for the loan and payment maths
```

GitHub Actions runs all three on every pull request and before every deploy. A failure blocks the deploy.

## Deploying

Merging into `main` deploys automatically (`.github/workflows/deploy.yml`):

1. lint, unit tests and build must pass;
2. `dist/` is uploaded to `public_html/` and `server/` to `backend/` over FTP;
3. `tmp/restart.txt` restarts the Node app.

Things the deploy does **not** do:

- **New backend dependency:** cPanel → Setup Node.js App → *Run NPM Install*.
- **New migration** (a file added to `server/migrations/`): run `npm run migrate` in the cPanel terminal. The server never changes the database when it starts. The cron scripts also apply pending migrations before they run.
- **Environment variables:** set them in cPanel → Setup Node.js App (see `server/.env.example`).

## Operations

| Task | Command (cPanel terminal, inside `backend/`) |
|---|---|
| Daily overdue update (cron, `5 0 * * *`) | `node scripts/sync-overdue.js` |
| Check loans for wrong balances (read-only) | `node scripts/check-loans.js` |
| Correct them | `node scripts/check-loans.js --fix` (add `--loan=ID` for one loan) |
| Apply pending migrations | `node scripts/migrate.js` |
| Retry failed receipt SMS (cron, `*/30 * * * *`) | `node scripts/retry-sms.js` |

Before running a command, activate the app's Node environment: copy the `source …/activate` line
from the top of cPanel → Setup Node.js App.

## Payment rules

All money rules are in `server/services/loanMath.js`:

- **Exact installments:** installments add up exactly to the total; they differ by at most Rs. 1.
- **Shortfall:** a partial payment carries the shortfall to the next week.
- **Overpayment:** an overpayment pays the oldest open weeks first, then reduces the next one.
- **Cap:** a payment can never exceed the remaining balance.
- **Completion:** a loan is completed only when nothing is owed.
- **Reversal:** only the latest payment can be reverted, and that restores the schedule exactly.

## SMS receipts

Every payment sends a receipt SMS (Text.lk) in the background, and records it in the `SmsLogs` table.
The loan page shows each receipt under the payment schedule:

| Status | Meaning | What happens |
|---|---|---|
| Sent | The gateway accepted it | Nothing to do |
| Failed | The gateway rejected it or could not be reached, so nothing was sent | Retried by the `retry-sms` cron job (up to 3 attempts, receipts from the last 2 days) |
| Not confirmed | No clear answer (timeout, gateway error) — the customer may have it | Never retried automatically; an admin can press **Resend** |
| Not sent | SMS switched off, or no valid phone number | Nothing to do |

If the `SmsLogs` table does not exist yet, payments and SMS work as before; only the log is missing.
