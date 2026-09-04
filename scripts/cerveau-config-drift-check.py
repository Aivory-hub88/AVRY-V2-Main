#!/usr/bin/env python3
"""Detect config drift between the two Cerveau instances behind HAProxy.

Both daemons serve the same traffic (`zeroclaw-cerveau` :3100 from
`~/.zeroclaw-cerveau`, `zeroclaw-cerveau-b` :3101 from `~/.zeroclaw-cerveau-b`),
so any difference in resolved config makes behaviour depend on which one
happens to answer a request. ADR-011 closed six such differences that had
accumulated silently; nothing prevented them recurring, which is what this
guards.

Compares **resolved** values (`zeroclaw config list`), not file text — file
diffs are dominated by line ordering and are useless here. List-valued
settings are compared as sets, because the order of an allow-list carries no
meaning; a membership difference does.

Exit codes, chosen for systemd/cron: 0 = no drift (prints one quiet line),
1 = real drift found (details on stderr, so a mailing cron surfaces only
this), 2 = the check itself could not run.
"""

from __future__ import annotations

import ast
import re
import subprocess
import sys
from datetime import datetime, timezone

BINARY = "/usr/local/bin/zeroclaw-cerveau"
INSTANCE_A = "/home/ubuntu/.zeroclaw-cerveau"
INSTANCE_B = "/home/ubuntu/.zeroclaw-cerveau-b"

# Keys that *must* differ: each instance points at its own copy of the
# stdio MCP binaries and its own per-tenant workspace root. Anything else
# differing is drift.
EXPECTED_DIFFERENT_PREFIXES = (
    "mcp.servers.obscura.",
    "mcp.servers.pdf-oxide.",
)

LINE = re.compile(r"\s*(\S+)\s+=\s+(.*?)\s+\((.*)\)\s*$")


def read_config(config_dir: str) -> dict[str, tuple[str, str]]:
    try:
        proc = subprocess.run(
            [BINARY, "config", "list", "--config-dir", config_dir],
            capture_output=True,
            text=True,
            timeout=120,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise SystemExit(f"drift-check: cannot run `config list` for {config_dir}: {exc}") from exc
    if proc.returncode != 0:
        raise SystemExit(
            f"drift-check: `config list` failed for {config_dir} "
            f"(exit {proc.returncode}): {proc.stderr.strip()[:300]}"
        )

    out: dict[str, tuple[str, str]] = {}
    for line in proc.stdout.splitlines():
        m = LINE.match(line.rstrip())
        if m:
            out[m.group(1)] = (m.group(2), m.group(3))
    if not out:
        raise SystemExit(f"drift-check: parsed zero keys from {config_dir} — output shape changed?")
    return out


def compare(a: dict[str, tuple[str, str]], b: dict[str, tuple[str, str]]) -> list[str]:
    findings: list[str] = []
    for key in sorted(set(a) | set(b)):
        if key.startswith(EXPECTED_DIFFERENT_PREFIXES):
            continue
        va, ta = a.get(key, ("<missing>", ""))
        vb, _tb = b.get(key, ("<missing>", ""))
        if va == vb:
            continue

        if ta.startswith("Vec<String>"):
            try:
                la, lb = ast.literal_eval(va), ast.literal_eval(vb)
            except (ValueError, SyntaxError):
                findings.append(f"{key}: differs, and the value could not be parsed to compare")
                continue
            only_a = [x for x in la if x not in lb]
            only_b = [x for x in lb if x not in la]
            if not only_a and not only_b:
                continue  # same members, different order — not drift
            parts = []
            if only_a:
                parts.append(f"only on A: {only_a}")
            if only_b:
                parts.append(f"only on B: {only_b}")
            findings.append(f"{key}: " + "; ".join(parts))
        else:
            findings.append(f"{key}: A={va} | B={vb}")
    return findings


def main() -> int:
    # Both dirs can be overridden so this is testable against a known-drifted
    # pair without touching production — a checker nobody has watched fail is
    # not yet known to work.
    args = sys.argv[1:]
    if len(args) == 2:
        dir_a, dir_b = args
    elif not args:
        dir_a, dir_b = INSTANCE_A, INSTANCE_B
    else:
        raise SystemExit("usage: cerveau-config-drift-check.py [<config-dir-a> <config-dir-b>]")

    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    a = read_config(dir_a)
    b = read_config(dir_b)
    findings = compare(a, b)

    if not findings:
        print(f"[{stamp}] Cerveau config drift: none ({len(a)} keys compared)")
        return 0

    print(
        f"[{stamp}] Cerveau config drift: {len(findings)} difference(s) between "
        f"{dir_a} and {dir_b} — the two instances serve the same traffic, "
        f"so behaviour now depends on which one answers. See docs/ADR-011.",
        file=sys.stderr,
    )
    for f in findings:
        print(f"  - {f}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
