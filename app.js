import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ------------------------------------------------------------------ utils */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (n, m) => ((n % m) + m) % m;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(pointer: fine)').matches;

function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t;
  const sy = t => ((ay * t + by) * t + cy) * t;
  const dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t = clamp(t - (sx(t) - x) / d);
    }
    return sy(t);
  };
}
const GLIDE = cubicBezier(.25, .75, .2, 1);
const ENTRANCE = cubicBezier(.16, 1, .3, 1);
const easeSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
const easeInOut = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/* ------------------------------------------------------------------- data */
const SHEET = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261116_132032_30242d8c-5062-4d60-8a3d-238f0a2ff788.png&w=2200&q=85';
const SW = 2688, SH = 1520;

const FLAVORS = [
  { n: 'PEANUT COCOA', c: '#b79474', box: [98, 145, 403, 849], bit: 1, ing: 'Peanuts, oats, dates, cocoa, pea protein, sea salt.' },
  { n: 'BERRY OAT', c: '#ab9ac4', box: [620, 145, 402, 849], bit: 0, ing: 'Oats, blueberries, raspberries, dates, pea protein, almonds.' },
  { n: 'SALTED CARAMEL', c: '#d1ad6c', box: [1137, 145, 402, 849], bit: 2, ing: 'Dates, cashews, oats, pea protein, sea salt, vanilla.' },
  { n: 'MINT CHIP', c: '#94bdb4', box: [1661, 145, 402, 849], bit: 3, ing: 'Oats, dark chocolate, almonds, pea protein, peppermint oil.' },
  { n: 'STRAWBERRY', c: '#d396a7', box: [2184, 145, 403, 849], bit: 4, ing: 'Oats, strawberries, dates, cashews, pea protein, lemon.' },
];
// The sheet's left-most ingredient cluster is the berry mix, so the bit 0/1
// boxes are ordered to match the artwork each flavour actually uses.
const BITS = [[110, 1125, 280, 255], [650, 1090, 340, 305], [1175, 1110, 320, 285], [1680, 1085, 380, 305], [2280, 1095, 250, 295]];
const titleCase = s => s.toLowerCase().replace(/(^|\s)\w/g, c => c.toUpperCase());

/* -------------------------------------------------------------- view state */
const docEl = document.documentElement;
const heroEl = $('#flavors');
const insideEl = $('#inside');
const shopEl = $('#shop');
const rangeEl = $('#range');
const inFront = $('#inFront');
const inBar = $('#inBar');
const inHead = $('#inHead');
const inNum = $('#inNum');
const numWrap = $('#numWrap');
const inCap = $('#inCap');
const inDark = $('#inDark');
const stormEl = $('#storm');
const cardsEl = $('#cards');
const thumbsEl = $('#thumbs');
const glowEl = $('#glow');
const buyEl = $('#buy');
const buyLabel = $('#buy .bl');
const basketEl = $('#basket');
const cartN = $('#cartN');
const navEl = $('#nav');
const navMid = $('#navMid');
const navHl = $('#navHl');
const navLinks = $$('#navMid a');
const titleEl = $('#title');
const countEl = $('#count');
const playEl = $('#play');
const autoEl = $('#auto');
const autoGlyph = $('#autoGlyph');
const ringsEl = $('#rings');
const arcEl = $('#arc');
const bitsEl = $('#bits');
const revealEl = $('#reveal');
const introEl = $('#intro');
const vidEl = $('#introVid');
const skipEl = $('#skip');
const stampEl = $('#stamp');

let vw = innerWidth, vh = innerHeight, u = 1, isPhone = vw < 820;
let heroH = vh, cx = vw / 2, cy = vh / 2;
let now = performance.now();
let ready = false;

function measure() {
  vw = innerWidth; vh = innerHeight; isPhone = vw < 820;
  heroH = heroEl.getBoundingClientRect().height || vh;
  u = isPhone ? Math.min(vw / 560, heroH / 980) : Math.min(vw / 1440, vh / 900);
  cx = vw / 2;
  cy = isPhone ? heroH * .4 : heroH / 2 - 78 * u;
  docEl.style.setProperty('--k', String(isPhone ? Math.min(vw / 390, vh / 780) : Math.min(vw / 1440, vh / 900)));
  layoutBits();
  layoutStorm();
  sizeTitle();
}

/* --------------------------------------------------------------- sprites */
function setCrop(el, box, pad = 0) {
  const [bx, by, bw, bh] = box;
  const x = bx - pad, y = by - pad, w = bw + 2 * pad, h = bh + 2 * pad;
  el.style.backgroundSize = `${(SW / w * 100).toFixed(4)}% ${(SH / h * 100).toFixed(4)}%`;
  el.style.backgroundPosition = `${(x / (SW - w) * 100).toFixed(4)}% ${(y / (SH - h) * 100).toFixed(4)}%`;
}
const cropOf = (box, pad = 0) => {
  const [bx, by, bw, bh] = box;
  const x = bx - pad, y = by - pad, w = bw + 2 * pad, h = bh + 2 * pad;
  return {
    size: `${(SW / w * 100).toFixed(4)}% ${(SH / h * 100).toFixed(4)}%`,
    pos: `${(x / (SW - w) * 100).toFixed(4)}% ${(y / (SH - h) * 100).toFixed(4)}%`,
  };
};

/* ------------------------------------------------------------------- bits */
const BIT_DEF = [
  [.12, .20, 120, -18, 0],
  [.86, .18, 96, 22, 2],
  [.07, .74, 84, 12, 3],
  [.655, .15, 78, -10, 4],
  [.205, .885, 70, 30, 1],
];
const bitEls = BIT_DEF.map(([px, py, size, rot, bit], i) => {
  const el = document.createElement('div');
  el.className = 'bit';
  el.style.left = px * 100 + '%';
  el.style.top = py * 100 + '%';
  el.style.setProperty('--r', rot + 'deg');
  el.dataset.size = size;
  setCrop(el, BITS[bit]);
  bitsEl.appendChild(el);
  return el;
});
function layoutBits() {
  bitEls.forEach((el, i) => {
    const s = +el.dataset.size * u * (isPhone ? 1.3 : 1);
    el.style.width = s + 'px';
    el.style.height = s + 'px';
    el.style.display = isPhone && [1, 3, 4].includes(i) ? 'none' : 'block';
  });
}
function startBits() {
  bitEls.forEach((el, i) => {
    if (RM) { el.style.opacity = .55; return; }
    el.style.transition = `opacity .9s var(--ease) ${300 + 90 * i}ms`;
    el.style.setProperty('--dx', (i % 2 ? 12 : -13) + 'px');
    el.style.setProperty('--dy', -(22 + 3 * i) + 'px');
    el.style.setProperty('--dr', (i % 2 ? -11 : 11) + 'deg');
    el.style.animation = `drift ${7000 + 900 * i}ms ease-in-out ${300 + 90 * i}ms infinite`;
    requestAnimationFrame(() => { el.style.opacity = .6; });
  });
}

