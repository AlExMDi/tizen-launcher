// Ajustes persistidos en localStorage.
// localStorage puede lanzar excepciones (modo privado, cuota, almacenamiento corrupto),
// así que toda lectura y escritura va en try/catch y siempre hay valores por defecto.

const STORAGE_KEY = 'launcher.settings.v1';

export const DEFAULTS = {
  // Lista ordenada [{ id, name, visible }] o null para "usar los favoritos de config.js".
  apps: null,
  clock: '24', // '12' | '24'
  lang: 'es', // 'es' | 'en'
  bgSource: 'local', // 'local' | 'remote'
  bgRotateMin: 15, // 0 = sin rotación
  inputs: 'auto', // 'auto' | 'viewer' | 'hidden'
  deviceLabel: 'samsung', // 'samsung' | 'model' | 'none'
};

export const OPTIONS = {
  clock: ['24', '12'],
  lang: ['es', 'en'],
  bgSource: ['local', 'remote'],
  bgRotateMin: [0, 5, 15, 30, 60],
  inputs: ['auto', 'viewer', 'hidden'],
  deviceLabel: ['samsung', 'model', 'none'],
};

let current = load();
const listeners = [];

function load() {
  let stored = {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) || {};
  } catch (e) {
    console.warn('[settings] no se pudieron leer los ajustes', e);
  }
  const merged = Object.assign({}, DEFAULTS);
  // Solo aceptamos valores válidos: un ajuste corrupto no debe romper el arranque.
  Object.keys(OPTIONS).forEach((key) => {
    if (OPTIONS[key].indexOf(stored[key]) !== -1) merged[key] = stored[key];
  });
  if (Array.isArray(stored.apps)) {
    merged.apps = stored.apps.filter((a) => a && typeof a.id === 'string');
  }
  return merged;
}

function save() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('[settings] no se pudieron guardar los ajustes', e);
  }
}

export function getSettings() {
  return current;
}

export function updateSettings(patch) {
  current = Object.assign({}, current, patch);
  save();
  listeners.forEach((fn) => fn(current, patch));
}

export function resetSettings() {
  current = Object.assign({}, DEFAULTS);
  save();
  listeners.forEach((fn) => fn(current, DEFAULTS));
}

export function onSettingsChange(fn) {
  listeners.push(fn);
}

/** Pasa al siguiente (dir = 1) o al anterior (dir = -1) valor de un ajuste. */
export function cycleSetting(key, dir) {
  const opts = OPTIONS[key];
  const i = opts.indexOf(current[key]);
  const next = opts[(i + dir + opts.length) % opts.length];
  const patch = {};
  patch[key] = next;
  updateSettings(patch);
}
