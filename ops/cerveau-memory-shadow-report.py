#!/usr/bin/env python3
"""Summarise the 'memory_inject shadow eval' events written by Cerveau (ADR-016 §18).

Run ON the VPS as ubuntu (the traces are there); prints aggregate numbers only, never content:

    python3 cerveau-memory-shadow-report.py [--since 2026-09-21] [/path/to/state]

Each event is one auto-injection recall. Fields: pool (candidates), ineligible (rows the renderer
skips anyway), injected (what the model actually got), decay_kept / rerank_kept / rerank_f03_kept /
floor_only_kept (what each alternative filter would have kept on the same pool), rerank_only /
decay_only (rows only one of the two arms keeps).
"""
import glob, json, os, statistics, sys

args = [a for a in sys.argv[1:] if not a.startswith("--")]
since = None
if "--since" in sys.argv:
    since = sys.argv[sys.argv.index("--since") + 1]
    args = [a for a in args if a != since]
state = args[0] if args else "/home/ubuntu/.zeroclaw-cerveau/data/state"

rows = []
for f in sorted(glob.glob(os.path.join(state, "runtime-trace*.jsonl"))):
    for line in open(f, errors="replace"):
        if "memory_inject shadow eval" not in line:
            continue
        try:
            r = json.loads(line)
        except ValueError:
            continue
        if since and (r.get("@timestamp") or "")[:10] < since:
            continue
        a = r.get("attributes") or {}
        if "pool" in a:
            rows.append(a)

if not rows:
    sys.exit("no shadow-eval events found (is the build with ADR-016 §18 deployed, and did any turn recall?)")

n = len(rows)
def mean(k): return statistics.fmean(r.get(k) or 0 for r in rows)
def share(pred): return 100.0 * sum(1 for r in rows if pred(r)) / n
recalled = [r for r in rows if r["pool"] > 0]
arm = {r.get("active_arm") for r in rows}

print(f"recall events: {n}   active arm(s): {sorted(x for x in arm if x)}   floor(s): {sorted({r.get('floor') for r in rows})}")
print(f"turns with an empty pool (nothing recalled): {share(lambda r: r['pool'] == 0):.0f}%")
print(f"mean per recall: pool {mean('pool'):.2f} | ineligible {mean('ineligible'):.2f} | injected {mean('injected'):.2f}")
print(f"  would keep -> decay arm {mean('decay_kept'):.2f} | floor only {mean('floor_only_kept'):.2f} | "
      f"rerank {mean('rerank_kept'):.2f} | rerank@0.3 {mean('rerank_f03_kept'):.2f}")
if recalled:
    print(f"of the {len(recalled)} recalls that found candidates:")
    print(f"  injected nothing: {100*sum(1 for r in recalled if r['injected']==0)/len(recalled):.0f}% of them, "
          f"and in {100*sum(1 for r in recalled if r['injected']==0 and r['pool']-r['ineligible']>0)/len(recalled):.0f}% "
          f"the pool still had rows the renderer would accept")
    print(f"  rerank would keep more than the decay arm: {100*sum(1 for r in recalled if r['rerank_only']>0)/len(recalled):.0f}%   "
          f"| the decay arm keeps rows rerank drops: {100*sum(1 for r in recalled if r['decay_only']>0)/len(recalled):.0f}%")
    print(f"  rerank@0.3 keeps more than the active filter: "
          f"{100*sum(1 for r in recalled if r['rerank_f03_kept']>r['injected'])/len(recalled):.0f}%")
mx = [r["score_max"] for r in recalled if r.get("score_max") is not None]
if mx:
    q = statistics.quantiles(mx, n=10) if len(mx) >= 10 else [min(mx), statistics.median(mx), max(mx)]
    print(f"best raw score per recall: median {statistics.median(mx):.2f}, max {max(mx):.2f} "
          f"(the floor is {sorted({r.get('floor') for r in rows})[0]})")
print("\nReading it: if 'injected nothing' is high while the pool had eligible rows, and rerank/rerank@0.3\n"
      "would keep them, the filter is discarding real candidates and P3 has a case. If injected is close\n"
      "to what the alternatives keep, the fixture over-stated the problem (ADR-016 §18).")