/* ------------------------------------------------------------------ cards */
cardsEl.innerHTML = FLAVORS.map((f, i) => `
  <article class="card" data-i="${i}" style="--c:${f.c}">
    <h3>${f.n.split(' ').join('<br>')}</h3>
    <div class="pk" data-i="${i}" role="button" tabindex="0" aria-label="${titleCase(f.n)} bar"></div>
    <button class="add" data-i="${i}" aria-label="Add a bag of ${titleCase(f.n)} to the cart"><span></span><span></span></button>
  </article>`).join('');
const cardEls = $$('.card', cardsEl);
cardEls.forEach((c, i) => setCrop($('.pk', c), FLAVORS[i].box, 4));

/* ---------------------------------------------------------------- thumbs */
thumbsEl.innerHTML = FLAVORS.map((f, i) => `
  <button class="thumb" data-i="${i}" aria-label="Add ${titleCase(f.n)} to the pack">
    <span class="sq" style="--c:${f.c}"><i></i></span>
    <b>${f.n}</b>
    <span class="ring"></span>
  </button>`).join('');
const thumbEls = $$('.thumb', thumbsEl);
thumbEls.forEach((t, i) => setCrop($('.sq i', t), FLAVORS[i].box, 4));

/* ------------------------------------------------------------ builder state */
let slots = [null, null, null], touched = false, buyBusy = false;
const slotEls = $$('.slot');
slotEls.forEach((s, i) => { s.dataset.i = i; });

function updateThumbs() {
  const counts = [0, 0, 0, 0, 0];
  slots.forEach(f => { if (f != null) counts[f]++; });
  thumbEls.forEach((el, i) => {
    const r = $('.ring', el);
    if (counts[i] > 1) { r.textContent = counts[i]; r.classList.add('has'); }
    else if (counts[i] === 1) { r.textContent = '✓'; r.classList.add('has'); }
    else { r.textContent = ''; r.classList.remove('has'); }
  });
}
function updateBuy() {
  const n = slots.filter(v => v != null).length;
  buyEl.disabled = n < 3;
  if (!buyBusy) {
    buyEl.classList.remove('done');
    buyLabel.textContent = n < 3 ? `Pick ${3 - n} more` : 'Add 3 to cart';
  }
}
function setSlot(i, fi, animate = true) {
  slots[i] = fi;
  const el = slotEls[i];
  const bar = $('.slot-bar', el);
  if (fi == null) {
    el.classList.add('empty');
    bar.style.backgroundImage = 'none';
  } else {
    el.classList.remove('empty');
    const c = cropOf(FLAVORS[fi].box, 4);
    bar.style.backgroundImage = 'var(--sheet)';
    bar.style.backgroundSize = c.size;
    bar.style.backgroundPosition = c.pos;
    if (animate && !RM) {
      const rise = 40 * (vw / 1440);
      bar.animate([
        { transform: `translate(-50%,-50%) translateY(${-rise}px) scale(.8)`, opacity: 0 },
        { transform: 'translate(-50%,-50%) translateY(0) scale(1)', opacity: 1 }
      ], { duration: 550, easing: 'cubic-bezier(.22,.8,.24,1)' });
    }
  }
  updateThumbs();
  updateBuy();
}
slotEls.forEach((el, i) => {
  $('.slot-x', el).addEventListener('click', () => { touched = true; setSlot(i, null); });
});
thumbEls.forEach((el, i) => {
  el.addEventListener('click', () => {
    touched = true;
    const free = slots.indexOf(null);
    if (free === -1) return;
    setSlot(free, i);
    setGlow(i);
  });
});

/* ------------------------------------------------------------------- cart */
let cartCount = 0;
function addCart(n) {
  cartCount += n;
  cartN.textContent = cartCount;
  cartN.classList.toggle('on', cartCount > 0);
  cartN.animate([
    { transform: 'scale(0)' },
    { transform: 'scale(1.5)', offset: .6 },
    { transform: 'scale(1)' }
  ], { duration: 350, easing: 'ease-out' });
}
function bumpBasket() {
  if (RM) return;
  basketEl.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(1.18)' },
    { transform: 'scale(1)' }
  ], { duration: 320, easing: 'ease-out' });
}
function flyToCart(srcs, count) {
  const b = basketEl.getBoundingClientRect();
  const tx = b.left + b.width / 2, ty = b.top + b.height / 2;
  if (RM || !srcs.length) { addCart(count); return; }
  srcs.forEach((s, i) => {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;left:${s.rect.left}px;top:${s.rect.top}px;width:${s.rect.width}px;height:${s.rect.height}px;background-image:var(--sheet);background-repeat:no-repeat;background-size:${s.size};background-position:${s.pos};z-index:70;pointer-events:none;filter:drop-shadow(0 10px 14px rgba(0,0,0,.25))`;
    document.body.appendChild(el);
    const dx = tx - (s.rect.left + s.rect.width / 2);
    const dy = ty - (s.rect.top + s.rect.height / 2);
    const lift = Math.min(160, .35 * Math.abs(dy) + 60);
    const k = Math.min(.2, 30 / s.rect.height);
    const a = el.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * .4}px,${dy * .4 - lift}px) scale(${.45 + k}) rotate(-10deg)`, opacity: 1, offset: .45 },
      { transform: `translate(${dx}px,${dy}px) scale(${k}) rotate(-18deg)`, opacity: .15 }
    ], { duration: 900, delay: i * 120, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' });
    a.onfinish = () => {
      el.remove();
      bumpBasket();
      if (i === srcs.length - 1) addCart(count);
    };
  });
}
function sourceOf(el) {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return { rect: r, size: cs.backgroundSize, pos: cs.backgroundPosition };
}
basketEl.addEventListener('click', () => {
  basketEl.animate([{ transform: 'scale(1)' }, { transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 260 });
});

/* --------------------------------------------------------------- builder UI */
$('#buy').addEventListener('click', () => {
  if (buyBusy || slots.some(v => v == null)) return;
  touched = true;
  const srcs = slotEls.map(el => sourceOf($('.slot-bar', el)));
  buyBusy = true;
  flyToCart(srcs, 1);
  setTimeout(() => {
    slots = [null, null, null];
    slotEls.forEach((el, i) => setSlot(i, null, false));
    buyEl.classList.add('done');
    buyEl.disabled = false;
    buyLabel.textContent = 'Added to cart';
  }, 60);
  setTimeout(() => {
    buyBusy = false;
    buyEl.classList.remove('done');
    updateBuy();
  }, 1660);
});
function setGlow(fi) {
  const c = FLAVORS[fi].c;
  const n = parseInt(c.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  glowEl.style.setProperty('--g', `rgba(${r},${g},${b},.72)`);
  glowEl.classList.remove('pulse');
  void glowEl.offsetWidth;
  glowEl.classList.add('pulse');
}

/* --------------------------------------------------------------- shop logic */
const tilts = FLAVORS.map(() => ({ x: 0, y: 0 }));
cardEls.forEach((card, i) => {
  const pk = $('.pk', card);
  card.addEventListener('pointermove', e => {
    if (!FINE) return;
    const r = card.getBoundingClientRect();
    const x = clamp((e.clientX - r.left) / r.width, 0, 1) - .5;
    const y = clamp((e.clientY - r.top) / r.height, 0, 1) - .5;
    tilts[i].x = x; tilts[i].y = y;
    card.classList.add('tilting');
    card.style.transform = `translateY(-8px) rotateX(${-y * 12}deg) rotateY(${x * 12}deg)`;
    card.style.boxShadow = '0 24px 40px -18px rgba(40,30,20,.35)';
  });
  card.addEventListener('pointerleave', () => {
    card.classList.remove('tilting');
    card.style.transform = '';
    card.style.boxShadow = '';
    tilts[i].x = 0; tilts[i].y = 0;
  });
  card.addEventListener('pointerdown', e => {
    if (e.target.closest('.add')) return;
    card.style.scale = '.97';
  });
  const up = () => { card.style.scale = ''; };
  card.addEventListener('pointerup', up);
  card.addEventListener('pointercancel', up);
  card.addEventListener('pointerleave', up);

  const poke = () => {
    if (i === cur) { pokeT0 = performance.now(); }
    else if (!RM) {
      pk.animate([
        { scale: '1 1' }, { scale: '1.06 .93', offset: .3 },
        { scale: '.97 1.04', offset: .6 }, { scale: '1 1' }
      ], { duration: 500, easing: 'ease-in-out' });
    }
  };
  pk.addEventListener('click', poke);
  pk.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(); } });
  card.addEventListener('click', e => {
    if (e.target.closest('.add')) return;
    const r = pk.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) poke();
  });

  $('.add', card).addEventListener('click', e => {
    e.stopPropagation();
    flyToCart([sourceOf(pk)], 1);
  });
});

