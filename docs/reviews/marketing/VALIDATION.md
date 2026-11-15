# Task7 validation ledger

This is evidence from isolated tests, not production certification. Exact final SHA/Preview are in PR20; check deployment gitSource matches head.

## Completed before Preview

- Native PostgreSQL17.12, loopback127.0.0.1:55437, disposable inviteizi_task7, marked cluster. No DATABASE_URL/live connection. All repository baseline migrations (except Storage/cron service integrations) plus new migration twice. Minimal storage.buckets stub, not hosted Storage.
-19 native tests:3/10/20 concurrent buyers with duplicate cash confirmations (6/20/40 parallel calls), exactlyN activations and earnings; coupon last-slot20 contenders, capacity20 with21 contenders; free/discount/rejection/expiry; attribution/self/repeat/refund;20 parallel free edits; worker leases/restart/stale ACK; transaction failure after money writes rolls back; RLS/append-only audit; existing0%campaign;3 full bot dialogues + duplicate approval webhooks; Telegram/image failure and ambiguous-send review.
- Financial invariant checks: no duplicate order/earning/confirmation in tested scenarios, free fulfillment paid_at NULL and no cash/commission. Not a guarantee about untested production concurrency or20/day SLA; loopback timing excludes network and Supabase pooler. Full bot scenarios use FakeTg and native DB, no actual Telegram API. Status generation is stubbed in those worker tests and independently rendered/decoded below.
-7 pure/media tests: flags, payloads, WhatsApp/config, timezone/midnight/year/leap/immutable demo samples, three real1080×1920 posters (UZ/RU/long Cyrillic) decoded by jsQR to exact HTTPS invitation URL, insecure/mismatched URL rejection. Existing licensed artwork, no regeneration.
- Browser local: landing + synthetic invitation in UZ/RU at320/360/375/390/430 (10cases), no horizontal overflow/broken images/console errors; attribution persists, map/RSVP badge collision, music play/pause, real2GIS link, demo RSVP generates zero POSTs; reduced motion case. Screenshots visually inspected at390.

TypeScript and production build passed. Full regression suite:1043 passed,95 skipped (including16 native tests skipped in that run; now18 executed separately). ESLint first exposed a hook return/ref inference issue, fixed by passing the element ref into the hook and returning only reactive placement state; final complete ESLint passed with zero errors/warnings. Five additional Preview mutation-boundary tests passed. A final production build includes these guards. Publication proof and actual HTTPS UI results are recorded in PR20 after deployment gitSource verification; local proof and the initial audit-only deployment are not publication evidence.

## Boundaries / not verified

Actual Supabase network/pooler/RLS drift, Storage service integration, real payments/bank refunds, actual Telegram send/timeout behavior, physical iPhone/Telegram WebView and true process-kill during external send are not exercised. Crash recovery is simulated using persisted leases/time advance, SQL transaction failure injection and repeated workers. Existing file security tests cover upload errors, but this task never uploads to hosted Storage. No load test hits a real service, no production capacity promise. WhatsApp button safely hidden because no real number was supplied/configured in this task; pure URL normalization tested, no real WhatsApp message sent. No paid-customer URL was used as test fixture.

## Concrete fixes found during the audit/implementation

- Existing credit helper could credit a nonpaid order when called directly: now owner/positive/paid-state validation and locking, plus database guard and regression coverage.
- Free and refunded orders could inflate paid revenue: explicit promotion/refund state and positive-cash filters.
- Legacy mark-before-send could lose a new paid-link notification after a crash: durable leased ACK jobs; flags-off worker does not consume paused mk: jobs.
- Promotion discount could survive format changes or an expired reservation: restore original quote/consent and release inventory; receipt review freezes valid reservations until a decision.
- Repeat free corrections: order lock, partial unique constraint and request key; paid correction cannot apply without explicit fee decision.
- Satori could not parse variable Lora fonts: static OFL-derived renamed Invite Status Serif instances; Cyrillic/QR renderer tests.
- UI badge initially treated full-screen watermark wrapper as an obstacle; fixed to actual text rectangle. Soft badge translated offscreen under Tailwind translate; explicit lower placement resets it. Reduced-motion transition now scoped CSS.
- Owner reports could exceed Telegram4096chars: bounded result batches and message chunks.

Overall distinct executed assertions:1043 regression tests +19 native tests +5 Preview boundaries =1067 passed. Seven media tests are included in1043 and were repeated only after the font change. Other79 live/config-specific tests were intentionally not enabled. Local browser11 cases are separate from Vitest counts. No test used production orders or payments.

Final review: attribution lookup failure falls back to the ordinary badge without blocking a paid invitation. Promo disable/audit share a transaction. Notification counters check acknowledgment of their own key, not an unrelated queued message.
