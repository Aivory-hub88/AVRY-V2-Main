#!/bin/bash
# Install guard hooks untuk AVRY-V2-Main (parent) — cegah insiden 997 deleted avry-user-dashboard
set -e
ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
HOOK_DIR="$ROOT/.git/hooks"
echo "Installing guard hooks to $HOOK_DIR ..."
# pre-clean-guard
cat > "$HOOK_DIR/pre-clean-guard" <<'EOS'
#!/bin/bash
# Guard: cegah git clean / rm -rf hapus working tree submodule/symlink avry-user-dashboard
set -e
PROTECTED="frontend/avry-user-dashboard"
if git clean -nd 2>/dev/null | grep -q "$PROTECTED"; then
  echo "⛔ Guard: git clean akan hapus $PROTECTED (997 file pernah hilang, HEAD 3e04a3c aman)"
  echo "   Batal. Pakai: git clean -fdx -e $PROTECTED"
  exit 1
fi
exit 0
EOS
chmod +x "$HOOK_DIR/pre-clean-guard"
# alias.clean
git config alias.clean '!f() { sh .git/hooks/pre-clean-guard clean 2>/dev/null || return 1; /usr/bin/git clean "$@"; }; f'
echo "alias.clean = $(git config --get alias.clean)"
# pre-commit
cat > "$HOOK_DIR/pre-commit" <<'EOS'
#!/bin/bash
set -e
PROTECTED="frontend/avry-user-dashboard"
if git ls-tree HEAD "$PROTECTED" >/dev/null 2>&1; then
  del=$(git -C "$PROTECTED" status --porcelain 2>/dev/null | grep -c "^ D" || true)
  if [[ "$del" -gt 100 ]]; then
    echo "⛔ Guard: $PROTECTED terhapus massal ($del file)"
    exit 1
  fi
fi
exit 0
EOS
chmod +x "$HOOK_DIR/pre-commit"
echo "✓ Hooks installed. Test: git clean -nd | head"
