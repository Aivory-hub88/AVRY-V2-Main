#!/usr/bin/env python3
"""Add Mira (marketing_content) to a Cerveau config.toml, idempotently.

  apply_mira_config.py CONFIG BLOCK [--check]

CONFIG  the live (or a test copy of) config.toml, edited in place unless --check
BLOCK   the Mira blocks, taken from ops/cerveau-config/config.redacted.toml from the
        "Mira - Marketing & Content Agent" marker to the end of the file

What it does (each step skipped if already done, so a second run changes nothing):
  1. appends BLOCK, with <<REDACTED:x-bridge-key>> replaced by the real key read
     from the aivory-native-leads-qualifier server entry in CONFIG;
  2. adds "marketing_content" to [peer_groups.room_team].agents;
  3. adds the read-only native tool to [tool_risk_tiers].reversible.

Stdlib only. Validates the result with tomllib when available (Python 3.11+) and
refuses to write anything that does not parse. Never prints the key.
"""
import re
import sys

MARKER = "# ── Mira — Marketing & Content Agent"
TOOLS = [
    "aivory-native-marketing-content__campaign_links",
]


def bridge_key(s):
    m = re.search(
        r'name = "aivory-native-leads-qualifier"\n(?:.*\n)*?\[mcp\.servers\.headers\]\n(?:.*\n)*?x-bridge-key = "([^"]+)"',
        s,
    )
    if not m or m.group(1).startswith("<<REDACTED"):
        sys.exit("could not read the real x-bridge-key from the aivory-native-leads-qualifier entry")
    return m.group(1)


def apply(s, block):
    steps = []
    if "[agents.marketing_content]" not in s:
        key = bridge_key(s) if "<<REDACTED:x-bridge-key>>" in block else ""
        b = block.replace("<<REDACTED:x-bridge-key>>", key) if key else block
        s = s.rstrip("\n") + "\n\n" + b.strip("\n") + "\n"
        steps.append("appended Mira blocks")

    m = re.search(r'(\[peer_groups\.room_team\]\n(?:.*\n)*?agents = \[)([^\]]*)(\])', s)
    if not m:
        sys.exit("[peer_groups.room_team] agents list not found")
    if '"marketing_content"' not in m.group(2):
        s = s[: m.start(2)] + m.group(2).rstrip() + ', "marketing_content"' + s[m.end(2):]
        steps.append("added marketing_content to room_team")

    m = re.search(r"^reversible = \[\n", s, re.M)
    if not m:
        sys.exit("[tool_risk_tiers] reversible list not found")
    # Look only inside the reversible list: the name also appears in Mira's auto_approve.
    end = s.index("\n]", m.end())
    present = s[m.end():end]
    missing = [t for t in TOOLS if f'"{t}"' not in present]
    if missing:
        s = s[: m.end()] + "".join(f'    "{t}",\n' for t in missing) + s[m.end():]
        steps.append(f"added {len(missing)} read-only tool(s) to reversible")
    return s, steps


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    check = "--check" in sys.argv
    if len(args) != 2:
        sys.exit(__doc__)
    path, block_path = args
    s = open(path).read()
    block = open(block_path).read()
    if MARKER not in block:
        sys.exit("BLOCK does not start from the Mira marker; wrong file?")
    block = block[block.index(MARKER):]
    out, steps = apply(s, block)
    try:
        import tomllib
        d = tomllib.loads(out)
        assert "marketing_content" in d["agents"], "agents.marketing_content missing"
        assert "agent_marketing_content" in d["risk_profiles"], "risk profile missing"
        assert "marketing_content" in d["peer_groups"]["room_team"]["agents"], "room_team missing"
        assert all(t in d["tool_risk_tiers"]["reversible"] for t in TOOLS), "risk tiers missing"
        assert "<<REDACTED:x-bridge-key>>" not in out.split("# ── Mira")[1], "placeholder left in Mira block"
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
