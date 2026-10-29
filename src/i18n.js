// Textos y nombres de fecha.
// No usamos Intl.DateTimeFormat para la fecha: en firmwares de TV el ICU puede venir recortado
// y devolver el idioma equivocado o formatos raros. Con tablas propias el resultado es
// idéntico en el Mac y en la tele.

const DAYS = {
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const MONTHS = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export function formatDate(d, lang) {
  const day = DAYS[lang][d.getDay()];
  const month = MONTHS[lang][d.getMonth()];
  if (lang === 'es') return day.charAt(0).toUpperCase() + day.slice(1) + ', ' + d.getDate() + ' de ' + month;
  return day + ', ' + d.getDate() + ' ' + month;
}

const STRINGS = {
  es: {
    apps: 'Apps',
    inputs: 'Inputs',
    settings: 'Ajustes',
    tv: 'TV',
    opening: 'Abriendo {name}…',
    openFailed: 'No se pudo abrir {name}',
    inputFailed: 'No se pudo cambiar a {name}',
    mockLaunch: '{name} (mock: aquí se abriría la app)',
    noApps: 'No hay apps visibles. Pulsa OK en Ajustes.',
    // Pantalla de ajustes
    sAppsTitle: 'Apps en la lista',
    sGeneralTitle: 'General',
    sClock: 'Formato de hora',
    sLang: 'Idioma',
    sBgSource: 'Fondos',
    sBgRotate: 'Cambiar fondo',
    sInputs: 'Inputs',
    sDeviceLabel: 'Texto superior',
    sReset: 'Restablecer ajustes',
    sResetDone: 'Ajustes restablecidos',
    vClock24: '24 h', vClock12: '12 h',
    vLangEs: 'Español', vLangEn: 'English',
    vBgLocal: 'Incluidos', vBgRemote: 'Online (Picsum)',
    vRotate0: 'Nunca', vRotateN: 'Cada {n} min',
    vInputsAuto: 'Automático', vInputsViewer: 'Solo TV', vInputsHidden: 'Ocultar',
    vLabelSamsung: 'Samsung', vLabelModel: 'Modelo', vLabelNone: 'Nada',
    shown: 'Visible', hidden: 'Oculta',
    hintApps: 'OK mostrar/ocultar · → mover · Back cerrar',
    hintMove: '↑↓ mover · OK o ← soltar',
    hintOption: '← → cambiar · Back cerrar',
    hintAction: 'OK confirmar · Back cerrar',
  },
  en: {
    apps: 'Apps',
    inputs: 'Inputs',
    settings: 'Settings',
    tv: 'TV',
    opening: 'Opening {name}…',
    openFailed: 'Could not open {name}',
    inputFailed: 'Could not switch to {name}',
    mockLaunch: '{name} (mock: the app would open here)',
    noApps: 'No visible apps. Press OK on Settings.',
    sAppsTitle: 'Apps in the list',
    sGeneralTitle: 'General',
    sClock: 'Time format',
    sLang: 'Language',
    sBgSource: 'Backgrounds',
    sBgRotate: 'Change background',
    sInputs: 'Inputs',
    sDeviceLabel: 'Top label',
    sReset: 'Reset settings',
    sResetDone: 'Settings reset',
    vClock24: '24 h', vClock12: '12 h',
    vLangEs: 'Español', vLangEn: 'English',
    vBgLocal: 'Bundled', vBgRemote: 'Online (Picsum)',
    vRotate0: 'Never', vRotateN: 'Every {n} min',
    vInputsAuto: 'Automatic', vInputsViewer: 'TV only', vInputsHidden: 'Hide',
    vLabelSamsung: 'Samsung', vLabelModel: 'Model', vLabelNone: 'Nothing',
    shown: 'Shown', hidden: 'Hidden',
    hintApps: 'OK show/hide · → move · Back close',
    hintMove: '↑↓ move · OK or ← drop',
    hintOption: '← → change · Back close',
    hintAction: 'OK confirm · Back close',
  },
};

let lang = 'es';
export function setLang(l) { lang = STRINGS[l] ? l : 'es'; }
export function getLang() { return lang; }

export function t(key, vars) {
  let s = STRINGS[lang][key] || STRINGS.es[key] || key;
  if (vars) Object.keys(vars).forEach((k) => { s = s.replace('{' + k + '}', vars[k]); });
  return s;
}
