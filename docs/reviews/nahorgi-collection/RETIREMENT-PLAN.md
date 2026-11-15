# Наҳорги ош — audit and safe future retirement plan

Read-only baseline: main bb599e9afa8aa7faacb3810559528ca52d652b6d. Work starts at PR13 /3c36f6cb11c71b1e5b2ead24954489e8f8afb256 in a separate child branch. This document is a plan, not a catalogue switch or database migration.

## Six currently sold designs

| ID | Number | Format | Current price | Client photos |
| --- | ---: | --- | ---: | --- |
| qozon-tongi |125| Animated |8000| no |
| tong-dasturxon |116| Scroll |6000| no |
| non-albom |124| Simple |5000| no |
| tonggi-piyola |120| Animated |8000| no |
| tong-varaq |126| Scroll |6000| no |
| choy-maktub |123| Simple |5000| no |

These six remain in ACCEPTED, CATALOG_ORDER.nahorgi and activeDesigns, in the same order. No source, ID, number, route, cover or OG file for them changes. getDesign/loadOrderDesign and /[slug] remain able to render stored orders irrespective of isOnSale; the real paid route is covered by synthetic fixtures for all six. Stored orders.format/amount and designVersion must not be inferred from future catalogue state.

## Four unlisted candidates

| ID | Number | Format | Price | Client photos |
| --- | ---: | --- | ---: | --- |
| sahar-sabosi |153| Animated |8000| no (same as before) |
| subhi-safo |154| Scroll |6000| no |
| bog-nasimi |157| Simple |5000| optional1–3 in a single photo composition |
| tong-naqshi |158| Simple |5000| no |

Numbers155/156 belong to previously retired previews; not reused. All four candidates are registered for direct demo/paid rendering but excluded from ACCEPTED and CATALOG_ORDER. isOnSale returns false. PRICES remains unchanged; active catalogue count remains36. The frontend optional-photo step is derived from clientPhotos; existing order/data shapes already support photos and /[slug] honours that flag without a special Nahorgi ban. No new photo field or upload endpoint is needed. The Animated design keeps fixed art; optional uploads are deliberately confined to the Simple built for it.

## Release plan — requires a separate owner-approved integration

1. Obtain artistic acceptance of the four and determine any already-open draft/pending-order policy before changing sale availability. Keep paid/active/archived orders and their stored amounts/formats untouched. Never automatically replace their templateId with a new design.
2. In that separate release, remove the six old IDs only from sale acceptance/order lists; include them in an explicit retired/history list used by everAccepted. Keep getDesign entries, components, names, public art/covers/OG and /[slug] behaviour. Add the four new IDs to ACCEPTED and replace only CATALOG_ORDER.nahorgi; do not alter other categories or PRICES.
3. Verify all selection surfaces: bot catalogList/designsFor and choose-design validation, Mini App server catalogue and submitDraft, website /catalog, template preview routes, favourites and saved draft editing. New attempts to select a retired ID must be rejected; historical links must render from stored templateId. submitDraft currently distinguishes brand-new orders from resumed orderId drafts; retain its policy unless separately agreed, and explicitly test it in that release.
4. Existing SQL defines orders.template_id -> public.templates(id). Before allowing orders on the new IDs, review the registry-derived seed rows for153/154/157/158, correct formats/prices/covers and activation flags. scripts/seed-templates.mjs supports **--dry-run** without credentials/connection. Its real execution upserts templates and deactivates absent rows; it must not run as part of this artwork task. Perform any database synchronization only in a separately authorised release. Keep old rows (inactive), never DELETE them or reassign IDs. No schema change is required for these formats/photo data.
5. Stage a Preview of that integration, test historical paid-slug fixtures for all six, resumed pending/draft policy, new four's selection and photo step, prices5000/6000/8000 and server rejection of retired new choices. Use simulated payments/RSVP only. Then owner approves the production release separately.
6. Preserve a rollback catalogue snapshot. Rollback concerns sale flags/order lists; it must not erase orders or the newly issued links.

Current task: no SQL execution, Supabase connection, migration, deployment to production, Telegram webhook/token change, order/payment write or merge. The seed dry-run was inspected only as static metadata:36 active, four candidates inactive.
