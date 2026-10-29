// Comprobación visual con Playwright: capturas a 1920×1080 y navegación con flechas.
// Uso: npm run check -- [url] [escenario]
//   escenarios: nav (por defecto), settings, viewer
// Requiere el servidor de desarrollo (npm run dev) o el preview del build (npm run preview).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] || 'http://localhost:5173/';
const scenario = process.argv[3] || 'nav';
const out = 'shots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

const shot = async (name) => {
  await page.waitForTimeout(700); // deja terminar las transiciones (340–520 ms)
  await page.screenshot({ path: `${out}/${scenario}-${name}.png` });
  const focused = await page.$eval('.list-item.focused', (el) => el.textContent).catch(() => '(ninguno)');
  console.log(`${name}: foco = ${focused}`);
};
const press = async (key, times = 1) => {
  for (let i = 0; i < times; i++) await page.keyboard.press(key);
};

// Ajustes limpios en cada ejecución.
await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.goto(scenario === 'viewer' ? url + (url.includes('?') ? '&' : '?') + 'inputs=viewer' : url);
await page.waitForSelector('.list-item.focused');

if (scenario === 'nav' || scenario === 'viewer') {
  await shot('01-inicio');
  await press('ArrowDown');
  await shot('02-abajo');
  await press('ArrowDown', 4);
  await shot('03-inputs');
  await press('ArrowDown', 10);
  await shot('04-final');
  await press('ArrowUp', 20);
  await press('Enter');
  await page.waitForTimeout(300);
  await shot('05-ok-toast');
} else if (scenario === 'settings') {
  await page.keyboard.press('r'); // tecla roja (alias de teclado) → ajustes
  await shot('01-ajustes');
  await press('Enter'); // ocultar primera app
  await press('ArrowRight'); // modo mover
  await press('ArrowDown', 2);
  await press('Enter'); // soltar
  await shot('02-mover');
  await press('ArrowDown', 12);
  await shot('03-generales');
  await press('ArrowRight'); // cambiar opción enfocada
  await shot('04-cambio');
  await press('Escape'); // Back
  await shot('05-home');
  await page.reload();
  await page.waitForSelector('.list-item.focused');
  await shot('06-tras-recargar');
  const saved = await page.evaluate(() => localStorage.getItem('launcher.settings.v1'));
  console.log('localStorage:', saved);
}

console.log(errors.length ? `ERRORES:\n${errors.join('\n')}` : 'Sin errores de consola.');
await browser.close();
process.exit(errors.length ? 1 : 0);