/* ------------------------------------------------------------- 3D scaffolding */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 10, 6000);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(-0.6, 0.9, 1.4);
scene.add(keyLight);

const BH = (849 + 8) / (403 + 8);
const CR = 0.062;

function barGeometry(back) {
  const g = new THREE.PlaneGeometry(1, BH, 30, 64);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    const ex = Math.abs(2 * u - 1), ev = Math.min(v, 1 - v);
    let z;
    if (ev < CR) {
      z = 0.006 + 0.006 * Math.abs(Math.sin(u * Math.PI * 34));
    } else {
      const across = Math.pow(Math.max(0, 1 - Math.pow(ex, 2.6)), 0.62);
      const along = Math.pow(clamp((ev - CR) / 0.11), 0.7);
      z = 0.012 + 0.118 * across * along + 0.004 * Math.sin(23 * u + 31 * v) * across;
    }
    pos.setZ(i, back ? -z : z);
    if (back) uv.setX(i, 1 - u);
  }
  if (back) {
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t;
    }
    g.index.needsUpdate = true;
  }
  g.computeVertexNormals();
  return g;
}
const GEO_FRONT = barGeometry(false);
const GEO_BACK = barGeometry(true);

function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(30,18,40,.55)');
  g.addColorStop(.45, 'rgba(30,18,40,.3)');
  g.addColorStop(1, 'rgba(30,18,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const SHADOW_GEO = new THREE.PlaneGeometry(1.25, 1.04 * BH);
const SHADOW_TEX = shadowTexture();

function newBar() {
  const g = new THREE.Group();
  g.rotation.order = 'ZYX';
  const fm = new THREE.MeshPhysicalMaterial({
    transparent: true, alphaTest: .5, roughness: .45, metalness: 0,
    clearcoat: .5, clearcoatRoughness: .32, envMapIntensity: .42
  });
  const bm = fm.clone();
  const front = new THREE.Mesh(GEO_FRONT, fm);
  const back = new THREE.Mesh(GEO_BACK, bm);
  front.frustumCulled = false; back.frustumCulled = false;
  g.add(front, back);
  scene.add(g);
  const sh = new THREE.Mesh(SHADOW_GEO, new THREE.MeshBasicMaterial({
    map: SHADOW_TEX, transparent: true, depthWrite: false, opacity: .5
  }));
  sh.renderOrder = -1; sh.frustumCulled = false;
  scene.add(sh);
  return { g, front, back, fm, bm, sh, fl: -1 };
}
const pool = Array.from({ length: 11 }, newBar);
const traveller = newBar();

function place(bar, s) {
  if (s.op <= 0.01) {
    bar.g.visible = false; bar.sh.visible = false; return;
  }
  bar.g.visible = true;
  bar.g.position.set(s.x - vw / 2, vh / 2 - s.y, s.z);
  bar.g.rotation.set(s.rx * Math.PI / 180, s.ry * Math.PI / 180, -s.rz * Math.PI / 180);
  const sc = s.h / BH;
  bar.g.scale.set(sc * s.sx, sc * s.sy, sc);

  const rs = Math.max(.3, Math.abs(Math.cos(s.ry * Math.PI / 180)));
  bar.sh.visible = s.shadow > .001;
  bar.sh.position.set(s.x - vw / 2, vh / 2 - (s.y + .05 * s.h), s.z - .32 * s.h);
  bar.sh.rotation.set(0, 0, -s.rz * Math.PI / 180);
  bar.sh.scale.set(sc * rs, sc, 1);
  bar.sh.material.opacity = .5 * s.op * s.shadow;
}

/* ------------------------------------------------------------------ textures */
let sheetImg = null;
const TEX_FRONT = [], TEX_BACK = [];

function roundRect(x, X, Y, W, H, r) {
  x.beginPath();
  x.moveTo(X + r, Y);
  x.arcTo(X + W, Y, X + W, Y + H, r);
  x.arcTo(X + W, Y + H, X, Y + H, r);
  x.arcTo(X, Y + H, X, Y, r);
  x.arcTo(X, Y, X + W, Y, r);
  x.closePath();
}
function mixTo(hex, target, t) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(target.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
  const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
  const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return `rgb(${r},${g},${bl})`;
}
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy); line = w; yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

function makeFrontCanvas(f) {
  const [bx, by, bw, bh] = f.box;
  const W = Math.round((bw + 8) * 1.5 * .75);
  const H = Math.round(W * BH);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const s = sheetImg.naturalWidth / SW;
  x.drawImage(sheetImg, (bx - 4) * s, (by - 4) * s, (bw + 8) * s, (bh + 8) * s, 0, 0, W, H);
  return c;
}

