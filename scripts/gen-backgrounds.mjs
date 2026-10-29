// Genera los fondos incluidos (public/backgrounds/0N.jpg) pintando paisajes en un <canvas>
// con Playwright. Son originales, así que no hay licencias de terceros, y salen ya a 1920×1080
// en JPEG: la tele no tiene que redimensionar nada al decodificarlos.
// Para usar tus fotos, sustituye los JPG (mejor a 1920×1080, calidad ~80, < 400 KB).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'public/backgrounds';
mkdirSync(OUT, { recursive: true });

// Paletas: cielo (arriba → horizonte), brillo del sol y color de las crestas (lejos → cerca).
const SCENES = [
  { sky: ['#1b2a4a', '#6b4a6e', '#e08a5a'], sun: [0.68, 0.62, '#ffb070'], ridges: ['#5a4660', '#3b3048', '#241f30', '#14121c'], stars: false },
  { sky: ['#0a1022', '#1c2b4f', '#3e5a7e'], sun: [0.3, 0.5, '#9fc4ff'], ridges: ['#2e4260', '#1f2f48', '#142034', '#0a111e'], stars: true },
  { sky: ['#2b3a4a', '#7c8f9a', '#d8c7a8'], sun: [0.75, 0.66, '#fff1cf'], ridges: ['#6f7c84', '#4c5960', '#313c42', '#1a2226'], stars: false },
  { sky: ['#120c1e', '#3a1f3f', '#a2475a'], sun: [0.55, 0.7, '#ff7b6b'], ridges: ['#4b2a44', '#331d33', '#211424', '#120b15'], stars: true },
  { sky: ['#17322e', '#3f6a5c', '#b8c99a'], sun: [0.22, 0.6, '#f4f0c0'], ridges: ['#3d5c50', '#2a4339', '#1b2d26', '#0e1915'], stars: false },
  { sky: ['#05070d', '#0f1a2e', '#24395a'], sun: [0.8, 0.35, '#dfe8ff'], ridges: ['#1e2c44', '#152035', '#0d1626', '#070b14'], stars: true },
];

function paint({ scene, seed }) {
  // Este código se ejecuta dentro de la página.
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const W = 1920, H = 1080;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  document.body.style.margin = '0';
  document.body.appendChild(c);
  const g = c.getContext('2d');

  const sky = g.createLinearGradient(0, 0, 0, H * 0.75);
  sky.addColorStop(0, scene.sky[0]);
  sky.addColorStop(0.55, scene.sky[1]);
  sky.addColorStop(1, scene.sky[2]);
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  if (scene.stars) {
    for (let i = 0; i < 420; i++) {
      g.fillStyle = `rgba(255,255,255,${0.15 + rnd() * 0.6})`;
      const r = rnd() * 1.4 + 0.3;
      g.beginPath(); g.arc(rnd() * W, rnd() * H * 0.5, r, 0, Math.PI * 2); g.fill();
    }
  }

  const [sx, sy, sc] = scene.sun;
  const glow = g.createRadialGradient(sx * W, sy * H, 0, sx * W, sy * H, W * 0.45);
  glow.addColorStop(0, sc + 'cc');
  glow.addColorStop(0.15, sc + '55');
  glow.addColorStop(1, sc + '00');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  // Crestas por desplazamiento de punto medio; cada capa más cercana, más baja y más rugosa.
  scene.ridges.forEach((color, layer) => {
    const n = 257;
    const pts = new Array(n).fill(0);
    const base = H * (0.52 + layer * 0.09);
    let rough = 160 - layer * 18;
    pts[0] = rnd() * rough - rough / 2;
    pts[n - 1] = rnd() * rough - rough / 2;
    for (let step = n - 1; step > 1; step >>= 1) {
      for (let i = step >> 1; i < n; i += step) {
        pts[i] = (pts[i - (step >> 1)] + pts[i + (step >> 1)]) / 2 + (rnd() - 0.5) * rough;
      }
      rough *= 0.55;
    }
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, H);
    for (let i = 0; i < n; i++) g.lineTo((i / (n - 1)) * W, base + pts[i]);
    g.lineTo(W, H);
    g.closePath();
    g.fill();
    // Niebla entre capas para dar profundidad.
    const fog = g.createLinearGradient(0, base - 60, 0, base + 160);
    fog.addColorStop(0, 'rgba(255,255,255,0)');
    fog.addColorStop(0.5, `rgba(255,255,255,${0.05 - layer * 0.01})`);
    fog.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = fog;
    g.fillRect(0, base - 60, W, 220);
  });

  // Grano fino: evita bandas en los degradados al comprimir en JPEG.
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 6;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (let i = 0; i < SCENES.length; i++) {
  await page.setContent('<html><body></body></html>');
  await page.evaluate(paint, { scene: SCENES[i], seed: 1234 + i * 977 });
  const file = `${OUT}/0${i + 1}.jpg`;
  await page.screenshot({ path: file, type: 'jpeg', quality: 80 });
  console.log('✓', file);
}
await browser.close();
