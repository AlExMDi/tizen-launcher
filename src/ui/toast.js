const el = document.getElementById('toast');
let timer = null;

export function toast(message, ms) {
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('show'), ms || 2600);
}
