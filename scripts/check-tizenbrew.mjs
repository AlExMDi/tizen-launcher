// Simula TizenBrew en local para probar el módulo completo (página + servicio):
//  1. Ejecuta service/service.js dentro de un `vm` con un `tizen` falso, como hace TizenBrew
//     (utils/serviceLauncher.js de TizenBrew).
//  2. Sirve el repo en http://127.0.0.1:8081/module/<módulo>/..., como su proxy de jsDelivr.
//  3. Abre la página con Playwright y comprueba lista, iconos y que OK llama a launch().
// Uso: npm run build && npm run check:tizenbrew
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve, extname } from 'node:path';
import vm from 'node:vm';
import { parse } from 'acorn';
import { chromium } from 'playwright';

let failed = false;
const fail = (msg) => { failed = true; console.error('✗', msg); };

const serviceSrc = readFileSync('service/service.js', 'utf8');
try {
  parse(serviceSrc, { ecmaVersion: 5 });
  console.log('✓ service.js es ES5 (apto para el Node antiguo de Tizen)');
} catch (e) {
  fail('service.js no es ES5: ' + e.message);
}

// --- 1. Servicio con tizen falso ---
const calls = [];
const icon = resolve('tizen/icon.png');
const fakeTizen = {
  application: {
    getAppsInfo: (ok) => setTimeout(() => ok([
      { id: '3201907018807', name: 'Netflix', show: true, iconPath: icon },
      { id: '111299001912', name: 'YouTube', show: true, iconPath: '/no/existe.png' },
      { id: 'org.tizen.tv-viewer', name: 'TV', show: false },
      { id: 'xvvl3S1bvH.TizenBrewStandalone', name: 'TizenBrew', show: true },
    ]), 5),
    getAppInfo: () => ({ id: 'xvvl3S1bvH.TizenBrewStandalone', packageId: 'xvvl3S1bvH' }),
    launch: (id, ok) => { calls.push('launch:' + id); setTimeout(ok, 5); },
  },
  systeminfo: { getCapability: () => 'QE55Q80BA' },
};
const sandbox = { require: createRequire(import.meta.url), tizen: fakeTizen, console, Buffer, setTimeout, module: { exports: {} } };
vm.runInContext(serviceSrc, vm.createContext(sandbox));

// --- 2. Proxy de módulos como el de TizenBrew ---
const MODULE = encodeURIComponent('gh/AlExMDi/tizen-launcher');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png' };
const proxy = createServer((req, res) => {
  const prefix = '/module/' + MODULE + '/';
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = path.startsWith(decodeURIComponent(prefix)) ? resolve(path.slice(decodeURIComponent(prefix).length)) : null;
  if (!file || !existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(8081, '127.0.0.1');

// --- 3. Página ---
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://127.0.0.1:8081/module/${MODULE}/dist/index.html`);
await page.waitForSelector('.list-item.focused');
await page.waitForTimeout(900);

const hasTizen = await page.evaluate(() => typeof window.tizen);
if (hasTizen !== 'undefined') fail('la página no debería tener window.tizen');
const labels = await page.$$eval('.list-item', (els) => els.map((e) => e.textContent));
console.log('  lista:', labels.join(' · '));
if (labels.join() !== 'Netflix,YouTube,TV,Ajustes') fail('lista inesperada');

const img = await page.$eval('.hero-layer.visible img', (el) => el.complete && el.naturalWidth).catch(() => 0);
if (!img) fail('el icono de Netflix no se cargó a través del servicio');
else console.log('✓ icono real servido por el servicio');
await page.screenshot({ path: 'shots/tizenbrew-netflix.png' });

await page.keyboard.press('Enter');
await page.waitForTimeout(300);
const toastText = await page.$eval('#toast', (e) => e.textContent);
console.log('  toast:', toastText);
if (toastText.indexOf('mock') !== -1) fail('sigue en modo mock');
await page.keyboard.press('ArrowDown'); // YouTube: icono inexistente → monograma
await page.waitForTimeout(600);
const mono = await page.$('.hero-layer.visible .hero-mono');
if (!mono) fail('YouTube sin icono debería caer al monograma');
await page.keyboard.press('ArrowDown'); // TV
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
console.log('  llamadas:', calls.join(' · '));
if (calls.join() !== 'launch:3201907018807,launch:org.tizen.tv-viewer') fail('llamadas inesperadas');

// Panel de diagnóstico (azul = B en el teclado).
await page.keyboard.press('b');
await page.waitForFunction(() => document.querySelector('#diag .d-body').textContent.indexOf('Consultando') === -1);
const diagText = await page.$eval('#diag .d-body', (e) => e.textContent);
console.log('  diagnóstico:\n    ' + diagText.split('\n').slice(-4).join('\n    '));
if (diagText.indexOf('Netflix · OK') === -1 || diagText.indexOf('YouTube · ENOENT') === -1) fail('diagnóstico inesperado');
await page.screenshot({ path: 'shots/tizenbrew-diag.png' });
await page.keyboard.press('Escape');

// El servicio no debe servir ficheros arbitrarios.
const forbidden = await fetch('http://127.0.0.1:8183/icon?path=' + encodeURIComponent('/etc/passwd')).then((r) => r.status);
if (forbidden !== 403) fail('/icon sirvió una ruta no permitida (' + forbidden + ')');

if (errors.length) fail('errores en la página:\n  ' + errors.join('\n  '));
await browser.close();
proxy.close();
console.log(failed ? 'FALLÓ' : '✓ módulo de TizenBrew OK (página + servicio)');
process.exit(failed ? 1 : 0);
