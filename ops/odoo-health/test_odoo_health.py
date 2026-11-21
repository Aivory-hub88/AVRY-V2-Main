import http.server
import json
import threading
import time
import unittest

import odoo_health as oh


def ok(name, detail="ok"):
    return oh.Check(name, True, detail)


def bad(name, detail="down"):
    return oh.Check(name, False, detail)


def site(**over):
    c = {n: ok(n) for n in ("container", "database", "origin", "edge", "login")}
    c["cert"] = oh.Check("cert", True, "60 days left", 0, 60.0)
    c.update(over)
    return c


class Diagnose(unittest.TestCase):
    def test_healthy(self):
        self.assertEqual(oh.diagnose_site(site())[0], "ok")

    def test_the_2026_11_outage_is_named_as_edge_problem(self):
        sev, msg = oh.diagnose_site(site(edge=bad("edge", "HTTP 500"), login=bad("login", "HTTP 500")))
        self.assertEqual(sev, "fail")
        self.assertIn("edge/proxy problem", msg)
        self.assertIn("Odoo is healthy", msg)
        self.assertIn("CrowdSec", msg)

    def test_app_down_when_origin_and_edge_fail(self):
        sev, msg = oh.diagnose_site(site(origin=bad("origin"), edge=bad("edge")))
        self.assertEqual(sev, "fail")
        self.assertIn("application not responding", msg)

    def test_container_and_database_take_priority(self):
        self.assertIn("container down", oh.diagnose_site(site(container=bad("container", "x missing"), origin=bad("origin")))[1])
        self.assertIn("database", oh.diagnose_site(site(database=bad("database", "no response"), origin=bad("origin")))[1])

    def test_login_failure_with_app_up(self):
        sev, msg = oh.diagnose_site(site(login=bad("login", "HTTP 500")))
        self.assertEqual(sev, "fail")
        self.assertIn("login page failing", msg)

    def test_cert_levels(self):
        self.assertEqual(oh.diagnose_site(site(cert=oh.Check("cert", False, "10 days left", 0, 10.0)))[0], "warn")
        self.assertEqual(oh.diagnose_site(site(cert=oh.Check("cert", False, "2 days left", 0, 2.0)))[0], "fail")

    def test_odmcp(self):
        good = {"container": ok("c"), "local": ok("l"), "public": ok("p")}
        self.assertEqual(oh.diagnose_odmcp(good)[0], "ok")
        self.assertIn("edge/proxy", oh.diagnose_odmcp({**good, "public": bad("public", "HTTP 500")})[1])
        self.assertEqual(oh.diagnose_odmcp({**good, "container": bad("c")})[0], "fail")


class StateMachine(unittest.TestCase):
    def test_fail_needs_two_runs_then_alerts_once(self):
        inc = {"odoo17": ("fail", "boom")}
        st, ev = oh.step_state({}, inc, 1000)
        self.assertEqual(ev, [])
        st, ev = oh.step_state(st, inc, 1120)
        self.assertEqual([e[0] for e in ev], ["ALERT"])
        st, ev = oh.step_state(st, inc, 1240)
        self.assertEqual(ev, [], "no spam while it keeps failing")

    def test_reminder_after_six_hours_and_recovery(self):
        inc = {"odoo17": ("fail", "boom")}
        st, _ = oh.step_state({}, inc, 0)
        st, ev = oh.step_state(st, inc, 120)
        self.assertEqual(ev[0][0], "ALERT")
        st, ev = oh.step_state(st, inc, 120 + oh.FAIL_REPEAT_SECONDS)
        self.assertEqual(ev[0][0], "REMINDER")
        st, ev = oh.step_state(st, {}, 120 + oh.FAIL_REPEAT_SECONDS + 120)
        self.assertEqual([e[0] for e in ev], ["RECOVERED"])
        self.assertEqual(st, {})

    def test_blip_never_alerts_and_never_announces_recovery(self):
        st, ev = oh.step_state({}, {"od-mcp": ("fail", "x")}, 0)
        st, ev = oh.step_state(st, {}, 120)
        self.assertEqual(ev, [])

    def test_warning_alerts_immediately_and_repeats_daily(self):
        inc = {"cert:odoo.aivory.id": ("warn", "10 days")}
        st, ev = oh.step_state({}, inc, 0)
        self.assertEqual(ev[0][0], "ALERT")
        st, ev = oh.step_state(st, inc, 3600)
        self.assertEqual(ev, [])
        st, ev = oh.step_state(st, inc, oh.WARN_REPEAT_SECONDS)
        self.assertEqual(ev[0][0], "REMINDER")


