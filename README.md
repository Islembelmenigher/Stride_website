# Stride — Plant Protein Bars

A responsive, single-page landing experience for a fictional plant-protein bar brand. The finished experience is in `index.html`; the editable source is kept as modular files and assembled by `build.py`.

## Run the page

Open `index.html` in a modern browser with an internet connection. For local development, run a static server from this folder:

```sh
python3 -m http.server 8080
```

Then visit `http://localhost:8080/`.

The page loads Three.js 0.160.0 from jsDelivr and the supplied wrapper sprite sheet and intro video from the project’s approved image/video hosts. The four font faces are embedded as base64 WOFF2 data in `fonts.css` and in the generated HTML.

## Build

After editing the modular source files, regenerate the standalone deliverable with:

```sh
python3 build.py
```

`build.py` combines `fonts.css`, `style.css`, `body.html`, and `app.js` into `index.html`. `build_fonts.py` is an optional utility for regenerating the embedded font stylesheet; it needs internet access to fetch the font files.

## Project files

- `index.html` — self-contained runnable page, with embedded styles, fonts, markup, and module code.
- `app.js` — Three.js wrapper-bar scene, flavour carousel, scroll-driven traveller, ingredient storm, shop and builder interactions.
- `style.css` — layout, responsive rules, type, animation and reduced-motion styles.
- `body.html` — page markup.
- `fonts.css` — four embedded font-face declarations: Archivo Black 400, Inter variable 100–900, and DM Mono 400/500.
- `build.py` — assembles the standalone HTML file.
- `build_fonts.py` — optional font stylesheet regeneration utility.

## Verification

The page was checked at 1440×900, 1920×1080, 390×844, 320×700, 844×390 and 768×1024. The tested sizes had no horizontal overflow; the hero, scroll-driven transitions, shop card landing, builder, cart interactions and reduced-motion path were exercised.

The ingredient crop assignment intentionally follows the supplied sprite sheet artwork: the berry and chocolate/peanut crop boxes are associated with the matching flavours even though their order differs from the brief’s content column.
# Stride_website
