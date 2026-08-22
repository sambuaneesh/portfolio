# Developer Guide

Setup, environment configuration, and deployment instructions for maintaining or redeploying this site. For a feature overview, see [README.md](./README.md).

## Prerequisites

- Node.js **>= 20.19** (the repo pins this in `package.json#engines` - `@tailwindcss/oxide`'s native binary requires it). Use [nvm](https://github.com/nvm-sh/nvm): `nvm install 22 && nvm use 22`.
- A [Supabase](https://supabase.com) project (Postgres + Edge Functions).
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase ...` works without a global install).

## 1. Clone and install

```sh
git clone git@github.com:sambuaneesh/portfolio.git
cd portfolio
npm install
```

## 2. Environment variables

Copy `.env.example` to `.env` and fill in your Supabase project's values (Project Settings → API in the Supabase dashboard):

```sh
cp .env.example .env
```

```env
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your anon/publishable key>"
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
```

These are the only client-side secrets - everything else (service-role key, JWT signing secret) lives server-side in the Edge Function and is never sent to the browser.

## 3. Link and migrate the database

```sh
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

This applies every file in `supabase/migrations/` in order. Current migrations, for reference:

| Migration | What it does |
|---|---|
| `20260101000000_aneesh_portfolio_baseline.sql` | Creates every table (all prefixed with `aneesh_` so this app can share a Supabase project with other apps), enables RLS, creates the public `aneesh-portfolio` storage bucket, and seeds all portfolio content |

**Note:** this project intentionally shares one Supabase instance with other apps. Never run foreign migrations against it - everything here is namespaced under `aneesh_`.

Re-run `supabase gen types typescript --linked > src/integrations/supabase/types.ts` after any schema change so the frontend types stay in sync.

## 4. Deploy the `admin` Edge Function

Every authenticated write, every admin-only read, and the image upload proxy go through one Edge Function (`supabase/functions/admin`):

```sh
npx supabase functions deploy admin
```

Set its secrets (never pass these as CLI arguments - use `secrets set` so they're not written to shell history):

```sh
npx supabase secrets set ADMIN_JWT_SECRET="$(openssl rand -hex 32)"
```

Image/document uploads go straight to the public `aneesh-portfolio` Supabase Storage bucket (created by the baseline migration), so no extra storage secrets are needed.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into every Edge Function by Supabase - don't set those yourself.

`supabase/config.toml` sets `verify_jwt = false` for this function deliberately: it implements its own JWT scheme (checked against `admin_users`), so Supabase's platform-level "must have a Supabase-issued JWT" gate has to be off, or no request would ever reach the function's own auth check.

## 5. Create your first admin user

Multiple admins are supported - this can be run again later for additional accounts.

```sh
SUPABASE_URL="https://<your-project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role key, from Project Settings → API>" \
ADMIN_BOOTSTRAP_USERNAME="youruser" \
ADMIN_BOOTSTRAP_PASSWORD="a strong password, 8+ chars" \
npm run create-admin
```

Env vars only, deliberately - the script refuses to read a username/password from `argv` so a password never ends up echoed in a shell history or process listing. Sign in at `/auth`.

## 6. Run it locally

```sh
npm run dev       # http://localhost:8080
npm run lint
npx tsc --noEmit
npm run build
npm run preview
```

CI (`.github/workflows/ci.yml`) runs `lint`, a type-check, and `build` on every push and pull request against `main`.

## Deployment

The frontend is a static Vite build with no server-side rendering, so it deploys to any static host:

```sh
npm run build   # outputs to dist/
```

Point Vercel, Netlify, Cloudflare Pages, or similar at this repo with build command `npm run build` and output directory `dist`, and set the three `VITE_*` environment variables from step 2 in that platform's dashboard. The Supabase Edge Function and database migrations are deployed independently via the Supabase CLI steps above - they aren't part of the static build.