class Handler(http.server.BaseHTTPRequestHandler):
    routes = {}
    posts = []

    def log_message(self, *a):
        pass

    def do_GET(self):
        code, body, delay = self.routes.get(self.path, (404, "", 0))
        time.sleep(delay)
        if code in (301, 302):
            self.send_response(code)
            self.send_header("Location", "/elsewhere")
            self.end_headers()
            return
        self.send_response(code)
        self.end_headers()
        self.wfile.write(body.encode())

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        Handler.posts.append((self.path, json.loads(self.rfile.read(n))))
        self.send_response(200)
        self.end_headers()


class Http(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.port = cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def url(self, p):
        return f"http://127.0.0.1:{self.port}{p}"

    def test_http_get_variants(self):
        Handler.routes = {"/ok": (200, '{"status": "pass"}', 0), "/boom": (500, "", 0), "/redir": (302, "", 0)}
        s, b, ms, err = oh.http_get(self.url("/ok"))
        self.assertEqual((s, err), (200, None))
        self.assertTrue(oh._health_ok(s, b))
        self.assertEqual(oh.http_get(self.url("/boom"))[0], 500)
        self.assertEqual(oh.http_get(self.url("/redir"))[0], 302, "redirects are not followed")
        s, _, _, err = oh.http_get("http://127.0.0.1:1/x", timeout=1)
        self.assertEqual(s, 0)
        self.assertTrue(err)

    def test_timeout_is_reported_not_raised(self):
        Handler.routes = {"/slow": (200, "pass", 2)}
        s, _, _, err = oh.http_get(self.url("/slow"), timeout=0.5)
        self.assertEqual(s, 0)
        self.assertTrue(err)

    def test_webhook_and_telegram_delivery_and_token_never_leaks(self):
        Handler.posts = []
        env = {"ALERT_WEBHOOK_URL": self.url("/hook"), "TELEGRAM_BOT_TOKEN": "SECRETTOKEN", "TELEGRAM_CHAT_ID": "42", "TELEGRAM_API_BASE": f"http://127.0.0.1:{self.port}"}
        res = oh.send_alerts("hello", env)
        self.assertEqual([r[0] for r in res], ["telegram", "webhook"])
        self.assertTrue(all(r[1] for r in res))
        self.assertTrue(any(p == "/botSECRETTOKEN/sendMessage" and b == {"chat_id": "42", "text": "hello"} for p, b in Handler.posts))
        self.assertTrue(any(p == "/hook" and b == {"text": "hello"} for p, b in Handler.posts))
        self.assertNotIn("SECRETTOKEN", json.dumps(res))

    def test_no_channel_configured(self):
        self.assertEqual(oh.send_alerts("x", {}), [])


class EndToEnd(unittest.TestCase):
    """run_all with injected probes: healthy, then the real outage shape."""

    def probes(self, edge_status):
        def get(url, timeout=8):
            if url.startswith("https://odoo") and url.endswith("/web/health"):
                return edge_status, '{"status": "pass"}' if edge_status == 200 else "", 5, None
            if url.endswith("/web/login"):
                return edge_status, "", 20, None
            if "8500/health" in url or "odoo-mcp" in url:
                return 200, '{"status":"ok"}', 3, None
            return 200, '{"status": "pass"}', 2, None  # origin

        return {
            "http_get": get,
            "container_state": lambda n: ("running", ""),
            "container_ip": lambda n: "172.18.0.9",
            "cert_days_left": lambda h: (80.0, None),
            "run": lambda cmd, timeout=10: (0, "accepting connections"),
        }

    def test_healthy(self):
        result, inc = oh.run_all(self.probes(200))
        self.assertEqual(inc, {})
        self.assertTrue(all(v["severity"] == "ok" for v in result.values()))

    def test_outage_shape_flags_both_sites_with_edge_diagnosis(self):
        result, inc = oh.run_all(self.probes(500))
        self.assertEqual(set(inc), {"odoo17", "odoo19-demo"})
        self.assertTrue(all("edge/proxy problem" in m for _, m in inc.values()))
        self.assertEqual(result["od-mcp"]["severity"], "ok")


if __name__ == "__main__":
    unittest.main()
