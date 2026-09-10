# Incident: avry-user-dashboard working tree terhapus 997 file

**Tanggal:** 2026-09-10
**Path:** `frontend/avry-user-dashboard`
**HEAD aman:** `3e04a3c fix(console): align VPS_BRIDGE dev fallback, tenant-aware stream with auth, lint and streaming race guard` (juga di `5a34eba` descendant)
**Dampak:** 997 file `deleted` di working tree, tidak ada loss history (`.git/modules/frontend/avry-user-dashboard` + `origin/main` aman). Sudah revive via `git -C frontend/avry-user-dashboard checkout -f HEAD -- .`

## Root cause
- `AVRY-V2-Main` simpan sebagai **submodule** `160000 commit` (`git ls-tree HEAD frontend/avry-user-dashboard`)
- `Frntend-nxt` simpan sebagai **symlink** `120000 blob 877... -> /home/ubuntu/avry-user-dashboard`
- `git checkout <branch>`, `git clean -fdx`, `rm -rf frontend/avry-user-dashboard` di parent dianggap hapus folder biasa — history tetap, working tree hilang

## Guard yang terpasang
- `.git/hooks/pre-clean-guard` + `alias.clean` (`git config alias.clean '!f() { sh .git/hooks/pre-clean-guard clean || return 1; /usr/bin/git clean "$@"; }; f'`)
- `.git/hooks/pre-commit` — abort jika `git -C frontend/avry-user-dashboard status | grep "^ D" >100`
- Tracked: `scripts/guard-avry-dashboard.sh`, `scripts/install-git-hooks.sh` — jalankan `bash scripts/install-git-hooks.sh` setelah clone

## SOP revive
```bash
git -C frontend/avry-user-dashboard checkout -f HEAD -- .
# atau
git submodule update --init --force frontend/avry-user-dashboard
# Frntend-nxt symlink:
ln -s /home/ubuntu/avry-user-dashboard frontend/avry-user-dashboard
```

## Pencegahan
- Jangan `rm -rf frontend/avry-user-dashboard`
- Pakai `git clean -fdx -e frontend/avry-user-dashboard`
- Cek sebelum destruktif: `git -C frontend/avry-user-dashboard status --short | wc -l` + `rev-parse HEAD`
