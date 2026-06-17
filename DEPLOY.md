# Vercel Preview Deploy Runbook — 3D-Print Constructor

**Target:** a working Vercel **Preview** URL backed by managed PostgreSQL + Vercel
Blob, with production deploy gated behind a passing preview smoke test.

**Stack facts that shape this runbook:**

- Package manager: `pnpm@9.12.0` (declared in `package.json`).
- Build script: `prisma generate && next build` — **note: this does NOT run
  migrations.** DB migrations are a separate, manual step (§4).
- Storage backend is env-selected at runtime in `src/lib/storage/index.ts`:
  `FILE_STORAGE_DRIVER="vercel-blob"` requires `BLOB_READ_WRITE_TOKEN` or it throws.
- Admin gating in `src/middleware.ts` is a **no-op if `ADMIN_PASSWORD` is unset**
  → admin would be open.
- Prisma baseline migration already exists: `prisma/migrations/20260618000000_init_postgres`.

---

## 1. Prerequisites

- A GitHub account + an empty GitHub repo to push to.
- A Vercel account with access to: project import, a Postgres integration
  (Vercel Postgres / Neon / Supabase), and Blob storage.
- Local toolchain: Node 20.x, `pnpm@9.12.0`, `git`, and `npm` (only to install the
  Vercel CLI globally).
- A strong admin password chosen (do not reuse anything; never commit it).

Confirm the working tree is clean and the deploy commits are present:

```bash
git log --oneline -3
git status --short   # expect: empty
```

---

## 2. One-time setup

### 2.1 Git remote / GitHub

```bash
git remote add origin git@github.com:<you>/<repo>.git   # or https URL
git push -u origin main
```

`.gitignore` already excludes `.env`, `*.db`, `uploads/`, `.next/`,
`node_modules/`, so nothing sensitive is pushed. Double-check with:

```bash
git ls-files | grep -E '\.env$|\.db$'   # should be empty
```

### 2.2 Vercel project import

1. Vercel Dashboard → **Add New → Project → Import** the GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. Install command: leave default (`pnpm install` — Vercel honors the
   `packageManager` field).
4. Build command: leave default (`pnpm build`, which is `prisma generate && next build`).
5. **Do not deploy yet** — set env vars first (§3), otherwise the first
   build/runtime will fail on missing `DATABASE_URL` / storage token.

### 2.3 Managed Postgres

- In the Vercel project → **Storage → Create Database → Postgres** (or attach an
  external Neon/Supabase DB).
- When attached via Vercel, it auto-injects `DATABASE_URL` (and `POSTGRES_*` vars)
  into the project. If you use an external provider, copy its **pooled**
  connection string for the app runtime; keep a **direct** (non-pooled) string for
  running migrations.
- Ensure the string ends with `?schema=public` (or provider equivalent) and uses
  `sslmode=require` if the provider needs it.

### 2.4 Vercel Blob

- In the Vercel project → **Storage → Create → Blob Store** → attach to this
  project.
- This injects `BLOB_READ_WRITE_TOKEN` automatically into the selected
  environments. You usually do **not** need to add it by hand.

---

## 3. Env var setup

Required variables (set for the **Preview** environment first):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
ADMIN_PASSWORD="<strong-secret>"        # mandatory; without it /admin is OPEN
FILE_STORAGE_DRIVER="vercel-blob"       # selects durable Blob backend
BLOB_READ_WRITE_TOKEN="<blob-token>"    # usually auto-added by the Blob integration
```

> Placeholders only — never put real secrets in this file or in git.

Notes:

- **`DATABASE_URL`** must point to managed Postgres, **not** SQLite. Local files
  are not durable on serverless and the schema provider is `postgresql`.
- **`ADMIN_PASSWORD`** is mandatory. The middleware is a no-op when it's unset,
  leaving the admin area unprotected. Use a strong, unique value.
- **`BLOB_READ_WRITE_TOKEN`** is normally provided automatically when the Blob
  store is attached. Only add it manually if it's missing.
- **`FILE_STORAGE_DRIVER=vercel-blob`** forces the durable backend; setting it
  explicitly is the safe, intentional choice.

Set via dashboard (**Settings → Environment Variables**, scope = Preview) or CLI (§5).

---

## 4. Migration command

The build does **not** migrate. After the managed Postgres exists, apply the
baseline migration once (use a **direct/non-pooled** URL if your provider
distinguishes):

```bash
DATABASE_URL="<managed-postgres-url>" pnpm prisma migrate deploy
```

Expected: it applies `20260618000000_init_postgres` and reports the DB is up to
date. Re-running is safe (idempotent — already-applied migrations are skipped).
Run this against the **preview** database now; repeat against the production
database later (§7).

---

## 5. Preview deploy command

Local pre-deploy gate (run before pushing a deploy):

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

Vercel CLI path:

```bash
npm i -g vercel
vercel login
vercel link                              # link local dir to the Vercel project

# Set Preview env vars (skip any the integrations already injected)
vercel env add DATABASE_URL preview
vercel env add ADMIN_PASSWORD preview
vercel env add FILE_STORAGE_DRIVER preview
vercel env add BLOB_READ_WRITE_TOKEN preview   # only if not auto-added by Blob

