// Única puerta de acceso a la plataforma. El resto del código nunca toca `tizen.*`.
//
// Interfaz común (todas las funciones devuelven Promise salvo `name`):
//   name                     'tizen' | 'mock'
//   init()                   registrar teclas, leer keycodes reales…
//   getInstalledApps()       [{ id, name, iconPath }] solo apps visibles para el usuario
//   launchApp(id)
//   getInputs()              { mode: 'sources' | 'viewer' | 'none', sources: [{ type, number }] }
//   switchInput(source|null)
//   getDeviceModel()         p. ej. 'QE55Q80BAT'
import { mockPlatform } from './mock.js';
import { tizenPlatform } from './tizen.js';

// `?mock` en la URL fuerza el mock incluso en la tele (útil para depurar la UI allí).
const forceMock = /[?&]mock\b/.test(window.location.search);
const hasTizen = typeof window.tizen === 'object' && window.tizen !== null && !!window.tizen.application;

export const platform = hasTizen && !forceMock ? tizenPlatform : mockPlatform;
