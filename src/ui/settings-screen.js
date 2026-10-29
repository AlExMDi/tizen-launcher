// Pantalla de ajustes: panel a la derecha, navegable con el mando.
//   Fila de app:    OK = mostrar/ocultar · → = modo mover (↑↓ mueve, OK o ← suelta)
//   Fila de opción: ← → (u OK) cambian el valor
//   Back: suelta si estás moviendo; si no, cierra.
// El panel es un fondo semitransparente sólido, sin backdrop-filter: el desenfoque en vivo de
// un área tan grande es de lo más caro para la GPU de la tele.
import { getSettings, cycleSetting, resetSettings } from '../settings.js';
import { t } from '../i18n.js';

const OPTION_ROWS = [
  { key: 'clock', label: 'sClock' },
  { key: 'lang', label: 'sLang' },
  { key: 'bgSource', label: 'sBgSource' },
  { key: 'bgRotateMin', label: 'sBgRotate' },
  { key: 'inputs', label: 'sInputs' },
  { key: 'deviceLabel', label: 'sDeviceLabel' },
];

function valueLabel(key, v) {
  switch (key) {
    case 'clock': return t(v === '12' ? 'vClock12' : 'vClock24');
    case 'lang': return t(v === 'en' ? 'vLangEn' : 'vLangEs');
    case 'bgSource': return t(v === 'remote' ? 'vBgRemote' : 'vBgLocal');
    case 'bgRotateMin': return v ? t('vRotateN', { n: v }) : t('vRotate0');
    case 'inputs': return t(v === 'viewer' ? 'vInputsViewer' : v === 'hidden' ? 'vInputsHidden' : 'vInputsAuto');
    case 'deviceLabel': return t(v === 'model' ? 'vLabelModel' : v === 'none' ? 'vLabelNone' : 'vLabelSamsung');
    default: return String(v);
  }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const VIEW_H = 760; // alto visible de la lista dentro del panel (= .s-viewport en CSS)
const MARGIN = 140; // distancia mínima del foco al borde antes de desplazar

/**
 * ctx = { getApps(): lista, setApps(lista), onReset(), onClose() }
 */
export function createSettingsScreen(root, ctx) {
  let rows = [];
  let focus = 0;
  let moving = false;
  let scroll = 0;
  let isOpen = false;

  function buildRows() {
    rows = [{ type: 'header', text: t('sAppsTitle') }];
    ctx.getApps().forEach((app, i) => rows.push({ type: 'app', appIndex: i }));
    rows.push({ type: 'header', text: t('sGeneralTitle') });
    OPTION_ROWS.forEach((o) => rows.push({ type: 'option', key: o.key, label: o.label }));
    rows.push({ type: 'action', id: 'reset' });
  }

  function focusable(i) {
    return rows[i] && rows[i].type !== 'header';
  }

  function render() {
    const apps = ctx.getApps();
    const s = getSettings();
    let html = '<div class="s-title">' + esc(t('settings')) + '</div><div class="s-viewport"><div class="s-rows">';
    rows.forEach((row, i) => {
      const cls = ['s-row', 's-' + row.type];
      if (i === focus) cls.push('focused');
      if (i === focus && moving) cls.push('moving');
      if (row.type === 'header') {
        html += '<div class="' + cls.join(' ') + '">' + esc(row.text) + '</div>';
      } else if (row.type === 'app') {
        const app = apps[row.appIndex];
        if (!app.visible) cls.push('off');
        html += '<div class="' + cls.join(' ') + '"><span>' + esc(app.name) + '</span><span class="s-val">' +
          (moving && i === focus ? '↕' : esc(t(app.visible ? 'shown' : 'hidden'))) + '</span></div>';
      } else if (row.type === 'option') {
        html += '<div class="' + cls.join(' ') + '"><span>' + esc(t(row.label)) + '</span><span class="s-val">‹ ' +
          esc(valueLabel(row.key, s[row.key])) + ' ›</span></div>';
      } else {
        html += '<div class="' + cls.join(' ') + '"><span>' + esc(t('sReset')) + '</span></div>';
      }
    });
    html += '</div></div><div class="s-hint">' + esc(hint()) + '</div>';
    root.innerHTML = html;
    keepInView();
  }

  function hint() {
    const row = rows[focus];
    if (moving) return t('hintMove');
    if (row.type === 'app') return t('hintApps');
    if (row.type === 'option') return t('hintOption');
    return t('hintAction');
  }

  // Desplaza la lista con transform (no con scrollTop) para que lo haga el compositor.
  function keepInView() {
    const rowsEl = root.querySelector('.s-rows');
    const el = rowsEl.children[focus];
    const top = el.offsetTop;
    if (top - scroll < MARGIN) scroll = Math.max(0, top - MARGIN);
    if (top + el.offsetHeight - scroll > VIEW_H - MARGIN) scroll = top + el.offsetHeight - VIEW_H + MARGIN;
    rowsEl.style.transform = 'translate3d(0,' + -scroll + 'px,0)';
  }

  function moveFocus(dir) {
    let i = focus + dir;
    while (i >= 0 && i < rows.length && !focusable(i)) i += dir;
    if (i >= 0 && i < rows.length) focus = i;
  }

  function moveApp(dir) {
    const row = rows[focus];
    const apps = ctx.getApps().slice();
    const j = row.appIndex + dir;
    if (j < 0 || j >= apps.length) return;
    const tmp = apps[row.appIndex];
    apps[row.appIndex] = apps[j];
    apps[j] = tmp;
    ctx.setApps(apps);
    focus += dir; // las filas de app son consecutivas: el foco acompaña a la app movida
  }

  function toggleApp() {
    const row = rows[focus];
    const apps = ctx.getApps().map((a) => Object.assign({}, a));
    apps[row.appIndex].visible = !apps[row.appIndex].visible;
    ctx.setApps(apps);
  }

  function handle(action) {
    const row = rows[focus];
    if (moving) {
      if (action === 'up' || action === 'down') moveApp(action === 'up' ? -1 : 1);
      else if (action === 'ok' || action === 'left' || action === 'back') moving = false;
      render();
      return;
    }
    switch (action) {
      case 'up': moveFocus(-1); break;
      case 'down': moveFocus(1); break;
      case 'back':
      case 'red':
        close();
        return;
      case 'ok':
        if (row.type === 'app') toggleApp();
        else if (row.type === 'option') cycleSetting(row.key, 1);
        else if (row.type === 'action') {
          resetSettings();
          ctx.onReset();
          buildRows();
          focus = 1;
        }
        break;
      case 'right':
        if (row.type === 'app') moving = true;
        else if (row.type === 'option') cycleSetting(row.key, 1);
        break;
      case 'left':
        if (row.type === 'option') cycleSetting(row.key, -1);
        break;
      default:
        return;
    }
    if (isOpen) render();
  }

  function open() {
    buildRows();
    focus = 1;
    moving = false;
    scroll = 0;
    isOpen = true;
    root.classList.remove('hidden');
    render();
    // Un frame después para que la transición de entrada se vea.
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')));
  }

  function close() {
    isOpen = false;
    root.classList.remove('open');
    setTimeout(() => { if (!isOpen) root.classList.add('hidden'); }, 300);
    ctx.onClose();
  }

  return {
    open: open,
    handle: handle,
    isOpen: () => isOpen,
    /** Si cambian el idioma u otros textos mientras está abierto. */
    refresh: () => { if (isOpen) { buildRows(); render(); } },
  };
}
