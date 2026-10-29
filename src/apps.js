// Combina las apps instaladas con los favoritos y con el orden guardado por el usuario.
import { FAVORITES } from './config.js';

const norm = (s) => String(s || '').toLowerCase();

/** Busca cada favorito por nombre entre las apps instaladas (y si no, por su appId de fallback). */
export function resolveFavorites(installed) {
  const out = [];
  FAVORITES.forEach((fav) => {
    let app = null;
    for (let i = 0; i < installed.length && !app; i++) {
      const name = norm(installed[i].name);
      if (fav.match.some((m) => name.indexOf(m) !== -1)) app = installed[i];
    }
    if (!app && fav.fallbackId) {
      app = installed.filter((a) => a.id === fav.fallbackId)[0] || null;
      // Si getAppsInfo() falló (lista vacía), confiamos en el fallback a ciegas:
      // como mucho, launch() fallará y mostraremos un aviso.
      if (!app && installed.length === 0) app = { id: fav.fallbackId, name: fav.name, iconPath: null };
    }
    if (app && !out.some((a) => a.id === app.id)) out.push(app);
  });
  return out;
}

/**
 * Devuelve la lista completa ordenada [{ id, name, iconPath, visible }].
 * - saved === null → los favoritos encontrados son visibles y el resto, ocultos.
 * - saved = lista guardada → se respeta su orden y visibilidad; se descartan las apps
 *   desinstaladas y las nuevas se añaden al final como ocultas.
 */
export function buildAppList(installed, saved) {
  const byId = {};
  installed.forEach((a) => { byId[a.id] = a; });

  if (!saved) {
    const favs = resolveFavorites(installed);
    const favIds = favs.map((a) => a.id);
    return favs.map((a) => withVisibility(a, true))
      .concat(installed.filter((a) => favIds.indexOf(a.id) === -1).map((a) => withVisibility(a, false)));
  }

  const seen = {};
  const list = [];
  saved.forEach((s) => {
    // Sin lista de instaladas (getAppsInfo falló) mantenemos lo guardado tal cual.
    const app = byId[s.id] || (installed.length === 0 ? { id: s.id, name: s.name, iconPath: null } : null);
    if (app && !seen[app.id]) {
      seen[app.id] = true;
      list.push(withVisibility(app, s.visible !== false));
    }
  });
  installed.forEach((a) => {
    if (!seen[a.id]) list.push(withVisibility(a, false));
  });
  return list;
}

function withVisibility(app, visible) {
  return { id: app.id, name: app.name, iconPath: app.iconPath || null, visible: visible };
}

/** Lo que se persiste: sin iconPath (puede cambiar al actualizar la app). */
export function toSaved(list) {
  return list.map((a) => ({ id: a.id, name: a.name, visible: a.visible }));
}
