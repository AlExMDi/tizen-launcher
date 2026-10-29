// Implementación falsa de la plataforma para desarrollar en el navegador del Mac.
// Tiene la misma interfaz que platform/tizen.js (ver platform/index.js).
//
// Parámetros de URL útiles para probar casos de la tele:
//   ?inputs=sources  → HDMI reales (como el .wgt con tv.window). Valor por defecto.
//   ?inputs=viewer   → solo "TV" (como TizenBrew, que no tiene tv.window)
//   ?inputs=none     → no hay visor de TV
//   ?apps=empty      → getAppsInfo() falla (se usan los appId de fallback)

const params = new URLSearchParams(window.location.search);

const MOCK_APPS = [
  { id: 'mock.netflix', name: 'Netflix' },
  { id: 'mock.youtube', name: 'YouTube' },
  { id: 'mock.prime', name: 'Prime Video' },
  { id: 'mock.plex', name: 'Plex' },
  { id: 'mock.browser', name: 'Internet' },
  { id: 'mock.disney', name: 'Disney+' },
  { id: 'mock.spotify', name: 'Spotify' },
  { id: 'mock.appletv', name: 'Apple TV' },
  { id: 'mock.twitch', name: 'Twitch' },
  { id: 'mock.smartthings', name: 'SmartThings' },
];

const MOCK_SOURCES = [
  { type: 'HDMI', number: 1 },
  { type: 'HDMI', number: 2 },
  { type: 'TV', number: 1 },
];

const delay = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const mockPlatform = {
  name: 'mock',

  init() {
    return Promise.resolve();
  },

  getInstalledApps() {
    if (params.get('apps') === 'empty') return Promise.resolve([]);
    return delay(60, MOCK_APPS.map((a) => ({ id: a.id, name: a.name, iconPath: null })));
  },

  launchApp(id) {
    console.info('[mock] launch', id);
    return delay(150);
  },

  getInputs() {
    const mode = params.get('inputs') || 'sources';
    if (mode === 'none') return Promise.resolve({ mode: 'none', sources: [] });
    if (mode === 'viewer') return Promise.resolve({ mode: 'viewer', sources: [] });
    return Promise.resolve({ mode: 'sources', sources: MOCK_SOURCES.slice() });
  },

  /** source = { type, number } o null para abrir el visor en la última fuente. */
  switchInput(source) {
    console.info('[mock] switchInput', source);
    return delay(150);
  },

  getDeviceModel() {
    return Promise.resolve('QE55Q80BAT');
  },
};
