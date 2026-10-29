// Configuración estática del launcher. Lo que el usuario cambia en runtime vive en settings.js.

// Apps favoritas por defecto. Se buscan POR NOMBRE en tizen.application.getAppsInfo():
// los appId cambian entre regiones y versiones, así que no los fijamos.
// `fallbackId` solo se usa si no hay coincidencia por nombre. Son valores sacados de listas
// comunitarias, no de Samsung: verifícalos en tu tele (README → Depurar) y edítalos aquí.
export const FAVORITES = [
  { name: 'Netflix', match: ['netflix'], fallbackId: '3201907018807' },
  { name: 'YouTube', match: ['youtube'], fallbackId: '111299001912' },
  { name: 'Prime Video', match: ['prime video', 'amazon prime'], fallbackId: '3201910019365' },
  { name: 'Plex', match: ['plex'], fallbackId: '3201512006963' },
  { name: 'Navegador', match: ['internet', 'browser', 'navegador'], fallbackId: 'org.tizen.browser' },
];

// Visor de TV del sistema. No viene en la documentación de Samsung, pero la comunidad lo ha
// visto en TVs de 2018 a 2022. Solo se usa si aparece en getAppsInfo().
export const TV_VIEWER_ID = 'org.tizen.tv-viewer';

// Fondos incluidos en el paquete (public/backgrounds). Generados con `npm run backgrounds`.
export const LOCAL_BACKGROUNDS = [
  'backgrounds/01.jpg',
  'backgrounds/02.jpg',
  'backgrounds/03.jpg',
  'backgrounds/04.jpg',
  'backgrounds/05.jpg',
  'backgrounds/06.jpg',
];

// Fondo remoto opcional. Picsum sirve fotos libres; el parámetro evita la caché entre rotaciones.
export const remoteBackgroundUrl = (seed) => `https://picsum.photos/seed/launcher${seed}/1920/1080.jpg`;
// Si el remoto no carga en este tiempo, usamos uno local (p. ej. tele sin conexión).
export const REMOTE_TIMEOUT_MS = 8000;
