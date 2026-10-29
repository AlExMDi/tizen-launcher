#!/bin/sh
# Empaqueta el launcher como .wgt firmado con tu perfil de certificado de Tizen Studio.
# Uso: npm run wgt            (perfil "launcher")
#      TIZEN_PROFILE=otro npm run wgt
set -e

PROFILE="${TIZEN_PROFILE:-launcher}"
OUT=build/wgt

npm run build
rm -rf "$OUT"
mkdir -p "$OUT"
cp -R dist/. "$OUT"/
cp tizen/config.xml tizen/icon.png "$OUT"/

if ! command -v tizen >/dev/null 2>&1; then
  echo "No encuentro la CLI 'tizen'. Añade ~/tizen-studio/tools/ide/bin al PATH."
  echo "La carpeta lista para empaquetar está en $OUT"
  exit 1
fi

tizen package -t wgt -s "$PROFILE" -- "$OUT"
mv "$OUT"/*.wgt build/
echo "Listo: $(ls build/*.wgt)"
