# Nani Frys main shop installation

This package is for ONE designated 64-bit Windows 10 main shop computer. It uses
XAMPP MariaDB and a Node backend, not Apache/PHP for the application. Node serves
the built touchscreen frontend at http://127.0.0.1:5050. Apache access to the
installation folder is explicitly denied. Other XAMPP applications are untouched.

## Installation and first changeover

1. Install XAMPP on the shop computer. A verified official Node.js 22 runtime is
   included; no Node installation or internet download is needed at the till.
   Start the XAMPP database for installation. Back up any existing shop databases first.
2. Run `ops/windows/Install Nani Frys.cmd` as the Windows account that will operate
   the till. Windows may require administrator assistance for the scheduled task.
   Installation refuses an existing application folder, configuration, or database.
3. The installer creates `C:\xampp\htdocs\nanifrys`, a new `nanifrys_shop`
   database, a private database account, and private configuration/backups under
   `C:\ProgramData\NaniFrys`. Do not copy these private files into the public
   web directory or Git. Do not reuse preparation-computer credentials.
4. Prepare the cloud receiver from this same reviewed application version. Before
   switching ownership, export and verify a fresh live SQL backup. Using database
   administrator access, create `NaniReplicaState` from `ops/replica-schema.sql`.
   No business table reset or demo seed is needed. Pair the private secret from
   the SHOP computer's `shop.env` with the receiver outside Git. Set cloud-only
   environment `SITE_MODE=cloud`, `REPLICA_CLOUD_READONLY=true`,
   `REPLICA_SHOP_ID=nani-frys-main-shop`, and `REPLICA_SECRET` to that private key.
5. In a planned pause in trading, restart the hosted API, confirm ordinary writes
   are blocked, and wait for existing requests to finish. Leave the cloud read-only.
   Run `ops/windows/pair-shop.ps1` on the shop. It fetches a consistent fresh
   snapshot over HTTPS and imports all business rows atomically, preserving IDs.
   Nonempty local databases are never replaced automatically. PINs become salted
   bcrypt hashes locally and are propagated securely to the cloud by sync.
6. Open **Nani Frys POS** from the desktop. Verify the current staff PIN, real menu,
   correct balances/stock, printing, backup and sync status. Run marked tests and
   compare both databases before real sales. Once local sales begin, do not reopen
   cloud writes or return to an older cloud release without reconciliation.

## Operation and ownership

- Sales, orders, payments, stock, shifts, expenses, menu and staff edits belong to
  the shop computer. The cloud is a reporting replica; it rejects ordinary writes.
  A staff deactivation must be made locally to take effect immediately offline.
- At Windows sign-in the scheduled supervisor starts the database if needed and
  runs the app. The desktop icon also checks/starts these services and waits for
  SQL health before opening the POS. A closed browser does not stop the worker.
  The PC must remain awake. This is sign-in startup, not a pre-login Windows service.
- Confirmed local SQL writes do not depend on internet. There is no browser mock
  fallback. Local SQL authentication works without an internet connection; staff
  PINs are never returned through staff/profile endpoints.
- Cloud changes are uploaded every 20 minutes. Failed connections are retried
  every minute. Related changes commit together in one batch. A durable pending batch retains its
  ID after restart or a lost acknowledgement; the receiver applies it once only.
  Version conflicts halt a batch instead of silently overwriting data.
  A backlog above 5,000 changed records requires operator review; data stays local.
- HTTP DELETE operations are blocked locally. Cancel orders or deactivate records.
  Current middleware does not convert every catalogue delete action to deactivate;
  these actions will show an explanatory error until a soft-delete UI is added.
  Existing catalogue editors that replace child rows can also trigger the missing-row
  review safeguard. Such deletions are never silently propagated to the cloud.
- Backups run at startup and hourly while the server runs, with SHA256 files.
  Automatic backup files are retained; monitor disk use. The default copy is on the
  same drive: configure a separate disk/off-site backup before relying on recovery.
- **Shop status** in the header shows pairing readiness, pending record changes,
  latest successful batch upload, next attempt and last backup. A record change
  count is not a sale count. No-change polling does not claim a successful upload.

## Recovery

Run `restore-check.ps1 -Backup <backup.sql>` with local database administrator
access. It validates the checksum and restores into a NEW `nanifrys_recovery_*`
database, never the trading database. Compare counts and records before a manager
changes private configuration. An older backup can be behind the cloud: resolve
conflicts and unsynced data first. Never import a dump over a running shop database.

## Acceptance tests on the actual shop hardware

Test startup after Windows restart; offline login; printer receipts/reprints; local
sale/payment/stock consistency without internet; restart with unsent changes;
network failure after cloud commit but before acknowledgement; duplicate retry;
conflict handling; a scheduled upload; and restoring a backup into a separate DB.
Test a full busy shift before treating this package as production-ready.

The local preparation build does not change nanifrys.com's operating mode. Cloud
pairing and the physical POS/printer acceptance test are installation steps.
