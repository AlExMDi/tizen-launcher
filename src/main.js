import { detectPlatform } from './platform/index.js';
import { actionFor, digitOf } from './keys.js';
import { getSettings, onSettingsChange, updateSettings } from './settings.js';
import { buildAppList, toSaved } from './apps.js';
import { setLang, t } from './i18n.js';
import { createHome } from './ui/home.js';
import { createHero } from './ui/hero.js';
import { startClock, updateClock } from './ui/clock.js';
import { toast } from './ui/toast.js';
import { createBackground } from './ui/background.js';
import { createSettingsScreen } from './ui/settings-screen.js';
import { createDiag } from './ui/diag.js';

const $ = (id) => document.getElementById(id);

let platform = null; // se decide en boot() (ver platform/index.js)

const state = {
  installed: [], // lo que devuelve la plataforma
  apps: [], // lista completa ordenada con visibilidad (ver apps.js)
  inputs: { mode: 'none', sources: [] },
  model: '',
};

// ---------- Escalado del escenario 1920×1080 ----------
function fitStage() {
  const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  const x = (window.innerWidth - 1920 * s) / 2;
  const y = (window.innerHeight - 1080 * s) / 2;
  $('stage').style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
}

// ---------- Construcción de la lista ----------
function inputLabel(src) {
  return src.type === 'TV' ? t('tv') : src.type + ' ' + src.number;
}

function buildItems() {
  const s = getSettings();
  const items = [];
  state.apps.filter((a) => a.visible).forEach((a) => {
    items.push({ key: 'app:' + a.id, kind: 'app', section: 'apps', sectionLabel: t('apps'), label: a.name, id: a.id, iconPath: a.iconPath });
  });

  // Inputs: "auto" usa lo que la plataforma sepa hacer; "viewer" fuerza un único "TV".
  const mode = s.inputs === 'hidden' ? 'none' : (s.inputs === 'viewer' && state.inputs.mode !== 'none' ? 'viewer' : state.inputs.mode);
  if (mode === 'sources') {
    state.inputs.sources.forEach((src) => {
      items.push({ key: 'input:' + src.type + src.number, kind: 'input', section: 'inputs', sectionLabel: t('inputs'), label: inputLabel(src), source: src });
    });
  } else if (mode === 'viewer') {
    items.push({ key: 'input:viewer', kind: 'input', section: 'inputs', sectionLabel: t('inputs'), label: t('tv'), source: null });
  }

  items.push({ key: 'settings', kind: 'settings', section: null, label: t('settings') });
  return items;
}

function renderDeviceLabel() {
  const s = getSettings();
  $('device-name').textContent = s.deviceLabel === 'samsung' ? 'Samsung' : s.deviceLabel === 'model' ? state.model : '';
}

// ---------- Acciones ----------
function activate(item) {
  if (!item) return;
  if (item.kind === 'app') {
    toast(platform.name === 'mock' ? t('mockLaunch', { name: item.label }) : t('opening', { name: item.label }));
    platform.launchApp(item.id).catch((e) => {
      console.error('[launch]', item.id, e);
      toast(t('openFailed', { name: item.label }));
    });
  } else if (item.kind === 'input') {
    toast(t('opening', { name: item.label }));
    platform.switchInput(item.source).catch((e) => {
      console.error('[input]', item.source, e);
      toast(t('inputFailed', { name: item.label }));
    });
  } else if (item.kind === 'settings') {
    openSettings();
  }
}

function openSettings() {
  document.body.classList.add('settings-open'); // atenúa la pantalla principal
  settingsScreen.open();
}

function refreshHome() {
  home.setItems(buildItems());
}

const hero = createHero($('hero-a'), $('hero-b'));
const home = createHome($('list'), { onFocus: (item) => hero.show(item) });
const background = createBackground($('bg-a'), $('bg-b'));
const diag = createDiag($('diag'));
const settingsScreen = createSettingsScreen($('settings'), {
  getApps: () => state.apps,
  setApps: (list) => {
    state.apps = list;
    updateSettings({ apps: toSaved(list) });
    refreshHome();
  },
  onReset: () => {
    state.apps = buildAppList(state.installed, null);
    refreshHome();
    toast(t('sResetDone'));
  },
  onClose: () => document.body.classList.remove('settings-open'),
});

// ---------- Teclado / mando ----------
// Limitamos la repetición de tecla mantenida: el mando envía ~30 eventos/s y cada uno lanza
// una transición nueva; con 1 cada 90 ms la navegación sigue siendo rápida y fluida.
const REPEAT_MS = 90;
let lastMove = 0;

function onKey(e) {
  const action = actionFor(e);
  if (!action) return;
  e.preventDefault(); // evita scroll del navegador y que Back cierre la app

  // Si hay un modal abierto, se queda con todas las teclas (Back lo cierra).
  if (diag.isOpen()) {
    if (action === 'back' || action === 'blue') diag.close();
    return;
  }
  if (settingsScreen.isOpen()) {
    settingsScreen.handle(action);
    return;
  }

  if (action === 'red') {
    openSettings();
  } else if (action === 'up' || action === 'down') {
    const now = Date.now();
    if (e.repeat && now - lastMove < REPEAT_MS) return;
    lastMove = now;
    home.move(action === 'up' ? -1 : 1);
  } else if (action === 'ok') {
    if (!e.repeat) activate(home.current());
  } else if (action === 'digit') {
    // 1-9: salta al elemento N de la lista.
    const n = digitOf(e);
    if (n > 0) home.focusIndex(n - 1);
  } else if (action === 'green') {
    background.next();
  } else if (action === 'blue') {
    diag.open(platform, state);
  }
  // 'back' en la pantalla principal no hace nada a propósito (ver PLAN.md, duda 4).
}

// ---------- Arranque ----------
async function boot() {
  fitStage();
  window.addEventListener('resize', fitStage);

  const s = getSettings();
  setLang(s.lang);
  startClock(s);
  background.start(s); // no esperamos: la lista se pinta mientras carga el fondo

  const detected = await detectPlatform();
  platform = detected.platform;
  if (detected.warning) toast(t('serviceDown'), 8000);
  await platform.init();
  const [installed, inputs, model] = await Promise.all([
    platform.getInstalledApps().catch(() => []),
    platform.getInputs().catch(() => ({ mode: 'none', sources: [] })),
    platform.getDeviceModel().catch(() => ''),
  ]);
  state.installed = installed;
  state.inputs = inputs;
  state.model = model;
  state.apps = buildAppList(installed, s.apps);

  renderDeviceLabel();
  home.setItems(buildItems());
  document.addEventListener('keydown', onKey);

  onSettingsChange((next, patch) => {
    setLang(next.lang);
    updateClock(next);
    renderDeviceLabel();
    background.configure(next);
    // El idioma cambia etiquetas ("Ajustes", "Inputs") y "inputs" cambia la lista.
    if ('lang' in patch || 'inputs' in patch) refreshHome();
    settingsScreen.refresh();
  });
}

boot();
