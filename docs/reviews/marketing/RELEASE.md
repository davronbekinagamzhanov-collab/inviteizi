# Task 7 — isolated release plan (NOT production approval)

Branch: `feature/referrals-marketing-automation`, Draft PR #20. Base main: `bb599e9afa8aa7faacb3810559528ca52d652b6d`. PR13–19 were inspected and remain independent/unmerged. No live database, webhook, bot token, order, payment or price was changed.

## Implementation checklist

| # | Requirement | Existing mechanism / scoped change |
|---|---|---|
|1|Small InviteIZI badge|Existing dimensions, palette and footer retained. Brief 5-second reappearance near map/RSVP; collision check, keyboard/visual viewport and iPhone safe area; reduced-motion transition disabled. Hidden when no safe slot. UI flag gates it.|
|2|Invitation attribution|Server-minted random128-bit opaque `inv_` mapping, unique DB column; strict ASCII payload36 chars (Telegram limit64). No names, phone or secret. Server checks active positive confirmed source and self referral. Unknown/old payload opens ordinary bot. Personal links reuse existing `p_` partner codes.|
|3|Future catalogue demos|`futureDemoData`: earliest event today+45 calendar days in Asia/Almaty, relative events preserved. Dynamic request under Suspense/connection. Only catalogue demo/namuna/legacy samples; actual order dates untouched.|
|4|Small landing|`/catalog/invite`, three currently active main designs and actual covers/demo links; UZ/RU, from5000, see-before-pay, Telegram. Optional validated `WHATSAPP_PHONE`, hidden otherwise. Attribution preserved through language/demo/Telegram/WhatsApp links. No new catalogue.|
|5|Host reward|Existing partners/earnings/payout ledger. First confirmed positive cash purchase per referred friend; default1000, capped at discounted net cash; no self/staff/employee/free/receipt-only credit. Order snapshot, row locks, one earning/order, immutable audit. Owner-recorded refund reverses ledger credit, never bank transfer.|
|6|Customer link/statistics|Post-delivery `p_` link with copy_text/share buttons; `/referrals` own friends/earned/paid/due. Customer partner row has no Telegram partner role, no onboarding spam. Existing daily financial reports/payouts include same ledger. Negative balance after already-paid refund offsets future earnings. No friends' personal data exposed.|
|7|WhatsApp status|1080×1920 PNG from existing licensed design artwork/static OFL Lora, main event/date/names/age, actual HTTPS QR, InviteIZI. Existing bot_notices durable jobs; only after acknowledged link, bounded retries, leased workers, dead-letter owner review. QR decoded in tests. No new generated images or remote customer photo fetch.|
|8|Kaspi step|Existing protected `KASPI_NAME`/`KASPI_PHONE` reused. Honest extra wording: owner checks receipt, usually5–30min, no guaranteed automation. Existing overdue-receipt owner reminders retained. No approval by OCR/photo. No invented bank/WhatsApp data.|
|9|One free correction|Order-scoped request, actual acknowledged issuance time, one pending/applied free correction≤24h; later2000. Client edit lock retained. Owner notice explicitly БЕСПЛАТНАЯ/ПЛАТНАЯ. Owner-only date/time application and paid-fee confirmation; audit and concurrency guard. General artistic/manual edits still use existing owner support, not unrestricted client mutation.|
|10|Promotions|Owner commands: named unique code,1–100%, capacity/expiry/enabled/statistics. Locked coupon, expiring30min reservations, receipt freeze, cancellation/rejection/format change release, transaction-level consume.100% fulfills as `promotion`, NULL paid_at, no fake Kaspi/cash revenue or referral credit. Explicit existing order confirmation remains.|
|11|0% partners|Already supported percent0; retained. Existing source/start customer metrics, orders, positive confirmed cash revenue and0commission verified. Metrics count attributed bot users/starts, NOT raw anonymous HTTP impressions; no second analytics ledger.|

## Attribution / money rules

First valid eligible source before a user's first order wins. An existing valid commercial `p_` source takes priority. Later clicks cannot overwrite attribution or an order snapshot. A customer referral earns once for that friend's first **positive confirmed cash** purchase, not for every later order. A free promotion consumes its coupon but creates no cash transaction or referral reward; a later first cash purchase may qualify. Ordinary commercial partner agreements retain their per-order fixed/percent rules; with a new discount, fixed reward is capped at actual cash and percent is rounded to integer KZT. All money columns remain integer; no transfers are initiated.

