# PLAN — Launcher minimalista para Samsung Q80BA (Tizen 6.5)

## Lo que he comprobado (fuentes)

| Tema | Hallazgo | Fuente |
|---|---|---|
| Motor web | 2022 / Tizen 6.5 → **Chromium M85** (2021 = M76, 2023 = M94) | Samsung, *Web Engine Specifications* |
| TizenBrew, módulo app | `package.json` con `packageType: "app"`, `appName`, `appPath`, `keys` (opcional `serviceFile`) | `TizenBrew/docs/MODULES.md` |
| Cómo carga TizenBrew los módulos | Descarga `https://cdn.jsdelivr.net/<gh/usuario/repo>/package.json`. Sirve los ficheros a través de un proxy local `http://127.0.0.1:8081/module/<módulo>/<appPath>` y hace `location.href = appPath` **en su propia ventana**. Antes registra las `keys` del `package.json`. | `service-nextgen/service/utils/moduleLoader.js`, `index.js`, `Modules.jsx` |
| Consecuencia | Hay que **commitear `dist/`** (jsDelivr sirve el repo tal cual) y usar rutas relativas. El launcher corre con **los privilegios de TizenBrew**: `application.launch`, `tv.inputdevice` e `internet`, pero **no `tv.window`**. | `TizenBrew/config.xml` |
| Añadir módulo | Module Manager → "Add GitHub Module" → `usuario/repo` (se guarda como `gh/usuario/repo`; admite `@tag`). Existe "Autolaunch" para abrirlo al arrancar TizenBrew. | `ModuleManager.jsx`, `lang/en.json` |
| `getAppsInfo()` | **No requiere privilegio**, salvo el campo `size` (`application.info`). Campos útiles: `id`, `name`, `iconPath`, `show`. | Samsung, *Application API* |
| `launch(id)` | `application.launch` (public) | Samsung, *Application API* |
| Teclas | `tv.inputdevice` (public). Flechas, Enter y Back son obligatorias y **no se registran**. Códigos reales con `getKey(name).code`. | Samsung, *TVInputDevice API* |
| Fuentes de vídeo | `systeminfo.getPropertyValue("VIDEOSOURCE")` → `{connected[], disconnected[]}` de `{type, number}`. No pide privilegio. | Samsung, *SystemInfo API* |
| Cambiar fuente | `tvwindow.setSource(src, ok, err)` necesita `tv.window` (**public**, no partner). | Samsung, *TVWindow API* |

## Inputs (HDMI/TV): conclusión

- **Documentado:** `tvwindow.setSource()` cambia la fuente de la *ventana de TV de la app* (un rectángulo de vídeo dentro de la app). No es un cambio de fuente del sistema.
- **Comprobado por la comunidad, no documentado:** llamar a `setSource({type:'HDMI', number:N})` y después `tizen.application.launch('org.tizen.tv-viewer')` deja la tele mostrando esa fuente a pantalla completa. Lo han probado en una S95B de 2022 (Tizen 6.5, misma generación que la Q80BA) y en una de 2018. Ojo: un puerto sin señal aparece en `disconnected`, no en `connected`.
- **No hay API documentada** para abrir el selector de fuentes nativo. No lo invento.
- **Decisión:**
  - `.wgt` (incluye `tv.window`): elementos HDMI reales sacados de `VIDEOSOURCE`, con `setSource()` y luego `tv-viewer`.
  - TizenBrew (sin `tv.window`): `setSource` lanza `SecurityError`, así que la sección queda en un único elemento **"TV"** que abre `org.tizen.tv-viewer` en la última fuente usada.
  - Ajuste "Inputs": `auto` / `solo TV` / `ocultar`. Si `org.tizen.tv-viewer` no aparece en `getAppsInfo`, la sección se oculta.

## Arquitectura

```
index.html            escenario fijo de 1920×1080 escalado al viewport
src/main.js           arranque y bucle de teclas
src/platform/         index.js elige tizen.js o mock.js (única puerta a tizen.*)
src/keys.js           keycodes TV + equivalentes de teclado
src/settings.js       ajustes en localStorage con try/catch y valores por defecto
src/apps.js           resuelve favoritos por nombre contra getAppsInfo (+ appId fallback)
src/ui/home.js        lista con posiciones calculadas (solo transform/opacity)
src/ui/hero.js        icono grande con crossfade A/B
src/ui/clock.js       reloj alineado al minuto; nombres de mes/día propios (es/en)
src/ui/background.js  2 capas con crossfade lento, precarga con img.decode()
src/ui/settings.js    pantalla de ajustes (modal; Back la cierra)
public/backgrounds/   JPG 1920×1080 incluidos en el paquete
tizen/config.xml      para el .wgt
```

- **Build:** Vite con `target: es2019` y `cssTarget: chrome85`, salida **IIFE clásica** (sin `type="module"`) y `base: './'`. Así funciona desde `file://` (wgt) y desde el proxy de TizenBrew.
- **Iconos:** uso el `iconPath` real de cada app instalada. Si falla, un monograma (no meto logos de marcas en el repo).
- **Fondos:** genero 6 paisajes propios por script (sin problemas de licencia). Opción remota con Picsum y fallback a los locales.
- **Fuente:** Inter variable (OFL), copiada de `@fontsource-variable/inter` a `src/assets`. Sin red en runtime.

## Fases (un commit o más por fase, verificadas con Playwright a 1920×1080)
1. UI estática y navegación con mock.
2. Animaciones de foco, crossfade del icono, fondos con rotación.
3. Ajustes y persistencia.
4. Capa Tizen real, `config.xml`, `package.json` de TizenBrew y script del `.wgt`.

## Dudas abiertas
1. **Inputs en tu Q80BA:** hay que probar en la tele que `setSource()` + `tv-viewer` cambian de verdad la fuente del sistema. También, que `tv-viewer` existe con ese id (lo verá Remote Inspector con `getAppsInfo()`).
2. **`iconPath` dentro de TizenBrew:** la página se sirve desde `http://127.0.0.1:8081`, así que cargar `file:///opt/...icon.png` podría estar bloqueado. Si pasa, saldrá el monograma; en el `.wgt` debería verse.
3. **appId de fallback** (Netflix, YouTube…): salen de listas comunitarias, no de Samsung. Solo se usan si no se encuentra la app por nombre. Son editables en `src/config.js`.
4. **Back en la pantalla principal:** no hace nada. Un launcher no debe cerrarse por accidente y en TizenBrew cerraría TizenBrew entero. Se sale con Home.
5. **Remote Inspector con TizenBrew:** el servicio de TizenBrew se conecta él mismo por CDP a su app (por eso pide la IP 127.0.0.1). Depurar es más fácil con el `.wgt`.
