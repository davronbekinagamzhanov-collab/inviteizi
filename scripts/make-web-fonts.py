"""Web-копии шрифтов для приглашений: assets/fonts/web/ (оригиналы в assets/fonts/ не меняются).

- Семейства без Reserved Font Name: подмножество символов, которые бывают в приглашениях
  (латиница с расширениями, вся кириллица с узбекскими и казахскими буквами, знаки, ₸, №, стрелки, ✦).
  Все варианты начертаний, оси переменных шрифтов и типографские функции (лигатуры, кернинг) сохраняются.
- Шрифты с Reserved Font Name (Lora, PT Serif и др.) не урезаются: только упаковка TTF → WOFF2 без изменения глифов.
Запуск: python3 scripts/make-web-fonts.py  (нужны fonttools и brotli)
"""
import io, pathlib, shutil
from fontTools import subset
from fontTools.ttLib import TTFont


ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/fonts"
OUT = SRC / "web"
SUBSET_FAMILIES = [
    "alegreya", "alegreyasans", "badscript", "cormorantgaramond", "cormorantunicase", "ebgaramond",
    "greatvibes", "libertinusserif", "notosans", "notoserif", "piazzolla", "playfair", "podkova",
    "sourceserif4", "viaodalibre", "vollkorn",
]
UNICODES = (
    "U+0000-017F,U+0218-021B,U+02B0-02FF,U+0300-036F,U+0400-052F,U+2000-206F,U+20A0-20CF,"
    "U+2100-214F,U+2190-21FF,U+2212,U+2215,U+221E,U+25A0-25FF,U+2600-27BF,U+FB00-FB06,U+FE00-FE0F,U+E000-F8FF"
)
# Ни один дизайн не задаёт font-stretch: ось ширины всегда 100 — закрепляем её, вид не меняется
PIN_AXES = {"wdth": 100}


def run_subset(src: pathlib.Path, dst: pathlib.Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.name_languages = ["*"]
    opts.notdef_outline = True
    opts.glyph_names = False
    opts.hinting = True
    font = TTFont(str(src), lazy=False)
    if "fvar" in font:
        from fontTools.varLib import instancer

        pins = {a.axisTag: v for a in font["fvar"].axes for t, v in PIN_AXES.items() if a.axisTag == t}
        if pins:
            instancer.instantiateVariableFont(font, pins, inplace=True)
            buf = io.BytesIO()
            font.flavor = None
            font.save(buf)
            buf.seek(0)
            font = TTFont(buf, lazy=False)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(font)
    subset.save_font(font, str(dst), opts)


total_before = total_after = 0
for family in SUBSET_FAMILIES:
    folder = SRC / "google" / family
    for f in sorted(folder.glob("*.woff2")):
        dst = OUT / "google" / family / f.name
        run_subset(f, dst)
        total_before += f.stat().st_size
        total_after += dst.stat().st_size
    for lic in folder.glob("OFL*.txt"):
        shutil.copy(lic, OUT / "google" / family / lic.name)

for name in ["Lora-Regular", "Lora-Italic", "PTSerif-Regular"]:
    font = TTFont(str(SRC / f"{name}.ttf"))
    font.flavor = "woff2"
    font.save(str(OUT / f"{name}.woff2"))
shutil.copy(SRC / "Lora-OFL.txt", OUT / "Lora-OFL.txt")
shutil.copy(SRC / "OFL.txt", OUT / "PTSerif-OFL.txt")
print(f"subset: {total_before // 1024} KB -> {total_after // 1024} KB")
