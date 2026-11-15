# Каталог: все 107 дизайнов и как включить новые (A3)

Ветка `release/integration-1`. Preview ветки: https://inviteizi-git-release-integration-1-scanizi.vercel.app
(если Vercel попросит вход — открыть под своим аккаунтом Vercel).

## Как включить дизайн в продажу

Единственное место — файл `templates/catalog.ts`, список `ON_SALE`:

- дизайн продаётся (бот, Mini App, `/catalog`, проверка выбора на сервере), только если его ID есть в списке;
- порядок строк внутри тадбира = порядок показа клиенту (первые — наверху);
- цена не задаётся: всегда цена формата (Animated 8 000 ₸, Scroll 6 000 ₸, Simple 5 000 ₸). Отдельной VIP-цены нет;
- убрать из продажи = удалить строку; демо, код и уже созданные/оплаченные заказы продолжают работать.

После изменения списка: `npm run db:seed-templates -- --dry-run` (проверить строки), затем
`npm run db:seed-templates` (после бэкапа) — таблица `templates` в базе совпадёт с кодом
(`is_active` = в продаже, `price` = цена формата, `sort` = порядок каталога). Тест
`supabase/natural-release.test.ts` проверяет это на изолированной PostgreSQL.

Тесты больше не завязаны на число дизайнов: они сверяются с `ON_SALE`. Исключение — правила порядка в
`templates/catalog-order.test.ts` (прежние решения владельца: первым в каждом тадбире дизайн за 8 000 ₸,
в никоҳ первые — №113 «Муҳр» и №114 «Ипак», в юбилее первые «Умр дарахти» и «Бордо гулдаста»). Если новый порядок
их меняет — эти правила обновляются вместе со списком.

Все 107 дизайнов готовы к включению технически: у каждого есть название, обложка каталога, миниатюра,
JPG для бота и OG-превью ссылки (проверяет `templates/catalog.test.ts`).

**Сейчас ничего нового не включено** — в продаже прежние 33. Список и порядок задаёт владелец.

## Сводка: в продаже / всего

| Тадбир | Simple: в продаже / всего | Scroll: в продаже / всего | Animated: в продаже / всего |
|---|---|---|---|
| Никоҳ | 4 / 8 | 5 / 16 | 6 / 31 |
| Суннат | 2 / 5 | 2 / 5 | 2 / 7 |
| Наҳорги ош | 2 / 8 | 2 / 6 | 2 / 8 |
| Юбилей | 2 / 5 | 2 / 4 | 2 / 4 |

Колонки таблицы: «Картина в дизайне» — встроенная фотография/иллюстрация дизайна; «Фото клиента» — бот предлагает
клиенту загрузить свои фото (1–3). «Откуда» — в каком PR дизайн появился. Ссылки «демо» ведут на Preview ветки.

## Все дизайны

