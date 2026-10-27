# Database setup and upgrade

The hosted database is **`mombasam_nanifrys`**, configured in cPanel for **nanifrys.com**. Read-only inspection of the open phpMyAdmin session confirmed that spelling and Prisma-style table names on 26 October 2026. The message spelling `mombasm_nanifrys` omits an `a`. An additional `NaniReplicaState` table is present and must be preserved. Its username, password, and host must come from cPanel; the database name does not establish those values.

`server/prisma/schema.prisma` is the application schema. `nani_fry_db.sql` is generated from that schema and is for an **empty database only**. Select `mombasam_nanifrys` before using it for a new installation. Do not import it over an existing installation.

## Existing hosted database

1. Export a full backup and restore a copy into a separate staging database. Keep production credentials and data untouched during verification.
2. Inspect existing tables and columns. The previous handwritten SQL used names such as `branches`, `orders`, and `pin_code`, while the application has always used Prisma names such as `Branch`, `Order`, and `pinCode`. The database name alone does not establish which schema is installed.
3. If staging matches `server/prisma/baseline.prisma`, configure its connection in a private server `.env`. From `server/`, check schema drift:

   ```sh
   npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/baseline.prisma
   ```

   An empty diff, or a reviewed diff containing only additional tables such as `NaniReplicaState` that will be preserved, is required before marking an existing schema as the baseline. Do not execute a generated diff that drops the extra table:

   ```sh
   npx prisma migrate resolve --applied 202610250000_baseline
   npx prisma migrate deploy
   npx prisma generate
   ```

4. If the database uses the old snake_case SQL tables, first introspect a copy into a separate schema file. Prepare explicit table/column mappings and a reviewed conversion migration. Do not apply this baseline to that database: it would create parallel tables rather than connect existing business data.
5. Verify checkout, held orders, stock, cancellation, expenses, shift closing, and activity logs in staging. After testing backup restoration and staging, deploy the reviewed migration and application together during a maintenance window.

The additive `202610260001_integrity_activity` migration adds checkout request IDs, unique expense references on cash movements, an activity log, and recorded stock movements with unique reversal references. It does not reconstruct past actions or deductions. Legacy completed sales need manual reconciliation when cancelled. Existing PINs are hashed on successful login; new or changed PINs are hashed immediately. Replace old shared/default credentials before production use.

## Fresh empty database

`202610270001_two_way_terminals` adds the installation identifier to shifts so shop and live drawers remain separate. Existing shifts retain the `cloud` identifier. During pairing the shop hashes any legacy PINs and synchronizes those hashes; cloud sign-in does not independently rehash the same legacy PIN while pairing is in progress.

For the inspected existing Prisma-named database, `ops/upgrade-database.cjs` is the idempotent deployment path. It saves all existing business and replica rows in a private checksummed backup, adds only missing reviewed columns/indexes/tables, preserves replica state, and verifies all application models are readable. Do not also run baseline creation SQL against that database. Restore both source backups in staging with `ops/prepare-staging.cjs` before using this path.

From `server/`, after configuring the intended empty database:

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run setup:owner
npm run build
npm start
```

`setup:owner` prompts locally for owner details and only works when the user table is empty. Add branches and staff after signing in. Never run the sample-data seeder against `mombasam_nanifrys`: production execution is disabled and test environments require an explicit test-data flag.

## Hosting

The project needs a running Node.js backend in addition to MySQL. Static or PHP-only hosting does not provide this API. If the cPanel account supports Node.js applications, configure `server/dist/index.js`, private environment variables, and public routing to that application. Keep server source, `.env`, SQL exports, and dependencies outside `public_html`.

On nanifrys.com the frontend uses `https://nanifrys.com/api`. Confirm `/api/health` returns JSON from the Node server. For a separate backend domain, configure the complete API URL in the sign-in connection settings and include the frontend origin in `CORS_ORIGINS`. Database credentials belong only on the server.

Set the server time zone to `Africa/Nairobi`; verify report dates against East Africa Time on the actual host.

## Rollback

Retain the pre-upgrade backup and previous application build. Stop a rollout if staging fails. Do not drop audit tables or remove request IDs to roll back code: retain the records and use a reviewed forward repair or the tested backup restoration procedure.