function makeBackCanvas(f) {
  const [bx, by, bw, bh] = f.box;
  const W = Math.round((bw + 8) * 1.5 * .75);
  const H = Math.round(W * BH);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const s = sheetImg.naturalWidth / SW;

  x.save();
  x.translate(W, 0); x.scale(-1, 1);
  x.drawImage(sheetImg, (bx - 4) * s, (by - 4) * s, (bw + 8) * s, (bh + 8) * s, 0, 0, W, H);
  x.restore();

  x.globalCompositeOperation = 'source-atop';

  x.fillStyle = f.c;
  x.globalAlpha = .9;
  x.fillRect(0, H * .075, W, H * .85);
  x.globalAlpha = .35;
  x.fillRect(0, 0, W, H * .075);
  x.fillRect(0, H * .925, W, H * .075);
  x.globalAlpha = 1;

  const grad = x.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, 'rgba(0,0,0,.10)');
  grad.addColorStop(.28, 'rgba(255,255,255,.14)');
  grad.addColorStop(.5, 'rgba(0,0,0,0)');
  grad.addColorStop(.8, 'rgba(0,0,0,.04)');
  grad.addColorStop(1, 'rgba(0,0,0,.14)');
  x.fillStyle = grad;
  x.fillRect(0, 0, W, H);

  const ink = mixTo(f.c, '#1c1a1f', .78);
  const mono = (sz, w = '400') => `${w} ${sz}px 'DM Mono'`;
  const disp = sz => `400 ${sz}px 'Archivo Black'`;

  x.fillStyle = ink;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = disp(W * .085);
  x.fillText('STRIDE', W / 2, H * .15);
  x.font = mono(W * .042, '500');
  x.fillText(f.n + ' · 50 G', W / 2, H * .185);

  // nutrition panel
  const px0 = W * .15, px1 = W * .85, py0 = H * .215, py1 = H * .575;
  x.fillStyle = 'rgba(255,255,255,.92)';
  roundRect(x, px0, py0, px1 - px0, py1 - py0, W * .03);
  x.fill();

  const lx = px0 + W * .035, rx = px1 - W * .035;
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  x.fillStyle = ink;
  x.font = disp(W * .058);
  x.fillText('NUTRITION', lx, py0 + H * .042);
  x.font = mono(W * .032);
  x.fillText('Serving size 1 bar (50 g)', lx, py0 + H * .074);
  x.fillRect(lx, py0 + H * .085, rx - lx, Math.max(1, H * .0016));

  const rows = [['Calories', '210'], ['Protein', '12 g'], ['Total fat', '9 g'], ['Carbohydrate', '22 g'], ['Fibre', '6 g'], ['Sugars', '8 g'], ['Salt', '0.2 g']];
  let ry = py0 + H * .108;
  rows.forEach((r, i) => {
    x.font = mono(W * .030, i < 2 ? '500' : '400');
    x.textAlign = 'left'; x.fillText(r[0], lx, ry);
    x.textAlign = 'right'; x.fillText(r[1], rx, ry);
    x.fillRect(lx, ry + H * .0075, rx - lx, Math.max(1, H * .0008));
    ry += H * .034;
  });

  // ingredients
  x.textAlign = 'left';
  x.font = mono(W * .034, '500');
  x.fillText('INGREDIENTS', W * .15, H * .62);
  x.font = mono(W * .034);
  wrapText(x, f.ing, W * .15, H * .62 + H * .026, W * .70, H * .023);

  // barcode
  const bcW = W * .44, bcH = H * .075, bcX = (W - bcW) / 2, bcY = H * .735;
  x.fillStyle = 'rgba(255,255,255,.95)';
  roundRect(x, bcX, bcY, bcW, bcH, W * .014);
  x.fill();
  let seed = 7 + f.bit * 13;
  const rr = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  let bxx = bcX + W * .028;
  const bTop = bcY + bcH * .12, bBot = bcY + bcH * .64;
  while (bxx < bcX + bcW - W * .028) {
    const w = W * (.003 + rr() * .011);
    x.fillStyle = ink;
    x.fillRect(bxx, bTop, w, bBot - bTop);
    bxx += w + W * (.004 + rr() * .010);
  }
  x.fillStyle = ink;
  x.font = mono(W * .021);
  x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.fillText('8 12345 67890 2', bcX + bcW / 2, bcY + bcH * .86);

  x.font = mono(W * .036, '500');
  x.textBaseline = 'middle';
  x.fillText('PRESSED, NOT BAKED', W / 2, H * .885);

  return c;
}

function buildTextures() {
  FLAVORS.forEach((f, i) => {
    const ft = new THREE.CanvasTexture(makeFrontCanvas(f));
    ft.colorSpace = THREE.SRGBColorSpace; ft.anisotropy = 8;
    const bt = new THREE.CanvasTexture(makeBackCanvas(f));
    bt.colorSpace = THREE.SRGBColorSpace; bt.anisotropy = 8;
    TEX_FRONT.push(ft); TEX_BACK.push(bt);
  });
}

/* ---------------------------------------------------------------- hero state */
const SLOTS = [[0, 0, 430, 0, 0], [245, 24, 330, 4, 16], [452, 44, 312, 8, 26], [660, 80, 296, 12, 34], [860, 118, 280, 15, 40]];
let pos = -2.6, targetIdx = 1, cur = 1, posTween = null;
let step = -1, angle = 0, flip = null;
let p1 = 0, p3 = 0, q = 0;
let B = null, C = null;
let pokeT0 = -9999;
let heroRatio = 1;

function slotAt(k) {
  const a = Math.min(Math.abs(k), 4);
  const i = Math.min(3, Math.floor(a)), t = a - i;
  const A = SLOTS[i], Bv = SLOTS[i + 1];
  return {
    dx: lerp(A[0], Bv[0], t), dy: lerp(A[1], Bv[1], t), h: lerp(A[2], Bv[2], t),
    rz: lerp(A[3], Bv[3], t), ry: lerp(A[4], Bv[4], t)
  };
}
function heroState(j) {
  const k = j - pos, a = Math.min(Math.abs(k), 4);
  const s = slotAt(k);
  const sgn = k < 0 ? -1 : 1;
  let x = cx + sgn * s.dx * u * (isPhone ? 1.02 : 1);
  let y = cy + s.dy * u;
  let rz = sgn * s.rz, ry = sgn * s.ry;
  if (!RM) {
    const b = Math.sin(now / 4600 * Math.PI * 2 + 1.37 * j);
    y -= (.5 * b + .5) * 9 * u;
    rz += .4 * b;
  }
  return {
    x, y, h: s.h * u, rz, ry, rx: 0,
    z: -a * 34 * u,
    op: a <= 3.3 ? 1 : clamp((3.9 - a) / .6),
    sx: 1, sy: 1, shadow: 1
  };
}

