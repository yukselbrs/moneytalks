/**
 * Landing v2 hareket katmani — TEK requestAnimationFrame dongusu.
 *
 * Uc canvas (ortam isigi, hero arazisi, kapanis CTA dalgalari) ve manyetik
 * butonlar ayni dongude surulur. Kayit modul seviyesinde tutulur cunku:
 *
 *   1. Canvas'lar DOM'un farkli yerlerinde (ambient fixed, terrain hero icinde,
 *      cta kapanis kartinda) — tek bilesenden render edilemezler.
 *   2. Donguden ASLA state'e yazilmaz. Yazilsaydi her kare tum agac yeniden
 *      render olurdu; handoff'un "Render kararliligi" notu bunu ozellikle
 *      yasakliyor (prototipte skor halkasini 0'da dondurmustu).
 */

export type CanvasTuru = "ambient" | "terrain" | "cta";

type Olcu = { w: number; h: number; dpr: number };
type ManyetikKayit = { el: HTMLElement; x: number; y: number };

const canvaslar = new Map<CanvasTuru, HTMLCanvasElement>();
const manyetikler = new Set<ManyetikKayit>();
const olculer = new WeakMap<HTMLCanvasElement, Olcu>();

/** Imlec — piksel (px/py) ve oransal (x/y) konum. Dongu bunu okur, state yok. */
export const isaretci = { x: 0.5, y: 0.4, px: -9999, py: -9999 };

export function hareketAzaltilmis(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function canvasKaydet(tur: CanvasTuru, el: HTMLCanvasElement): () => void {
  canvaslar.set(tur, el);
  return () => {
    if (canvaslar.get(tur) === el) canvaslar.delete(tur);
  };
}

export function manyetikKaydet(el: HTMLElement): () => void {
  const kayit: ManyetikKayit = { el, x: 0, y: 0 };
  manyetikler.add(kayit);
  return () => {
    manyetikler.delete(kayit);
    el.style.transform = "";
  };
}

/** DPR'a gore olcekle; boyut degismediyse dokunma (setTransform pahali). */
function olc(c: HTMLCanvasElement): { w: number; h: number; ctx: CanvasRenderingContext2D } | null {
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = c.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width));
  const h = Math.max(1, Math.round(r.height));
  const onceki = olculer.get(c);
  if (!onceki || onceki.w !== w || onceki.h !== h || onceki.dpr !== dpr) {
    c.width = w * dpr;
    c.height = h * dpr;
    olculer.set(c, { w, h, dpr });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return { w, h, ctx };
}

/** Dort Gauss tepesi + iki sinus gurultusu — arazinin sirt profili. */
function sirtYuksekligi(u: number, t: number): number {
  const g = (c: number, w: number, a: number) => a * Math.exp(-Math.pow((u - c) / w, 2));
  let h = g(0.11, 0.14, 1.0) + g(0.89, 0.14, 0.95) + g(0.71, 0.055, 0.3) + g(0.32, 0.05, 0.16);
  h += 0.05 * Math.sin(u * 16 + t * 0.5) + 0.03 * Math.sin(u * 27 - t * 0.35);
  return h;
}

