# Промпты картин InviteIZI

Генерация: Pollinations (`https://image.pollinations.ai/prompt/<prompt>?width=1080&height=1920&model=flux&nologo=true&seed=<seed>`), не чаще 1 запроса в 15 с (фактический бесплатный лимит сейчас — 1 в 45 с, скрипт ждёт 50 с).
Скрипт: `node scripts/gen-art.mjs [id]` → черновики в `art-raw/`, лучший вариант → `node scripts/art-to-webp.mjs <файл> <id>` → `public/art/<id>.webp` (≤ 300 КБ).
Для каждой картины 3 варианта (seed 11, 2026, 777), выбирается лучший: анатомия коня и людей, нет надписей, верх светлый и пустой.

## oq-ot — Пилот 3 «Оқ от» (суннат тўйи)
Photorealistic painting, vertical 9:16. A small Uzbek boy (about 7 years old) in a gold-embroidered blue velvet chapan and traditional doppi hat sits proudly on a majestic white horse with ornate festive harness, in front of the Registan madrasa in Samarkand, soft golden morning light, rose petals in the air. The top third of the image is a soft hazy cream-white sky with nothing in it. Elegant, warm, cinematic, highly detailed, no text, no watermark.

## tonggi-qozon — Пилот 4 «Тонгги қозон» (наҳорги ош)
Photorealistic painting, vertical 9:16. A huge traditional Uzbek kazan of steaming plov in a courtyard at dawn, tandir oven and a wooden sandal bench covered with suzani in the background, a tray of pomegranates and round non bread, gentle golden sunrise light and soft steam. The top third is a pale cream sky fading to white with nothing in it. Warm, festive, no people, no text, no watermark.

## pion-guldasta — Пилот 5 «Пион гулдаста» (юбилей)
Photorealistic still life, vertical 9:16. A lush abundant bouquet of blush pink and white peonies with a few deep burgundy roses in an elegant gold vase on a table with a cream silk cloth, soft window light, a few petals on the table. The top third is soft cream empty background. Luxurious, romantic, highly detailed, no text, no watermark.

## Выбор
(заполняется после просмотра вариантов)
