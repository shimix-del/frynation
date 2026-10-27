# Nani Frys POS

Restaurant sales, stock, shifts, expenses, staff, and branch reporting for Nani Frys.

React, TypeScript, Vite, and Tailwind form the frontend. Express, Prisma, and **MySQL** form the backend. The hosted database is **`mombasam_nanifrys`** on the cPanel account for **nanifrys.com**.

## Live mode

Live mode uses the hosted backend. Rejected requests remain errors; the application never silently switches to browser storage. Checkout validates menu prices and payments, requires an authorized open shift, and saves payments, stock movements, shift counters, and activity in one transaction. Request IDs prevent duplicate checkout submissions.

M-Pesa and card entries record payments confirmed by staff. Enter the actual transaction or slip reference. Automatic provider verification and STK integration are not implemented.

The owner's **Activity Log** filters actions by user, shift, branch, date, and action. It records logins, logouts, orders, cancellations, cash movements, expenses, stock movements, and staff changes from this update onward. Historical actions cannot be reconstructed.

## Local mode

Open the shop server at **http://127.0.0.1:5050/**. **Local mode** uses the shop MySQL database and works without internet. It requires a running, paired shop backend; it does not create a separate browser owner or sample records.

Both Local mode and nanifrys.com accept sales. The shop exchanges changes with the live site at **00:00, 04:00, 08:00, 12:00, 16:00 and 20:00 Africa/Nairobi time**, retrying failed exchanges every five minutes. The PC must remain awake. Each installation has its own cash drawer and shift. See [synchronization and recovery](docs/SYNCHRONIZATION.md) for pairing, backups and conflict handling.

Older browser-only data is preserved for export through `backup-local-data.html`. Trading in the retired browser store is disabled; review and reconcile exported records before clearing them.

## Pending central sales

A connection failure during central checkout saves a pending ticket with its original cashier, shift, and request ID. Explicit server rejections do not create offline sales. Automatic retry runs while the POS screen is open and online. The original cashier must sign in; closed-shift tickets require owner review. Repeated failures never discard tickets.

The Activity Log shows pending tickets on the current device and can export them for review. Confirmed tickets are removed individually after a successful response from their configured backend.

## Setup

Use Node.js 22 or newer. Install dependencies:

```sh
npm ci
npm --prefix server ci
npm --prefix client ci
```

Copy `server/.env.example` to a private `server/.env`. Supply the cPanel database user, password, host, and a long random JWT secret. Never put credentials in the frontend.

**For existing data, follow [the database upgrade guide](docs/DATABASE-UPGRADE.md) before starting the updated server.** Restore and verify both backups in staging first. The deployment script makes a private backup and applies only the reviewed additive changes; it never imports the empty-database SQL over business data.

Development:

```sh
npm run dev
```

Built installation:

```sh
npm run build:server
npm run build:client
npm start
```

The backend serves the built client at `http://localhost:5000/`. On nanifrys.com the client uses `/api` on the same HTTPS origin. A separate API address can be configured on the sign-in screen.

## Verification

```sh
npm test
npm run build:server
npm --prefix client run build
npm run test:integration
```

Regression tests exercise authorization, checkout rollback, duplicate submissions, exact stock reversals, held orders, expense reconciliation and durable pending tickets. The integration check creates two isolated local MySQL databases, verifies simultaneous shop/live sales and interrupted two-way synchronization, then removes those verification databases. It never connects to the hosted database.
