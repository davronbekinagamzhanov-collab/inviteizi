# Self-hosted Google Fonts

These are the same 21 font families previously requested by next/font/google, downloaded over verified HTTPS from the official https://github.com/google/fonts/tree/main/ofl repository. Each directory retains its upstream METADATA.pb and OFL.txt license. No replacement family or placeholder font is used.

Full original TTF files were losslessly packaged as WOFF2 using fontTools TTFont with flavor='woff2' and Brotli, without subsetting or removing glyphs. provenance.json records the source filenames, their SHA-256 hashes, output hashes, and conversion. The upstream manifest describes downloaded source faces; only faces used by the application are retained as WOFF2.

Loader bindings use unique identifiers per module to prevent font-family name collisions in the installed Next.js compiler.

next/font/local preserves each existing CSS variable, requested weight range, and normal/italic style. Font preloading is disabled so pages download only the faces they use, rather than every locally registered family. Build and runtime no longer require fonts.googleapis.com or fonts.gstatic.com. The files are committed; no Python, Brotli installation, or font download is required for npm ci or next build.

This changes font delivery, not invitation composition, copy, prices, or business logic. The existing Lora and image-generation PT Serif files one directory above remain untouched.
