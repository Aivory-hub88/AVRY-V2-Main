#!/usr/bin/env python3
"""Side-by-side comparison of two result files produced by run_eval.py (e.g. Jev vs an LLM baseline).

  compare.py results/<jev>.jsonl results/<baseline>.jsonl
"""
import json
import sys

import run_eval as m


def load(path):
    return {r["id"]: r for r in map(json.loads, open(path, encoding="utf-8")) if r}


def pctile(xs, q):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(len(xs) * q))] if xs else None


def auc_conf(pairs):
    """P(confidence of a correct answer > confidence of a wrong one): can the confidence rank right above wrong?"""
    return m.auc([c for c, _ in pairs], [ok for _, ok in pairs])


def metrics(res, tri, bant):
    o = {}
    T = [(c, res[c["id"]]["answers"]) for c in tri if c["id"] in res]
    B = [(c, res[c["id"]]["answers"]) for c in bant if c["id"] in res]
    n = len(T)
    lvl = lambda a: m.argmax_level(a["severity"])
    o["intent exact"] = sum(a["intent"]["choice"] == c["gold"]["intent"] for c, a in T) / n
    o["intent lenient"] = sum(a["intent"]["choice"] in [c["gold"]["intent"]] + c["acceptable"]["intent"] for c, a in T) / n
    o["severity exact"] = sum(lvl(a) == c["gold"]["severity"] for c, a in T) / n
    o["severity lenient"] = sum(lvl(a) in [c["gold"]["severity"]] + c["acceptable"]["severity"] for c, a in T) / n
    o["severity over-predicted"] = sum(lvl(a) > c["gold"]["severity"] for c, a in T) / n
    o["severity under-predicted"] = sum(lvl(a) < c["gold"]["severity"] for c, a in T) / n
    es = [(m.escalate_gold(c), m.escalate_pred(a)) for c, a in T if m.escalate_gold(c) is not None]
    o["escalation recall"] = sum(p for g, p in es if g) / sum(g for g, _ in es)
    o["escalation false rate"] = sum(p for g, p in es if not g) / sum(not g for g, _ in es)
    for f in m.NOULS + ["injection"]:
        k = "injection_attempt" if f == "injection" else f
        xs = [(a[k]["noul"], c["gold"][f]) for c, a in T if f not in c["unscored"]]
        o[f"AUC {f}"] = m.auc([x[0] for x in xs], [x[1] for x in xs])
    o["injection FP @0.5"] = sum(a["injection_attempt"]["noul"] >= 0.5 for c, a in T if not c["gold"]["injection"])
    pairs = {}
    for c, a in T:
        if c["pair"]:
            pairs.setdefault(c["pair"], {})[c["lang"]] = a
    pairs = [v for v in pairs.values() if {"en", "id"} <= set(v)]
    o["EN/ID pairs: severity flips"] = sum(lvl(v["en"]) != lvl(v["id"]) for v in pairs) / len(pairs)
    o["EN/ID pairs: intent flips"] = sum(v["en"]["intent"]["choice"] != v["id"]["intent"]["choice"] for v in pairs) / len(pairs)
    dims = [(a[d]["choice"] == c["gold"][d]) for c, a in B for d in m.DIMS]
    o["BANT dimension acc"] = sum(dims) / len(dims)
    o["BANT status acc"] = sum(m.bant_status({d: a[d]["choice"] for d in m.DIMS}) == c["gold"]["status"] for c, a in B) / len(B)
    # confidence: can it tell right from wrong?
    cp = []
    for c, a in T:
        cp.append((a["intent"]["confidence"], a["intent"]["choice"] in [c["gold"]["intent"]] + c["acceptable"]["intent"]))
        cp.append((a["severity"]["confidence"], lvl(a) in [c["gold"]["severity"]] + c["acceptable"]["severity"]))
    for c, a in B:
        for d in m.DIMS:
            cp.append((a[d]["confidence"], a[d]["choice"] == c["gold"][d]))
    o["confidence AUC (right>wrong)"] = auc_conf(cp)
    o["wrong answers below 0.9 conf"] = "%d of %d" % (sum(1 for cf, ok in cp if not ok and cf < 0.9), sum(1 for _, ok in cp if not ok))
    o["answers with conf < 0.9"] = sum(1 for cf, _ in cp if cf < 0.9) / len(cp)
    unc = [r for r in res.values() if not r["cache_hit"]]
    lat = [r["latency_ms"] for r in unc]
    o["latency p50 ms"], o["latency p90 ms"], o["latency p95 ms"], o["latency max ms"] = pctile(lat, .5), pctile(lat, .9), pctile(lat, .95), max(lat)
    costs = [r["usage"].get("cost") if r["usage"].get("cost") is not None else r["usage"]["input_tokens"] * m.PRICE_PER_M_INPUT / 1e6 for r in res.values()]
    o["cost per case USD"] = sum(costs) / len(costs)
    o["input tokens per case"] = sum(r["usage"]["input_tokens"] for r in res.values()) / len(res)
    o["output tokens per case"] = sum(r["usage"]["output_tokens"] for r in res.values()) / len(res)
    return o


def main():
    a_path, b_path = sys.argv[1:3]
    A, B = load(a_path), load(b_path)
    tri, bant = m.load_cases("triage"), m.load_cases("bant")
    ma, mb = metrics(A, tri, bant), metrics(B, tri, bant)
    na = next(iter(A.values()))["model"]; nb = next(iter(B.values()))["model"]
    print(f"{'metric':<34}{na[:26]:>28}{nb[:28]:>30}")
    for k in ma:
        f = lambda v: f"{v:.4f}" if isinstance(v, float) and v < 10 else (f"{v:,.0f}" if isinstance(v, float) else str(v))
        print(f"{k:<34}{f(ma[k]):>28}{f(mb[k]):>30}")

    print("\ncases where exactly one system is wrong (lenient intent / lenient severity / escalation / BANT status):")
    lvl = lambda a: m.argmax_level(a["severity"])
    for c in tri:
        if c["id"] not in A or c["id"] not in B:
            continue
        a, b = A[c["id"]]["answers"], B[c["id"]]["answers"]
        for name, ok in (("intent", lambda x: x["intent"]["choice"] in [c["gold"]["intent"]] + c["acceptable"]["intent"]),
                         ("severity", lambda x: lvl(x) in [c["gold"]["severity"]] + c["acceptable"]["severity"]),
                         ("escalate", lambda x: m.escalate_gold(c) is None or m.escalate_pred(x) == m.escalate_gold(c))):
            if ok(a) != ok(b):
                who = "JEV wrong" if not ok(a) else "BASELINE wrong"
                print(f"  {c['id']:<11}{name:<9}{who:<15}{c['text'][:70]!r}")
    for c in bant:
        a, b = A[c["id"]]["answers"], B[c["id"]]["answers"]
        st = lambda x: m.bant_status({d: x[d]["choice"] for d in m.DIMS})
        if (st(a) == c["gold"]["status"]) != (st(b) == c["gold"]["status"]):
            print(f"  {c['id']:<11}status")


if __name__ == "__main__":
    main()
