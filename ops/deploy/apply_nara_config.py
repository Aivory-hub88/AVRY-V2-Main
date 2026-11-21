#!/usr/bin/env python3
"""Add Nara (deep_researcher) to a Cerveau config.toml, idempotently.

  apply_nara_config.py CONFIG BLOCK [--check] [--replace]

CONFIG  the live (or a test copy of) config.toml, edited in place unless --check
BLOCK   the Nara blocks, taken from ops/cerveau-config/config.redacted.toml from the
        "Nara - Research & Evidence Agent" marker to the end of the file

What it does (each step skipped if already done, so a second run changes nothing):
  1. appends BLOCK (Nara has no native MCP server, so there is no key to substitute);
     with --replace, an existing Nara block (from the marker to the next "# ── " marker or the end
     of the file) is replaced by BLOCK instead, so a later edit to the block can be rolled out;
  2. adds "deep_researcher" to [peer_groups.room_team].agents.

Stdlib only. Validates the result with tomllib when available (Python 3.11+) and
refuses to write anything that does not parse. It does not change [web_search]: switching
the search provider needs a key and is a separate, deliberate step.
"""
import re
import sys

MARKER = "# ── Nara — Research & Evidence Agent"


def apply(s, block, replace=False):
    steps = []
    if "[agents.deep_researcher]" not in s:
        s = s.rstrip("\n") + "\n\n" + block.strip("\n") + "\n"
        steps.append("appended Nara blocks")
    elif replace and MARKER in s:
        start = s.index(MARKER)
        nxt = s.find("\n# ── ", start + len(MARKER))
        end = nxt + 1 if nxt != -1 else len(s)
        new = block.strip("\n") + "\n"
        if s[start:end].strip("\n") != new.strip("\n"):
            tail = s[end:]
            s = s[:start] + new + ("\n" + tail if tail else "")
            steps.append("replaced Nara blocks")

    m = re.search(r'(\[peer_groups\.room_team\]\n(?:.*\n)*?agents = \[)([^\]]*)(\])', s)
    if not m:
        sys.exit("[peer_groups.room_team] agents list not found")
    if '"deep_researcher"' not in m.group(2):
        s = s[: m.start(2)] + m.group(2).rstrip() + ', "deep_researcher"' + s[m.end(2):]
        steps.append("added deep_researcher to room_team")
    return s, steps


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    check = "--check" in sys.argv
    replace = "--replace" in sys.argv
    if len(args) != 2:
        sys.exit(__doc__)
    path, block_path = args
    s = open(path).read()
    block = open(block_path).read()
    if MARKER not in block:
        sys.exit("BLOCK does not start from the Nara marker; wrong file?")
    block = block[block.index(MARKER):]
    out, steps = apply(s, block, replace)
    try:
        import tomllib
        d = tomllib.loads(out)
        assert "deep_researcher" in d["agents"], "agents.deep_researcher missing"
        assert "agent_deep_researcher" in d["risk_profiles"], "risk profile missing"
        assert d["risk_profiles"]["agent_deep_researcher"]["delegation_policy"]["mode"] == "forbidden", "delegation must be forbidden"
        assert d["runtime_profiles"]["agent_deep_researcher"]["max_delegation_depth"] == 1, "depth must be 1"
        assert "deep_researcher" in d["peer_groups"]["room_team"]["agents"], "room_team missing"
        assert any(x["agent"] == "deep_researcher" for x in d["agents"]["chief_of_staff"]["delegates"]), "Aira delegate edge missing"
    except ImportError:
        print("note: tomllib unavailable (Python < 3.11); skipping parse check, run zeroclaw doctor", file=sys.stderr)
    if not steps:
        print("already applied; no change")
        return
    if check:
        print("would apply:", "; ".join(steps))
        return
    open(path, "w").write(out)
    print("applied:", "; ".join(steps))


if __name__ == "__main__":
    main()
