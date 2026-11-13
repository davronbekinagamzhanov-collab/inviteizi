# PR16 — three remaining floral invitations

Scope: follow-up to owner-approved69f2e09030b67c638f3b64cc2e883a4c7b10f64e. Only gul-doira / suvbuyoq-zumrad / suvbuyoq-upa change. Approved girih-barg and suvbuyoq-tuman, their pilot renderer/CSS/assets and all fifteen watercolor exports remain byte-identical. No registry, tariff, bot, API, Mini App, database, main, production or PR13–15 changes.

## Art direction

- **Гул доира / Animated8000**: ivory and blush rose wedding print; names inside a restrained oval, heart-marked month, centred letter, calendar → programme → guest directions. Opening is a physical left-bound folded folio, not Girih's envelope. The photographic-looking printed cover rotates on its left spine; its typography travels with the paper and never shows backwards. The interior names/date are visible as the cover turns. The folio then moves down, revealing the already loaded invitation, about1.8s. No aperture, opening circle, geometric doors or fullscreen photo fade as the only event. Double-tap guard, decoding, timer cleanup, reduced-motion immediate entry, keyboard operation.
- **Зумрад / Scroll6000**: saturated emerald ink, upright formal names framed within the garden watercolor, restrained double print line, paired ruled margins around the letter/programme. Reading path: garden portrait → letter/programme → botanical plate → locations → month → family signature. Direct access, no opening overlay/click.
- **Упа / Scroll6000**: blush wedding letterhead with expressive asymmetric italic names above a distinct garden illustration, soft arch around early guest directions, a vertical programme, then separate floral plate/month and family signature. Direct access, no intro. It does not reuse the full-portrait title layout of Blue/Emerald.

All nine approved paintings for these three are retained without regeneration, each appears once. The only added image is public/art/floral-trio/gul-folio.webp, generated using image_gen as a photographic wedding-print cover with roses/sage and actual paper/spine cues; this is AI-generated artwork, not a documentary photograph or a CSS/SVG imitation. Source PNG retained; export/hash/source documented in public/art/floral-trio/provenance.json. No embedded lettering; cover text/dates remain live and translated. No unsupported client-photo feature is enabled (registry.clientPhotos remains false).

Compared390px before/after captures from4d and owner-approved69f pilots. Reviewed closed/open/intermediate Gul frames, first screens and full pages of all three. Restored strong watercolor/paper/name hierarchy; removed fragmented label cards/schematic marks and circular opening. On visual review: replaced blank inner folio with live type; moved second paintings into the page rhythm so they do not form an unrelated pair at the bottom. Owner retains artistic approval.

Reference priglasi.pro/wedding and interactive site1-36_blue were inspected in the ongoing session, including closed/click/opening frames in Chromium390. No third-party code/assets copied. Owner video attachments are unavailable in the current task; no claim of viewing them.

## Compatibility and checks

Existing useInvitation/InvitationShell handle localization, data glue, music override/noMusic, event ordering, family text, maps, demo watermark, RSVP and paid routes. No changes to those shared blocks. Gul countdown retained; Scroll designs keep no countdown. Emerald/Upa now show a readable full month rather than a week; selected date and event times use the same parsed client date, no business-logic change.

-92 tests/5 files pass: actual components demo/full×1–3 events and long fields, maps, existing paid-slug fixtures, no unsupported uploads, unique images, registry prices/formats, saved-order compatibility and service checks. Three additional regression cases protect the distinct calendar/programme/map reading paths.
- TypeScript, ESLint and production Turbopack build pass.
- Local default browser suite:16 cases (three templates×320/360/375×812/390/430, plus Gul reduced-motion/keyboard/reload). Long full-data fixture suite:19 cases PASS (15 sizes + Gul reduced/keyboard/reload + three demo RSVP submissions, zero POST). Temporary development-only fixture route removed before commit.
- Browser checks: images decoded/unique, UZ/RU, text range bounds/horizontal overflow, music play/pause, actual2GIS navigation, calendar, click/double click and keyboard/reload/reduced motion. Long fixtures include three events, long names/venues/families, ignored unsupported photo input and preview-only RSVP with zero POST requests.
- Published Preview is checked against the exact GitHub SHA after Vercel READY. The final deployment ID/host/SHA and published browser result are recorded in PR16, without another artificial commit just to trigger publication. Temporary share tokens stay outside Git/PR.

Limits: Chromium automation, not physical iPhone/Safari/Telegram WebView. Native2GIS launch and real paid orders/real RSVP/database/storage writes are intentionally not exercised. Existing paid routes tested through synthetic fixtures. No real data or production access. New artwork still requires owner artistic acceptance. No merge.
