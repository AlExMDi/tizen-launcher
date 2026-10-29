// Implementación real sobre las Web Device APIs de Samsung/Tizen.
// Todas las llamadas a tizen.* van en try/catch: si falta un privilegio, la API lanza un
// WebAPIException síncrono (SecurityError) en lugar de llamar al callback de error.
import { TV_VIEWER_ID } from '../config.js';
import { setKeyCodes } from '../keys.js';

// Teclas que pedimos al sistema. Flechas, Enter y Back son obligatorias: no se registran.
const KEYS_TO_REGISTER = ['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const tz = () => window.tizen;

/** Convierte una API de callbacks (success, error) de Tizen en Promise. */
function call(fn) {
  return new Promise((resolve, reject) => {
    try {
      fn(resolve, reject);
    } catch (e) {
      reject(e);
    }
  });
}

// getAppsInfo() se pide una sola vez y lo comparten getInstalledApps() y getInputs().
let appsInfo = null;
function getAppsInfo() {
  if (!appsInfo) appsInfo = call((ok, err) => tz().application.getAppsInfo(ok, err));
  return appsInfo;
}

function ownAppId() {
  try {
    return tz().application.getCurrentApplication().appInfo.id;
  } catch (e) {
    return '';
  }
}

function launch(id) {
  return call((ok, err) => tz().application.launch(id, ok, err));
}

/** ¿Tenemos el privilegio tv.window? Dentro de TizenBrew no (su config.xml no lo declara). */
function canUseTvWindow() {
  try {
    if (!tz().tvwindow) return false;
    tz().tvwindow.getSource(); // lanza SecurityError sin el privilegio
    return true;
  } catch (e) {
    console.info('[tizen] tvwindow no disponible:', e && e.name);
    return false;
  }
}

const SOURCE_ORDER = { HDMI: 0, TV: 1 };

export const tizenPlatform = {
  name: 'tizen',

  init() {
    const input = tz().tvinputdevice;
    if (input) {
      KEYS_TO_REGISTER.forEach((name) => {
        // Una a una: si un modelo no tiene una tecla, registerKeyBatch fallaría entera.
        try { input.registerKey(name); } catch (e) { console.info('[tizen] no se registró', name); }
      });
      const code = (name, fallback) => {
        try { return input.getKey(name).code; } catch (e) { return fallback; }
      };
      setKeyCodes({
        RED: code('ColorF0Red', 403),
        GREEN: code('ColorF1Green', 404),
        YELLOW: code('ColorF2Yellow', 405),
        BLUE: code('ColorF3Blue', 406),
      });
    }
    return Promise.resolve();
  },

  getInstalledApps() {
    const self = ownAppId();
    return getAppsInfo().then((list) => list
      // `show` = la app aparece en el Smart Hub; el resto son servicios y apps internas.
      .filter((a) => a.show && a.id !== self && a.id !== TV_VIEWER_ID)
      .map((a) => ({ id: a.id, name: a.name, iconPath: a.iconPath || null }))
      .sort((a, b) => a.name.localeCompare(b.name)));
  },

  launchApp(id) {
    return launch(id);
  },

  getInputs() {
    return getAppsInfo().catch(() => []).then((list) => {
      const hasViewer = list.some((a) => a.id === TV_VIEWER_ID);
      if (!hasViewer) return { mode: 'none', sources: [] };
      if (!canUseTvWindow()) return { mode: 'viewer', sources: [] };
      return call((ok, err) => tz().systeminfo.getPropertyValue('VIDEOSOURCE', ok, err))
        .then((vs) => {
          // Un HDMI sin señal (aparato en standby) sale en `disconnected` pero sí se puede
          // seleccionar, así que unimos ambas listas.
          const all = (vs.connected || []).concat(vs.disconnected || []);
          const seen = {};
          const sources = all
            .filter((s) => s.type in SOURCE_ORDER)
            .filter((s) => {
              const k = s.type + s.number;
              if (seen[k]) return false;
              seen[k] = true;
              return true;
            })
            .sort((a, b) => (SOURCE_ORDER[a.type] - SOURCE_ORDER[b.type]) || (a.number - b.number))
            // `raw` conserva el objeto original: setSource() espera un SystemInfoVideoSourceInfo.
            .map((s) => ({ type: s.type, number: s.number, raw: s }));
          return sources.length ? { mode: 'sources', sources: sources } : { mode: 'viewer', sources: [] };
        })
        .catch((e) => {
          console.warn('[tizen] VIDEOSOURCE falló', e);
          return { mode: 'viewer', sources: [] };
        });
    });
  },

  // Método observado por la comunidad (no documentado como cambio de fuente del sistema):
  // fijar la fuente con tvwindow.setSource() y abrir el visor de TV, que la muestra a
  // pantalla completa. Sin `source`, solo abrimos el visor en la última fuente usada.
  switchInput(source) {
    if (!source) return launch(TV_VIEWER_ID);
    return call((ok, err) => tz().tvwindow.setSource(source.raw || source, ok, err))
      .then(() => launch(TV_VIEWER_ID));
  },

  getDeviceModel() {
    return call((ok, err) => tz().systeminfo.getPropertyValue('BUILD', ok, err))
      .then((b) => b.model || '')
      .catch(() => '');
  },
};