function araziCiz(c: HTMLCanvasElement, zaman: number, durgun: boolean) {
  const olcum = olc(c);
  if (!olcum) return;
  const { w, h, ctx } = olcum;
  ctx.clearRect(0, 0, w, h);

  const t = durgun ? 0 : zaman / 1000;
  const satir = 62;
  const ufuk = h * 0.3;
  const kayma = durgun ? 0 : (t * 0.05) % 1;
  const egim = (isaretci.x - 0.5) * 0.05;

  for (let i = 0; i < satir; i++) {
    const k = (i + kayma) / satir;
    const derinlik = Math.pow(k, 2.4);
    const y0 = ufuk + derinlik * (h - ufuk);
    const uzak = Math.pow(1 - derinlik, 0.75);
    // Son carpan ufka dogru yumusak sonum saglar; olmazsa ustte sert bir dikis olusur.
    const alfa = (0.045 + Math.pow(k, 1.4) * 0.26) * Math.min(1, k / 0.2);
    ctx.beginPath();
    for (let x = -24; x <= w + 24; x += 8) {
      const u = x / w + egim * uzak;
      const y = y0 - sirtYuksekligi(u, t + i * 0.02) * h * 0.5 * uzak;
      if (x === -24) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(96,165,250,${alfa.toFixed(3)})`;
    ctx.lineWidth = 0.55 + derinlik;
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(147,197,253,0.10)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    const x = w * (0.08 + i * 0.14);
    const faz = (t * 0.25 + i * 0.31) % 1;
    const boy = h * 0.13;
    const yUst = h * 0.28 - boy + faz * (h * 0.42 + boy);
    ctx.globalAlpha = 0.55 * Math.sin(Math.PI * faz);
    ctx.beginPath();
    ctx.moveTo(x, yUst);
    ctx.lineTo(x, yUst + boy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Huzmenin dustugu yerdeki isik havuzu
  const g = ctx.createRadialGradient(w / 2, h * 0.66, 0, w / 2, h * 0.66, Math.max(w, h) * 0.34);
  g.addColorStop(0, "rgba(147,197,253,0.16)");
  g.addColorStop(1, "rgba(147,197,253,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

const KUTLELER = [
  { x: 0.18, y: 0.24, r: 0.52, a: 0.075, sx: 0.031, sy: 0.019, px: 0.9, py: 2.1 },
  { x: 0.82, y: 0.36, r: 0.46, a: 0.062, sx: 0.024, sy: 0.027, px: 3.4, py: 0.6 },
  { x: 0.52, y: 0.78, r: 0.58, a: 0.05, sx: 0.017, sy: 0.022, px: 1.8, py: 4.2 },
  { x: 0.3, y: 0.62, r: 0.34, a: 0.044, sx: 0.036, sy: 0.014, px: 5.1, py: 2.8 },
] as const;

function ortamCiz(c: HTMLCanvasElement, zaman: number, durgun: boolean) {
  const olcum = olc(c);
  if (!olcum) return;
  const { w, h, ctx } = olcum;
  ctx.clearRect(0, 0, w, h);

  const t = durgun ? 0 : zaman / 1000;
  const acikilik = Math.max(w, h);
  ctx.globalCompositeOperation = "lighter";

  KUTLELER.forEach((o, i) => {
    const cx = (o.x + Math.sin(t * o.sx + o.px) * 0.07) * w;
    const cy = (o.y + Math.cos(t * o.sy + o.py) * 0.06) * h;
    const yaricap = acikilik * o.r * (0.9 + 0.1 * Math.sin(t * 0.09 + i));
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, yaricap);
    const ton = i === 2 ? "129,140,248" : "59,130,246";
    g.addColorStop(0, `rgba(${ton},${o.a.toFixed(3)})`);
    g.addColorStop(0.55, `rgba(${ton},${(o.a * 0.28).toFixed(3)})`);
    g.addColorStop(1, `rgba(${ton},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, yaricap, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = "rgba(147,197,253,0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const x = Math.round(w * (0.12 + i * 0.19));
    const faz = (t * 0.045 + i * 0.23) % 1;
    const boy = h * 0.32;
    const yUst = -boy + faz * (h + boy);
    ctx.globalAlpha = Math.sin(Math.PI * faz);
    ctx.beginPath();
    ctx.moveTo(x, yUst);
    ctx.lineTo(x, yUst + boy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function ctaCiz(c: HTMLCanvasElement, zaman: number, durgun: boolean) {
  const olcum = olc(c);
  if (!olcum) return;
  const { w, h, ctx } = olcum;
  ctx.clearRect(0, 0, w, h);

  const t = durgun ? 0 : zaman / 1000;
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 12) {
      const y = h * (0.3 + i * 0.1) + Math.sin(x / 160 + t * (0.4 + i * 0.1) + i) * (10 + i * 4);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(59,130,246,${(0.1 + i * 0.02).toFixed(2)})`;
    ctx.stroke();
  }
}

function manyetikGuncelle() {
  manyetikler.forEach((m) => {
    const r = m.el.getBoundingClientRect();
    const dx = isaretci.px - (r.left + r.width / 2);
    const dy = isaretci.py - (r.top + r.height / 2);
    const uzaklik = Math.hypot(dx, dy);
    const cekim = uzaklik < 180 ? 1 - uzaklik / 180 : 0;
    m.x += (dx * 0.14 * cekim - m.x) * 0.12;
    m.y += (dy * 0.14 * cekim - m.y) * 0.12;
    m.el.style.transform = `translate3d(${m.x.toFixed(2)}px,${m.y.toFixed(2)}px,0)`;
  });
}

/** Tek kare — LandingHareket bilesenindeki dongu cagirir. */
export function kareCiz(zaman: number, durgun: boolean) {
  const ortam = canvaslar.get("ambient");
  if (ortam) ortamCiz(ortam, zaman, durgun);
  const arazi = canvaslar.get("terrain");
  if (arazi) araziCiz(arazi, zaman, durgun);
  const cta = canvaslar.get("cta");
  if (cta) ctaCiz(cta, zaman, durgun);
  if (!durgun) manyetikGuncelle();
}
