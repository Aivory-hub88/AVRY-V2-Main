#!/usr/bin/env python3
"""Aira routing eval (stdlib only). Answers ADR-025 Q1: does adding the 10th agent
(and re-scoping Geno) make Aira route worse?

  run_eval.py validate                         offline: check fixtures, count calls
  run_eval.py payload <case_id> <condition>    offline: print the exact request for one case
  run_eval.py run --model M [--k 3]            call an OpenAI-compatible chat API (env below)
  run_eval.py run --stub                       offline pipeline check, canned keyword router
  run_eval.py report results/<file>.jsonl      metrics + pass/fail against thresholds.json

Conditions (same cases in each):
  baseline        9 agents, Geno as generalist            (today)
  plus_dr         + DeepResearcher, Geno still generalist
  plus_dr_geno    + DeepResearcher, Geno re-scoped to task/follow-up keeper

Routing is read from the first `delegate` tool call. No tool call = Aira answers itself ("aira").
This measures the model's routing decision from a synthetic prompt, NOT the live Cerveau
prompt assembly. Use the before/after delta; do not read absolute numbers as production accuracy.

Env: AIRA_EVAL_BASE_URL (default https://openrouter.ai/api/v1), AIRA_EVAL_API_KEY.
Cost: validate prints the call count; `run` stops at --max-calls (default 800).
"""
import argparse
import concurrent.futures as cf
import json
import os
import re
import sys
import time
import urllib.request
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONDITIONS = ["baseline", "plus_dr", "plus_dr_geno"]
DOMAIN_GROUPS = {"regular", "confusable"}
GROUPS = {"regular", "confusable", "research", "geno_scope", "direct"}


def load_cases():
    with open(HERE / "cases.jsonl", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def load_json(name):
    with open(HERE / name, encoding="utf-8") as f:
        return json.load(f)


def thresholds():
    return {k: v for k, v in load_json("thresholds.json").items() if not k.startswith("_")}


def roster_for(cond):
    r = load_json("roster.json")
    agents = dict(r["agents"])
    agents.update(r["geno_rescoped"] if cond == "plus_dr_geno" else r["geno_baseline"])
    if cond != "baseline":
        agents.update(r["deep_researcher"])
    return r["aira_system_prompt"], agents


def build_request(case, cond, model):
    system, agents = roster_for(cond)
    lines = "\n".join(f"- {t} ({a['name']}): {a['desc']}" for t, a in agents.items())
    return {
        "model": model,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": f"{system}\n\nAvailable agents:\n{lines}"},
            {"role": "user", "content": case["text"]},
        ],
        "tools": [{
            "type": "function",
            "function": {
                "name": "delegate",
                "description": "Delegate the request to one agent.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "agent": {"type": "string", "enum": list(agents)},
                        "task": {"type": "string"},
                    },
                    "required": ["agent", "task"],
                },
            },
        }],
        "tool_choice": "auto",
    }


def parse_choice(resp):
    msg = resp["choices"][0]["message"]
    calls = msg.get("tool_calls") or []
    if not calls:
        return "aira", 0
    first = calls[0]["function"]
    try:
        agent = json.loads(first.get("arguments") or "{}").get("agent", "invalid")
    except json.JSONDecodeError:
        agent = "invalid"
    return agent, len(calls)


def stub_choice(case, cond):
    """Keyword router so the pipeline can be tested offline. Its numbers mean nothing."""
    t = case["text"].lower()
    rules = [
        ("deep_researcher", r"research|riset|sumber|sources|cite|sitasi|monitor|deep dive|compliance|cari tahu"),
        ("customer_service", r"ticket|tiket|refund|customer|pelanggan"),
        ("leads_qualifier", r"lead|prospek|pipeline|deals|bant"),
        ("finance_invoice_ops", r"invoice|tagihan|expense|payment"),
        ("office_assistant", r"word|powerpoint|pdf|presentasi|calendar|schedule|meeting notes"),
        ("data_analyst", r"forecast|kpi|churn|analy|data"),
        ("operations_inventory", r"sku|stok|delivery|supplier|gudang"),
        ("marketing_content", r"caption|newsletter|blog|konten|content"),
        ("autonomous", r"track|pantau|follow up|ingatkan|tindak lanjut|progress"),
    ]
    for agent, pat in rules:
        if agent == "deep_researcher" and cond == "baseline":
            continue
        if re.search(pat, t):
            return agent, 1
    return "aira", 0