vercel                                   # builds & deploys a PREVIEW, prints the URL
```

Alternatively, pushing a non-`main` branch / opening a PR triggers an automatic
Preview deploy if the Git integration is connected.

---

## 6. Preview smoke checklist

Open the printed Preview URL and verify:

**Public**

- [ ] `/` loads.
- [ ] `/constructor` loads.
- [ ] Presets selectable.
- [ ] 3D tab renders.
- [ ] Submit **without** attachment succeeds.
- [ ] Submit **with** a small attachment (<4 MB) succeeds.
- [ ] Success page shows.
- [ ] "Copy number" works.

**Admin**

- [ ] `/admin/login` loads.
- [ ] Login with the preview admin password works.
- [ ] Request list renders.
- [ ] Request detail renders.
- [ ] Visual summary renders.
- [ ] Uploaded file list shows.
- [ ] File download works.

**Safety**

- [ ] No raw `imageDataUrl` exposed in responses/markup.
- [ ] No 500 responses.
- [ ] No console errors.
- [ ] File upload actually lands in Blob (check the Blob store contents).
- [ ] DB persists across a redeploy (redeploy, confirm prior request still present).

Do not proceed to production until every box passes.

---

## 7. Production deploy command (only after preview passes)

```bash
# Production env vars (use the PRODUCTION Postgres + production admin password)
vercel env add DATABASE_URL production
vercel env add ADMIN_PASSWORD production
vercel env add FILE_STORAGE_DRIVER production
vercel env add BLOB_READ_WRITE_TOKEN production   # only if not auto-added

# Apply migrations to the PRODUCTION database (direct/non-pooled URL)
DATABASE_URL="<prod-postgres-url>" pnpm prisma migrate deploy

# Deploy to production
vercel --prod
```

Then repeat the §6 smoke checklist against the production URL.

---

## 8. Rollback notes

- **App rollback:** Vercel Dashboard → Deployments → pick the last good
  deployment → **Promote to Production** (instant; no rebuild). Or
  `vercel rollback <deployment-url>`.
- **Code rollback:** revert the offending commit and redeploy —
  `git revert <sha> && git push` triggers a fresh deploy. Prefer revert over
  force-push.
- **DB rollback:** the baseline migration only creates tables; there is no
  destructive migration to undo. If a future migration misbehaves, restore from
  the provider's backup/branch — **do not** hand-edit `_prisma_migrations`. Never
  run `prisma migrate reset` against a database with real data.
- **Env rollback:** changing an env var requires a redeploy to take effect.
  Runtime vars are read live — re-set the var and redeploy if needed.

---

## 9. Known limitations

- **Uploads > 4 MB are intentionally unsupported** right now. The per-file cap is
  4 MiB (kept under Vercel's ~4.5 MB serverless request-body limit) — see
  `src/lib/storage/types.ts`.
- **Local filesystem storage (`FILE_STORAGE_DRIVER=local`) is dev-only** — it is
  not durable on serverless. Production/preview must use `vercel-blob`.
- **Client-direct Blob upload** (to allow larger files without hitting the body
  limit) is a deliberate **future slice**, not in scope here.
- **Production deploy must wait** until the preview smoke checklist passes.

---

## 10. Troubleshooting

- **Missing `DATABASE_URL`** → build may pass (`prisma generate` doesn't connect)
  but every DB request 500s at runtime, and `prisma migrate deploy` errors with
  "Environment variable not found: DATABASE_URL". Fix: set the env var for the
  right environment and redeploy; ensure the migration was actually run (§4).
- **Missing `ADMIN_PASSWORD`** → `/admin` is **wide open** (middleware no-ops).
  Fix: set a strong value for the environment and redeploy; re-verify
  `/admin/login` actually challenges.
- **Missing `BLOB_READ_WRITE_TOKEN`** with `FILE_STORAGE_DRIVER=vercel-blob` → the
  storage factory **throws** (`requires BLOB_READ_WRITE_TOKEN to be set`) and
  uploads 500. Fix: attach the Blob store (auto-injects the token) or add it
  manually, then redeploy.
- **Prisma migration fails** → check you used a **direct/non-pooled** URL (pooled
  connections like PgBouncer can break DDL/advisory locks), confirm SSL params,
  and confirm the DB user can create tables. If it reports drift, do **not** reset
  a DB with data — investigate the diff first.
- **Blob upload fails** → verify the token's store is attached to *this* project
  and environment, that the file is ≤4 MB and an allowed MIME
  (`jpeg/png/webp/heic/pdf`), and inspect the function logs for the `put` error. A
  413 before app validation means the file exceeded the platform body limit
  (expected for >4 MB).
- **Build fails due to a concurrent `next dev`** → a running dev server writing to
  `.next` can corrupt a production build (manifested as `PageNotFoundError` during
  "Collecting page data"). This only affects local builds. Fix locally: stop any
  dev/preview server, `rm -rf .next`, rebuild. Vercel's CI builds are isolated and
  unaffected.
