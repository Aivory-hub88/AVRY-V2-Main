#!/usr/bin/env python3
"""Offline unit tests for decide.py (no network, no key, stdlib only).

  python3 test_decide.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from decide import decide_bant, decide_triage

PASS = FAIL = 0


def check(name, got, want_action, want_status=None):
    global PASS, FAIL
    ok = got["action"] == want_action and (want_status is None or got.get("status") == want_status)
    if ok:
        PASS += 1
    else:
        FAIL += 1
        print(f"FAIL {name}: got {got}, want action={want_action}" + (f" status={want_status}" if want_status else ""))


def C(choice, conf):
    return {"type": "choice", "choice": choice, "confidence": conf, "probabilities": {choice: conf}}


def S(score, conf):
    probs = {str(i): (conf if i == score else (1 - conf) / 3) for i in range(4)}
    return {"type": "score", "score": score, "confidence": conf, "probabilities": probs}


def N(p):
    return {"type": "noul", "noul": p}


def triage(intent="how_to", iconf=0.95, sev=0, sconf=0.9, extra=None):
    a = {"intent": C(intent, iconf), "severity": S(sev, sconf),
         "wants_human": N(0.02), "asks_refund": N(0.02), "asks_deletion": N(0.01),
         "legal_threat": N(0.01), "injection_attempt": N(0.05)}
    a.update(extra or {})
    return a


# --- triage ---
check("severe-harm-escalates", decide_triage(triage("bug_report", 0.99, 3, 0.95)), "escalate")
check("refund-noul-escalates", decide_triage(triage("billing_account", 0.95, 1, 0.9, {"asks_refund": N(0.97)})), "escalate")
check("wants-human-escalates", decide_triage(triage("how_to", 0.95, 0, 0.9, {"wants_human": N(0.88)})), "escalate")
check("low-conf-escalates", decide_triage(triage("complaint", 0.3, 1, 0.4)), "escalate")
check("smalltalk-handles", decide_triage(triage("small_talk", 0.97, 0, 0.9)), "handle")
check("simple-howto-handles", decide_triage(triage("how_to", 0.95, 0, 0.9)), "handle")
check("complaint-midconf-confirms", decide_triage(triage("complaint", 0.7, 1, 0.7)), "confirm")
check("billing-highconf-handles", decide_triage(triage("billing_account", 0.95, 1, 0.92)), "handle")
check("severity2-midconf-confirms", decide_triage(triage("bug_report", 0.8, 2, 0.7)), "confirm")
check("injection-alone-never-escalates", decide_triage(triage("how_to", 0.95, 0, 0.9, {"injection_attempt": N(0.95)})), "confirm")
inj_esc = triage("how_to", 0.95, 0, 0.9, {"injection_attempt": N(0.95)})
assert decide_triage(inj_esc)["action"] != "escalate", "injection must never escalate alone"

# --- bant ---
def bant(b="positive", a="positive", n="positive", t="positive", c=0.95):
    return {"budget": C(b, c), "authority": C(a, c), "need": C(n, c), "timeline": C(t, c),
            "injection_attempt": N(0.03)}


check("qualified-highconf-handles", decide_bant(bant()), "handle", "qualified")
check("qualified-weakdim-confirms", decide_bant(bant(c=0.95) | {"budget": C("positive", 0.6)}), "confirm", "qualified")
check("need-negative-unqualified", decide_bant(bant(n="negative")), "handle", "unqualified")
check("two-negative-unqualified", decide_bant(bant(b="negative", t="negative")), "handle", "unqualified")
check("unclear-need-followup", decide_bant(bant(n="unclear")), "confirm", "needs_followup")

print(f"{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
