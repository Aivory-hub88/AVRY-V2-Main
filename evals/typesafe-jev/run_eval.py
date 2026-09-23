#!/usr/bin/env python3
"""Fixture validation and evaluation harness for TypeSafe Jev (stdlib only).

  run_eval.py validate                      offline: check fixtures, estimate cost
  run_eval.py payload tri-P01-id            offline: print the exact request for one case
  run_eval.py probe                         one ~$0.00001 request: checks auth, base URL, model name, key limit
  run_eval.py run [--suite triage|bant|all] call the API; caches every response; --budget caps spend (default $0.25)
  run_eval.py report results/<file>.jsonl   metrics + pass/fail against thresholds.json

Set TYPESAFE_BASE_URL to point at a local stand-in (see fake_jev.py).
"""
import argparse
import concurrent.futures as cf
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE_URL = os.environ.get("TYPESAFE_BASE_URL", "https://api.typesafe.ai").rstrip("/")
API_URL = BASE_URL + "/v1/systemone"
PRICE_PER_M_INPUT = 0.042  # USD, docs.typesafe.ai/models (checked 2026-09-21)

NOULS = ["wants_human", "asks_refund", "asks_deletion", "legal_threat"]
ESCALATE_NOULS = NOULS
DIMS = ["budget", "authority", "need", "timeline"]
LANGS = ["en", "id", "mixed"]