/* -------------------------------------------------------------------- title */
const mctx = document.createElement('canvas').getContext('2d');
function measureName(txt) {
  mctx.font = "400 100px 'Archivo Black'";
  return mctx.measureText(txt).width || 1;
}
function titleHTML(name) {
  return name.split(' ').map(w =>
    `<span class="wd">${[...w].map(ch => `<span class="lt">${ch}</span>`).join('')}</span>`
  ).join(' ');
}
function sizeTitle() {
  if (!titleEl.textContent) return;
  const name = FLAVORS[cur].n;
  if (isPhone) {
    const longest = name.split(' ').reduce((a, b) => measureName(a) > measureName(b) ? a : b);
    const w = measureName(longest);
    const s = Math.min(Math.min(64, Math.max(40, vw * .125)), (vw - 36) * 100 / w);
    titleEl.style.fontSize = s + 'px';
  } else {
    const w = measureName(name);
    const s = Math.min(96 * u, 760 * u * 100 / w);
    titleEl.style.fontSize = s + 'px';
  }
}
function setTitleNow(fi) {
  titleEl.innerHTML = titleHTML(FLAVORS[fi].n);
  sizeTitle();
}
function swapTitle(fi, dir) {
  const old = $$('.lt', titleEl);
  const out = dir < 0 ? '110%' : '-110%';
  old.forEach((el, i) => {
    el.style.transition = `transform .3s cubic-bezier(.45,0,.75,.3) ${i * 11}ms, opacity .3s cubic-bezier(.45,0,.75,.3) ${i * 11}ms`;
    el.style.transform = `translateY(${out})`;
    el.style.opacity = '0';
  });
  const wait = 300 + old.length * 11;
  setTimeout(() => {
    titleEl.innerHTML = titleHTML(FLAVORS[fi].n);
    sizeTitle();
    const nw = $$('.lt', titleEl);
    const from = dir < 0 ? '-110%' : '110%';
    nw.forEach(el => {
      el.style.transition = 'none';
      el.style.transform = `translateY(${from})`;
      el.style.opacity = '0';
    });
    requestAnimationFrame(() => {
      nw.forEach((el, i) => {
        el.style.transition = `transform .62s cubic-bezier(.22,1,.36,1) ${120 + i * 22}ms, opacity .62s cubic-bezier(.22,1,.36,1) ${120 + i * 22}ms`;
        el.style.transform = 'translateY(0)';
        el.style.opacity = '1';
      });
    });
  }, wait);
}
function swapCount(fi, dir) {
  countEl.style.transition = 'translate .22s cubic-bezier(.5,0,.75,0), opacity .22s cubic-bezier(.5,0,.75,0)';
  countEl.style.translate = `0 ${dir < 0 ? 10 : -10}px`;
  countEl.style.opacity = '0';
  setTimeout(() => {
    countEl.textContent = String(fi + 1).padStart(2, '0');
    countEl.style.transition = 'none';
    countEl.style.translate = `0 ${dir < 0 ? -14 : 14}px`;
    countEl.style.opacity = '0';
    void countEl.offsetWidth;
    countEl.style.transition = 'translate .38s cubic-bezier(.22,1,.36,1), opacity .38s cubic-bezier(.22,1,.36,1)';
    countEl.style.translate = '0 0';
    countEl.style.opacity = '1';
  }, 280);
}

/* ------------------------------------------------------------------ reveal */
let rvT0 = -1, rvColor = null, rvR = 0, rvCX = 0, rvCY = 0;
function startReveal(fi) {
  if (RM) { docEl.style.setProperty('--flav', FLAVORS[fi].c); return; }
  finishReveal();
  rvColor = FLAVORS[fi].c;
  rvCX = cx; rvCY = cy;
  rvR = 1.45 * Math.max(
    Math.hypot(rvCX, rvCY), Math.hypot(vw - rvCX, rvCY),
    Math.hypot(rvCX, heroH - rvCY), Math.hypot(vw - rvCX, heroH - rvCY)
  );
  revealEl.style.setProperty('--rv', rvColor);
  revealEl.style.clipPath = 'circle(150% at 50% 50%)';
  rvT0 = performance.now();
}
function finishReveal() {
  if (rvT0 < 0) return;
  docEl.style.setProperty('--flav', rvColor);
  revealEl.style.setProperty('--rv', 'transparent');
  revealEl.style.maskImage = 'none';
  revealEl.style.webkitMaskImage = 'none';
  revealEl.style.clipPath = 'circle(0 at 50% 50%)';
  rvT0 = -1;
}
function updateReveal() {
  if (rvT0 < 0) return;
  const t = clamp((now - rvT0) / 420);
  const e = GLIDE(t);
  const r = rvR * e;
  const f = Math.max(60, .35 * r);
  const mask = `radial-gradient(circle at ${rvCX}px ${rvCY}px, #000 ${Math.max(0, r - f)}px, transparent ${r}px)`;
  revealEl.style.maskImage = mask;
  revealEl.style.webkitMaskImage = mask;
  if (t >= 1) finishReveal();
}

/* -------------------------------------------------------------- flavour swap */
function setFlavour(fi, dir = 1) {
  if (fi === cur) return;
  cur = fi;
  startReveal(fi);
  swapTitle(fi, dir);
  swapCount(fi, dir);
  updateLive();
  if (step === 3) softSwap(inHead, headHTML(3));
  setGlow(fi);
  updateStormBits();
  resetAuto();
}
function updateLive() {
  cardEls.forEach((c, i) => c.classList.toggle('live', i === cur));
}
function goTo(to, dur, ease) {
  const from = pos;
  targetIdx = Math.round(to);
  const d = dur != null ? dur : 650 + 160 * Math.max(0, Math.abs(targetIdx - from) - 1);
  if (RM) {
    pos = targetIdx;
    posTween = null;
    const fi = mod(targetIdx, 5);
    if (fi !== cur) setFlavour(fi, Math.sign(targetIdx - from) || 1);
    return;
  }
  posTween = { from, to: targetIdx, t0: performance.now(), dur: d, ease: ease || GLIDE, fired: false };
}

/* -------------------------------------------------------------- section two */
const STEP_HEADS = ['REAL FOOD,<br>FIRST', 'PRESSED,<br>NOT BAKED', 'WRAPPED<br>SAME DAY', null];
const STEP_CAPS = ['Oats, nuts, fruit.<br>Nothing you can\'t say.', 'Real ingredients.<br>Clean energy.', 'Cold-pressed at dawn.<br>Sealed by noon.', '12g plant protein.<br>No crash.'];
const STEP_ANGLE = [0, 180, 360, 720];
const iconEls = $$('.in-ico');
let stepFadeTimer = null;

