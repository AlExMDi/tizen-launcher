// Plataforma para cuando el launcher corre como módulo de TizenBrew.
// La página no tiene `window.tizen`; todo pasa por el servicio del módulo (service/service.js),
// que TizenBrew arranca al abrir el módulo y que escucha en 127.0.0.1:8183.

const BASE = 'http://127.0.0.1:8183';

function get(path, timeoutMs) {
  // M85 tiene fetch y AbortController (desde M66), así que podemos poner timeout.
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs || 4000) : null;
  return fetch(BASE + path, ctrl ? { signal: ctrl.signal } : undefined)
    .then((res) => res.json().then((body) => {
      if (!res.ok) throw new Error(body.error || 'HTTP ' + res.status);
      return body;
    }))
    .then((body) => {
      clearTimeout(timer);
      return body;
    }, (e) => {
      clearTimeout(timer);
      throw e;
    });
}

/**
 * Espera a que el servicio responda. TizenBrew lo descarga de jsDelivr y lo arranca a la vez que
 * abre la página, así que los primeros segundos puede no estar listo todavía.
 */
export function waitForService(totalMs) {
  const deadline = Date.now() + (totalMs || 10000);
  const attempt = () => get('/ping', 1500).then(() => true, () => {
    if (Date.now() > deadline) return false;
    return new Promise((r) => setTimeout(r, 400)).then(attempt);
  });
  return attempt();
}

let appsPromise = null;
const loadApps = () => {
  if (!appsPromise) appsPromise = get('/apps', 6000);
  return appsPromise;
};

export const tizenbrewPlatform = {
  name: 'tizenbrew',

  // Las teclas ya las registró TizenBrew con la lista `keys` del package.json antes de abrir
  // la página; aquí no hay tvinputdevice, así que se usan los keycodes por defecto (403–406).
  init() {
    return Promise.resolve();
  },

  getInstalledApps() {
    return loadApps().then((body) => body.apps
      .map((a) => ({
        id: a.id,
        name: a.name,
        // El icono es un fichero del sistema; lo pedimos a través del servicio.
        iconPath: a.iconPath ? BASE + '/icon?path=' + encodeURIComponent(a.iconPath) : null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)));
  },

  launchApp(id) {
    return get('/launch?id=' + encodeURIComponent(id), 8000);
  },

  // tvwindow solo existe en páginas con el privilegio tv.window, y los servicios no tienen
  // ventana: aquí solo podemos abrir el visor de TV en la última fuente usada.
  getInputs() {
    return loadApps().then((body) => (body.hasViewer ? { mode: 'viewer', sources: [] } : { mode: 'none', sources: [] }));
  },

  switchInput() {
    return this.launchApp('org.tizen.tv-viewer');
  },

  getDeviceModel() {
    return get('/model').then((b) => b.model || '', () => '');
  },
};
