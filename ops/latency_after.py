#!/usr/bin/env python3
"""Latency before/after for the ADR-015 latency work (preload + smalltalk).
Cutoff default: 2026-09-19T16:25:00Z (config live; first preload turn 16:43Z).
Usage: latency_after.py [cutoff_iso]  (reads runtime-trace*.jsonl in cwd)
"""
import json, glob, sys
from collections import Counter
from datetime import datetime, timezone

CUTOFF = sys.argv[1] if len(sys.argv) > 1 else "2026-09-19T16:25:00Z"
CUTOFF_DT = datetime.fromisoformat(CUTOFF.replace("Z", "+00:00"))

def ts(e):
    return datetime.fromisoformat(e["@timestamp"].replace("Z", "+00:00"))

turns = {}
for fn in sorted(glob.glob("runtime-trace*.jsonl")):
    for line in open(fn):
        line = line.strip()
        if not line:
            continue
        try:
            e = json.loads(line)
        except Exception:
            continue
        tid = e.get("trace_id")
        if not tid:
            continue
        t = turns.setdefault(tid, {"req": [], "resp": [], "tools": [], "final": None,
                                   "prof": Counter(), "smalltalk": 0, "first_ts": None})
        m = e.get("message", "")
        a = e.get("attributes", {})
        if t["first_ts"] is None or ts(e) < t["first_ts"]:
            t["first_ts"] = ts(e)
        if m == "llm_request":
            t["req"].append(e)
        elif m == "llm_response":
            t["resp"].append(e)
        elif m == "tool_call_result":
            t["tools"].append(e)
            rp = (e.get("zeroclaw") or {}).get("risk_profile")
            if rp:
                t["prof"][rp] += 1
        elif m == "turn_final_response":
            t["final"] = e
        if "smalltalk fast path" in m:
            t["smalltalk"] += 1
        rp = (e.get("zeroclaw") or {}).get("risk_profile")
        if rp:
            t["prof"][rp] += 1

def med(xs):
    xs = sorted(xs)
    return xs[len(xs) // 2] if xs else None

def summarize(name, tids):
    walls, ncalls, prompt_toks = [], [], []
    with_tools, Lex_tools, Lex_search = 0, 0, 0
    notools = []
    for tid in tids:
        t = turns[tid]
        if not t["req"]:
            continue
        end = t["final"]
        end_ts = ts(end) if end else max([ts(e) for e in t["req"] + t["resp"]] +
                                         [ts(e) for e in t["tools"]] or [t["first_ts"]])
        wall = (end_ts - ts(t["req"][0])).total_seconds()
        prof = t["prof"].most_common(1)[0][0] if t["prof"] else "?"
        is_lex = prof == "agent_leads_qualifier"
        first_resp = min(t["resp"], key=lambda e: e["attributes"].get("iteration", 99)) if t["resp"] else None
        if t["tools"]:
            with_tools += 1
            walls.append(wall)
            ncalls.append(len(t["resp"]))
            if first_resp and first_resp["attributes"].get("input_tokens"):
                prompt_toks.append(first_resp["attributes"]["input_tokens"])
            if is_lex:
                Lex_tools += 1
                if any(x["attributes"].get("tool") == "tool_search" for x in t["tools"]):
                    Lex_search += 1
        else:
            notools.append((wall, t["smalltalk"] > 0))
    print(f"--- {name}: {len(tids)} turns ({len([t for t in tids if turns[t]['req']])} with llm) ---")
    if walls:
        print(f"tool turns: n={len(walls)} wall_med={med(walls):.1f}s llmcalls_med={med(ncalls)} prompt_med={med(prompt_toks)}")
    if notools:
        w = [x[0] for x in notools]
        st = [x[0] for x in notools if x[1]]
        print(f"no-tool turns: n={len(w)} wall_med={med(w):.1f}s  smalltalk_hits={len(st)}" +
              (f" smalltalk_med={med(st):.1f}s" if st else ""))
    if Lex_tools:
        print(f"Lex tool turns: {Lex_tools}, needing tool_search: {Lex_search} ({100.0*Lex_search/Lex_tools:.0f}%)")
    print()

before = [tid for tid, t in turns.items() if t["first_ts"] < CUTOFF_DT]
after = [tid for tid, t in turns.items() if t["first_ts"] >= CUTOFF_DT]
print(f"cutoff={CUTOFF}  total_turns={len(turns)}")
summarize("BEFORE", before)
summarize("AFTER", after)