# --------------------------------------------------------------------------- data
def load_jsonl(name):
    with open(HERE / name, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def load_questions():
    with open(HERE / "questions.json", encoding="utf-8") as f:
        q = json.load(f)
    return {k: v for k, v in q.items() if not k.startswith("_")}


def load_thresholds():
    with open(HERE / "thresholds.json", encoding="utf-8") as f:
        t = json.load(f)
    return {k: v for k, v in t.items() if not k.startswith("_")}


def load_cases(suite):
    return load_jsonl("triage.jsonl" if suite == "triage" else "bant.jsonl")


def state_for(suite, case):
    if suite == "triage":
        return {"customer_message": case["text"]}
    return {"today": case["today"], "conversation": case["conversation"]}


def payload_for(suite, case, model, questions):
    return {"state": state_for(suite, case), "model": model, "questions": questions[suite]}


def bant_status(d):
    """Deterministic policy applied to per-dimension judgments. Mirrors bant-qualification/SKILL.md."""
    neg = sum(v == "negative" for v in d.values())
    if d["need"] == "negative" or neg >= 2 or (d["timeline"] == "negative" and d["need"] != "positive"):
        return "unqualified"
    pos_other = sum(d[k] == "positive" for k in ("budget", "authority", "timeline"))
    if d["need"] == "positive" and pos_other >= 2 and neg == 0:
        return "qualified"
    return "needs_followup"


def escalate_gold(case):
    g, un = case["gold"], set(case["unscored"])
    if g["severity"] >= 3:
        return True
    if any(c in un for c in ESCALATE_NOULS):
        return None
    return any(g[c] for c in ESCALATE_NOULS)


def argmax_level(ans):
    probs = ans["probabilities"]
    return int(max(probs, key=lambda k: probs[k]))


def escalate_pred(ans, thr=0.5):
    return argmax_level(ans["severity"]) >= 3 or any(ans[c]["noul"] >= thr for c in ESCALATE_NOULS)


# --------------------------------------------------------------------------- validate
def cmd_validate(_):
    questions = load_questions()
    problems = []
    intents = set(questions["triage"]["intent"]["criteria"])
    statuses = {"qualified", "unqualified", "needs_followup"}

    triage, bant = load_cases("triage"), load_cases("bant")
    for suite, cases in (("triage", triage), ("bant", bant)):
        ids = [c["id"] for c in cases]
        for dup in {i for i in ids if ids.count(i) > 1}:
            problems.append(f"{suite}: duplicate id {dup}")
        pairs = defaultdict(set)
        for c in cases:
            if c["lang"] not in LANGS:
                problems.append(f"{c['id']}: bad lang {c['lang']}")
            if c["pair"]:
                pairs[c["pair"]].add(c["lang"])
        for p, langs in pairs.items():
            if langs != {"en", "id"}:
                problems.append(f"{suite}: pair {p} has langs {sorted(langs)}, expected en+id")

    for c in triage:
        g = c["gold"]
        if g["intent"] not in intents:
            problems.append(f"{c['id']}: unknown intent {g['intent']}")
        if g["severity"] not in range(4):
            problems.append(f"{c['id']}: severity out of range")
        for i in c["acceptable"]["intent"]:
            if i not in intents:
                problems.append(f"{c['id']}: unknown acceptable intent {i}")
        for u in c["unscored"]:
            if u not in g:
                problems.append(f"{c['id']}: unscored field {u} not in gold")

    for c in bant:
        g = c["gold"]
        dims = {d: g[d] for d in DIMS}
        if any(v not in ("positive", "negative", "unclear") for v in dims.values()):
            problems.append(f"{c['id']}: bad dimension label")
        if g["status"] not in statuses:
            problems.append(f"{c['id']}: bad status")
        elif bant_status(dims) != g["status"]:
            problems.append(f"{c['id']}: gold status {g['status']} but policy over gold dims gives {bant_status(dims)}")
        if any(t["role"] not in ("prospect", "agent") for t in c["conversation"]):
            problems.append(f"{c['id']}: bad role")

    for name, cases in (("triage", triage), ("bant", bant)):
        by_lang = Counter(c["lang"] for c in cases)
        tags = Counter(t for c in cases for t in c.get("tags", []))
        print(f"{name}: {len(cases)} cases  langs={dict(by_lang)}  tags={dict(tags)}")

    chars = sum(len(json.dumps(payload_for(s, c, "jev-latest", questions))) for s, cs in (("triage", triage), ("bant", bant)) for c in cs)
    est_tokens = chars / 3.5  # JSON overhead and Indonesian tokenise worse than English; deliberately pessimistic
    print(f"one full pass ~ {est_tokens:,.0f} input tokens ~ ${est_tokens / 1e6 * PRICE_PER_M_INPUT:.4f}")

    if problems:
        print("\nPROBLEMS:")
        for p in problems:
            print(" -", p)
        return 1
    print("\nfixtures OK")
    return 0


def cmd_payload(args):
    questions = load_questions()
    for suite in ("triage", "bant"):
        for c in load_cases(suite):
            if c["id"] == args.case_id:
                print(json.dumps(payload_for(suite, c, args.model, questions), indent=2, ensure_ascii=False))
                return 0
    print("unknown case id", file=sys.stderr)
    return 1


# --------------------------------------------------------------------------- run
def call_api(payload, key, retries=6, url=None):
    body = json.dumps(payload).encode()
    last = None
    for attempt in range(retries):
        req = urllib.request.Request(
            url or API_URL, data=body, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            detail = e.read()[:300]
            last = f"HTTP {e.code} {detail!r}"
            if e.code in (429, 529) or e.code >= 500:  # docs: retry with exponential backoff
                time.sleep(min(30, 0.5 * 2**attempt))
                continue
            raise RuntimeError(last)
        except (urllib.error.URLError, TimeoutError) as e:
            last = str(e)
            time.sleep(min(30, 0.5 * 2**attempt))
    raise RuntimeError(f"retries exhausted: {last}")


def cache_path(cache_dir, url, payload):
    # URL in the key: fake_jev answers must never satisfy a real run
    return cache_dir / (hashlib.sha256((url + "\n" + json.dumps(payload, sort_keys=True)).encode()).hexdigest() + ".json")


def cached_call(payload, key, cache_dir, url=None):
    url = url or API_URL
    path = cache_path(cache_dir, url, payload)
    if path.exists():
        return json.loads(path.read_text()), True
    t0 = time.perf_counter()
    resp = call_api(payload, key, url=url)
    entry = {"response": resp, "latency_ms": round((time.perf_counter() - t0) * 1000)}
    path.write_text(json.dumps(entry))
    return entry, False


def get_key(openrouter=False):
    """TYPESAFE_API_KEY, or OPENROUTER_API_KEY when pointed at OpenRouter (TYPESAFE_BASE_URL=https://openrouter.ai/api)."""
    key = os.environ.get("TYPESAFE_API_KEY", "")
    if openrouter:
        key = os.environ.get("OPENROUTER_API_KEY", "") or key
    elif not key and "openrouter.ai" in BASE_URL:
        key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key and os.environ.get("TYPESAFE_API_KEY_FILE"):  # keeps the key out of shell history and chat
        key = Path(os.environ["TYPESAFE_API_KEY_FILE"]).expanduser().read_text().strip()
    return key


def call_cost(resp):
    """USD for one response: OpenRouter reports usage.cost; otherwise price the input tokens (output is free)."""
    u = resp.get("usage") or {}
    if u.get("cost") is not None:
        return float(u["cost"])
    return u.get("input_tokens", 0) * PRICE_PER_M_INPUT / 1e6


class Budget:
    """Hard spend cap, checked before every uncached request. Cached responses cost nothing."""

    def __init__(self, limit):
        self.limit, self.spent, self.lock = limit, 0.0, __import__("threading").Lock()

    def reserve_ok(self):
        with self.lock:
            return self.spent < self.limit

    def add(self, usd):
        with self.lock:
            self.spent += usd


CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"
LLM_SYSTEM = ("You are a precise classifier inside a software pipeline. You are given a STATE and QUESTIONS about it. "
              "Answer every question using only the state. Reply with one JSON object and nothing else.")


def llm_payload(suite, case, model, questions):
    """Baseline request: the SAME state and question definitions Jev gets, wrapped in a plain chat prompt."""
    spec = {}
    for qid, q in questions[suite].items():
        if q["type"] == "choice":
            fmt = {"choice": "<one of the option keys in criteria>", "confidence": "<0 to 1: how sure you are>"}
        elif q["type"] == "score":
            fmt = {"level": "<integer index into criteria, 0 = first item>", "confidence": "<0 to 1: how sure you are>"}
        else:
            fmt = {"probability": "<0 to 1: probability that the answer is yes/true>"}
        spec[qid] = {"question": q, "answer_format": fmt}
    user = json.dumps({"state": state_for(suite, case), "questions": spec}, ensure_ascii=False)
    user += "\n\nReturn one JSON object mapping each question id to its answer, in that question's answer_format."
    return {"model": model, "temperature": 0, "max_tokens": 1500, "reasoning": {"enabled": False},
            "response_format": {"type": "json_object"},
            "messages": [{"role": "system", "content": LLM_SYSTEM}, {"role": "user", "content": user}]}


def parse_llm(resp, qs):
    """Turn a chat completion into the same `answers` shape System One returns, so `report` works unchanged."""
    text = resp["choices"][0]["message"]["content"].strip()
    if text.startswith("```"):
        text = text.strip("`").split("\n", 1)[1].rsplit("```", 1)[0] if "\n" in text else text.strip("`")
    obj = json.loads(text)
    clamp = lambda x: max(0.0, min(1.0, float(x)))
    answers = {}
    for qid, q in qs.items():
        a = obj[qid]
        if q["type"] == "choice":
            c = a["choice"]
            if c not in q["criteria"]:
                raise ValueError(f"{qid}: unknown option {c!r}")
            answers[qid] = {"type": "choice", "choice": c, "confidence": clamp(a.get("confidence", 0.5)),
                            "probabilities": {k: (1.0 if k == c else 0.0) for k in q["criteria"]}}
        elif q["type"] == "score":
            lvl = int(a["level"])
            if not 0 <= lvl < len(q["criteria"]):
                raise ValueError(f"{qid}: level {lvl} out of range")
            answers[qid] = {"type": "score", "score": float(lvl), "confidence": clamp(a.get("confidence", 0.5)),
                            "probabilities": {str(i): (1.0 if i == lvl else 0.0) for i in range(len(q["criteria"]))}}
        else:
            answers[qid] = {"type": "noul", "noul": clamp(a["probability"])}
    return answers


def llm_usage(resp):
    u = resp.get("usage") or {}
    return {"input_tokens": u.get("prompt_tokens", 0), "output_tokens": u.get("completion_tokens", 0), "cost": u.get("cost"),
            "reasoning_tokens": (u.get("completion_tokens_details") or {}).get("reasoning_tokens")}


def cmd_probe(args):
    """One tiny request: verifies auth, base URL and model name for ~$0.00001, and shows the key's remaining limit."""
    key = get_key()
    if not key:
        print("no key: set TYPESAFE_API_KEY (or OPENROUTER_API_KEY with an OpenRouter base URL)", file=sys.stderr)
        return 2
    payload = {"state": "Hello there!", "model": args.model,
               "questions": {"is_greeting": {"type": "noul", "instructions": "Is this message a greeting?"}}}
    t0 = time.perf_counter()
    resp = call_api(payload, key)
    ms = round((time.perf_counter() - t0) * 1000)
    print(f"endpoint={API_URL}\nrequested model={args.model}  served model={resp.get('model')}  provider={resp.get('provider')}")
    print(f"answer={resp['answers']['is_greeting']}  latency={ms}ms  usage={resp.get('usage')}  cost=${call_cost(resp):.8f}")
    if "openrouter.ai" in BASE_URL:
        try:
            req = urllib.request.Request("https://openrouter.ai/api/v1/key", headers={"Authorization": f"Bearer {key}"})
            with urllib.request.urlopen(req, timeout=30) as r:
                d = json.load(r).get("data", {})
            print("key limit={} remaining={} usage={} (values as reported by OpenRouter)".format(
                d.get("limit"), d.get("limit_remaining"), d.get("usage")))
        except Exception as e:  # informational only
            print("could not read key info:", e)
    return 0


def cmd_run(args):
    key = get_key(openrouter=args.backend == "llm")
    if not key:
        print("no API key (a run needs one; validate/payload/report do not): set TYPESAFE_API_KEY, "
              "or OPENROUTER_API_KEY with TYPESAFE_BASE_URL=https://openrouter.ai/api, "
              "or TYPESAFE_API_KEY_FILE=<path to a file holding the key>", file=sys.stderr)
        return 2
    questions = load_questions()
    cache_dir = HERE / ".cache"
    cache_dir.mkdir(exist_ok=True)
    (HERE / "results").mkdir(exist_ok=True)
    suites = ["triage", "bant"] if args.suite == "all" else [args.suite]
    jobs = [(s, c) for s in suites for c in load_cases(s)]
    if args.limit:
        jobs = jobs[: args.limit]
    budget = Budget(args.budget)
    skipped = []

    llm = args.backend == "llm"
    url = CHAT_URL if llm else API_URL

    def work(job):
        suite, case = job
        payload = (llm_payload if llm else payload_for)(suite, case, args.model, questions)
        if not cache_path(cache_dir, url, payload).exists() and not budget.reserve_ok():
            skipped.append(case["id"])
            return None
        entry, hit = cached_call(payload, key, cache_dir, url=url)
        r = entry["response"]
        if not hit:
            budget.add(call_cost(r) if not llm else float(llm_usage(r)["cost"] or 0))
        if llm:
            try:
                answers = parse_llm(r, questions[suite])
            except (ValueError, KeyError, TypeError, json.JSONDecodeError) as e:
                raise RuntimeError(f"{case['id']}: unparseable LLM answer ({e})")
            return {"id": case["id"], "suite": suite, "model": r.get("model"), "answers": answers,
                    "usage": llm_usage(r), "latency_ms": entry["latency_ms"], "cache_hit": hit}
        return {"id": case["id"], "suite": suite, "model": r.get("model"), "answers": r["answers"],
                "usage": r.get("usage"), "latency_ms": entry["latency_ms"], "cache_hit": hit}

    slug = args.model.replace("/", "_") if llm else "jev"
    out = HERE / "results" / f"{time.strftime('%Y%m%d-%H%M%S')}-{args.suite}-{slug}.jsonl"
    rows, fails = [], 0
    with cf.ThreadPoolExecutor(max_workers=args.workers) as ex:
        for fut in cf.as_completed([ex.submit(work, j) for j in jobs]):
            try:
                row = fut.result()
                if row:
                    rows.append(row)
            except Exception as e:  # keep going; one failed case must not hide the rest
                fails += 1
                print("FAILED:", e, file=sys.stderr)
    rows.sort(key=lambda r: r["id"])
    out.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows))
    print(f"{len(rows)} ok, {fails} failed, {len(skipped)} skipped by budget -> {out.relative_to(HERE)}")
    print(f"spent ${budget.spent:.6f} of ${args.budget:g} cap on uncached requests")
    return 1 if fails or skipped else 0


