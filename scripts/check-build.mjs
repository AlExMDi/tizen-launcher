// Comprueba el build (dist/) como lo vería la tele:
//  1. El JS se parsea como ES2019 (si queda `?.`, `??` u otra sintaxis nueva, falla).
//  2. El CSS no usa features posteriores a Chromium M85.
//  3. Abre dist/index.html desde file:// (como un .wgt) con un `window.tizen` simulado y
//     ejercita la capa Tizen real: getAppsInfo, launch, VIDEOSOURCE, setSource, registerKey.
// Uso: npm run build && node scripts/check-build.mjs
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'acorn';
import { chromium } from 'playwright';

let failed = false;
const fail = (msg) => { failed = true; console.error('✗', msg); };

// 1. Sintaxis JS
const js = readFileSync('dist/assets/app.js', 'utf8');
try {
  parse(js, { ecmaVersion: 2019, sourceType: 'script' });
  console.log('✓ app.js es ES2019 válido');
} catch (e) {
  fail('app.js no es ES2019: ' + e.message);
}

// 2. CSS: features que M85 no tiene (lista no exhaustiva de las más tentadoras).
const css = readFileSync('dist/assets/style.css', 'utf8');
const UNSUPPORTED = [
  [':has(', 'Chromium 105'], ['@container', 'Chromium 105'], ['aspect-ratio', 'Chromium 88'],
  ['inset:', 'Chromium 87'], [':is(', 'Chromium 88'], [':where(', 'Chromium 88'],
  ['@layer', 'Chromium 99'], ['dvh', 'Chromium 108'], ['color-mix(', 'Chromium 111'],
];
const found = UNSUPPORTED.filter(([needle]) => css.indexOf(needle) !== -1);
if (found.length) found.forEach(([f, v]) => fail(`style.css usa ${f} (necesita ${v})`));
else console.log('✓ style.css sin features posteriores a M85 (de la lista comprobada)');

// 3. Ejecución desde file:// con tizen simulado
const fakeTizen = () => {
  const calls = (window.__calls = []);
  const apps = [
    { id: '3201907018807', name: 'Netflix', show: true, iconPath: null },
    { id: '111299001912', name: 'YouTube', show: true, iconPath: null },
    { id: 'org.tizen.browser', name: 'Internet', show: true, iconPath: null },
    { id: 'org.tizen.tv-viewer', name: 'TV', show: false },
    { id: 'LnchrTV001.Launcher', name: 'Launcher', show: true },
  ];
  const keys = { ColorF0Red: 403, ColorF1Green: 404, ColorF2Yellow: 405, ColorF3Blue: 406 };
  window.tizen = {
    application: {
      getAppsInfo: (ok) => setTimeout(() => ok(apps), 10),
      launch: (id, ok) => { calls.push('launch:' + id); setTimeout(ok, 10); },
      getCurrentApplication: () => ({ appInfo: { id: 'LnchrTV001.Launcher' } }),
    },
    tvinputdevice: {
      registerKey: (k) => calls.push('registerKey:' + k),
      getKey: (k) => ({ name: k, code: keys[k] || 48 }),
    },
    tvwindow: {
      getSource: () => ({ type: 'HDMI', number: 1 }),
      setSource: (s, ok) => { calls.push('setSource:' + s.type + s.number); setTimeout(() => ok(s), 10); },
    },
    systeminfo: {
      getPropertyValue: (p, ok) => setTimeout(() => ok(p === 'VIDEOSOURCE'
        ? { connected: [{ type: 'TV', number: 1 }, { type: 'HDMI', number: 1 }], disconnected: [{ type: 'HDMI', number: 2 }] }
        : { model: 'QE55Q80BAT' }), 10),
    },
  };
};

mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('requestfailed', (r) => errors.push('requestfailed ' + r.url()));
await page.addInitScript(fakeTizen);
await page.goto(pathToFileURL(resolve('dist/index.html')).href);
await page.waitForSelector('.list-item.focused');
await page.waitForTimeout(800);

const labels = await page.$$eval('.list-item', (els) => els.map((e) => e.textContent));
console.log('  lista:', labels.join(' · '));
if (labels.join() !== 'Netflix,YouTube,Internet,HDMI 1,HDMI 2,TV,Ajustes') fail('lista inesperada');

const font = await page.evaluate(() => document.fonts.check('84px Inter'));
if (!font) fail('la fuente Inter no cargó desde file://');

await page.keyboard.press('Enter'); // Netflix
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown'); // HDMI 2 (desconectado, pero seleccionable)
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/build-file-tizen.png' });
const calls = await page.evaluate(() => window.__calls);
console.log('  llamadas:', calls.filter((c) => !c.startsWith('registerKey')).join(' · '));
const expected = ['launch:3201907018807', 'setSource:HDMI2', 'launch:org.tizen.tv-viewer'];
if (expected.some((c) => calls.indexOf(c) === -1)) fail('faltan llamadas a la API de Tizen');
if (calls.indexOf('registerKey:ColorF0Red') === -1) fail('no se registró la tecla roja');
const model = await page.$eval('#device-name', (e) => e.textContent);
if (model !== 'Samsung') fail('texto superior inesperado: ' + model);

if (errors.length) fail('errores en la página:\n  ' + errors.join('\n  '));
await browser.close();
console.log(failed ? 'FALLÓ' : '✓ build OK desde file:// con tizen simulado');
process.exit(failed ? 1 : 0);
