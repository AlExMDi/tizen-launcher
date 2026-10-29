// Reloj y fecha. Se actualiza justo al cambiar de minuto.
// Un setInterval(60000) arrancado a mitad de minuto iría hasta 59 s tarde, y además los
// timers derivan. Por eso reprogramamos un setTimeout hasta el siguiente :00 en cada tick.
import { formatDate } from '../i18n.js';

const hmEl = document.getElementById('clock-hm');
const ampmEl = document.getElementById('clock-ampm');
const dateEl = document.getElementById('clock-date');

let opts = { clock: '24', lang: 'es' };
let timer = null;

const pad = (n) => (n < 10 ? '0' + n : '' + n);

function render() {
  const now = new Date();
  const h = now.getHours();
  if (opts.clock === '12') {
    hmEl.textContent = (h % 12 || 12) + ':' + pad(now.getMinutes());
    ampmEl.textContent = h < 12 ? 'AM' : 'PM';
  } else {
    hmEl.textContent = pad(h) + ':' + pad(now.getMinutes());
    ampmEl.textContent = '';
  }
  dateEl.textContent = formatDate(now, opts.lang);
}

function schedule() {
  const now = new Date();
  // +50 ms de margen para no caer en el minuto anterior por redondeo del timer.
  const ms = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 50;
  timer = setTimeout(() => {
    render();
    schedule();
  }, ms);
}

export function startClock(settings) {
  opts = { clock: settings.clock, lang: settings.lang };
  render();
  if (timer) clearTimeout(timer);
  schedule();
  // Al volver a la app desde otra (Netflix…) los timers pudieron estar congelados.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      render();
      clearTimeout(timer);
      schedule();
    }
  });
}

export function updateClock(settings) {
  opts = { clock: settings.clock, lang: settings.lang };
  render();
}
