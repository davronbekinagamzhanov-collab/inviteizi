# Sunnat collection — task5

Separate branch feature/sunnat-collection from owner-approved PR17 SHA9e08fdea477864f14555ac5a3c5a25842b38e10b. Draft PR base feature/nahorgi-collection. Seven weddings and four morning designs, all their components/assets and shared engine are unchanged. Main bb599e9 unchanged. Four new unlisted IDs159–162, no ACCEPTED/catalogue/PRICES change.

## Art direction

- zarhal-duo / Зарҳал дуо / Animated8000: forest-green bound ceremonial folio with small embroidered rosette and blind embossed corners. Left spine rotation reveals an ivory inner face, then the folio moves down revealing the complete invitation. Typography travels on the cover, no mirrored text, apertures, square doors or envelope copied from Nahorgi/Girih. Existing useCeremony manages decoding/fonts, busy guard/retry and reduced motion. About1.7s. Content: expressive centered title and letter, separate photographic boy's festive chapan/cap scene without wearer, month/countdown, then event programme/directions. Fixed art, no unsupported partial customer-photo opening.
- moviy-ayvon / Мовий айвон / Scroll6000: direct editorial composition with oversized upright name, independent wide sunlit ayvan photograph, indented welcome, chronological directions, then month and family closing. Blue/stone palette. No portrait, no intro, no forced photo upload. One image, no reuse of previous courtyard photographs.
- tulpor-quvonchi / Тулпор қувончи / Simple5000: one warm ivory/copper photo card. Name/date above a wide photograph of a boy in traditional festive clothes on a chestnut horse, three-quarter rear view. No Registan/white horse composition from hidden oq-ot. Whole horse remains visible with contain. Photo block supports optional1–3 customer images in one compact grid; cached failures and duplicates handled, empty/all-failed restores built-in image. Letter, compact1–3 events/maps, week and hosts. No opening/countdown/story screens.
- kashta-tilagi / Кашта тилаги / Simple5000: independent embroidered print composition with one photographic stitched rosette/border, blue/bronze text, large date/time ribbon, letter, week, compact event directions and hosts. No portrait or customer photos, no intro/countdown. Natural height growth for long names/text, one continuous print.

All5 new image_gen sources are documented in public/art/sunnat-collection/provenance.json, original PNGs retained. Photographic-looking generated artwork, not documentary/licensed stock or code-drawn photos. Horse anatomy, turned-away face, visible hand/feet and clothing inspected. No image repeated within a default invitation or shared as main art between the four. HTML supplies translated lettering; source art has no embedded text.

Existing InvitationData/useInvitation/InvitationShell/maps/RSVP/order-photo shape are reused unchanged. New scoped kit follows existing data blocks, with sunnatBazm as primary ceremonial date and existing chronological program. Client data, event kinds, custom texts and addresses are preserved; if the order contains morning osh and later sunnat both remain visible. Initial Uzbek via existing initialLanguage; explicit RU/query and switch preserved. Music starts only through interaction. Existing1–3 upload contract used only in Simple photo design, others ignore stale photos. Demo/Full/paid routes remain compatible.

## Six existing active Sunnat designs: no retirement now

| ID | Number | Format/price | Customer photos |
|---|---:|---|---|
| ganch-darvoza |134|Animated8000|no|
| bog |115|Scroll6000|yes|
| lola-medalyon |136|Simple5000|yes|
| lola-bodom |121|Animated8000|no|
| doppi-kitob |135|Scroll6000|no|
| doppicha |78|Simple5000|no|

All six stay active, same order, IDs/components/public assets retained. Hidden oq-ot31 and vip-oq-tulpor147 inspected; neither copied, activated, removed or overwritten. New horse image is an independent subject/composition.

## Separate future release plan

After owner artistic approval only: remove old6 from ACCEPTED/CATALOG_ORDER.sunnat and add a retired/history list to everAccepted, keep their getDesign/paid routes/clientPhotos flags/covers/OG and all stored orders. Add new4 to sale lists, no other category/price changes. Review templates seed metadata before activation: orders.template_id references templates.id. Seed rows159–162 and exact formats/prices/covers must exist before orders can use them; no schema change needed. Any real database synchronization requires separate release authorization, not performed here. Keep old template rows inactive rather than DELETE; never remap templateId or recalculate saved order amounts/formats. Explicitly test new selection rejection for retired IDs and agree resumed draft/pending-order policy (submitDraft distinguishes resumed orderId from brand-new orders). Preserve legacy paid URLs and photos on bog/lola-medalyon. Verify bot/server MiniApp/site catalogue and API together in release Preview; no working showcase switch in this task. Catalogue snapshot rollback must not delete issued links/orders.

## QA and limits

Profile tests cover new4 demo/full×1–3 events/600-character Cyrillic custom text, person/hosts/maps, optional/missing/partial/duplicate photo inputs, actual paid-slug fixtures for old6/new4, photo-step and previewData contracts. Regression covers approved morning collection,7 weddings, registry, formats, service and localization/OG. Browser:320/360/375×812/390/430, UZ/RU, audio gesture/play/pause,2GIS popup, calendar, decoded unique imagery, no horizontal/text overflow, console, double tap/reload/keyboard/reduced motion. Local temporary long/photo/RSVP fixtures use no real data writes and are removed before commit. Full production build, ESLint and TypeScript run after cleanup. Final exact-SHA READY deployment and actual HTTPS browser results recorded in Draft PR.

No physical iPhone/Safari/Telegram WebView, native2GIS or real payment/order/RSVP/Storage upload tests. No SQL, production, bot changes or merge. Artistic acceptance is owner-only; stop at Preview, no Jubilee work.

Local evidence:159 tests across10 files PASS (sequential run),21 mobile/reduced scenarios PASS,25 long-data/reduced/demo-RSVP cases PASS (zero RSVP POST),9 photo cases PASS. The legacy Doppicha fixture uses inline word spans, so paid-route host comparison normalizes markup/whitespace rather than requiring one literal HTML substring. No legacy source changed. Five viewports and390px closed/opening/full pages visually reviewed; folio photo's surrounding table is cropped out in the presentation so only the actual cover rotates.

## Task6 prerequisite — two Simple corrections
Only Horse/Embroidered assembly changes: remove Letter and Calendar, leaving occasion/person/date/time, photo or embroidery, all supplied event locations/addresses/maps and hosts. No opening/countdown/story structure. Photo capability stays1–3 for Tulpor and false for Kashta. Ceremonial, Folio and Ayvan functions, their CSS/art and registry unchanged.105 focused regression tests and10 local mobile cases pass. Updated two covers/OG. New exact-SHA READY and published checks recorded in PR18; historical section descriptions above refer to task5.
