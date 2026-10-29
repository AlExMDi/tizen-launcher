// Icono grande de la derecha, con crossfade entre dos capas (A/B).
// Cambiamos el contenido de la capa oculta y luego alternamos su opacidad: así nunca se ve un
// "salto" ni hay que esperar a que acabe la animación anterior.

const ICON_HDMI =
  '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round">' +
  '<path d="M18 44h84v18l-10 14H28L18 62z"/><path d="M36 56h48"/></svg>';
const ICON_TV =
  '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="14" y="26" width="92" height="58" rx="8"/><path d="M44 98h32"/></svg>';
const ICON_SETTINGS =
  '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round">' +
  '<path d="M24 36h72M24 60h72M24 84h72"/><circle cx="46" cy="36" r="8" fill="#000"/>' +
  '<circle cx="78" cy="60" r="8" fill="#000"/><circle cx="56" cy="84" r="8" fill="#000"/></svg>';

// Color estable por nombre para los monogramas (no incluimos logos de marcas en el repo).
function hue(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

function monogram(name) {
  const el = document.createElement('div');
  el.className = 'hero-mono';
  el.style.backgroundColor = 'hsl(' + hue(name) + ', 38%, 30%)';
  el.textContent = name.charAt(0).toUpperCase();
  return el;
}

function glyph(svg) {
  const el = document.createElement('div');
  el.className = 'hero-glyph';
  el.innerHTML = svg;
  return el;
}

function contentFor(item) {
  if (item.kind === 'settings') return glyph(ICON_SETTINGS);
  if (item.kind === 'input') return glyph(item.source && item.source.type === 'HDMI' ? ICON_HDMI : ICON_TV);
  if (item.iconPath) {
    const img = new Image();
    img.className = 'hero-img';
    img.alt = '';
    // Si el icono no carga (p. ej. file:// bloqueado desde TizenBrew), monograma.
    img.onerror = () => {
      if (img.parentNode) img.parentNode.replaceChild(monogram(item.label), img);
    };
    img.src = item.iconPath;
    return img;
  }
  return monogram(item.label);
}

export function createHero(layerA, layerB) {
  let front = layerA;
  let back = layerB;
  let currentKey = null;

  return {
    show(item) {
      if (!item || item.key === currentKey) return;
      currentKey = item.key;
      back.textContent = '';
      back.appendChild(contentFor(item));
      back.classList.add('visible');
      front.classList.remove('visible');
      const tmp = front;
      front = back;
      back = tmp;
    },
  };
}
