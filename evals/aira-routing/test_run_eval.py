#!/usr/bin/env python3
"""Offline self-test: fixtures are consistent, the stub pipeline runs end to end, report computes.
No network, no key. The stub's numbers say nothing about any model."""
import argparse
import io
import contextlib
import run_eval as e

e.cmd_validate(None)
path = e.cmd_run(argparse.Namespace(model=None, k=1, workers=1, max_calls=800, stub=True))
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    e.cmd_report(argparse.Namespace(file=str(path)))
out = buf.getvalue()
for needle in ("baseline_domain_acc", "research_to_dr", "geno_scope_acc", "RESULT:"):
    assert needle in out, needle
# baseline must never offer deep_researcher
req = e.build_request(e.load_cases()[0], "baseline", "m")
assert "deep_researcher" not in req["tools"][0]["function"]["parameters"]["properties"]["agent"]["enum"]
req = e.build_request(e.load_cases()[0], "plus_dr_geno", "m")
assert "deep_researcher" in req["tools"][0]["function"]["parameters"]["properties"]["agent"]["enum"]
assert "Task and Follow-up" in req["messages"][0]["content"]
path.unlink()
print("self-test OK")
