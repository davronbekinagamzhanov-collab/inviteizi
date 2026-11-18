# woff2/woff/ttf → статичный TTF для Satori (картинки «Сақлаб олиш»): нужная толщина, только латиница и кириллица.
# python3 font-ttf.py <вход> <выход.ttf> <wght> [ital]
import sys
from fontTools.ttLib import TTFont
from fontTools import subset

src, out, wght = sys.argv[1], sys.argv[2], float(sys.argv[3])
font = TTFont(src)
if "fvar" in font:
    from fontTools.varLib import instancer
    axes = {a.axisTag: a.defaultValue for a in font["fvar"].axes}
    if "wght" in axes:
        lo = min(a.minValue for a in font["fvar"].axes if a.axisTag == "wght")
        hi = max(a.maxValue for a in font["fvar"].axes if a.axisTag == "wght")
        axes["wght"] = max(lo, min(hi, wght))
    font = instancer.instantiateVariableFont(font, axes)
font.flavor = None
opts = subset.Options()
opts.layout_features = ["kern", "liga", "calt", "clig", "ccmp", "locl", "mark", "mkmk"]
opts.name_IDs = ["*"]
opts.notdef_outline = True
sub = subset.Subsetter(opts)
sub.populate(unicodes=list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + list(range(0x400, 0x530)) + list(range(0x2010, 0x2070)) + [0x2116, 0x20B8, 0x2122])
sub.subset(font)
font.save(out)