| № | ID | Название | Тадбир | Формат | Цена | Картина в дизайне | Фото клиента | Сейчас | Откуда | Демо |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `oltin-monogramma` | Олтин монограмма | Никоҳ | Animated | 8 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/oltin-monogramma) |
| 23 | `sapfir` | Сапфир | Никоҳ | Simple | 5 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/sapfir) |
| 31 | `oq-ot` | Оқ от | Суннат | Animated | 8 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/oq-ot) |
| 41 | `tonggi-qozon` | Тонгги қозон | Наҳорги ош | Animated | 8 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/tonggi-qozon) |
| 51 | `pion-guldasta` | Пион гулдаста | Юбилей | Animated | 8 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/pion-guldasta) |
| 61 | `ganch-peshtoq` | Ганч пештоқ | Никоҳ | Animated | 8 000 ₸ | нет | нет | скрыт 12.11 (PR #14) | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/ganch-peshtoq) |
| 62 | `zarhal-eshik` | Зарҳал эшик | Никоҳ | Animated | 8 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/zarhal-eshik) |
| 63 | `atlas-tolqin` | Атлас тўлқини | Никоҳ | Animated | 8 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/atlas-tolqin) |
| 64 | `anor-bogi` | Анор боғи | Никоҳ | Animated | 8 000 ₸ | да | нет | ⛔ скрыт (замечания) | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/anor-bogi) |
| 65 | `bodom-guli` | Бодом гули | Никоҳ | Animated | 8 000 ₸ | да | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/bodom-guli) |
| 66 | `samarqand-kitob` | Самарқанд | Никоҳ | Animated | 8 000 ₸ | да | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/samarqand-kitob) |
| 67 | `ipak-romol` | Ипак рўмол | Никоҳ | Simple | 5 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/ipak-romol) |
| 68 | `rishton-koshin` | Риштон кошин | Никоҳ | Simple | 5 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/rishton-koshin) |
| 69 | `atirgul` | Атиргул | Никоҳ | Simple | 5 000 ₸ | да | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/atirgul) |
| 70 | `shohona-baxmal` | Шоҳона бахмал | Никоҳ | Scroll | 6 000 ₸ | нет | нет | скрыт 12.11 (PR #14) | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/shohona-baxmal) |
| 71 | `tandir-nuri` | Тандир нури | Наҳорги ош | Animated | 8 000 ₸ | да | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/tandir-nuri) |
| 72 | `dasturxon` | Дастурхон | Наҳорги ош | Animated | 8 000 ₸ | да | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/dasturxon) |
| 73 | `non-muhr` | Нон муҳри | Наҳорги ош | Animated | 8 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/non-muhr) |
| 74 | `tonggi-choy` | Тонгги чой | Наҳорги ош | Scroll | 6 000 ₸ | да | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/tonggi-choy) |
| 75 | `paxta-gul` | Пахта гул | Наҳорги ош | Scroll | 6 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/paxta-gul) |
| 76 | `oltin-ot` | Олтин от | Суннат | Animated | 8 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/oltin-ot) |
| 77 | `oq-chinni` | Оқ чинни | Наҳорги ош | Simple | 5 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/oq-chinni) |
| 78 | `doppicha` | Дўппича | Суннат | Simple | 5 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/doppicha) |
| 79 | `sayram-hovli` | Сайрам ҳовлиси | Суннат | Scroll | 6 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/sayram-hovli) |
| 80 | `zarvaraq` | Зарварақ | Юбилей | Simple | 5 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/zarvaraq) |
| 81 | `umr-daraxti` | Умр дарахти | Юбилей | Scroll | 6 000 ₸ | да | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/umr-daraxti) |
| 82 | `marvarid-satr` | Марварид сатри | Никоҳ | Simple | 5 000 ₸ | да | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/marvarid-satr) |
| 83 | `gulbog-sahifa` | Гулбоғ саҳифаси | Никоҳ | Scroll | 6 000 ₸ | да | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/gulbog-sahifa) |
| 84 | `suzani-yol` | Сўзана йўли | Никоҳ | Scroll | 6 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/suzani-yol) |
| 85 | `bugdoy-boshoq` | Буғдой бошоғи | Наҳорги ош | Simple | 5 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/bugdoy-boshoq) |
| 86 | `lola-ehtirom` | Лола эҳтироми | Юбилей | Scroll | 6 000 ₸ | да | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/lola-ehtirom) |
| 87 | `zarhal-lavha` | Зарҳал лавҳа | Юбилей | Animated | 8 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/zarhal-lavha) |
| 88 | `adras-nishon` | Адрас нишони | Суннат | Simple | 5 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/adras-nishon) |
| 89 | `mis-kafgir` | Мис капгир | Наҳорги ош | Simple | 5 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/mis-kafgir) |
| 90 | `rayhon-sahari` | Райҳон саҳари | Наҳорги ош | Scroll | 6 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/rayhon-sahari) |
| 91 | `visol-rishta` | Висол риштаси | Никоҳ | Animated | 8 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/visol-rishta) |
| 92 | `uzum-hovli` | Узум ҳовлиси | Никоҳ | Scroll | 6 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/uzum-hovli) |
| 93 | `sopol-navo` | Сопол навоси | Никоҳ | Scroll | 6 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/sopol-navo) |
| 94 | `girih-nur` | Гиреҳ нури | Никоҳ | Animated | 8 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/girih-nur) |
| 95 | `siyoh-duo` | Сиёҳ дуоси | Никоҳ | Animated | 8 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/siyoh-duo) |
| 96 | `kabutar-salom` | Кабутар саломи | Никоҳ | Animated | 8 000 ₸ | да | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/kabutar-salom) |
| 97 | `shirin-tilak` | Ширин тилак | Никоҳ | Scroll | 6 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/shirin-tilak) |
| 98 | `minor-satr` | Минор сатри | Никоҳ | Scroll | 6 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/minor-satr) |
| 99 | `kumush-taroq` | Кумуш тароқ | Никоҳ | Scroll | 6 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/kumush-taroq) |
| 100 | `shabnam-visol` | Шабнам висоли | Никоҳ | Animated | 8 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/shabnam-visol) |
| 101 | `visol-soati` | Висол соати | Никоҳ | Animated | 8 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/visol-soati) |
| 102 | `dutor-navosi` | Дутор навоси | Никоҳ | Scroll | 6 000 ₸ | да | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/dutor-navosi) |
| 103 | `tut-qogozi` | Тут қоғози | Никоҳ | Scroll | 6 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/tut-qogozi) |
| 104 | `qosh-uzuk` | Қўш узук | Никоҳ | Animated | 8 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/qosh-uzuk) |
| 105 | `yelpigich-ziynat` | Елпиғич зийнати | Никоҳ | Animated | 8 000 ₸ | да | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/yelpigich-ziynat) |
| 106 | `saodat-kaliti` | Саодат калити | Никоҳ | Animated | 8 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/saodat-kaliti) |
| 107 | `sunnat-muqova` | Суннат муқоваси | Суннат | Animated | 8 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/sunnat-muqova) |
| 108 | `sunnat-nasab` | Оила шажараси | Суннат | Scroll | 6 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/sunnat-nasab) |
| 109 | `sahar-ipagi` | Саҳар ипаги | Наҳорги ош | Animated | 8 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/sahar-ipagi) |
| 110 | `sahar-maktubi` | Саҳар мактуби | Наҳорги ош | Simple | 5 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/sahar-maktubi) |
| 111 | `umr-sahifalari` | Умр саҳифалари | Юбилей | Scroll | 6 000 ₸ | да | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/umr-sahifalari) |
| 112 | `ehtirom-kartasi` | Эҳтиром варағи | Юбилей | Simple | 5 000 ₸ | нет | нет | скрыт 03.11 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/ehtirom-kartasi) |
| 113 | `muhr` | Муҳр | Никоҳ | Animated | 8 000 ₸ | нет | да | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/muhr) |
| 114 | `ipak` | Ипак | Никоҳ | Animated | 8 000 ₸ | нет | да | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/ipak) |
| 115 | `bog` | Боғ | Суннат | Scroll | 6 000 ₸ | нет | да | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/bog) |
| 116 | `tong-dasturxon` | Тонгги дастурхон | Наҳорги ош | Scroll | 6 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/tong-dasturxon) |
| 117 | `gul-doira` | Гул доира | Никоҳ | Animated | 8 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/gul-doira) |
| 118 | `girih-barg` | Гиреҳ барг | Никоҳ | Animated | 8 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/girih-barg) |
| 119 | `muhrli-maktub` | Муҳрли мактуб | Никоҳ | Animated | 8 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/muhrli-maktub) |
| 120 | `tonggi-piyola` | Тонгги пиёла | Наҳорги ош | Animated | 8 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/tonggi-piyola) |
| 121 | `lola-bodom` | Лола ва бодом | Суннат | Animated | 8 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/lola-bodom) |
| 122 | `bordo-guldasta` | Бордо гулдаста | Юбилей | Simple | 5 000 ₸ | да | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/bordo-guldasta) |
| 123 | `choy-maktub` | Чой мактуби | Наҳорги ош | Simple | 5 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/choy-maktub) |
| 124 | `non-albom` | Нон ва чой | Наҳорги ош | Simple | 5 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/non-albom) |
| 125 | `qozon-tongi` | Қозон тонги | Наҳорги ош | Animated | 8 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/qozon-tongi) |
| 126 | `tong-varaq` | Тонг варағи | Наҳорги ош | Scroll | 6 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/tong-varaq) |
| 127 | `oq-maktub` | Оқ мактуб | Никоҳ | Simple | 5 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/oq-maktub) |
| 128 | `ipak-albom` | Ипак альбом | Никоҳ | Simple | 5 000 ₸ | нет | да | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/ipak-albom) |
| 129 | `suzani-medalyon` | Сузана медальон | Никоҳ | Simple | 5 000 ₸ | нет | да | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/suzani-medalyon) |
| 130 | `nur-varaq` | Нур варақ | Никоҳ | Scroll | 6 000 ₸ | нет | да | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/nur-varaq) |
| 131 | `islimi-varaq` | Ислими варақ | Никоҳ | Scroll | 6 000 ₸ | нет | нет | скрыт после батча 3 | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/islimi-varaq) |
| 132 | `xotira-albom` | Хотира альбоми | Никоҳ | Scroll | 6 000 ₸ | нет | да | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/xotira-albom) |
| 133 | `visol-hikoya` | Висол ҳикояси | Никоҳ | Animated | 8 000 ₸ | нет | да | скрыт 12.11 (PR #14) | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/visol-hikoya) |
| 134 | `ganch-darvoza` | Ганч дарвоза | Суннат | Animated | 8 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/ganch-darvoza) |
| 135 | `doppi-kitob` | Дўппи китоби | Суннат | Scroll | 6 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/doppi-kitob) |
| 136 | `lola-medalyon` | Лола медальон | Суннат | Simple | 5 000 ₸ | нет | да | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/lola-medalyon) |
| 137 | `umr-kitobi` | Умр китоби | Юбилей | Scroll | 6 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/umr-kitobi) |
| 138 | `hurmat-maktub` | Ҳурмат мактуби | Юбилей | Simple | 5 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/hurmat-maktub) |
| 139 | `suvbuyoq-tuman` | Мовий туман | Никоҳ | Scroll | 6 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/suvbuyoq-tuman) |
| 140 | `suvbuyoq-zumrad` | Зумрад | Никоҳ | Scroll | 6 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/suvbuyoq-zumrad) |
| 141 | `suvbuyoq-upa` | Упа гул | Никоҳ | Scroll | 6 000 ₸ | нет | нет | ✅ в продаже | до PR | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/suvbuyoq-upa) |
| 142 | `vip-tilla-muhr` | Тилла муҳр (VIP) | Никоҳ | Animated | 8 000 ₸ | да | да | новый, не в продаже | PR #13 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/vip-tilla-muhr) |
| 143 | `vip-osmon` | Осмон (VIP) | Никоҳ | Animated | 8 000 ₸ | да | да | новый, не в продаже | PR #13 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/vip-osmon) |
| 144 | `vip-suzana` | Сўзана (VIP) | Никоҳ | Animated | 8 000 ₸ | да | да | новый, не в продаже | PR #13 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/vip-suzana) |
| 145 | `vip-marvarid` | Марварид (VIP) | Никоҳ | Animated | 8 000 ₸ | да | да | новый, не в продаже | PR #13 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/vip-marvarid) |
| 146 | `vip-bogi-visol` | Боғи висол (VIP) | Никоҳ | Animated | 8 000 ₸ | да | да | новый, не в продаже | PR #13 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/vip-bogi-visol) |
| 147 | `vip-oq-tulpor` | Оқ тулпор (VIP) | Суннат | Animated | 8 000 ₸ | да | нет | новый, не в продаже | PR #13 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/vip-oq-tulpor) |
| 148 | `vip-umr-ziyosi` | Умр зиёси (VIP) | Юбилей | Animated | 8 000 ₸ | да | да | новый, не в продаже | PR #13 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/vip-umr-ziyosi) |
| 149 | `vip-visol-nuri` | Висол нури (VIP) | Никоҳ | Animated | 8 000 ₸ | да | да | новый, не в продаже | PR #13 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/vip-visol-nuri) |
| 150 | `vip-zarrin-ahd` | Заррин аҳд (VIP) | Никоҳ | Animated | 8 000 ₸ | да | да | новый, не в продаже | PR #13 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/vip-zarrin-ahd) |
| 151 | `vip-ipak-ziyosi` | Ипак зиёси (VIP) | Никоҳ | Animated | 8 000 ₸ | да | да | новый, не в продаже | PR #13 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/vip-ipak-ziyosi) |
| 152 | `vip-zarbof` | Зарбоф (VIP) | Никоҳ | Animated | 8 000 ₸ | да | нет | новый, не в продаже | PR #13 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/vip-zarbof) |
| 153 | `sahar-sabosi` | Саҳар сабоси | Наҳорги ош | Animated | 8 000 ₸ | да | нет | новый, не в продаже | PR #13 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/sahar-sabosi) |
| 154 | `subhi-safo` | Субҳи сафо | Наҳорги ош | Scroll | 6 000 ₸ | да | нет | новый, не в продаже | PR #13 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/subhi-safo) |
| 157 | `bog-nasimi` | Боғ насими | Наҳорги ош | Simple | 5 000 ₸ | да | да | новый, не в продаже | PR #17 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/bog-nasimi) |
| 158 | `tong-naqshi` | Тонг нақши | Наҳорги ош | Simple | 5 000 ₸ | да | нет | новый, не в продаже | PR #17 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/tong-naqshi) |
| 159 | `zarhal-duo` | Зарҳал дуо | Суннат | Animated | 8 000 ₸ | да | нет | новый, не в продаже | PR #18 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/zarhal-duo) |
| 160 | `moviy-ayvon` | Мовий айвон | Суннат | Scroll | 6 000 ₸ | да | нет | новый, не в продаже | PR #18 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/moviy-ayvon) |
| 161 | `tulpor-quvonchi` | Тулпор қувончи | Суннат | Simple | 5 000 ₸ | да | да | новый, не в продаже | PR #18 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/tulpor-quvonchi) |
| 162 | `kashta-tilagi` | Кашта тилаги | Суннат | Simple | 5 000 ₸ | да | нет | новый, не в продаже | PR #18 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/kashta-tilagi) |
| 163 | `umr-durdonasi` | Умр дурдонаси | Юбилей | Animated | 8 000 ₸ | да | да | новый, не в продаже | PR #19 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/umr-durdonasi) |
| 164 | `qadr-surati` | Қадр сурати | Юбилей | Simple | 5 000 ₸ | да | да | новый, не в продаже | PR #19 | [демо](https://inviteizi-git-release-integration-1-scanizi.vercel.app/demo/qadr-surati) |