def call_api(case, cond, model):
    base = os.environ.get("AIRA_EVAL_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    key = os.environ.get("AIRA_EVAL_API_KEY")
    if not key:
        sys.exit("AIRA_EVAL_API_KEY is not set")
    body = json.dumps(build_request(case, cond, model)).encode()
    req = urllib.request.Request(base + "/chat/completions", data=body, headers={
        "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    last = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001 - retry any transport error, then fail loudly
            last = e
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"{case['id']}/{cond}: {last}")


# --------------------------------------------------------------------------- commands
def cmd_validate(_):
    cases = load_cases()
    ids = [c["id"] for c in cases]
    assert len(ids) == len(set(ids)), "duplicate case ids"
    _, base_agents = roster_for("baseline")
    _, dr_agents = roster_for("plus_dr_geno")
    valid = set(dr_agents) | {"aira"}
    for c in cases:
        assert c["group"] in GROUPS, f"{c['id']}: bad group"
        assert c["expected"] in valid, f"{c['id']}: expected {c['expected']} not in roster"
        if c["group"] != "research":
            assert c["expected"] in set(base_agents) | {"aira"}, f"{c['id']}: expected agent missing from baseline"
    by = defaultdict(int)
    for c in cases:
        by[c["group"]] += 1
    langs = defaultdict(int)
    for c in cases:
        langs[c["lang"]] += 1
    print("cases:", len(cases), dict(by), "langs:", dict(langs))
    print("baseline roster:", len(base_agents), "agents; plus_dr:", len(dr_agents))
    print("calls per trial of k=1:", len(cases) * len(CONDITIONS), "(k=3 ->", 3 * len(cases) * len(CONDITIONS), ")")
    print("OK")


def cmd_payload(a):
    case = next(c for c in load_cases() if c["id"] == a.case_id)
    print(json.dumps(build_request(case, a.condition, a.model or "MODEL"), ensure_ascii=False, indent=2))


def cmd_run(a):
    cases = load_cases()
    jobs = [(c, cond, rep) for rep in range(a.k) for cond in CONDITIONS for c in cases]
    if len(jobs) > a.max_calls:
        sys.exit(f"{len(jobs)} calls exceeds --max-calls {a.max_calls}")
    if not a.stub and not a.model:
        sys.exit("--model is required unless --stub")
    out_dir = HERE / "results"
    out_dir.mkdir(exist_ok=True)
    tag = "stub" if a.stub else re.sub(r"[^A-Za-z0-9._-]", "_", a.model)
    path = out_dir / f"{time.strftime('%Y%m%d-%H%M%S')}-{tag}.jsonl"

    def one(job):
        c, cond, rep = job
        if a.stub:
            chosen, n = stub_choice(c, cond)
        else:
            chosen, n = parse_choice(call_api(c, cond, a.model))
        return {"case_id": c["id"], "cond": cond, "rep": rep, "chosen": chosen, "n_calls": n,
                "model": "stub" if a.stub else a.model}

    with cf.ThreadPoolExecutor(max_workers=1 if a.stub else a.workers) as ex, open(path, "w", encoding="utf-8") as f:
        for row in ex.map(one, jobs):
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print("wrote", path, f"({len(jobs)} calls)")
    return path


def rate(rows, pred):
    rows = list(rows)
    return (sum(1 for r in rows if pred(r)) / len(rows)) if rows else float("nan")


def cmd_report(a):
    cases = {c["id"]: c for c in load_cases()}
    rows = [json.loads(line) for line in open(a.file, encoding="utf-8") if line.strip()]
    for r in rows:
        r["case"] = cases[r["case_id"]]
    th = thresholds()

    def sel(cond, groups):
        return [r for r in rows if r["cond"] == cond and r["case"]["group"] in groups]

    ok = lambda r: r["chosen"] == r["case"]["expected"]  # noqa: E731
    m = {}
    m["baseline_domain_acc"] = rate(sel("baseline", DOMAIN_GROUPS), ok)
    m["domain_acc_plus_dr"] = rate(sel("plus_dr", DOMAIN_GROUPS), ok)
    m["domain_acc_plus_dr_geno"] = rate(sel("plus_dr_geno", DOMAIN_GROUPS), ok)
    m["domain_regression_plus_dr"] = m["baseline_domain_acc"] - m["domain_acc_plus_dr"]
    m["domain_regression_plus_dr_geno"] = m["baseline_domain_acc"] - m["domain_acc_plus_dr_geno"]
    m["research_to_dr"] = rate(sel("plus_dr", {"research"}), ok)
    non_research = DOMAIN_GROUPS | {"geno_scope", "direct"}
    m["dr_false_capture"] = rate(sel("plus_dr", non_research), lambda r: r["chosen"] == "deep_researcher")
    m["geno_scope_acc"] = rate(sel("plus_dr_geno", {"geno_scope"}), ok)
    m["geno_false_capture"] = rate(sel("plus_dr_geno", {"regular"}), lambda r: r["chosen"] == "autonomous")

    checks = [
        ("baseline_domain_acc", m["baseline_domain_acc"] >= th["baseline_domain_acc_min"], f">= {th['baseline_domain_acc_min']}"),
        ("domain_regression_plus_dr", m["domain_regression_plus_dr"] <= th["domain_regression_max"], f"<= {th['domain_regression_max']}"),
        ("domain_regression_plus_dr_geno", m["domain_regression_plus_dr_geno"] <= th["domain_regression_max"], f"<= {th['domain_regression_max']}"),
        ("research_to_dr", m["research_to_dr"] >= th["research_to_dr_min"], f">= {th['research_to_dr_min']}"),
        ("dr_false_capture", m["dr_false_capture"] <= th["dr_false_capture_max"], f"<= {th['dr_false_capture_max']}"),
        ("geno_scope_acc", m["geno_scope_acc"] >= th["geno_scope_acc_min"], f">= {th['geno_scope_acc_min']}"),
        ("geno_false_capture", m["geno_false_capture"] <= th["geno_false_capture_max"], f"<= {th['geno_false_capture_max']}"),
    ]
    print(f"{'metric':34} {'value':>7}  threshold  result")
    for name, passed, rule in checks:
        print(f"{name:34} {m[name]:7.3f}  {rule:9}  {'PASS' if passed else 'FAIL'}")

    # per-case flips: baseline vs plus_dr, trial-averaged
    def acc_by_case(cond):
        d = defaultdict(list)
        for r in rows:
            if r["cond"] == cond:
                d[r["case_id"]].append(ok(r))
        return {k: sum(v) / len(v) for k, v in d.items()}
    b, p = acc_by_case("baseline"), acc_by_case("plus_dr")
    flips = [(cid, b[cid], p[cid]) for cid in b if cases[cid]["group"] in DOMAIN_GROUPS and b[cid] != p.get(cid)]
    if flips:
        print("\ndomain cases whose accuracy changed baseline -> plus_dr:")
        for cid, x, y in flips:
            print(f"  {cid:14} {x:.2f} -> {y:.2f}  {cases[cid]['text'][:70]}")
    for lang in ("en", "id", "mixed"):
        v = rate([r for r in sel("baseline", DOMAIN_GROUPS) if r["case"]["lang"] == lang], ok)
        print(f"baseline domain acc [{lang}]: {v:.3f}  (informational)")
    failed = [n for n, passed, _ in checks if not passed]
    print("\nRESULT:", "PASS" if not failed else "FAIL (" + ", ".join(failed) + ")")
    return 0 if not failed else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("validate").set_defaults(fn=cmd_validate)
    p = sub.add_parser("payload")
    p.add_argument("case_id")
    p.add_argument("condition", choices=CONDITIONS)
    p.add_argument("--model")
    p.set_defaults(fn=cmd_payload)
    r = sub.add_parser("run")
    r.add_argument("--model")
    r.add_argument("--k", type=int, default=3)
    r.add_argument("--workers", type=int, default=4)
    r.add_argument("--max-calls", type=int, default=800)
    r.add_argument("--stub", action="store_true")
    r.set_defaults(fn=cmd_run)
    q = sub.add_parser("report")
    q.add_argument("file")
    q.set_defaults(fn=cmd_report)
    a = ap.parse_args()
    sys.exit(a.fn(a) or 0)


if __name__ == "__main__":
    main()
