#!/usr/bin/env python3
"""Confidence-gated policy layer over TypeSafe-shaped judgments (ADR-017, P0).

Pure functions: Jev-shaped answers in (from fake_jev, the Jev API, or
run_eval.py --llm), a routing decision out. No network, no key, stdlib only.
Thresholds live HERE in code, not in prompts — changing a weight or a cutoff
never requires re-inference.

  python3 test_decide.py          # offline unit tests

Answer shapes (same as run_eval.py):
  choice: {"choice": str, "confidence": float, "probabilities": {...}}
  score:  {"score": int, "confidence": float, "probabilities": {...}}
  noul:   {"noul": float}

Actions:
  handle    act directly (execute the normal handler)
  confirm   ask the user to confirm first (conversational Ya/Batal)
  escalate  park for a human (F-1 pending row in Cerveau terms)
"""

ESCALATE_NOULS = ["wants_human", "asks_refund", "asks_deletion", "legal_threat"]
HIGH_STAKES_INTENTS = {"billing_account", "complaint"}

TRIAGE_POLICY = {
    "high_conf": 0.9,        # at/above: act on high-stakes intents directly
    "low_conf": 0.5,         # below: cannot classify -> escalate
    "escalate_noul_thr": 0.5,
    "confirm_severity": 2,   # severity at/above this needs confirm unless high-conf
    "injection_confirm_thr": 0.9,  # informational signal only (see below)
}

BANT_POLICY = {
    "high_conf": 0.9,        # all dims at/above: route qualified directly
    "low_conf": 0.5,
}


def _noul(answers, name):
    a = (answers.get(name) or {})
    v = a.get("noul")
    return float(v) if isinstance(v, (int, float)) else 0.0


def decide_triage(answers, policy=None):
    """Route one triaged message. Returns {"action", "reasons"}."""
    p = dict(TRIAGE_POLICY, **(policy or {}))
    reasons = []

    intent = (answers.get("intent") or {})
    label = intent.get("choice", "other")
    conf = float(intent.get("confidence", 0.0))
    sev_ans = (answers.get("severity") or {})
    try:
        sev = int(max((sev_ans.get("probabilities") or {"0": 1}), key=lambda k: (sev_ans["probabilities"] or {"0": 1})[k]))
    except (ValueError, TypeError):
        sev = int(sev_ans.get("score", 0))
    sev_conf = float(sev_ans.get("confidence", 0.0))

    # 1. Severe harm happening now -> human, regardless of confidence.
    if sev >= 3:
        reasons.append(f"severity={sev} (severe harm)")
        return {"action": "escalate", "reasons": reasons}

    # 2. Policy Nouls (refund/deletion/human/legal). Injection is measured
    # for information only and can NEVER trigger alone (see README).
    fired = [n for n in ESCALATE_NOULS
             if n in answers and _noul(answers, n) >= p["escalate_noul_thr"]]
    if fired:
        reasons.append("policy noul fired: " + ",".join(fired))
        return {"action": "escalate", "reasons": reasons}

    # 3. Cannot classify -> human.
    if conf < p["low_conf"]:
        reasons.append(f"intent confidence {conf:.2f} < {p['low_conf']}")
        return {"action": "escalate", "reasons": reasons}

    injection = _noul(answers, "injection_attempt")
    high_stakes = label in HIGH_STAKES_INTENTS or sev >= p["confirm_severity"]

    # 4. Nothing to act on -> handle directly (answer, no side effects).
    if label in ("small_talk", "other") and sev == 0:
        reasons.append(f"{label}, severity 0")
        action = "handle"
    # 5. High stakes: need high confidence to act, else confirm.
    elif high_stakes and (conf < p["high_conf"] or sev_conf < p["high_conf"]):
        reasons.append(f"high-stakes ({label}, severity {sev}) below high-conf {p['high_conf']}")
        action = "confirm"
    else:
        reasons.append(f"{label}, severity {sev}, confidence sufficient")
        action = "handle"

    # 6. Injection signal can only downgrade handle -> confirm, never escalate.
    if injection >= p["injection_confirm_thr"] and action == "handle":
        reasons.append(f"injection signal {injection:.2f} (downgrade to confirm)")
        action = "confirm"
    elif injection >= p["injection_confirm_thr"]:
        reasons.append(f"injection signal {injection:.2f} noted")

    return {"action": action, "reasons": reasons}


def bant_status(dims):
    """Deterministic BANT policy. Mirrors bant-qualification skill / run_eval."""
    neg = sum(v == "negative" for v in dims.values())
    if dims["need"] == "negative" or neg >= 2 or (dims["timeline"] == "negative" and dims["need"] != "positive"):
        return "unqualified"
    pos_other = sum(dims[k] == "positive" for k in ("budget", "authority", "timeline"))
    if dims["need"] == "positive" and pos_other >= 2 and neg == 0:
        return "qualified"
    return "needs_followup"


def decide_bant(answers, policy=None):
    """Route one BANT-qualified conversation. Returns {"action", "status", "reasons"}."""
    p = dict(BANT_POLICY, **(policy or {}))
    dims = {d: (answers.get(d) or {}).get("choice", "unclear")
            for d in ("budget", "authority", "need", "timeline")}
    confs = {d: float((answers.get(d) or {}).get("confidence", 0.0))
             for d in dims}
    status = bant_status(dims)
    reasons = [f"status={status}"]

    if status == "unqualified":
        return {"action": "handle", "status": status,
                "reasons": reasons + ["polite close, no sales route"]}
    if status == "needs_followup":
        missing = [d for d, v in dims.items() if v != "positive"]
        return {"action": "confirm", "status": status,
                "reasons": reasons + [f"ask for: {','.join(missing)}"]}
    # qualified: route directly only if every dimension is high-confidence.
    weak = [d for d, c in confs.items() if c < p["high_conf"]]
    if weak:
        return {"action": "confirm", "status": status,
                "reasons": reasons + [f"verify weak dims: {','.join(weak)}"]}
    return {"action": "handle", "status": status,
            "reasons": reasons + ["route to sales"]}
