// Servicio del módulo para TizenBrew (campo `serviceFile` del package.json).
//
// Por qué existe: dentro de TizenBrew, la página del launcher se sirve como web normal desde
// http://127.0.0.1:8081 y NO tiene `window.tizen`. TizenBrew sí expone `tizen` (con sus
// privilegios) a los servicios de los módulos, que ejecuta con Node.js dentro de un `vm`.
// Este servicio hace de puente: una mini API HTTP en 127.0.0.1 que la página consulta con fetch.
//
// Restricciones del entorno:
//  - El Node de los servicios de Tizen es antiguo (TizenBrew avisa de Node 4.4.3), así que este
//    archivo es ES5: var, function, sin template strings ni destructuring.
//  - TizenBrew lo descarga de jsDelivr como texto y lo evalúa tal cual: un solo archivo y solo
//    módulos nativos de Node (http, fs, url).

var http = require('http');
var fs = require('fs');
var url = require('url'); // url.parse: el Node 4 de Tizen no tiene la clase global URL

var PORT = 8183; // libre: TizenBrew usa 8081 y TizenTube 8085/8095
var TV_VIEWER_ID = 'org.tizen.tv-viewer';

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'application/json; charset=utf-8',
    // La página vive en otro origen (puerto 8081): hace falta CORS.
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function fail(res, e) {
  send(res, 500, { error: String((e && (e.name + ': ' + e.message)) || e) });
}

function getAppsInfo(ok, err) {
  try {
    tizen.application.getAppsInfo(ok, err);
  } catch (e) {
    err(e);
  }
}

// Los iconos son ficheros del sistema (p. ej. /opt/usr/globalapps/<pkg>/shared/res/icon.png).
// Solo servimos rutas que getAppsInfo() haya devuelto como icono, no cualquier fichero.
var allowedIcons = {};

var routes = {
  '/ping': function (req, res) {
    send(res, 200, { ok: true, version: 1 });
  },

  '/apps': function (req, res) {
    getAppsInfo(function (list) {
      var self = '';
      try { self = tizen.application.getAppInfo().id; } catch (e) { /* sin id propio */ }
      allowedIcons = {};
      var apps = [];
      var hasViewer = false;
      for (var i = 0; i < list.length; i++) {
        var a = list[i];
        if (a.id === TV_VIEWER_ID) hasViewer = true;
        if (!a.show || a.id === self || a.id === TV_VIEWER_ID) continue;
        if (a.iconPath) allowedIcons[a.iconPath] = true;
        apps.push({ id: a.id, name: a.name, iconPath: a.iconPath || null });
      }
      send(res, 200, { apps: apps, hasViewer: hasViewer });
    }, function (e) { fail(res, e); });
  },

  '/launch': function (req, res, query) {
    if (!query.id) return send(res, 400, { error: 'falta id' });
    try {
      tizen.application.launch(query.id, function () {
        send(res, 200, { ok: true });
      }, function (e) { fail(res, e); });
    } catch (e) {
      fail(res, e);
    }
  },

  '/model': function (req, res) {
    var model = '';
    try { model = tizen.systeminfo.getCapability('http://tizen.org/system/model_name'); } catch (e) { /* vacío */ }
    send(res, 200, { model: model });
  },

  // Diagnóstico de iconos: para cada app visible, qué ruta da el sistema y si podemos leerla.
  // Lo muestra la página con la tecla azul (src/ui/diag.js).
  '/diag': function (req, res) {
    getAppsInfo(function (list) {
      var apps = [];
      for (var i = 0; i < list.length; i++) if (list[i].show) apps.push(list[i]);
      apps = apps.slice(0, 12);
      var out = [];
      var pending = apps.length;
      if (!pending) return send(res, 200, { total: list.length, apps: out });
      apps.forEach(function (a, idx) {
        var path = String(a.iconPath || '').replace(/^file:\/\//, '');
        if (!path) {
          out[idx] = { name: a.name, iconPath: a.iconPath || null, read: 'sin iconPath' };
          if (--pending === 0) send(res, 200, { total: list.length, apps: out });
          return;
        }
        fs.readFile(path, function (e, data) {
          out[idx] = { name: a.name, iconPath: a.iconPath, read: e ? (e.code || String(e)) : 'OK ' + data.length + ' B' };
          if (--pending === 0) send(res, 200, { total: list.length, apps: out });
        });
      });
    }, function (e) { fail(res, e); });
  },

  '/icon': function (req, res, query) {
    var path = String(query.path || '').replace(/^file:\/\//, '');
    if (!allowedIcons[query.path] && !allowedIcons[path]) return send(res, 403, { error: 'icono no permitido' });
    fs.readFile(path, function (e, data) {
      if (e) return send(res, 404, { error: 'no encontrado' });
      var type = /\.jpe?g$/i.test(path) ? 'image/jpeg' : 'image/png';
      res.writeHead(200, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=86400' });
      res.end(data);
    });
  }
};

var server = http.createServer(function (req, res) {
  var parsed = url.parse(req.url, true);
  var handler = routes[parsed.pathname];
  if (!handler) return send(res, 404, { error: 'ruta desconocida' });
  try {
    handler(req, res, parsed.query);
  } catch (e) {
    fail(res, e);
  }
});

// Si TizenBrew ya tenía una instancia escuchando (se reabre el módulo), no rompemos nada.
server.on('error', function (e) {
  console.log('[launcher-service] ' + e.code);
});

// Solo 127.0.0.1: la API no debe ser accesible desde otros equipos de la red.
server.listen(PORT, '127.0.0.1');
