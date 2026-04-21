# Merchant multi-project wiring — remaining work

**Status:** foundation laid; route-by-route refactor pending.

## Done

- Dropped `merchants.user_id → auth.users(id)` FK on the Merchant Supabase
  project (migration `decouple_merchants_from_local_auth`).
- Dropped `admins.user_id → auth.users(id)` FK on the same.
- Added `src/lib/server/merchant-client.ts` with:
  - `getMerchantContext()` → `{ user, merchantDb }` (auth from Blink, data
    from Merchant).
  - `getMerchantAdminClient()` → bare service-role Merchant client.
  - `getMerchantForUser(userId)` → resolve the merchant row.
- Refactored `src/app/api/merchant/overview/route.ts` as the reference
  pattern.
- `.env.local` and `.env.example` already document the
  `MERCHANT_SUPABASE_URL` / `_ANON_KEY` / `_SERVICE_ROLE_KEY` triplet.

## Pattern to apply

Each merchant route currently follows:

```ts
import { createClient } from "@/lib/supabase/server";
// ...
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// ... supabase.from("merchants")...
// ... supabase.from("payments")...
```

Replace with:

```ts
import { getMerchantContext } from "@/lib/server/merchant-client";
// ...
const ctx = await getMerchantContext();
if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// ... ctx.merchantDb.from("merchants")...
// ... ctx.merchantDb.from("payments")...
```

The Blink auth stays in place (the cookie flow is identical); only the
data queries switch.

## Routes still pointing at Blink

These call `createClient()` from `@/lib/supabase/server` and then query
Merchant tables on the Blink client — they currently hit the wrong
project and return empty / fail:

- `src/app/api/merchant/api-keys/route.ts`
- `src/app/api/merchant/export/payments/route.ts`
- `src/app/api/merchant/invoices/route.ts`
- `src/app/api/merchant/invoices/[id]/route.ts`
- `src/app/api/merchant/milestones/route.ts`
- `src/app/api/merchant/notifications/route.ts`
- `src/app/api/merchant/notifications/[id]/read/route.ts`
- `src/app/api/merchant/notifications/read-all/route.ts`
- `src/app/api/merchant/onboarding/route.ts`
- `src/app/api/merchant/payment-links/route.ts`
- `src/app/api/merchant/payments/route.ts`
- `src/app/api/merchant/payments/[id]/route.ts`
- `src/app/api/merchant/payments/[id]/refund/route.ts`
- `src/app/api/merchant/referrals/route.ts`
- `src/app/api/merchant/refunds/route.ts`
- `src/app/api/merchant/tickets/route.ts`
- `src/app/api/merchant/tickets/[id]/route.ts`
- `src/app/api/merchant/tickets/[id]/messages/route.ts`
- `src/app/api/merchant/webhooks/deliveries/route.ts`

Server components that also query Merchant tables via Blink:

- `src/app/(app)/merchant/**/page.tsx` — dashboard pages that read via
  `createClient()`.

## Pages-level utility

Some code lives in `src/lib/merchant/*.ts` (e.g. onboarding helpers,
forex). Grep for `.from("merchants" | "payments" | "invoices" |
"api_keys" | "webhook_endpoints" | "refunds" | "withdrawals" |
"offramp_configs" | "notifications" | "tickets" | "ticket_messages" |
"merchant_milestones" | "merchant_referrals")` and swap client.

## While you're in the routes

Add rate limiting on all POST / PATCH / DELETE handlers via
`createRateLimiter` from `src/lib/server/rate-limit.ts`. Existing
key-creation / invoice-create / webhook-register endpoints are the
highest-value to cap first (typical 10/hour/user).

## Why not one big PR

Each route refactor is small (~15 line diff per file) but touches
structured business logic worth reviewing carefully. Better as a
focused series of commits: 3-4 routes per commit, grouped by feature
area (payments, invoices, webhooks, notifications, support).
