// Fondo a pantalla completa con dos capas y crossfade lento (2,4 s, solo opacity).
//
// Antes de mostrar una imagen la precargamos y la decodificamos con img.decode(), disponible
// desde Chromium 64. Si no, el decode de un JPEG de 1920×1080 ocurriría en mitad del fade y
// en la CPU de la tele se notaría un tirón.
import { LOCAL_BACKGROUNDS, remoteBackgroundUrl, REMOTE_TIMEOUT_MS } from '../config.js';

function preload(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let done = false;
    const timer = timeoutMs ? setTimeout(() => finish(new Error('timeout ' + url)), timeoutMs) : null;
    function finish(err) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (err) reject(err); else resolve(img);
    }
    img.onload = () => {
      if (img.decode) img.decode().then(() => finish(), () => finish());
      else finish();
    };
    img.onerror = () => finish(new Error('no carga ' + url));
    img.src = url;
  });
}

export function createBackground(layerA, layerB) {
  let front = layerA;
  let back = layerB;
  let localIndex = Math.floor(Math.random() * LOCAL_BACKGROUNDS.length);
  let remoteSeed = Math.floor(Math.random() * 1000);
  let source = 'local';
  let rotateMin = 0;
  let timer = null;
  let loading = false;
  let keep = null; // referencia a la imagen visible para que no se libere su decode

  function show(img) {
    keep = img;
    back.style.backgroundImage = 'url("' + img.src + '")';
    back.classList.add('visible');
    front.classList.remove('visible');
    const tmp = front;
    front = back;
    back = tmp;
  }

  function nextLocal() {
    localIndex = (localIndex + 1) % LOCAL_BACKGROUNDS.length;
    return preload(LOCAL_BACKGROUNDS[localIndex]);
  }

  function next() {
    if (loading) return Promise.resolve();
    loading = true;
    const load = source === 'remote'
      // Sin red, o con Picsum caído, seguimos con los fondos incluidos.
      ? preload(remoteBackgroundUrl(remoteSeed++), REMOTE_TIMEOUT_MS).catch((e) => {
        console.warn('[bg] remoto falló, uso local:', e.message);
        return nextLocal();
      })
      : nextLocal();
    return load
      .then(show)
      .catch((e) => console.warn('[bg]', e))
      .then(() => { loading = false; });
  }

  function schedule() {
    clearInterval(timer);
    timer = null;
    if (rotateMin > 0) timer = setInterval(() => { if (!document.hidden) next(); }, rotateMin * 60000);
  }

  return {
    /** Primer fondo: siempre uno local (es instantáneo); el remoto llega en la primera rotación. */
    start(settings) {
      source = settings.bgSource;
      rotateMin = settings.bgRotateMin;
      localIndex = (localIndex + LOCAL_BACKGROUNDS.length - 1) % LOCAL_BACKGROUNDS.length;
      const first = nextLocal().then(show);
      schedule();
      return source === 'remote' ? first.then(next) : first;
    },
    configure(settings) {
      const changed = settings.bgSource !== source;
      source = settings.bgSource;
      rotateMin = settings.bgRotateMin;
      schedule();
      if (changed) next();
    },
    next: next,
  };
}