Refund is a separate owner-verified accounting operation, not an API call to Kaspi. Original order amount/payment confirmation and earning snapshot remain in audit; existing earning becomes0. Existing payouts are not rewritten. A refund does not reset a friend's one-time reward marker or restore a consumed coupon automatically (fraud protection); future policy changes need explicit owner decision.

## Flags / configuration (server only)

All financial features OFF by default:
- `MARKETING_AUTOMATION_ENABLED=true`: transactional confirmation/durable delivery master.
- `MARKETING_REFERRALS_ENABLED=true`, `MARKETING_PROMOS_ENABLED=true`, `MARKETING_STATUS_ENABLED=true`, `MARKETING_EDITS_ENABLED=true`: separate subfeatures, require master.
- `MARKETING_UI_ENABLED=true`: landing destination/badge; Preview UI enabled automatically, financial flags do not follow it.
- `REFERRAL_REWARD_KZT`: integer0..1000000, default1000. Invalid value fails closed; test before enabling. Existing customer partner rate is a saved agreement, not silently rewritten when default changes.
- `WHATSAPP_PHONE`: optional real owner number, international10–15digits; hidden if unset/invalid.
- Existing `OWNER_TELEGRAM_ID`, `ADMIN_IDS`, `KASPI_NAME`, `KASPI_PHONE`, bot credentials, public base URL remain authoritative. No values belong in Git.

Missing new schema disables new bot/cron features via readiness probe, preserving legacy mode. This is not a substitute for migration verification. Preview `/api/bot`, `/api/cron`, `/api/app`, `/api/app/upload` and `/api/rsvp` return404 to prevent connected production credentials from processing traffic. Synthetic `/dev/marketing` and `/api/marketing/status-preview` have no DB/Telegram/order access and return404 in production. No tests are sent to the actual bot or Preview database.

## Migration and future activation — owner-controlled, not executed here

One additive migration: `supabase/migrations/20261115130000_marketing_automation.sql`. Created using official SupabaseCLI2.81.3 `migration new`, timestamp resequenced after existing20261115120000. CLI3 installer could not write its home on this managed host; no login/link/dbpush attempted. Migration uses standard PostgreSQL, not a version-specific hosted API.

1. Restore a verified backup into a **separate staging DB** with the same PG version/roles/extensions/pooler. Review baseline migrations/current live schema for drift. Back up roles/schema/data and verify restoration. Review new checks/triggers and existing confirmed earnings before applying.
2. Keep master/subflags OFF. Apply migration with privileged migration role, `lock_timeout='5s'`, reasonable statement timeout and maintenance window. DDL/unique indexes lock tables; choose a larger-table concurrent-index rollout if staging measurements require it. Script is BEGIN/COMMIT, replayable and tested twice. Do not apply every historical migration blindly to an existing live schema.
3. Check columns, FK/index/partial unique constraints, server-role grants and RLS; anon/authenticated must not read new private tables. Check audit append-only and revoked PUBLIC function execution. Native tests used inviteizi_server, not superuser for application operations. Validate pooler/timeout behavior separately.
4. Deploy code with flags OFF to staging, then enable master and subfeatures one by one using a dedicated test bot/test credentials and PUBLIC_BASE_URL for staging. Verify cron10min and payment/manual correction runbook. Configure the real owner WhatsApp only after validation.
5. Execute manual checklist below. Review staging receipts, coupon statistics, earnings/payouts/audit and failed jobs. Only explicit future release approval may enable production. No schema application, flag/environment change or production deployment was performed in this task.

New tables: marketing_attributions, promotion_codes, promotion_reservations, marketing_audit, order_edit_requests, marketing_command_limits. Additive order/partner/notice columns and guarded triggers; existing orders/IDs/slugs/events/photos and ledger preserved. No retroactive customer referral credits are synthesized. Old paid links remain route-compatible. Legacy issuance time cannot be reconstructed exactly: free-edit eligibility uses paid_at/created_at conservatively only for historical records; it does not start a fresh24h window.

## Operational commands

Private bot chat only; owner commands check immutable OWNER_TELEGRAM_ID; cash approvals still require isAdmin. New commands rate-limited10/min/user. Replace placeholders, never paste bank secrets:

```
/promo_create FIRST20 100 20 - Биринчи оилалар
/promo_create SUMMER 25 10 2027-08-01 Ёзги таклиф
/promos
/promo_disable FIRST20
/promo ORDER_NUMBER CODE
/referrals
/correction ORDER_NUMBER Что исправить
/corrections
/correction_apply REQUEST_UUID 2027-03-22 18:30 1
/correction_apply REQUEST_UUID 2027-03-22 18:30 1 paid
/correction_reject REQUEST_UUID
/refund ORDER_NUMBER причина фактически выполненного возврата
/delivery
/delivery_retry JOB_KEY
```

