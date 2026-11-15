# Task7 — marketing/referrals/reliability audit and implementation ledger

Base: main bb599e9afa8aa7faacb3810559528ca52d652b6d. PR13–19 are open Draft, not merged or modified. Their template/data/photo contracts remain additive; this task does not import their catalogues or designs. Runtime work is isolated in feature/referrals-marketing-automation.

## Existing architecture (reuse)

- Telegram webhook: timing-safe secret header; normalize update; persistent handled-update markers plus process-local delivery ledger; pre-commit transient failures return503. Bot state uses question CAS; new-order creation consumes draft and inserts order transactionally (chat and Mini App share upsertDraftOrder).
- Orders: seven statuses; saved format/quote, data/events, music/photos, stable slug_history. Receipt is evidence, not payment. Admin-only guarded receipt_sent→active CAS, paidAt/expiresAt, QR/link pack with text fallback. Demo personal sample24h; catalog demo uses fixed dates and full presentation.
- Partners: partners/partner_earnings(one PK per order)/partner_payouts, fixed or percentage rate incl0, manager relationships, onboarding, daily reports, own-only stats. Integer KZT. Payout locks partner, verifies exact expected balance. First users.source is currently fixed at initial start. Reuse this ledger; customer referrals must not accidentally change customers into partner-role menus.
- Notices: bot_notices unique key and nightly scheduling, but claim sets sent_at before external delivery. No durable paid-link recovery across process crash after activation. Existing sendAfterCommit retries only in-process. This is a reliability gap, not evidence that a real customer has lost a link.
- Current creditPartnerOrder has order PK dedupe and self guards but independently lacks paid-state/positive-money/ownership guard; referral attribution is read from user at credit time. Add regression coverage and transaction-level defence.
- Kaspi recipient already comes from required server config KASPI_NAME and is displayed with KASPI_PHONE. No invented recipient/WhatsApp number. Existing 5–30min manual-confirmation wording is more honest than an unqualified15min promise.
- Paid invitation edits are blocked for clients; manual owner assistance costs2000. Preserve this boundary, add one auditable request allowance after actual link delivery rather than enabling unrestricted paid-order mutation.
- Shared InvitationShell supplies branding/audio/RSVP/lang. BrandSoft hides after first screen; classic badge stays fixed. Keep dimensions/style, add scoped reappearance with collision protection. Signed-in customer data must not enter public referral codes.
- Public slug rendering reads DB on request; active full / personal demo / expired, old slug redirects. Photos policy per design. Shared RSVP and file guards remain authoritative. OG already avoids private address/photo fetch.
- SQL migrations: server role inviteizi_server, RLS and no anon/authenticated grants for private tables. Storage is server-gated. Existing isolated PGlite wire tests do not prove native multi-backend locking; use native isolated PostgreSQL when available and explicitly report limits.
- Vercel: cacheComponents/partial prefetch, image optimization disabled, server max1 pooled connection, no Vercel cron config: pg_cron invokes authenticated /api/cron. All finance flags must default off; no live credentials or DB access during test/Preview QA.

## Planned safety invariants

1. One existing earnings ledger/order PK; cash confirmation vs zero-price promotion are distinct audited events. No cash credit for free orders.
2. Random opaque invitation mapping; strict Telegram ASCII payload≤64; server lookup, immutable order attribution; invalid/legacy links safely fall back. Existing commercial partner attribution has priority; first valid eligible referral wins and cannot overwrite an order snapshot.
3. Coupon row lock plus durable expiring reservations; no N+1 redemption; confirmation/receipt freezes are atomic. Cancellation/expiry releases capacity; disabled/expired codes cannot newly reserve.
4. Durable leased jobs in existing bot_notices with explicit ack/retry/dead-letter handling. Telegram offers no exactly-once send key: financial effects can be exactly-once; ambiguous remote send acknowledgement must be reported/handled, never advertised as a mathematical exactly-once delivery guarantee.
5. Owner-only promo/refund/correction controls; customer-scoped statistics; immutable audit of actor/event/key. No automatic Kaspi transfers.
6. No schema execution against production, no real Telegram calls, no real orders/payments. All new financial functions gated; deployment is Preview only. Migration rollback must preserve records/audit and disable features first.

Implementation/results/limitations will be appended as each part is completed. This document is an audit baseline, not a claim that all11 requirements are implemented or production-approved.

Implementation, release/rollback policy and final evidence: [RELEASE.md](RELEASE.md), [VALIDATION.md](VALIDATION.md). Financial features remain disabled pending isolated staging/manual acceptance.
