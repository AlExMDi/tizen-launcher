// Lista vertical de la izquierda (Apps / Inputs / Ajustes).
//
// Rendimiento: cada elemento se dibuja siempre a tamaño grande (84 px) y se reduce con
// `transform: scale()`. Las posiciones se calculan en JS y se aplican con translate3d.
// Así, al mover el foco solo cambian transform y opacity, que el compositor anima en GPU sin
// relayout. Si animásemos font-size o top, la CPU de la tele recalcularía el layout en cada frame.
//
// No ponemos `will-change: transform` fijo: Chromium rasterizaría el texto una vez a la escala
// inicial y se vería borroso al ampliarlo. Sin will-change, al acabar la transición lo
// vuelve a rasterizar nítido.

const FONT_PX = 84; // tamaño real del texto (= tamaño enfocado)
const SMALL_SCALE = 0.42; // ≈ 35 px visibles cuando no está enfocado
const SLOT_BIG = 124; // alto reservado para el elemento enfocado
const SLOT_SMALL = 54;
const LABEL_H = 40;
const SECTION_GAP = 34;
const FOCUS_Y = 440; // el elemento enfocado se queda siempre a esta altura (coordenadas del stage)

export function createHome(listEl, handlers) {
  let items = [];
  let rows = []; // [{ type: 'label' | 'item', el, index? }]
  let focus = 0;

  function setItems(newItems, keepKey) {
    const prevKey = keepKey || (items[focus] && items[focus].key);
    items = newItems;
    listEl.textContent = '';
    rows = [];
    let lastSection;
    items.forEach((item, i) => {
      if (item.section !== lastSection) {
        lastSection = item.section;
        if (item.section) {
          const label = document.createElement('div');
          label.className = 'list-label';
          label.textContent = item.sectionLabel;
          listEl.appendChild(label);
          rows.push({ type: 'label', el: label, firstIndex: i });
        } else {
          rows.push({ type: 'gap' });
        }
      }
      const el = document.createElement('div');
      el.className = 'list-item';
      el.textContent = item.label;
      listEl.appendChild(el);
      rows.push({ type: 'item', el: el, index: i });
    });
    let idx = 0;
    for (let i = 0; i < items.length; i++) if (items[i].key === prevKey) idx = i;
    focus = Math.min(idx, Math.max(0, items.length - 1));
    // Sin transición en el primer pintado para que no "vuele" desde arriba.
    listEl.classList.add('no-anim');
    layout();
    // Forzar reflow antes de reactivar transiciones (si no, el navegador agrupa ambos cambios).
    void listEl.offsetHeight;
    listEl.classList.remove('no-anim');
    if (items.length) handlers.onFocus(items[focus]);
  }

  function layout() {
    // 1) Posiciones "en reposo" de cada fila dado el foco actual.
    let y = 0;
    let focusY = 0;
    const pos = [];
    rows.forEach((row, r) => {
      if (row.type === 'gap') {
        y += SECTION_GAP;
      } else if (row.type === 'label') {
        if (r > 0) y += SECTION_GAP;
        pos.push(y);
        y += LABEL_H;
      } else {
        const big = row.index === focus;
        const slot = big ? SLOT_BIG : SLOT_SMALL;
        const scale = big ? 1 : SMALL_SCALE;
        // Centramos verticalmente el texto escalado dentro de su hueco.
        const top = y + (slot - FONT_PX * scale) / 2;
        if (big) focusY = top;
        pos.push(top);
        y += slot;
      }
    });
    // 2) Desplazamos toda la lista para que el enfocado quede en FOCUS_Y.
    const offset = FOCUS_Y - focusY;
    let p = 0;
    rows.forEach((row) => {
      if (row.type === 'gap') return;
      const top = pos[p++] + offset;
      if (row.type === 'label') {
        const dist = Math.abs(row.firstIndex - focus);
        row.el.style.opacity = String(Math.max(0, 0.55 - 0.07 * dist));
        row.el.style.transform = 'translate3d(0,' + top + 'px,0)';
      } else {
        const big = row.index === focus;
        const dist = Math.abs(row.index - focus);
        // Se apagan con la distancia: da profundidad y evita una máscara (que sería más cara).
        const opacity = big ? 1 : Math.max(0, 0.6 - 0.075 * (dist - 1));
        row.el.style.opacity = String(opacity);
        row.el.style.transform = 'translate3d(0,' + top + 'px,0) scale(' + (big ? 1 : SMALL_SCALE) + ')';
        row.el.classList.toggle('focused', big);
      }
    });
  }

  function setFocus(i) {
    if (!items.length) return;
    const next = Math.max(0, Math.min(items.length - 1, i));
    if (next === focus) return;
    focus = next;
    layout();
    handlers.onFocus(items[focus]);
  }

  return {
    setItems: setItems,
    move: (dir) => setFocus(focus + dir),
    focusIndex: setFocus,
    current: () => items[focus],
  };
}
