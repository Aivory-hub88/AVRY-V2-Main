#!/bin/bash
# Guard: cegah git clean / rm -rf hapus working tree submodule/symlink avry-user-dashboard
# Insiden: 997 file deleted, HEAD 3e04a3c aman (2026-09-10), sudah revive via git checkout -f HEAD -- .
# Parent: AVRY-V2-Main (submodule 160000), Frntend-nxt (symlink 120000 -> /home/ubuntu/avry-user-dashboard)
set -e
PROTECTED="frontend/avry-user-dashboard"
if git clean -nd 2>/dev/null | grep -q "$PROTECTED"; then
  echo "⛔ Guard: git clean akan hapus $PROTECTED (997 file pernah hilang, HEAD 3e04a3c aman)"
  echo "   Batal. Pakai: git clean -fdx -e $PROTECTED"
  echo "   Revive: git -C $PROTECTED checkout -f HEAD -- .  atau  git submodule update --init --force $PROTECTED"
  exit 1
fi
if git ls-tree HEAD "$PROTECTED" >/dev/null 2>&1; then
  del=$(git -C "$PROTECTED" status --porcelain 2>/dev/null | grep -c "^ D" || true)
  if [[ "$del" -gt 100 ]]; then
    echo "⛔ Guard: $PROTECTED terhapus massal ($del file)"
    exit 1
  fi
fi
if git ls-tree HEAD -- frontend/avry-user-dashboard 2>/dev/null | grep -q "120000"; then
  if [[ ! -L "frontend/avry-user-dashboard" ]]; then
    echo "⚠️ Guard: symlink frontend/avry-user-dashboard hilang (Frntend-nxt)"
  fi
fi
exit 0
