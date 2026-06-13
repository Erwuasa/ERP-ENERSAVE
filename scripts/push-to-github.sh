#!/usr/bin/env bash
# Crea el repositorio en GitHub y sube el código (requiere gh auth login)
set -euo pipefail

cd "$(dirname "$0")/.."

if ! gh auth status &>/dev/null; then
  echo "Primero inicia sesión en GitHub:"
  echo "  gh auth login -h github.com -p https -w"
  exit 1
fi

gh repo create ERP-ENERSAVE \
  --description "ERP ENERSAVE" \
  --source=. \
  --remote=origin \
  --public \
  --push

echo ""
echo "Repositorio creado y código subido."
gh repo view --web
