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
from decide import decide_bant, decide_triage


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


def gold_decision(suite, case):
    """Gold-policy reference: escalate iff the gold policy escalates (triage);
    BANT gold status mapped to the action decide_bant would take at full
    confidence (qualified->handle, needs_followup->confirm, unqualified->handle)."""
    if suite == "triage":
        g = m.escalate_gold(case)
        if g is None:
            return None
        return "escalate" if g else "non-escalate"
    return {"qualified": "handle", "needs_followup": "confirm",
            "unqualified": "handle"}[m.bant_status(case["gold"])]


def main(paths):
    tri, bant = m.load_cases("triage"), m.load_cases("bant")
    cases = {c["id"]: ("triage", c) for c in tri}
    cases.update({c["id"]: ("bant", c) for c in bant})
    backends = [(p, load_results(p)) for p in paths]

    for path, res in backends:
        dist, agree, scored, esc_tp, esc_gold_n = {}, 0, 0, 0, 0
        for cid, (suite, case) in cases.items():
            if cid not in res:
                continue
            d = decide(suite, res[cid]["answers"])
            act = d["action"]
            dist[act] = dist.get(act, 0) + 1
            g = gold_decide(suite, case)
            if g is None:
                continue
            scored += 1
            if suite == "triage":
                pred = "escalate" if act == "escalate" else "non-escalate"
                agree += pred == g
                esc_gold_n += g == "escalate"
                esc_tp += pred == "escalate" == g
            else:
                agree += act == g
        print(f"== {Path(path).name}")
        print(f"   decisions: {dist}")
        print(f"   agreement vs gold policy: {agree}/{scored}")
        if esc_gold_n:
            print(f"   triage escalation recall vs gold: {esc_tp}/{esc_gold_n}")

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


def gold_decide(suite, case):
    return gold_decision(suite, case)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: python3 shadow_compare.py results/<a>.jsonl [results/<b>.jsonl ...]")
    main(sys.argv[1:])
