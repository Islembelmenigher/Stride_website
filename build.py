import pathlib
base = pathlib.Path(__file__).parent
fonts = (base / "fonts.css").read_text()
css = (base / "style.css").read_text()
body = (base / "body.html").read_text()
app = (base / "app.js").read_text()

html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Stride: Plant Protein Bars</title>
<meta name="description" content="Five bold flavours of plant protein bar. Pressed, not baked.">
<style>
{fonts}
{css}
</style>
<script type="importmap">
{{"imports":{{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}}}
</script>
</head>
<body class="locked">
{body}
<script type="module">
{app}
</script>
</body>
</html>
"""
(base / "index.html").write_text(html)
print("index.html", len(html), "bytes")