# --------------------------------------------------------------------------- report
def pct(x, n):
    return f"{x / n:.3f}" if n else "n/a"


def auc(scores, labels):
    pos = [s for s, y in zip(scores, labels) if y]
    neg = [s for s, y in zip(scores, labels) if not y]
    if not pos or not neg:
        return None
    wins = sum((p > n) + 0.5 * (p == n) for p in pos for n in neg)
    return wins / (len(pos) * len(neg))


def band_stats(pairs):
    """pairs: list of (confidence, correct). Returns per-band n/acc and the >=0.9 band."""
    bands = {"<0.5": [], "0.5-0.9": [], ">=0.9": []}
    for conf, ok in pairs:
        bands["<0.5" if conf < 0.5 else "0.5-0.9" if conf < 0.9 else ">=0.9"].append(ok)
    return bands


class Checks:
    def __init__(self, thresholds):
        self.t, self.rows = thresholds, []

    def add(self, key, value, kind):  # kind: "min" or "max"
        limit = self.t[key]
        ok = value is not None and (value >= limit if kind == "min" else value <= limit)
        shown = "n/a" if value is None else f"{value:.3f}"
        self.rows.append((("PASS" if ok else "FAIL"), key, shown, f"{'>=' if kind == 'min' else '<='} {limit}"))

    def print(self, title):
        print(f"\n== {title}: thresholds ==")
        for r in self.rows:
            print("  {:<5} {:<34} {:>7}  (need {})".format(*r))
        return all(r[0] == "PASS" for r in self.rows)


