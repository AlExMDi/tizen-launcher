// Panel de diagnóstico (tecla azul). Sirve para ver en la propia tele lo que haría falta mirar
// con Remote Inspector, que dentro de TizenBrew no está disponible: plataforma detectada y,
// para cada app, la ruta del icono y si se puede leer.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createDiag(root) {
  let isOpen = false;

  function render(lines) {
    root.innerHTML = '<div class="d-title">Diagnóstico</div><pre class="d-body">' + esc(lines.join('\n')) +
      '</pre><div class="d-hint">Azul o Back para cerrar</div>';
  }

  return {
    isOpen: () => isOpen,
    open(platform, state) {
      isOpen = true;
      root.classList.remove('hidden');
      const head = [
        'Plataforma: ' + platform.name,
        'URL: ' + window.location.href,
        'Apps instaladas visibles: ' + state.installed.length,
        'Inputs: ' + state.inputs.mode,
        '',
      ];
      if (!platform.diagnose) {
        render(head.concat(state.installed.slice(0, 12).map((a) => a.name + '  →  ' + (a.iconPath || 'sin iconPath'))));
        return;
      }
      render(head.concat(['Consultando al servicio…']));
      platform.diagnose().then((d) => {
        if (!isOpen) return;
        render(head.concat(['getAppsInfo total: ' + d.total, 'app · lectura en servicio · HTTP a la página · ruta', '']).concat(
          d.apps.map((a) => a.name + ' · ' + a.read + ' · ' + a.http + ' · ' + (a.iconPath || '-')),
        ));
      }, (e) => {
        if (isOpen) render(head.concat(['Error del servicio: ' + e.message]));
      });
    },
    close() {
      isOpen = false;
      root.classList.add('hidden');
    },
  };
}
