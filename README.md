# Nani Frys POS

Nani Frys uses React/Vite, a Node.js/Express backend and Prisma with MySQL/MariaDB.
The Windows shop installation and the Truehost database both use the database
name **mombasam_nanifrys**. There are 15 business tables and one sync metadata
 table, NaniReplicaState. SQLite/PostgreSQL instructions and demo seed logins are
not applicable to this deployment.

## Install the main shop computer

Follow [the Windows installation guide](ops/windows/README.md). The prepared
64-bit Windows 10/11 package includes the Node.js 22 runtime. XAMPP supplies the
local MariaDB server. The desktop launcher opens the app at
http://127.0.0.1:5050 after the database and app server are ready.

For existing live data, use the separate PRIVATE database transfer ZIP. Extract
its nanifrys-live-database folder alongside nanifrys-shop-installer, and run
**Install with existing data.cmd** inside the database folder. The installer
creates the matching schema and imports the reviewed data-only SQL file. It
refuses an existing database rather than overwriting records.

Do not run the demo seed against live, imported or shop data. Do not publish
staff PINs, SQL data dumps, database passwords or pairing secrets in Git.

## Ownership and synchronization

After a planned cutover, the shop computer owns sales, payments, inventory,
shifts, expenses, menu and staff changes. The hosted database is a reporting
copy and rejects ordinary writes. The local server uploads changes automatically
every 20 minutes and retries connection failures. No phpMyAdmin upload is needed.

Both sides use [the same Prisma schema](server/prisma/schema.prisma). The
[additive sync-table SQL](ops/replica-schema.sql) can prepare an existing hosted
database without rebuilding business tables. New empty hosted databases may
use server/prisma/cpanel-initial.sql. Existing tables use utf8mb4_unicode_ci;
match the database default to this for XAMPP compatibility.

Protocol version 2 checks an application schema fingerprint. A staged local base
must also match the fresh cloud business fingerprint before activation. Changed
or stale bases stop for review without silently replacing local records. Data
sync uses retained batch IDs, atomic cloud commits, row conflict checks and exact
acknowledgements, so a lost response can be retried without duplicate payments.
Backlogs above 5,000 changed records and removed rows require review.

Cloud receiver configuration and private pairing must be completed on the actual
shop machine before trading. The domain never connects directly to a remote
localhost address. Its status panel shows the latest committed shop upload.

## Offline access and backups

Staff sign in against local SQL without internet. Activation stores salted PIN
hashes; staff PINs are not returned by profile or staff-list APIs. The owner can
change staff access locally, and inactive users immediately lose API access.

The Windows supervisor starts at sign-in and from the desktop icon, monitors the
database, and restarts the app if necessary. The computer must stay on and awake.
Hourly backups are stored outside htdocs with checksums. Choose a separate drive
for protection against a failed shop disk. The restore checker validates a backup
and imports it into a new recovery database, never over the trading database.

## Source builds and checks

Use Node.js 22. Install dependencies from the lockfiles, generate the Prisma client,
and build the server and client. Production requires private DATABASE_URL and
JWT_SECRET values. The client uses the same-origin /api service and has no
production browser mock fallback.

Regression checks: tests/api-production.test.mjs, tests/checkout-transaction.test.mjs,
tests/cashier-dialogs.test.mjs and tests/device-import.test.mjs.
The local XAMPP integration test tests/shop-replica.test.mjs creates isolated
nanifrys_test_* databases and verifies staged-base pairing, schema rejection,
offline staff access, sales/payment/stock consistency, lost acknowledgements,
duplicate retries, conflicts and backups. It does not target hosted business data.

The cPanel Git task builds a versioned release before activation. Keep private
credentials outside the document root. Do not switch cloud writes off until the
actual shop is ready for its initial verified import and planned changeover.
