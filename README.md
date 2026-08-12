# Building Maintenance Management Platform

A production-ready building maintenance management system built with
**Next.js (App Router) + TypeScript + Tailwind CSS + Supabase**, deployed on
**Vercel**.

Residents raise maintenance requests; managers triage, assign technicians and
create work orders; admins audit every important action through an append-only
activity log. All authorization is enforced in the database with Row Level
Security — the frontend never decides who can see what.

## Architecture

```
GitHub → Vercel → Next.js App Router
                    │
                    ├─ @supabase/ssr (cookie sessions)
                    │
                    └─ Supabase
                        ├─ Auth (email/password + Google OAuth)
                        ├─ PostgreSQL + Row Level Security
                        ├─ Storage (private "maintenance-files" bucket)
                        └─ user_activity audit log (append-only)
```

Three strictly separated Supabase clients (`lib/supabase/`):

| Client         | Key                | Where            | RLS      |
|----------------|--------------------|------------------|----------|
| `client.ts`    | publishable        | browser          | enforced |
| `server.ts`    | publishable + cookies | server components/actions | enforced |
| `admin.ts`     | secret (service role) | server-only (guarded by `server-only` import) | bypassed — used **only** for activity logs and system notifications |

## Tech stack

Next.js 15 (App Router, Server Actions), TypeScript (strict), Tailwind CSS 4,
Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Zod validation, Vitest.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase values
npm run dev                  # http://localhost:3000
```

Checks:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest
npm run build       # production build
```

## Environment variables

| Name | Scope | Purpose |
|------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | publishable/anon key (RLS-protected) |
| `SUPABASE_SECRET_KEY` | **server only** | secret key for `lib/supabase/admin.ts` |
| `NEXT_PUBLIC_SITE_URL` | public | base URL for auth redirects |

Never commit `.env.local`. Never prefix the secret key with `NEXT_PUBLIC_`.

## Supabase setup

1. Create a project at https://supabase.com/dashboard.
2. Copy the URL, publishable key and secret key into `.env.local`.
3. Run migrations (in order) with the Supabase CLI:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   Or paste each file from `supabase/migrations/` (001 → 007) into the SQL
   editor. Optionally run `supabase/seed.sql` for demo data (dev only).
4. **Auth → URL Configuration**: set Site URL to your production URL, and add
   redirect URLs:
   - `http://localhost:3000/**`
   - `https://<your-app>.vercel.app/**`
   - `https://*-<your-team>.vercel.app/**` (previews)
5. **Auth → Email**: keep "Confirm email" enabled.
6. Grant yourself admin after first signup (SQL editor):
   ```sql
   insert into public.user_roles (user_id, role)
   values ('<your-auth-user-uuid>', 'admin');
   ```

## Google OAuth setup

Google Cloud Console:
1. Create/select a project → **APIs & Services → OAuth consent screen**:
   External, add app name and your domain.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. Authorized redirect URI (exactly one, from Supabase):
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Scopes: `openid`, `email`, `profile` (defaults).

Supabase Dashboard → **Auth → Providers → Google**: enable, paste the Client
ID and Client Secret. The secret lives only in Supabase — never in this repo.

## Vercel deployment

1. Import the GitHub repository in Vercel.
2. Add the four environment variables for **Production**, **Preview** and
   **Development** (set `NEXT_PUBLIC_SITE_URL` per environment; for previews
   use the assigned preview domain or leave the callback's
   `x-forwarded-host` handling to resolve it).
3. Deploy. Build command `next build`, no special config needed.
4. Add the production domain (and preview wildcard) to Supabase Auth
   redirect URLs (step 4 above).

## Authentication

- **Email signup** with full name, strong password policy (Zod), confirm
  password and email verification (`/auth/confirm` route verifying the OTP
  token hash).
- **Email login**, friendly error messages, loading states.
- **Google OAuth** via Supabase (`Continue with Google`), PKCE code exchange
  in `/auth/callback`, preview-safe redirects via `x-forwarded-host`,
  cancelled-flow handling on `/auth/auth-error`.
- **Password reset**: `resetPasswordForEmail` → `/auth/confirm` →
  `/reset-password`. Responses never reveal whether an email exists.
- **Profiles** are created by a database trigger (`handle_new_user`) — never
  by frontend code — and are duplicate-proof (`unique (user_id)` +
  `on conflict`). New users get the `resident` role by default.
- Sessions are cookie-based via `@supabase/ssr`; middleware refreshes tokens
  and gates all non-public routes. Passwords are handled exclusively by
  Supabase Auth; nothing sensitive is ever stored in application tables.

## Authorization (RBAC + RLS)

Roles: `admin`, `property_manager`, `maintenance_manager`, `technician`,
`resident`, `vendor` (table `user_roles`, many per user).

The database is the single source of truth: every table has RLS enabled with
restrictive policies built on `SECURITY DEFINER` helpers (`is_admin()`,
`is_manager()`, `is_assigned_to_property()`, `manages_property()`).
Examples: residents see only their own requests on properties they belong
to; technicians see requests/work orders assigned to them; vendors see only
their own work orders; only admins read the full activity log. UI role checks
(`lib/permissions/`) are cosmetic conveniences on top.