def print_bands(name, pairs):
    bands = band_stats(pairs)
    parts = [f"{b}: n={len(v)} acc={pct(sum(v), len(v))}" for b, v in bands.items()]
    print(f"  confidence bands [{name}]  " + " | ".join(parts))
    hi = bands[">=0.9"]
    return sum(hi), len(hi)


def report_triage(cases, results, thresholds):
    by_id = {c["id"]: c for c in cases}
    rows = [(by_id[r["id"]], r["answers"]) for r in results if r["id"] in by_id]
    print(f"\n===== TRIAGE ({len(rows)} cases) =====")

    stats = defaultdict(lambda: Counter())
    conf_pairs = []
    for c, a in rows:
        g, acc = c["gold"], c["acceptable"]
        pi = a["intent"]["choice"]
        lvl = argmax_level(a["severity"])
        s = stats[c["lang"]]
        s["n"] += 1
        s["intent_exact"] += pi == g["intent"]
        s["intent_ok"] += pi == g["intent"] or pi in acc["intent"]
        s["sev_exact"] += lvl == g["severity"]
        s["sev_ok"] += lvl == g["severity"] or lvl in acc["severity"]
        s["sev_w1"] += abs(lvl - g["severity"]) <= 1
        conf_pairs.append((a["intent"]["confidence"], pi == g["intent"] or pi in acc["intent"]))
        conf_pairs.append((a["severity"]["confidence"], lvl == g["severity"] or lvl in acc["severity"]))
    tot = Counter()
    for s in stats.values():
        tot.update(s)
    print("\nper language (exact | lenient=gold or acceptable)")
    print(f"  {'lang':<6}{'n':>4}  intent exact/lenient   severity exact/lenient/within-1")
    for lang in LANGS + ["ALL"]:
        s = tot if lang == "ALL" else stats.get(lang)
        if not s:
            continue
        n = s["n"]
        print(f"  {lang:<6}{n:>4}  {pct(s['intent_exact'], n)} / {pct(s['intent_ok'], n)}"
              f"        {pct(s['sev_exact'], n)} / {pct(s['sev_ok'], n)} / {pct(s['sev_w1'], n)}")

    print("\nintent confusion (gold -> predicted, errors only)")
    conf = Counter((c["gold"]["intent"], a["intent"]["choice"]) for c, a in rows
                   if a["intent"]["choice"] != c["gold"]["intent"] and a["intent"]["choice"] not in c["acceptable"]["intent"])
    for (g, p), n in conf.most_common():
        print(f"  {g:<16} -> {p:<16} x{n}")
    if not conf:
        print("  none")

    print("\nnoul fields (gold-scored cases only)")
    aucs = {}
    for f in NOULS + ["injection"]:
        key = "injection_attempt" if f == "injection" else f
        xs = [(a[key]["noul"], c["gold"][f]) for c, a in rows if f not in c["unscored"]]
        sc, lb = [x[0] for x in xs], [x[1] for x in xs]
        tp = sum(1 for s, y in xs if s >= 0.5 and y)
        fp = sum(1 for s, y in xs if s >= 0.5 and not y)
        fn = sum(1 for s, y in xs if s < 0.5 and y)
        mid = sum(1 for s, _ in xs if 0.2 < s < 0.8)
        aucs[f] = auc(sc, lb)
        print(f"  {f:<14} n={len(xs):>3} pos={sum(lb):>2} AUC={'n/a' if aucs[f] is None else f'{aucs[f]:.3f}'}"
              f"  @0.5 TP={tp} FP={fp} FN={fn}  uncertain(0.2-0.8)={mid}")

    # escalation policy over predictions
    tp = fp = fn = tn = 0
    urgent_tp = urgent_fn = 0
    hijack = hijack_n = 0
    for c, a in rows:
        ge = escalate_gold(c)
        if ge is None:
            continue
        pe = escalate_pred(a)
        tp += ge and pe
        fn += ge and not pe
        fp += (not ge) and pe
        tn += (not ge) and not pe
        if c["gold"]["severity"] == 3:
            urgent_tp += argmax_level(a["severity"]) >= 3
            urgent_fn += argmax_level(a["severity"]) < 3
        if c["gold"]["injection"]:
            hijack_n += 1
            hijack += (not ge) and pe
    esc_recall = tp / (tp + fn) if tp + fn else None
    esc_fp_rate = fp / (fp + tn) if fp + tn else None
    urgent_recall = urgent_tp / (urgent_tp + urgent_fn) if urgent_tp + urgent_fn else None
    print(f"\nescalation policy (severity=3 or any of {ESCALATE_NOULS} >= 0.5)")
    print(f"  recall={pct(tp, tp + fn)} (TP={tp} FN={fn})  false-escalation rate={pct(fp, fp + tn)} (FP={fp} TN={tn})")
    print(f"  urgent (severity 3) recall={pct(urgent_tp, urgent_tp + urgent_fn)}")
    print(f"  injection cases where the injected text flipped a gold non-escalation into an escalation: {hijack}/{hijack_n}")

    print("\nconfidence")
    hi_ok, hi_n = print_bands("intent+severity", conf_pairs)

    # matched EN/ID pairs
    pairs = defaultdict(dict)
    for c, a in rows:
        if c["pair"]:
            pairs[c["pair"]][c["lang"]] = (c, a)
    pairs = {p: v for p, v in pairs.items() if {"en", "id"} <= set(v)}
    d_int = d_sev = d_esc = 0
    for v in pairs.values():
        (ce, ae), (ci, ai) = v["en"], v["id"]
        d_int += ae["intent"]["choice"] != ai["intent"]["choice"]
        d_sev += argmax_level(ae["severity"]) != argmax_level(ai["severity"])
        d_esc += escalate_pred(ae) != escalate_pred(ai)
    n = len(pairs)
    print(f"\nmatched EN/ID pairs ({n}): same content, different language")
    print(f"  prediction differs  intent={pct(d_int, n)}  severity={pct(d_sev, n)}  escalate={pct(d_esc, n)}")

    en, idn = stats.get("en"), stats.get("id")
    gap = (en["intent_ok"] / en["n"] - idn["intent_ok"] / idn["n"]) if en and idn else None
    en_acc = en["intent_ok"] / en["n"] if en else None
    w1 = tot["sev_w1"] / tot["n"] if tot["n"] else None

    lat = [r["latency_ms"] for r in results if not r.get("cache_hit")]
    if lat:
        lat.sort()
        print(f"\nlatency (uncached, n={len(lat)}): p50={lat[len(lat)//2]}ms p95={lat[int(len(lat)*0.95)-1]}ms max={lat[-1]}ms")
    use = [r["usage"]["input_tokens"] for r in results if r.get("usage")]
    costs = [r["usage"]["cost"] for r in results if r.get("usage") and r["usage"].get("cost") is not None]
    if use:
        est = f"${sum(use)/len(use)/1e6*PRICE_PER_M_INPUT:.6f}/case at Jev list price"
        real = f"; reported usage.cost mean=${sum(costs)/len(costs):.6f}/case" if costs else ""
        print(f"input tokens per case: mean={sum(use)/len(use):.0f}  -> {est}{real}")

    ch = Checks(thresholds["triage"])
    ch.add("intent_acc_en_min", en_acc, "min")
    ch.add("intent_acc_gap_max", gap, "max")
    ch.add("severity_within1_min", w1, "min")
    ch.add("urgent_recall_min", urgent_recall, "min")
    ch.add("escalate_recall_min", esc_recall, "min")
    ch.add("escalate_false_rate_max", esc_fp_rate, "max")
    ch.add("pair_intent_disagree_max", d_int / n if n else None, "max")
    ch.add("noul_auc_min", min((v for k, v in aucs.items() if k != "injection" and v is not None), default=None), "min")
    ch.add("high_conf_acc_min", hi_ok / hi_n if hi_n else None, "min")
    ch.add("high_conf_coverage_min", hi_n / len(conf_pairs) if conf_pairs else None, "min")
    ch.add("injection_escalation_hijack_max", hijack / hijack_n if hijack_n else None, "max")
    return ch.print("triage")


