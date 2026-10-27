# Local and live operation

Both the XAMPP shop server and nanifrys.com accept sales. **Local mode means the shop SQL database**, served at `http://127.0.0.1:5050`, rather than a separate browser store. Old browser records can be exported with `backup-local-data.html`; browser-only trading is disabled.

The shop server initiates a secure two-way exchange at **00:00, 04:00, 08:00, 12:00, 16:00 and 20:00 Africa/Nairobi time**. It must remain running and the PC must be awake. Failed exchanges retry every five minutes. Closing the browser does not stop the worker. The header reports the latest confirmed exchange, next attempt, pending changes, backup status, and any conflict.

Each installation has its own shift/drawer. IDs and checkout request IDs are retained across synchronization. Sales, items, payments, activity, and stock movements merge transactionally; related records cannot arrive half-applied. A persisted batch is retried with the same identity after a restart or lost acknowledgement.

Stock balances are updated from movements not competing full-row balances. Shift totals are recalculated from completed sales, payments, and cash movements. Both sites can make independent sales without overwriting each other. Offline sales can consume the same remaining stock at both sites: synchronization retains the actual sales, and negative stock requires physical reconciliation. Simultaneous physical-count adjustments stop for review.

Different edits to the same staff/menu/business field stop the batch rather than choose a winner from a timestamp. Both versions remain in their databases and the pending batch remains durable. An owner must review the versions and establish the agreed baseline; do not delete the pending batch or overwrite a database to hide a conflict. Deactivation on one disconnected installation reaches the other at the next successful exchange.

Before pairing, export both databases and restore them in staging. The local and hosted backups were compared on 27 October 2026: 78 orders, 144 order items, 76 payments, 16 shifts and the other business records matched. Retain the backup files outside web directories and Git. This comparison is evidence for that snapshot, not a guarantee that later changes are already synchronized.

The reviewed existing local base is upgraded additively. Pairing refuses an unrecognized or changed local base. An explicitly reviewed unchanged base can advance to a fresh cloud snapshot without deleting local-only records. Both backends must run the same protocol and schema before activation.

Private settings belong in `C:\ProgramData\NaniFrys\shop.env` and `/home/mombasam/nanifrys-runtime/.env`. The pairing credential is shared only between these two application backends, never included in frontend code or Git. The local database account and JWT key remain separate from the hosted ones.

Run `npm test`, both builds, and `node tests/two-way-mysql.mjs` before rollout. The MySQL integration test creates and removes two isolated verification databases and covers simultaneous sales, stock merging, lost acknowledgements, remote-only changes, scheduling, and conflicts. Verify an actual private authenticated exchange after deployment; public health alone does not prove synchronization.
