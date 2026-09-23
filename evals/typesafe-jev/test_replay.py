#!/usr/bin/env python3
"""Offline self-test for replay.py (no network, no key, stdlib only).

Builds a synthetic runtime-trace JSONL (LogEvent-shaped lines, incl. one
non-shadow row and one garbage line to prove filtering), replays it through
the stub backend, and asserts the pipeline end to end.

  python3 test_replay.py
"""
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from replay import StubJudge, compare, load_shadow_events

PASS = FAIL = 0


def check(name, cond, extra=""):
    global PASS, FAIL
    if cond:
        PASS += 1
    else:
        FAIL += 1
        print(f"FAIL {name} {extra}")


def sev(level, conf=0.92):
    probs = {str(i): (conf if i == level else (1 - conf) / 3) for i in range(4)}
    return {"type": "score", "score": level, "confidence": conf, "probabilities": probs}


def exp(p):
    return {"type": "noul", "noul": p}


def shadow_event(tid, tool, tier, gate, pending=None, origin="tolong kirim invoice itu"):
    return {
        "id": f"evt-{tid}", "@timestamp": "2026-09-23T00:00:00.000Z",
        "severity_text": "INFO", "event": {"category": "Tool", "action": "Note"},
        "message": "judge_shadow", "trace_id": tid,
        "attributes": {
            "trace_id": tid, "tool": tool, "tier": tier,
            "requirement": "Pending", "gate_action": gate, "pending_id": pending,
            "judge_request": {
                "state": {"tool": tool, "tier": tier, "args_summary": "{}",
                          "origin_message": origin},
                "questions": {"explicit_instruction": {}, "severity": {}},
                "escalate_on": [], "escalate_score_at": 3,
                "confirm_score_at": 2, "observe_only": [],
            },
        },
    }


CASES = [
    # (trace_id, tool, tier, gate_action, severity, exp_p) — last one mismatches on purpose
    ("t-sev", "odoo_write", "irreversible", "deny (pending)", sev(3), exp(0.95)),
    ("t-noauth-irr", "send_mail", "irreversible", "deny (pending)", sev(1), exp(0.20)),
    ("t-noauth-rev", "draft_create", "reversible", "replace", sev(1, 0.8), exp(0.30)),
    ("t-mid", "odoo_write", "reversible", "proceed (unapproved)", sev(1, 0.7), exp(0.70)),
    ("t-clean", "search_mail", "reversible", "proceed (approved)", sev(0), exp(0.97)),
    ("t-mismatch", "odoo_write", "irreversible", "deny (pending)", sev(0), exp(0.97)),
]

lines = [json.dumps(shadow_event(tid, tool, tier, gate, pending="ap-1"))
         for tid, tool, tier, gate, _, _ in CASES]
lines.append(json.dumps({"message": "tool_call_result", "attributes": {}}))  # filtered out
lines.append("not json at all {{{")  # filtered out
trace = "\n".join(lines) + "\n"

stub_answers = {tid: {"severity": s, "explicit_instruction": e} for tid, _, _, _, s, e in CASES}

with tempfile.TemporaryDirectory() as d:
    tp = Path(d) / "trace.jsonl"
    tp.write_text(trace, encoding="utf-8")
    events = load_shadow_events([str(tp)])
    check("filters to shadow rows only", len(events) == 6, f"got {len(events)}")
    rep = compare(events, StubJudge(stub_answers))
    s = rep["summary"]
    check("all rows scored", s["scored"] == 6, str(s))
    check("5/6 agree (one deliberate mismatch)", s["agreement"] == 5, str(s))
    check("escalation recall 2/3", s["esc_recall"] == [2, 3], str(s))
    mismatch = [r for r in rep["rows"] if not r["agree"]]
    check("mismatch is t-mismatch", [r["trace_id"] for r in mismatch] == ["t-mismatch"])
    check("pending_id carried", all(r["pending_id"] == "ap-1" for r in rep["rows"]))

print(f"{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