def report_bant(cases, results, thresholds):
    by_id = {c["id"]: c for c in cases}
    rows = [(by_id[r["id"]], r["answers"]) for r in results if r["id"] in by_id]
    print(f"\n===== BANT ({len(rows)} cases) =====")

    dim_ok = Counter()
    per_lang = defaultdict(Counter)
    conf_pairs = []
    status_conf = Counter()
    for c, a in rows:
        g = c["gold"]
        pred = {d: a[d]["choice"] for d in DIMS}
        ps = bant_status(pred)
        for d in DIMS:
            dim_ok[d] += pred[d] == g[d]
            conf_pairs.append((a[d]["confidence"], pred[d] == g[d]))
        s = per_lang[c["lang"]]
        s["n"] += 1
        s["dims_ok"] += sum(pred[d] == g[d] for d in DIMS)
        s["status_ok"] += ps == g["status"]
        status_conf[(g["status"], ps)] += 1
    n = len(rows)
    print("\nper-dimension accuracy: " + "  ".join(f"{d}={pct(dim_ok[d], n)}" for d in DIMS))

    print("\nper language (dimension accuracy | derived status accuracy)")
    tot = Counter()
    for s in per_lang.values():
        tot.update(s)
    for lang in LANGS + ["ALL"]:
        s = tot if lang == "ALL" else per_lang.get(lang)
        if s:
            print(f"  {lang:<6}{s['n']:>4}  dims={pct(s['dims_ok'], s['n'] * 4)}  status={pct(s['status_ok'], s['n'])}")

    print("\nstatus confusion (gold -> derived from predicted dimensions)")
    for (g, p), k in sorted(status_conf.items()):
        print(f"  {g:<15} -> {p:<15} x{k}{'' if g == p else '   <-- error'}")

    xs = [(a["injection_attempt"]["noul"], c["gold"]["injection"]) for c, a in rows]
    print(f"\ninjection_attempt AUC={auc([x[0] for x in xs], [x[1] for x in xs])}  (positives: {sum(x[1] for x in xs)})")

    print("\nconfidence")
    hi_ok, hi_n = print_bands("four dimensions", conf_pairs)

    tags = defaultdict(lambda: [0, 0])
    for c, a in rows:
        pred = {d: a[d]["choice"] for d in DIMS}
        for t in c.get("tags", []):
            tags[t][0] += bant_status(pred) == c["gold"]["status"]
            tags[t][1] += 1
    if tags:
        print("\nstatus accuracy by tag: " + "  ".join(f"{t}={k[0]}/{k[1]}" for t, k in sorted(tags.items())))

    en, idn = per_lang.get("en"), per_lang.get("id")
    gap = (en["status_ok"] / en["n"] - idn["status_ok"] / idn["n"]) if en and idn else None
    ch = Checks(thresholds["bant"])
    ch.add("dim_acc_min", tot["dims_ok"] / (n * 4) if n else None, "min")
    ch.add("status_acc_min", tot["status_ok"] / n if n else None, "min")
    ch.add("status_acc_gap_max", gap, "max")
    ch.add("high_conf_acc_min", hi_ok / hi_n if hi_n else None, "min")
    ch.add("high_conf_coverage_min", hi_n / len(conf_pairs) if conf_pairs else None, "min")
    return ch.print("bant")


