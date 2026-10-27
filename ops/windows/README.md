# Nani Frys shop operation

Both the shop and nanifrys.com accept sales. The shop SQL backend serves Local mode at http://127.0.0.1:5050. Read [the current synchronization guide](../../docs/SYNCHRONIZATION.md) before installation or recovery. Older instructions that leave the cloud read-only or upload every 20 minutes are superseded.

## Existing shop database

Do not run the fresh installer against an existing database. Export and restore both local and hosted databases in staging, compare every business row, and apply the additive upgrade. `ops/setup-existing-shop.cjs` prepares private configuration for the reviewed existing database; it refuses to replace an installed configuration. Pair only after both servers run the same reviewed protocol and the local base fingerprint has been recorded and verified.

Private settings and backups stay under `C:\ProgramData\NaniFrys`, outside the web directory and Git. The paired backends share a private synchronization key; their database accounts and login token keys remain separate. New hosted credentials must be entered by the account owner.

If the shared XAMPP instance is damaged, an explicitly approved isolated recovery can use `isolated-database.cjs prepare <checksummed-backup.sql>`, followed by starting its private configuration and running `isolated-database.cjs finish`. It creates fresh system tables under `C:\ProgramData\NaniFrys\mysql-data` on loopback port 3307. It never replaces shared XAMPP tables. Shop settings change only after restored business rows match the reviewed fingerprint. The supervisor reads the database port and `MYSQL_DEFAULTS_FILE` from the private shop settings; it does not restart the damaged shared instance in this configuration.

## Fresh empty computer

Build the installer package before running `Install Nani Frys.cmd`. The installer refuses an existing application directory, private configuration or database. Never delete these safeguards to force an installation. A staged data-only SQL export must have a verified checksum. Do not seed sample data.

Prepare the same cloud release with `SITE_MODE=cloud`, `REPLICA_CLOUD_READONLY=false` and the paired shop ID and key. Run `pair-shop.ps1` only after backups and base verification. Unrecognized or changed existing data stops pairing; it is never silently replaced.

## Daily operation

The supervisor starts at Windows sign-in and restarts a stopped backend. It checks XAMPP MySQL without changing unrelated applications. Closing the POS browser does not stop it. The computer must remain awake for synchronization at 00:00, 04:00, 08:00, 12:00, 16:00 and 20:00 EAT. Failed exchanges retry every five minutes. Backups run at startup and hourly, with SHA256 checksums. Keep a separate disk or off-site backup as well.

Each installation has its own shift and drawer. Stock movements merge once; competing changes to the same business field stop for owner review. The header shows the most recent confirmed exchange, pending changes, next attempt and backup state. A record count is not a sale count.

## Recovery and acceptance

`restore-check.ps1 -Backup <backup.sql>` validates the checksum and restores into a new recovery database. Compare its records before changing any live configuration. Never import an older backup over a running shop or remove a pending batch to conceal a conflict.

Verify sign-in startup, offline SQL login, sale/payment/stock consistency, interrupted synchronization, duplicate retries, both directions of exchange, shift closing, and restoration. Verify receipts on the actual printer. Retain the prior release and backups until the new installation passes these checks.
