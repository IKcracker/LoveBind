# Repair the LoveBind Didit migration history

## Why P3006 / P1014 occurs

The populated LoveBind Neon database has an applied initial migration
`20261024111839_data` and existing tables including `User`. Its original migration
file is **missing from this GitHub repository**. This branch currently contains
only `20261024_didit_verification`, which creates an identity-verification table
with a foreign key referencing `User`.

`prisma migrate dev` replays all checked-in migrations against an empty shadow
database. Without the initial migration creating `User`, the Didit migration
fails. This is **not proof that the live User table is missing**.

Do not run `prisma migrate reset`, delete tables, modify
`_prisma_migrations` by hand, or mark the existing initial migration as
rolled back. These operations could destroy real accounts.

## Restore the missing initial migration

From the `server` directory, in Windows PowerShell:

```powershell
Test-Path .\prisma\migrations\20261024111839_data\migration.sql
```

If the file is present, verify its hash:

```powershell
(Get-FileHash .\prisma\migrations\20261024111839_data\migration.sql -Algorithm SHA256).Hash.ToLower()
```

The applied migration checksum in this LoveBind Neon database is:

`9cc456e5e19538842b2dda1188530ca1afb91c3ff84ab9d9cf31a4c8d2fdd9eb`

The file must match exactly. Commit the original migration folder
`server/prisma/migrations/20261024111839_data` to the feature branch.
This restores consistent history for other developers and the shadow DB.

If the original file is missing or has a different hash, recover it from
the machine/backup that originally ran `prisma migrate dev --name data`.
**Do not fabricate an empty migration or overwrite its SQL.** Use Prisma's
documented baseline/migration-recovery process on a separate copy of the
database if recovery is impossible.

## Use a direct Neon connection for migrations

Keep `DATABASE_URL` set to the pooled Neon URL for the running API. In
`server/.env.local`, optionally set `DIRECT_DATABASE_URL` to the *separate
non-pooled connection string* copied from Neon Connect (do not commit it).
`server/scripts/prisma-cli.cjs` now automatically uses the direct URL for
`migrate` commands only, without affecting server startup.

## Apply only the pending Didit migration

The target database already has the `User` table and does not yet have
`IdentityVerification`. After reviewing the SQL and taking a Neon branch/
backup, you can apply only unapplied migrations:

```powershell
npm run prisma:deploy
```

Unlike `migrate dev`, Prisma 6's `migrate deploy` does not use a shadow
database and does not reset an existing database. It also does **not** repair
missing migration files; restore the original history separately.

To inspect migration history (it may report divergence until the original file
is restored):

```powershell
npm run prisma:status
```

Do not automatically run migrations during normal Render API startup.
Review and apply database changes separately, and never use live IDs in
identity verification provider sandbox tests.
