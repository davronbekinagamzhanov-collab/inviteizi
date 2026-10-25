# Локальные шрифты

- PT Serif Regular: [Google Fonts / PT Serif](https://github.com/google/fonts/tree/main/ofl/ptserif), исходный файл `PT_Serif-Web-Regular.ttf`. Лицензия — `OFL.txt` в этой папке.
- Lora, normal/italic, variable weights 400–700: [Google Fonts / Lora](https://github.com/google/fonts/tree/main/ofl/lora). Лицензия — `Lora-OFL.txt`.

Это те же семейства, которые уже использовал проект. Lora сохранена локально из-за ошибки парсинга URL в установленном `next/font/google`.

`node scripts/font-codepoints.mjs` пересоздаёт список символов PT Serif и проверяет наличие ў қ ғ ҳ. Генератор изображений не запрашивает удалённые emoji/шрифты: неизвестные символы заменяются на `?`, значок тенге — на «тг» (шкала графика — KZT). Полные названия/суммы остаются в текстовых Telegram-отчётах.