def report_decisions(results):
    """Decision layer over the answers (decide.py, ADR-017 P0): what would
    Cerveau DO with these judgments — handle / confirm / escalate — and how
    that compares to the gold policy. Informational: never gates PASS/FAIL."""
    try:
        import decide
    except ImportError:
        print("\n===== DECISIONS =====\nskipped (decide.py not found)")
        return
    cases = {c["id"]: ("triage", c) for c in load_cases("triage")}
    cases.update({c["id"]: ("bant", c) for c in load_cases("bant")})
    by_id = {r["id"]: r for r in results if r["id"] in cases}
    s = decide.summarize(cases, by_id)
    print(f"\n===== DECISIONS ({len(by_id)} cases, decide.py) =====")
    print(f"  actions: {s['dist']}")
    print(f"  agreement vs gold policy: {s['agree']}/{s['scored']}", end="")
    if s["esc_gold"]:
        print(f"  triage escalation recall: {s['esc_tp']}/{s['esc_gold']}", end="")
    print("  (informational)")


def cmd_report(args):
    results = [json.loads(line) for f in args.results for line in open(f, encoding="utf-8") if line.strip()]
    thresholds = load_thresholds()
    ok = True
    models = sorted({r.get("model") for r in results})
    print(f"model(s): {models}  results: {len(results)}")
    if any(r["suite"] == "triage" for r in results):
        ok &= report_triage(load_cases("triage"), [r for r in results if r["suite"] == "triage"], thresholds)
    if any(r["suite"] == "bant" for r in results):
        ok &= report_bant(load_cases("bant"), [r for r in results if r["suite"] == "bant"], thresholds)
    report_decisions(results)
    print("\nOVERALL:", "PASS" if ok else "FAIL (see above; a fail means 'not proven', not 'unusable')")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("validate").set_defaults(fn=cmd_validate)
    p = sub.add_parser("payload")
    p.add_argument("case_id")
    p.add_argument("--model", default="jev-latest")
    p.set_defaults(fn=cmd_payload)
    p = sub.add_parser("run")
    p.add_argument("--suite", choices=["triage", "bant", "all"], default="all")
    p.add_argument("--model", default="jev-latest")
    p.add_argument("--workers", type=int, default=6)
    p.add_argument("--limit", type=int, default=0)
    p.add_argument("--budget", type=float, default=0.25, help="hard USD cap on uncached spend (default 0.25)")
    p.add_argument("--backend", choices=["systemone", "llm"], default="systemone",
                   help="llm = baseline: same state and questions sent to a chat model via OpenRouter")
    p.set_defaults(fn=cmd_run)
    p = sub.add_parser("probe")
    p.add_argument("--model", default="jev-1.13")
    p.set_defaults(fn=cmd_probe)
    p = sub.add_parser("report")
    p.add_argument("results", nargs="+")
    p.set_defaults(fn=cmd_report)
    args = ap.parse_args()
    sys.exit(args.fn(args))


if __name__ == "__main__":
    main()
