# Локальные шрифты

- PT Serif Regular: [Google Fonts / PT Serif](https://github.com/google/fonts/tree/main/ofl/ptserif), исходный файл `PT_Serif-Web-Regular.ttf`. Лицензия — `OFL.txt` в этой папке.
- Lora, normal/italic, variable weights 400–700: [Google Fonts / Lora](https://github.com/google/fonts/tree/main/ofl/lora). Лицензия — `Lora-OFL.txt`.

Это те же семейства, которые уже использовал проект. Lora сохранена локально из-за ошибки парсинга URL в установленном `next/font/google`.

`node scripts/font-codepoints.mjs` пересоздаёт список символов PT Serif и проверяет наличие ў қ ғ ҳ. Генератор изображений не запрашивает удалённые emoji/шрифты: неизвестные символы заменяются на `?`, значок тенге — на «тг» (шкала графика — KZT). Полные названия/суммы остаются в текстовых Telegram-отчётах.

## Offline Google Fonts (final premium release)

The remaining 21 existing font families are now vendored in `google/`, from the official `google/fonts` repository at commit `6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec`. Every directory retains its original OFL notice and upstream METADATA.pb (text line endings/trailing whitespace normalized; wording unchanged). `google/manifest.json` records source URLs, original SHA-256 hashes, and bundled WOFF2 SHA-256 hashes.

Only lossless TTF → WOFF2 container compression was performed using fontTools; original outlines, names, character coverage, weights and variation axes are retained. No substitute fonts or fabricated files are used. Existing Google-family imports have been replaced with `next/font/local` in their original modules. Build/runtime no longer contacts Google Fonts.

Run `node scripts/check-local-fonts.mjs` to verify all 64 WOFF2 binaries, 21 license notices and the absence of runtime Google font loaders. Premium designs themselves continue to use the existing bundled Lora. Source artwork and customer data are unrelated to these font licenses.