function headHTML(st) {
  if (st !== 3) return STEP_HEADS[st];
  return FLAVORS[cur].n.split(' ').map(w =>
    w.length > 9 ? `<span style="font-size:.72em;display:inline-block;line-height:1.02">${w}</span>` : w
  ).join('<br>');
}
function softSwap(el, html) {
  if (RM) { el.innerHTML = html; return; }
  el.style.transition = 'transform .24s ease, opacity .24s ease';
  el.style.transform = 'translateY(-10px)';
  el.style.opacity = '0';
  clearTimeout(el._swap);
  el._swap = setTimeout(() => {
    el.innerHTML = html;
    el.style.transition = 'none';
    el.style.transform = 'translateY(14px)';
    el.style.opacity = '0';
    void el.offsetWidth;
    el.style.transition = 'transform .46s cubic-bezier(.22,1,.36,1), opacity .46s cubic-bezier(.22,1,.36,1)';
    el.style.transform = 'translateY(0)';
    el.style.opacity = '1';
  }, 280);
}
function applyStepText() {
  softSwap(inHead, headHTML(step));
  softSwap(inNum, '0' + (step + 1));
  softSwap(inCap, STEP_CAPS[step]);
  iconEls.forEach((b, i) => b.classList.toggle('on', i === step));
}
function onStep(st) {
  const to = STEP_ANGLE[st];
  const half = clamp(Math.abs(to - angle) / 180, .4, 2);
  flip = { from: angle, to, t0: performance.now(), dur: half * 720, fired: false };
  if (RM) {
    angle = to; flip = null; applyStepText();
    return;
  }
  setTimeout(() => { if (step === st) applyStepText(); }, Math.min(720, half * 720) * .38);
}
iconEls.forEach((b, i) => {
  b.addEventListener('click', () => {
    const r = insideEl.getBoundingClientRect();
    const top = r.top + scrollY;
    const y = top + (i * .19 + .095) * (r.height - vh);
    gliding = false;
    targetY = y;
    window.scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
  });
});