## Activity logging

Two complementary layers:

1. **Supabase Auth audit** (built-in) — token refreshes, raw auth events.
2. **Application activity** — `public.user_activity` (append-only, enforced
   by trigger). Written three ways:
   - `logActivity()` (`lib/activity/log.ts`) — server-side, via the admin
     client so browsers can neither forge nor suppress logs. Metadata is
     scrubbed of credential-like keys before storage. Logging failures never
     break the primary operation.
   - **DB triggers** for critical mutations (request status/assignment
     changes, role grants/revocations) — captured even if app code is
     bypassed.
   - Auth flows log `auth.signup`, `auth.login` (with provider), `auth.logout`,
     `auth.password_reset_requested`, `auth.password_changed`,
     `auth.email_verified`.

Business events: `property.created`, `building.created`,
`maintenance_request.created/commented/closed` (+ trigger-captured
`status_changed`/`assigned`), `work_order.created/completed`,
`profile.updated`, `role.granted/revoked`.

Admins inspect everything at **/admin/activity** with filtering (user,
action, entity, date range) and pagination. IP and user-agent are recorded
for security forensics only; passwords, tokens and secrets are never logged.
For retention, periodically delete rows older than your policy window using
a scheduled job with the service role (the append-only trigger blocks API
deletes by design; run `alter table ... disable trigger` inside the
maintenance job or use a `security definer` cleanup function).

## Finances (dues, expenses, UPI payments)

A flat-wise finance module sits alongside the maintenance workflow:

- **Dues** (`monthly_dues`) — one row per unit per month. Managers click
  "Generate dues" to create rows for every unit in a building using each
  unit's `default_monthly_amount`, then record payments as they come in
  (`/finances/dues`).
- **Expenses** (`expenses`, `expense_categories`) — building running costs
  (watchman salary, electricity, lift maintenance, etc.), manager/admin only
  (`/finances/expenses`).
- **Payment settings** (`property_payment_settings`) — UPI ID, UPI number and
  bank details, configured once per property (`/finances/payment-settings`).
- **My Dues** (`/finances/my-dues`) — what a resident sees: their own unit's
  due history and outstanding balance **only** (enforced by the
  `resides_in_unit()` RLS policy — there is no query path to another
  resident's dues), plus a scannable UPI QR code (generated server-side with
  the `qrcode` package from the configured UPI ID) pre-filled with their
  balance.
- **Reports** (`/finances/reports`, admin-only) — Collection Status,
  Outstanding Dues, Expense Report, Income vs Expense. Each report is a
  print-friendly page; "Print / Save as PDF" uses the browser's native
  print-to-PDF, which is also how residents/admins can screenshot or share
  a report — no extra PDF library or server dependency required.

### Members & units

Before dues or per-resident visibility work, a manager must:
1. Add units under a building (**Properties → a property → Add unit**),
   optionally setting a `default_monthly_amount`.
2. Add the resident as a **member** of the property (**Properties → a
   property → Members**), by email, choosing the `resident` relationship and
   their unit. The person must already have an account (self-signup, or
   created manually in Supabase Auth) — this only links the existing account
   to a property/unit. This is also what scopes maintenance requests: a
   resident can only create/see requests for a property they're linked to.

## Storage

## Storage

Private bucket `maintenance-files` (no public access). Path convention
`<property_id>/<request_id>/<file>`; read access requires membership of the
property (or manager role), deletes restricted to the uploader. Metadata rows
live in `public.documents`.

## Testing

`tests/` (Vitest): password/signup/login/request validation, UUID injection
guards, RBAC role checks, activity metadata credential-scrubbing, and the
open-redirect guard. RLS itself is enforced by Postgres; validate policies
against a real project with `supabase test` or manual probes per role.

## Troubleshooting

- **Redirect loop to /login** — publishable key or URL wrong, or middleware
  can't reach Supabase.
- **Google login returns to /auth/auth-error** — redirect URI mismatch:
  Google must point at `https://<ref>.supabase.co/auth/v1/callback`, and
  your app URL must be in Supabase's redirect allow-list.
- **"Email not confirmed"** — user must click the verification link;
  resend from Supabase dashboard if needed.
- **Empty dashboard** — the user has no property assignment yet; add one in
  `property_user_assignments` or via the Properties UI as a manager.
- **`SUPABASE_SECRET_KEY is not configured`** — set the server env var in
  Vercel (all environments).

## Security considerations

RLS on every table with least-privilege policies; service-role key confined
to `server-only` module; append-only audit log; server-side validation of all
inputs (Zod) including UUID params; open-redirect protection on auth `next`
targets; generic user-facing error messages (raw DB errors only server-side);
no secrets in the repo (`.env.example` has placeholders only); private
storage bucket. See `docs/DATABASE.md` for the schema and policy reference.
