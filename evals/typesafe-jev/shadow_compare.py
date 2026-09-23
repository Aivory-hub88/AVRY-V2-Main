#!/usr/bin/env python3
"""P1 shadow compare (ADR-017): run decide.py over stored backend answers and
compare decisions — backend vs backend, and each backend vs the gold policy.

Backends are interchangeable files produced by run_eval.py (fake_jev, Jev, --llm);
decisions must be stable across them on clear cases and diverge only where the
answers themselves disagree.

  python3 shadow_compare.py results/<a>.jsonl [results/<b>.jsonl ...]
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import run_eval as m
from decide import decide_bant, decide_triage, summarize


def load_results(path):
    out = {}
    for line in open(path, encoding="utf-8"):
        r = json.loads(line)
        if r:
            out[r["id"]] = r
    return out


def decide(suite, answers):
    if suite == "triage":
        return decide_triage(answers)
    return decide_bant(answers)


def main(paths):
    tri, bant = m.load_cases("triage"), m.load_cases("bant")
    cases = {c["id"]: ("triage", c) for c in tri}
    cases.update({c["id"]: ("bant", c) for c in bant})
    backends = [(p, load_results(p)) for p in paths]

    for path, res in backends:
        s = summarize(cases, res)
        print(f"== {Path(path).name}")
        print(f"   decisions: {s['dist']}")
        print(f"   agreement vs gold policy: {s['agree']}/{s['scored']}")
        if s["esc_gold"]:
            print(f"   triage escalation recall vs gold: {s['esc_tp']}/{s['esc_gold']}")

    if len(backends) == 2:
        (pa, ra), (pb, rb) = backends
        same = diff = 0
        diff_ids = []
        for cid, (suite, _) in cases.items():
            if cid in ra and cid in rb:
                da, db = decide(suite, ra[cid]["answers"])["action"], decide(suite, rb[cid]["answers"])["action"]
                if da == db:
                    same += 1
                else:
                    diff += 1
                    diff_ids.append((cid, da, db))
        print(f"== cross-backend decision agreement: {same}/{same + diff}")
        for cid, da, db in diff_ids[:15]:
            print(f"   {cid}: {Path(pa).name.split('-')[0]}={da} vs {Path(pb).name.split('-')[0]}={db}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: python3 shadow_compare.py results/<a>.jsonl [results/<b>.jsonl ...]")
    main(sys.argv[1:])
