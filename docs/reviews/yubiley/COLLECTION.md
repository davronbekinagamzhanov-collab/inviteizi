# Task6 — Jubilee collection (Preview only)

Parent: corrected PR18 `85b80b1aa1b839df87749255808885eb71ca8c37`.
Branch: `feature/yubiley-collection`; target: `feature/sunnat-collection`.
No catalogue activation, production deployment, database mutation, order/payment change, merge or bot runtime edit.

## Four identities

| ID | Format / KZT | Photos | Composition |
|---|---|---|---|
| umr-durdonasi (new163) | Animated /8000 | Optional1–3 | Pearl cotton-paper folded greeting card; horizontal top fold, real reverse, open card lowers; age/name, celebration photo, guest programme first, invitation, month and countdown, family signature. |
| umr-daraxti (existing81) | Scroll /6000 | Fixed | Direct editorial page; mature tree as life/generations symbol, age inset, upright names, invitation, month/countdown then programme. |
| qadr-surati (new164) | Simple /5000 | Optional1–3 | Compact slate-blue printed card; photo and milestone side by side, name/date, programme/maps and family signature. |
| bordo-guldasta (existing122) | Simple /5000 | Fixed | Compact ivory/burgundy peony print, large upright type, warm gold double print line, dates/venues and family signature. |

The existing Bordo-guldasta remains the fixed Simple; Umr-daraxti remains Scroll. No duplicate of either is created. Their IDs, format, price and photo contracts are retained. Old illustration files remain available for historic references.

Simple has no entry layer, calendar, countdown, viewport-height scene or page-by-page story. Long custom text, hosts or1–3 events naturally increase its height. RSVP, when enabled in actual order data, remains the existing shared form. It is not removed for a smaller screenshot.

## Art direction and provenance

Five necessary assets were created with OpenAI image_gen: one folded paper cover and one unique default image per design. They are generated photographic artwork, not documentary photos or code-drawn pictures. Originals remain in `/workspace/generated_images`; exact source filenames and delivered WebP SHA256 hashes are in `public/art/yubiley-collection/provenance.json`.

- Pearl: pearl/apricot/champagne family birthday table; no strangers, portraits, rings or fixed age in image.
- Tree: mature sunlit mulberry garden replaces the schematic SVG family tree, preserving the theme of generations and warm natural palette.
- Portrait Simple: powder-blue/ivory birthday still life, optional customer photos replace this image. Full customer photos use contain rather than cutting off faces;1–3 unique slots, cached failed images reconcile to one fallback.
- Burgundy: natural burgundy peonies replace flat floral illustration; the beige/burgundy/gold palette, large upright names, gentle double rule and elderly-reader emphasis are retained.

No image is repeated within a page. No baked-in text, age, identity or random portrait. All visible invitation text is live UZ/RU.

## Compatibility boundary

Shared order model, slug route, registry lookup, translation hook, RSVP, audio gesture, map resolver, calendar and payment logic remain intact. New IDs are registered but absent from ACCEPTED/CATALOG_ORDER. Existing81/122 remain offered exactly as before, same formats/photo policies. No database seed has been executed; new-ID sale activation requires an explicitly approved later integration release with existing FK/template metadata handling.

Existing paid URLs resolve independently of current sale availability. Synthetic active-order fixtures cover all six prior Jubilee IDs and the two new candidates, with no real Supabase request or payment. Browser fixtures use an in-memory development-only route, removed before release; RSVP demo exercises validation/local response without submitting a real RSVP.

## Safe retirement proposal — do not execute in this task

Retain the refreshed81/122 and review the two new candidates first. Potential later sale retirement: zarhal-lavha87, umr-kitobi137, hurmat-maktub138 and pion-guldasta51. Their older pane/book/flat-letter constructions are weaker than the proposed collection. This is a proposal, not an automatic quality verdict or owner acceptance.

After owner approval, separately change only sale allowlist/order metadata for new purchases; inspect resumable draft selection policy and seed template rows before enabling new IDs. Keep registry records, components, routes, assets, historical amount/format, template-version resolution and paid invitation data. Test synthetic active/archived/preview/draft cases before that separate release. Do not rewrite old orders or delete paid routes. No retirement/activation or production change is included here.

## Verification

Final measured results and Preview commit/READY status are recorded in the Draft PR and owner report. Browser widths320/360/375/390/430, UZ/RU, full/demo fixtures,1–3 events, long Cyrillic names/texts, maps, audio gesture, photo1/2/3/failure/duplicate cases, keyboard/reload/reduced motion, console and overflow checks. Physical phones, Safari/iOS and real customer uploads/payments/RSVP writes are outside this verification.

### Local release checks (14.11.2026)

-199 tests PASS across12 files (197 regression/profile +2 simulated Jubilee bot/order/catalogue tests).38 are specific to this collection. Includes synthetic active/paid lookup for every prior Jubilee ID; no database calls.
- TypeScript `tsc --noEmit`, ESLint and Next.js production build PASS.
-21 normal mobile browser cases PASS (4×5 widths plus Animated keyboard/reload/reduced-motion);25 long-data/demo browser cases PASS;14 customer-photo/fallback/unsupported-photo cases PASS;10 long-cover inscription bounds checks PASS (5 widths×UZ/RU).
- Actual2GIS browser popup navigation and music play/pause exercised at390; all widths have language/decoded-unique-images/console/text-bounds/horizontal-overflow checks. RSVP tested only in demo with zero POST writes.
- Development fixture route removed before build. Browser evidence outside Git: `/workspace/work/yubiley-local`, `yubiley-long`, `yubiley-photos`, `yubiley-cover-fit.json`; logs `yubiley-tests-final.log`, `yubiley-flow-tests.log`, `yubiley-build.log`, `yubiley-lint.log`, `yubiley-tsc-final.log`.
- HTTPS Preview checks follow after GitHub commit and exact-SHA READY verification; see final Draft PR status. This local report alone does not claim publication or owner artistic approval.