`paid` is required for a2000 correction only after owner separately verifies receipt of that fee; it records that decision in audit. `correction_done` deliberately rejected: marking applied without actually changing the date is unsafe. Date/time only; other manually agreed changes still go through existing owner support. `/promos` and `/delivery` show latest10; `/corrections` oldest5, process and request again; reports split under4096chars. No automatic money transfer. Confirm correction result with customer manually before closing support case.

## Recovery / external delivery semantics

Transaction commits activation, commission/audit and unique outbox job keys together. No Telegram request inside financial transaction. `bot_notices` uses SKIP LOCKED,120s lease, explicit ACK, at most5 automatic attempts and backoff; cron10min recovers pending work after process exit. Status/referral wait for acknowledged link. Link failure leaves order active and queued. Generation failure cannot block link. Owner receives daily failed-delivery count and `/delivery` exposes safe error code, not receipt/secret. Owner retry only after inspecting Telegram chat.

Telegram offers **no exactly-once send idempotency key**. A link whose successful response is lost can be delivered twice on retry; financial credit/order cannot be duplicated by it. Status sends persist `sending_at` before remote call: ambiguous timeout or crash after send starts stops blind replay and requires owner review. There is an unavoidable crash window between that mark and remote send; manual retry may be needed even when no image was sent. Definitive generation/API failures retry boundedly. This limitation is explicit, not an exactly-once promise.

Legacy non-marketing care/RSVP notifications still have their historical mark-before-send semantics; they were audited but not globally rewritten. Existing nightly receipt copy is a service expectation, not a technical guarantee; the new payment screen explicitly says manual5–30min. An actual delay depends on owner availability/cron and requires operational follow-up.

## Manual staging Telegram checklist before any release

- Dedicated staging bot + isolated DB, verified webhook secret/admin/nonadmin boundary, secret-free logs; no production credentials. Verify real Telegram copy_text and share buttons, UZ/RU, language changes.
- Three complete clients, NAMUNA, demo, optional photo/music upload and failures,1–3events, real quote; double taps and reconnect. Unknown/old slug and old paid link still open.
- Kaspi real configured recipient displayed; receipt alone never activates. Reject/re-submit, double approve, admin receipt reminder, delayed link retry. Verify actual invitation/RSVP/map/calendar/music in Telegram WebView and physical iPhone safe areas/keyboard.
- Referral first source, self, personal link, paid friend, free friend, discount, refund after payout, report and0%campaign; compare all ledger/audit totals. No unrelated customer's PII in stats.
-100%code limit20, last-slot race and expired reservation, format change, partial discount receipt review, disable code, free fulfillment caption (no Kaspi success claim).
- Actual status image style/long names/date/QR scan on another phone; image generation failure, Telegram blocked/timeout, cron restart, dead-job owner alert/retry.
- Free correction≤24h once, later2000 confirmed explicitly, parallel/replayed request, owner apply/reject, client remains locked; expired invitation behavior.
- Preview-only synthetic routes404 in production build; do not activate until staging sign-off.

## Safe rollback

1. Stop new campaign exposure and switch master/subflags OFF (separate future release action). Preserve published invitation URLs and owner access. This binary’s legacy notice worker excludes mk: jobs, so disabling flags pauses those jobs rather than emitting their fallback bodies. Financial data is never deleted to roll back code.
2. Snapshot pending notices, coupon reservations/receipts, edit requests, audit, payouts and earnings. Reconcile ambiguous Telegram messages manually. Finish/release pending coupons under the documented policy; do not change cash prices of receipt-under-review orders.
3. Prefer **this code with flags OFF**, retaining refund/zero-cash protections and DB trigger guards. Do not roll back to an older binary that treats every archived/free order as cash without reconciliation. Additive migration stays; it is compatible with legacy order/slug fields, but trigger/audit defenses intentionally remain.
4. No destructive automatic down migration: dropping ledger/audit/coupon data after use is unsafe. If pre-activation rollback is essential, a DBA must first prove new tables/columns contain no financial/history data and restore verified baseline definitions in staging. A backup restore after live transactions needs a separate reconciliation plan, not silent rewind.

## Assessment only (not implemented)

VIP10000-first: requires owner-approved catalogue tier/price schema and saved-quote compatibility; no price or ordering changed. Short domain: configure an owned domain in Vercel, HTTPS/DNS and PUBLIC_BASE_URL for new links, preserve vercel.app and old slugs/QRs with redirects; purchase/DNS changes require separate task. No domain/tariff changes made.
