#!/usr/bin/env python3
"""Local stand-in for POST /v1/systemone, used ONLY to test the harness plumbing (HTTP, retry, cache, metrics).

It answers from the fixtures' gold labels, deliberately corrupting about one case in seven and returning 429 for
the first request. Its numbers say nothing about Jev.

  python3 fake_jev.py 8765 &
  TYPESAFE_BASE_URL=http://127.0.0.1:8765 TYPESAFE_API_KEY=fake python3 run_eval.py run
"""
import json
import sys
import zlib
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
rows = {}
for suite, fn in (("triage", "triage.jsonl"), ("bant", "bant.jsonl")):
    for line in (HERE / fn).read_text(encoding="utf-8").splitlines():
        c = json.loads(line)
        key = c["text"] if suite == "triage" else json.dumps(c["conversation"], sort_keys=True)
        rows[(suite, key)] = c

served = {"n": 0}
INTENTS = ["bug_report", "how_to", "billing_account", "complaint", "feature_request", "small_talk", "other"]
OPTS = ["positive", "negative", "unclear"]


def wrong(case_id):
    return zlib.crc32(case_id.encode()) % 7 == 0


def dist(options, pick, conf):
    rest = (1 - conf) / (len(options) - 1)
    return {o: (conf if o == pick else rest) for o in options}


def answer_triage(c):
    g, bad = c["gold"], wrong(c["id"])
    intent = g["intent"] if not bad else INTENTS[(INTENTS.index(g["intent"]) + 1) % len(INTENTS)]
    sev = g["severity"] if not bad else max(0, g["severity"] - 1)
    p = dist(["0", "1", "2", "3"], str(sev), 0.92)
    a = {
        "intent": {"type": "choice", "choice": intent, "confidence": 0.55 if bad else 0.95,
                   "probabilities": dist(INTENTS, intent, 0.6 if bad else 0.96)},
        "severity": {"type": "score", "score": sev, "confidence": 0.5 if bad else 0.9, "probabilities": p,
                     "legend": {"0": "a", "1": "b", "2": "c", "3": "d"}},
    }
    for f in ("wants_human", "asks_refund", "asks_deletion", "legal_threat"):
        a[f] = {"type": "noul", "noul": 0.96 if g[f] != (bad and f == "wants_human") else 0.04}
    a["injection_attempt"] = {"type": "noul", "noul": 0.9 if g["injection"] else 0.05}
    return a


def answer_bant(c):
    g, bad = c["gold"], wrong(c["id"])
    a = {}
    for i, d in enumerate(("budget", "authority", "need", "timeline")):
        pick = g[d] if not (bad and i == 0) else OPTS[(OPTS.index(g[d]) + 1) % 3]
        a[d] = {"type": "choice", "choice": pick, "confidence": 0.5 if (bad and i == 0) else 0.93,
                "probabilities": dist(OPTS, pick, 0.9)}
    a["injection_attempt"] = {"type": "noul", "noul": 0.9 if g["injection"] else 0.05}
    return a


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        served["n"] += 1
        if served["n"] == 1:  # exercise the retry path
            self.send_response(429)
            self.end_headers()
            return
        st = body["state"]
        if isinstance(st, str):  # probe request
            self._send({"model": "fake-1.0", "provider": "fake", "answers": {"is_greeting": {"type": "noul", "noul": 0.97}},
                        "usage": {"input_tokens": 40, "output_tokens": 5, "cost": 0.0000017}})
            return
        suite = "triage" if "customer_message" in st else "bant"
        key = st["customer_message"] if suite == "triage" else json.dumps(st["conversation"], sort_keys=True)
        c = rows[(suite, key)]
        answers = answer_triage(c) if suite == "triage" else answer_bant(c)
        self._send({"model": "fake-1.0", "answers": answers, "usage": {"input_tokens": 700, "output_tokens": 60, "cost": 0.00003}})

    def _send(self, obj):
        out = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(out)


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8765), H).serve_forever()
