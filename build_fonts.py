import re, base64, urllib.request, pathlib

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
OUT = pathlib.Path(__file__).parent

def get(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req) as r:
        data = r.read()
    return data if binary else data.decode()

def latin_url(css):
    # split into @font-face blocks, return the one preceded by /* latin */
    blocks = re.findall(r"/\* (\S+) \*/\s*@font-face\s*\{(.*?)\}", css, re.S)
    for label, body in blocks:
        if label == "latin":
            m = re.search(r"url\((https://[^)]+\.woff2)\)", body)
            if m:
                return m.group(1)
    raise SystemExit("no latin block")

faces = [
    ("Archivo Black", 400, "normal", "https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap"),
    ("Inter", "100 900", "normal", "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"),
    ("DM Mono", 400, "normal", "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap"),
    ("DM Mono", 500, "normal", "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap"),
]

# DM Mono needs the block matching its weight, so handle it specially
dm_css = get("https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap")

css_parts = []

# Archivo
arch_css = get(faces[0][3])
arch_url = latin_url(arch_css)
arch_b64 = base64.b64encode(get(arch_url, True)).decode()
css_parts.append(f"""@font-face{{font-family:'Archivo Black';font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,{arch_b64}) format('woff2');}}""")

# Inter
inter_css = get(faces[1][3])
inter_url = latin_url(inter_css)
inter_b64 = base64.b64encode(get(inter_url, True)).decode()
css_parts.append(f"""@font-face{{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,{inter_b64}) format('woff2');}}""")

# DM Mono per weight: find latin block with the given weight in its body
for weight in (400, 500):
    found = None
    for label, body in re.findall(r"/\* (\S+) \*/\s*@font-face\s*\{(.*?)\}", dm_css, re.S):
        if label == "latin" and f"font-weight: {weight};" in body:
            found = re.search(r"url\((https://[^)]+\.woff2)\)", body).group(1)
            break
    if not found:
        raise SystemExit(f"no latin DM Mono {weight}")
    b64 = base64.b64encode(get(found, True)).decode()
    css_parts.append(f"""@font-face{{font-family:'DM Mono';font-style:normal;font-weight:{weight};font-display:swap;src:url(data:font/woff2;base64,{b64}) format('woff2');}}""")

(OUT / "fonts.css").write_text("\n".join(css_parts) + "\n")
print("wrote fonts.css", (OUT / "fonts.css").stat().st_size, "bytes")
for p in ("Archivo", "Inter", "DM"):
    pass
print("archivo woff2", len(arch_b64), "inter woff2", len(inter_b64))
