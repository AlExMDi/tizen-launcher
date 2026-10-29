// Única puerta de acceso a la plataforma. El resto del código nunca toca `tizen.*`.
//
// Interfaz común (todas las funciones devuelven Promise salvo `name`):
//   name                     'tizen' | 'tizenbrew' | 'mock'
//   init()                   registrar teclas, leer keycodes reales…
//   getInstalledApps()       [{ id, name, iconPath }] solo apps visibles para el usuario
//   launchApp(id)
//   getInputs()              { mode: 'sources' | 'viewer' | 'none', sources: [{ type, number }] }
//   switchInput(source|null)
//   getDeviceModel()         p. ej. 'QE55Q80BAT'
//
// Tres casos:
//   .wgt instalado      → window.tizen existe en la página          → tizen.js
//   módulo de TizenBrew → sin window.tizen; servicio en 127.0.0.1   → tizenbrew.js
//   navegador del Mac   → nada de lo anterior                       → mock.js
import { mockPlatform } from './mock.js';
import { tizenPlatform } from './tizen.js';
import { tizenbrewPlatform, waitForService } from './tizenbrew.js';

const search = window.location.search;
const forceMock = /[?&]mock\b/.test(search);
const hasTizen = typeof window.tizen === 'object' && window.tizen !== null && !!window.tizen.application;
// TizenBrew sirve los módulos en http://127.0.0.1:8081/module/<nombre>/... (`?tizenbrew` lo fuerza en local).
const inTizenBrew = /[?&]tizenbrew\b/.test(search) ||
  (window.location.port === '8081' && window.location.pathname.indexOf('/module/') === 0);

/** Devuelve la plataforma a usar. Es asíncrono porque en TizenBrew hay que esperar al servicio. */
export function detectPlatform() {
  if (forceMock) return Promise.resolve({ platform: mockPlatform });
  if (hasTizen) return Promise.resolve({ platform: tizenPlatform });
  if (inTizenBrew) {
    return waitForService(10000).then((ok) => (ok
      ? { platform: tizenbrewPlatform }
      // Sin servicio no podemos abrir apps: avisamos en vez de fingir que funciona.
      : { platform: mockPlatform, warning: 'serviceDown' }));
  }
  return Promise.resolve({ platform: mockPlatform });
}
