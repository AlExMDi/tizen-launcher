// Traducción de eventos de teclado a acciones del launcher.
//
// En el mando Samsung las flechas, OK y Back son "teclas obligatorias": siempre llegan a la app
// y NO se pueden (ni deben) registrar. Las de colores y los números sí hay que registrarlos con
// tizen.tvinputdevice.registerKey(); si no, el sistema se los queda.

const DEFAULT_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  ENTER: 13,
  BACK: 10009, // Back del mando Samsung (en Tizen no es 8 ni 27)
  // Valores habituales de los colores; en la tele se sustituyen por los de tvinputdevice.getKey().
  RED: 403,
  GREEN: 404,
  YELLOW: 405,
  BLUE: 406,
};

let codes = Object.assign({}, DEFAULT_CODES);

/** Permite a la capa de plataforma inyectar los keycodes reales del dispositivo. */
export function setKeyCodes(overrides) {
  codes = Object.assign({}, codes, overrides);
}

// Atajos de teclado solo para desarrollar en el Mac (no existen en el mando).
const DEV_ALIASES = {
  8: 'back', // Backspace
  27: 'back', // Escape
  82: 'red', // R
  71: 'green', // G
  89: 'yellow', // Y
  66: 'blue', // B
};

/** Devuelve 'up' | 'down' | 'left' | 'right' | 'ok' | 'back' | 'red' | ... | 'digit' o null. */
export function actionFor(e) {
  // keyCode está deprecado en la web, pero es lo que entrega Tizen de forma fiable
  // para las teclas del mando (e.key no está definido para colores en M85).
  const k = e.keyCode;
  switch (k) {
    case codes.LEFT: return 'left';
    case codes.UP: return 'up';
    case codes.RIGHT: return 'right';
    case codes.DOWN: return 'down';
    case codes.ENTER: return 'ok';
    case codes.BACK: return 'back';
    case codes.RED: return 'red';
    case codes.GREEN: return 'green';
    case codes.YELLOW: return 'yellow';
    case codes.BLUE: return 'blue';
    default: break;
  }
  if (k >= 48 && k <= 57) return 'digit'; // 0-9 coinciden en mando y teclado
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  return DEV_ALIASES[k] || null;
}

export function digitOf(e) {
  return e.keyCode - 48;
}