/* ------------------------------------------------------------------- storm */
let seed = 20261116;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const PIECES = Array.from({ length: 20 }, (_, i) => ({
  el: null,
  useSel: i < 14,
  bit: Math.floor(rnd() * 5),
  a: rnd() * Math.PI * 2,
  ph: i / 20 + rnd() * .03,
  spin: (rnd() < .5 ? -1 : 1) * 360,
  size: .7 + rnd() * .6,
}));
PIECES.forEach(p => {
  const el = document.createElement('div');
  el.className = 'piece';
  stormEl.appendChild(el);
  p.el = el;
  setCrop(el, BITS[p.useSel ? FLAVORS[1].bit : p.bit]);
});
function updateStormBits() {
  PIECES.forEach(p => setCrop(p.el, BITS[p.useSel ? FLAVORS[cur].bit : p.bit]));
}
function layoutStorm() {
  const base = .085 * Math.min(vw, vh);
  PIECES.forEach(p => {
    p.el.style.width = base + 'px';
    p.el.style.height = base + 'px';
  });
}
function updateStorm() {
  const on = !RM && q > 0 && q < 1;
  stormEl.style.display = on ? 'block' : 'none';
  if (!on) return;
  const R = .55 * Math.hypot(vw, vh);
  PIECES.forEach(p => {
    const s = clamp((q - .45 * p.ph) / .55);
    if (s <= 0 || s >= 1) { p.el.style.opacity = '0'; return; }
    const rad = (.06 + Math.pow(s, 1.5) * .95) * R;
    const x = vw / 2 + Math.cos(p.a) * rad;
    const y = vh / 2 + Math.sin(p.a) * rad * .8;
    const sc = (.2 + 1.7 * s) * p.size;
    const op = Math.sin(Math.PI * s) * clamp(5 * q) * clamp(6 * (1 - q));
    p.el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) rotate(${p.spin * s}deg) scale(${sc})`;
    p.el.style.opacity = op;
  });
}

/* ------------------------------------------------------------------- frame */
let last = performance.now();
let gliding = false, targetY = scrollY, curY = scrollY;
let autoOn = !RM, autoT = 0;
let entered = false;

function updateHero(now) {
  if (posTween) {
    const t = clamp((now - posTween.t0) / posTween.dur);
    pos = lerp(posTween.from, posTween.to, posTween.ease(t));
    if (!posTween.fired && now - posTween.t0 >= posTween.dur * .12) {
      posTween.fired = true;
      const fi = mod(Math.round(posTween.to), 5);
      if (fi !== cur) setFlavour(fi, Math.sign(posTween.to - posTween.from) || 1);
    }
    if (t >= 1) { pos = posTween.to; posTween = null; }
  }

  if (!ready) return;

  const start = Math.floor(pos) - 5;
  const jT = Math.round(targetIdx);
  const fade = 1 - clamp(1.6 * p1);
  for (let i = 0; i < 11; i++) {
    const j = start + i;
    const bar = pool[i];
    if (j === jT) { bar.g.visible = false; bar.sh.visible = false; continue; }
    const fi = mod(j, 5);
    if (bar.fl !== fi) {
      bar.fm.map = TEX_FRONT[fi]; bar.bm.map = TEX_BACK[fi];
      bar.fm.needsUpdate = bar.bm.needsUpdate = true;
      bar.fl = fi;
    }
    const s = heroState(j);
    s.op *= fade;
    place(bar, s);
  }

  // traveller
  let S = heroState(jT);
  if (p1 > 0) S = mixState(S, B, easeInOut(p1));
  if (p3 > 0) S = mixState(B, C, easeInOut(p3));

  const pt = (now - pokeT0) / 500;
  if (pt >= 0 && pt < 1) {
    let sx = 1, sy = 1;
    if (pt < .3) { const t = pt / .3; sx = lerp(1, 1.06, t); sy = lerp(1, .93, t); }
    else if (pt < .6) { const t = (pt - .3) / .3; sx = lerp(1.06, .97, t); sy = lerp(.93, 1.04, t); }
    else { const t = (pt - .6) / .4; sx = lerp(.97, 1, t); sy = lerp(1.04, 1, t); }
    S.sx = sx; S.sy = sy;
  }
  const tfi = mod(jT, 5);
  if (traveller.fl !== tfi) {
    traveller.fm.map = TEX_FRONT[tfi]; traveller.bm.map = TEX_BACK[tfi];
    traveller.fm.needsUpdate = traveller.bm.needsUpdate = true;
    traveller.fl = tfi;
  }
  place(traveller, S);
}
function mixState(a, b, t) {
  return {
    x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), h: lerp(a.h, b.h, t),
    rz: lerp(a.rz, b.rz, t), ry: lerp(a.ry, b.ry, t), rx: lerp(a.rx, b.rx, t),
    z: lerp(a.z, b.z, t), op: lerp(a.op, b.op, t),
    sx: lerp(a.sx, b.sx, t), sy: lerp(a.sy, b.sy, t), shadow: lerp(a.shadow, b.shadow, t),
  };
}

function updateInside(now) {
  const r = insideEl.getBoundingClientRect();
  const total = Math.max(1, r.height - vh);
  const p = clamp(-r.top / total);
  const st = Math.min(3, Math.floor(Math.min(p, .759) / .19));
  if (st !== step) { step = st; onStep(st); }

  if (flip && !RM) {
    const t = clamp((now - flip.t0) / flip.dur);
    angle = lerp(flip.from, flip.to, easeSine(t));
    if (t >= 1) { angle = flip.to; flip = null; }
  }

  q = clamp((p - .76) / .24);
  p1 = clamp(1 - r.top / vh);
  const sr = shopEl.getBoundingClientRect();
  p3 = clamp((vh - sr.top) / (.7 * vh));

  const br = inBar.getBoundingClientRect();
  const bob = RM ? 0 : Math.sin(now / 2600 * Math.PI * 2) * 6;
  B = {
    x: br.left + br.width / 2, y: br.top + br.height / 2 + bob, h: br.height,
    rz: 14, ry: angle + (RM ? 0 : 720 * q), rx: 0, z: 0, op: 1, sx: 1, sy: 1, shadow: 1
  };

  const pk = $('.pk', cardEls[cur]).getBoundingClientRect();
  const tl = tilts[cur];
  C = {
    x: pk.left + pk.width / 2, y: pk.top + pk.height / 2, h: pk.height,
    rz: 0, ry: Math.round(B.ry / 360) * 360 + tl.x * 14, rx: -tl.y * 14,
    z: 30, op: 1, sx: 1, sy: 1, shadow: .7
  };

  let pinY = 0;
  if (r.top > 0) pinY = r.top;
  else if (r.bottom < vh) pinY = r.bottom - vh;
  inFront.style.transform = `translateY(${pinY}px)`;
  inFront.style.visibility = (r.bottom > 0 && r.top < vh) ? 'visible' : 'hidden';

  inDark.style.opacity = clamp(3.5 * q) * .42;
  const frontOp = 1 - clamp(4 * q);
  const frame = $('.frame', inFront);
  frame.style.opacity = frontOp;
  numWrap.style.opacity = frontOp;

  if (p3 > 0 && isPhone && !phoneCentred) {
    phoneCentred = true;
    cardEls[cur].scrollIntoView({ inline: 'center', block: 'nearest', behavior: RM ? 'auto' : 'smooth' });
  }
}
let phoneCentred = false;

function frame(nowMs) {
  requestAnimationFrame(frame);
  now = nowMs;
  const dt = Math.min(64, now - last);
  last = now;

  if (gliding && !RM) {
    curY += (targetY - curY) * (1 - Math.exp(-dt / 120));
    if (Math.abs(targetY - curY) < .5) { curY = targetY; gliding = false; }
    window.scrollTo(0, curY);
  }

  updateInside(now);
  updateHero(now);
  updateReveal();
  updateStorm();

  if (ready) renderer.render(scene, camera);

  if (autoOn && entered && !document.hidden && heroRatio >= .6 && !(drag && drag.active) && !posTween) {
    autoT += dt;
    if (autoT >= 3200) { autoT = 0; goTo(targetIdx + 1); }
  }
}

/* -------------------------------------------------------------------- intro */
let vidStarted = false, logoShown = false;
function startVid() {
  if (vidStarted || logoShown) return;
  vidStarted = true;
  try { vidEl.currentTime = .55; } catch (e) { }
  vidEl.play().catch(() => { });
  setTimeout(showLogo, 4600);
}
function showLogo() {
  if (logoShown || entered) return;
  logoShown = true;
  try { vidEl.pause(); } catch (e) { }
  introEl.classList.add('cream');
  stampEl.classList.add('on');
  setTimeout(enterHero, 650);
}
function enterHero() {
  if (entered) return;
  entered = true;
  introEl.classList.add('gone');
  document.body.classList.remove('locked');
  navEl.classList.add('in');
  ringsEl.classList.add('in');
  heroEl.classList.add('go');
  playEl.style.transitionDelay = '.5s';
  countEl.style.transitionDelay = '.62s';
  autoEl.style.transitionDelay = '.74s';
  playEl.style.opacity = '1';
  autoEl.style.opacity = '1';
  countEl.style.opacity = '1';
  pos = -2.6;
  goTo(1, 1700, ENTRANCE);
  startBits();
  resetAuto();
  setTimeout(() => { playEl.style.transitionDelay = ''; countEl.style.transitionDelay = ''; autoEl.style.transitionDelay = ''; }, 1600);
}
skipEl.addEventListener('click', enterHero);

function resetAuto() { autoT = 0; }

/* -------------------------------------------------------------------- input */
let drag = null;
arcEl.addEventListener('pointerdown', e => {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  drag = {
    x0: e.clientX, pos0: pos, active: false, v: 0,
    lastX: e.clientX, lastT: performance.now(), id: e.pointerId
  };
  resetAuto();
});
addEventListener('pointermove', e => {
  if (drag) {
    const dx = e.clientX - drag.x0;
    if (!drag.active) {
      if (Math.abs(dx) <= 6) return;
      drag.active = true;
      posTween = null;
      try { arcEl.setPointerCapture(e.pointerId); } catch (err) { }
      document.body.classList.add('dragging');
    }
    const slotPx = 245 * u * (isPhone ? 1.02 : 1);
    pos = drag.pos0 - dx / slotPx;
    const t = performance.now();
    const dt = Math.max(1, t - drag.lastT);
    const v = (-(e.clientX - drag.lastX) / slotPx) / dt;
    drag.v = lerp(drag.v, v, .4);
    drag.lastX = e.clientX; drag.lastT = t;
    return;
  }
  if (FINE && entered && e.clientY < heroH) {
    const hit = pickBar(e.clientX, e.clientY);
    arcEl.style.cursor = hit ? 'pointer' : 'grab';
  }
});
function endDrag(e, cancelled) {
  if (!drag) return;
  const d = drag;
  drag = null;
  document.body.classList.remove('dragging');
  if (!d.active) {
    if (!cancelled) tapAt(e.clientX, e.clientY);
    return;
  }
  const near = Math.abs(pos - Math.round(pos)) < .02;
  if (cancelled && near) return;
  const to = Math.round(pos + clamp(d.v * 220, -2, 2));
  goTo(to, Math.max(380, 650 * Math.min(1, Math.abs(to - pos) + .35)));
}
addEventListener('pointerup', e => endDrag(e, false));
addEventListener('pointercancel', e => endDrag(e, true));

const raycaster = new THREE.Raycaster();
function pickBar(x, y) {
  if (!ready) return null;
  const ndc = new THREE.Vector2((x / vw) * 2 - 1, -(y / vh) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const objs = [];
  pool.forEach(b => { if (b.g.visible) objs.push(b.front, b.back); });
  if (traveller.g.visible) objs.push(traveller.front, traveller.back);
  const hits = raycaster.intersectObjects(objs, false);
  if (!hits.length) return null;
  const mesh = hits[0].object;
  const bar = pool.find(b => b.front === mesh || b.back === mesh);
  if (bar) return { j: Math.floor(pos) - 5 + pool.indexOf(bar), bar };
  if (traveller.front === mesh || traveller.back === mesh) return { j: Math.round(targetIdx), bar: traveller };
  return null;
}
function tapAt(x, y) {
  const hit = pickBar(x, y);
  if (!hit) return;
  const k = Math.round(hit.j - pos);
  if (k !== 0) goTo(targetIdx + k);
}
playEl.addEventListener('click', () => { resetAuto(); goTo(targetIdx + 1); });
autoEl.addEventListener('click', () => {
  autoOn = !autoOn;
  autoEl.setAttribute('aria-pressed', String(autoOn));
  autoGlyph.innerHTML = autoOn
    ? '<span class="bar"></span><span class="bar"></span>'
    : '<span class="tri"></span>';
  resetAuto();
});
function autoGlyphSet() {
  autoGlyph.innerHTML = autoOn
    ? '<span class="bar"></span><span class="bar"></span>'
    : '<span class="tri"></span>';
  autoEl.setAttribute('aria-pressed', String(autoOn));
}
addEventListener('keydown', e => {
  gliding = false; targetY = scrollY; curY = scrollY;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    if (heroRatio >= .5) {
      e.preventDefault();
      resetAuto();
      goTo(targetIdx + (e.key === 'ArrowRight' ? 1 : -1));
    }
  }
});

/* ------------------------------------------------------------------ scrolling */
const isTouch = matchMedia('(pointer: coarse)').matches;
function maxScroll() { return Math.max(0, docEl.scrollHeight - vh); }
addEventListener('wheel', e => {
  if (RM || isTouch || !entered || document.body.classList.contains('locked')) return;
  if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  const strip = e.target.closest && e.target.closest('.cards');
  if (strip && strip.scrollWidth > strip.clientWidth) return;
  e.preventDefault();
  targetY = clamp(targetY + e.deltaY, 0, maxScroll());
  gliding = true;
}, { passive: false });
addEventListener('scroll', () => {
  if (!gliding) { curY = targetY = scrollY; }
}, { passive: true });

/* ---------------------------------------------------------------- observers */
new IntersectionObserver(entries => {
  entries.forEach(en => { heroRatio = en.intersectionRatio; });
}, { threshold: [0, .5, .6, .8, 1] }).observe(heroEl);

new IntersectionObserver((entries, obs) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      shopEl.classList.add('in');
      cardEls.forEach((c, i) => setTimeout(() => c.classList.add('in'), 120 + i * 80));
      obs.disconnect();
    }
  });
}, { threshold: .18 }).observe(shopEl);

let packFilled = false;
new IntersectionObserver((entries, obs) => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    rangeEl.classList.add('in');
    if (!packFilled) {
      packFilled = true;
      setTimeout(() => { if (!touched) setSlot(0, cur); }, 250);
      setTimeout(() => { if (!touched) setSlot(1, mod(cur + 1, 5)); }, 410);
      setTimeout(() => { if (!touched) setSlot(2, mod(cur + 2, 5)); }, 570);
    }
    obs.disconnect();
  });
}, { threshold: .3 }).observe(rangeEl);

const secs = [heroEl, insideEl, shopEl, rangeEl];
function navUpdate() {
  const y = vh * .35;
  let idx = 0;
  secs.forEach((s, i) => { if (s.getBoundingClientRect().top <= y) idx = i; });
  navLinks.forEach((a, i) => a.classList.toggle('on', i === idx));
  const a = navLinks[idx];
  if (a && a.offsetWidth) {
    navHl.style.opacity = '1';
    navHl.style.left = a.offsetLeft + 'px';
    navHl.style.width = a.offsetWidth + 'px';
  }
  // theme follows what is actually behind the bar, not the section at 35% vh
  let tIdx = 0;
  const band = navEl.offsetHeight * .5;
  secs.forEach((s, i) => { if (s.getBoundingClientRect().top <= band) tIdx = i; });
  navEl.classList.toggle('light', tIdx === 2);
  navEl.classList.toggle('dark', tIdx === 3);
}
navLinks.forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const sec = $(a.getAttribute('href'));
    const y = sec.getBoundingClientRect().top + scrollY;
    gliding = false;
    targetY = y;
    window.scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
  });
});
setInterval(navUpdate, 120);

/* -------------------------------------------------------------------- resize */
function resize() {
  measure();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isPhone ? 1.75 : 2));
  renderer.setSize(vw, vh, false);
  canvas.style.width = '100vw';
  canvas.style.height = vh + 'px';

  const D = clamp(1500 * Math.min(vw / 1440, vh / 900), 1000, 2200);
  camera.aspect = vw / vh;
  camera.fov = 2 * Math.atan((vh / 2) / D) * 180 / Math.PI;
  camera.position.set(0, 0, D);
  camera.near = 10;
  camera.far = 4 * D;
  camera.updateProjectionMatrix();

  targetY = clamp(targetY, 0, maxScroll());
  curY = scrollY;
  sizeTitle();
}
addEventListener('resize', resize);

/* --------------------------------------------------------------------- boot */
async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load('400 100px "Archivo Black"'),
      document.fonts.load('400 40px "DM Mono"'),
      document.fonts.load('500 40px "DM Mono"'),
      document.fonts.load('700 40px "Inter"'),
    ]);
    await document.fonts.ready;
  } catch (e) { }
}
function loadSheet() {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { sheetImg = img; res(); };
    img.onerror = rej;
    img.src = SHEET;
  });
}

async function boot() {
  measure();
  resize();
  setTitleNow(1);
  autoGlyphSet();
  updateLive();
  updateThumbs();
  updateBuy();
  requestAnimationFrame(frame);

  await loadFonts();
  try { await loadSheet(); } catch (e) { console.warn('sheet failed', e); }
  if (sheetImg) {
    buildTextures();
    ready = true;
    document.body.classList.add('gl');
  }
  updateLive();
  sizeTitle();

  if (RM) {
    introEl.classList.add('gone');
    document.body.classList.remove('locked');
    navEl.classList.add('in');
    ringsEl.classList.add('in');
    heroEl.classList.add('go');
    playEl.style.opacity = '1'; autoEl.style.opacity = '1'; countEl.style.opacity = '1';
    entered = true;
    pos = 1; targetIdx = 1;
    startBits();
  } else {
    vidEl.addEventListener('ended', showLogo);
    vidEl.addEventListener('error', showLogo);
    if (vidEl.readyState >= 3) startVid();
    else vidEl.addEventListener('canplay', startVid, { once: true });
    setTimeout(() => { if (!vidStarted) showLogo(); }, 3500);
    setTimeout(enterHero, 9000);
  }
  navUpdate();
}
boot();
