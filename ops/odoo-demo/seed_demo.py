#!/usr/bin/env python3
"""
Aivory Odoo Demo — inject scenario data before a prospect demo.

Uses Odoo XML-RPC (works on 17/18/19, no extra addon needed).
Run AFTER the golden DB exists and the demo user + API key are created.

Usage:
  ODOO_URL=https://odoo.aivory.id ODOO_DB=demo \\
  ODOO_USER=aivory-agent ODOO_API_KEY=xxx \\
  ./ops/odoo-demo/seed_demo.py --scenario retail

  --scenario retail  : 3 customers, 5 products, 6 SO (kopi / general)
  --scenario service : 2 customers, service products, open tickets-style SO
  --scenario roofer  : Roofers Resource prospect (bestroofersresource.com) —
                       4 Texas roofing contractors, Elevate Base/RMS/Pro
                       products with real pricing, 6 job SO mix draft/confirmed
  --clear            : delete only data created by this script (by name prefix)

All records are prefixed [DEMO] so reset/clear never touches real config.
After demo: ./ops/odoo-demo/reset_demo.sh (full golden restore).
"""
import argparse
import os
import sys
import xmlrpc.client

PREFIX = "[DEMO]"

SCENARIOS = {
    "retail": {
        "partners": ["PT Maju Jaya", "CV Berkah Abadi", "Toko Sinar Baru"],
        "products": [
            ("Kopi Arabika 1kg", 145000),
            ("Kopi Robusta 1kg", 98000),
            ("Tumbler Aivory 500ml", 189000),
            ("Gift Box Lebaran", 259000),
            ("Beans Subscription / bulan", 120000),
        ],
        "n_orders": 6,
    },
    "service": {
        "partners": ["PT Cipta Solusi", "Yayasan Harapan Bangsa"],
        "products": [
            ("Implementasi Odoo / paket", 25000000),
            ("Support / jam", 350000),
            ("Training / hari", 5000000),
        ],
        "n_orders": 4,
    },
    # Prospect: Roofers Resource — bestroofersresource.com (runs Odoo itself).
    # Demo Odoo mirrors THEIR business: customers = small roofing contractors,
    # products = Elevate tiers with real pricing from /pricing page.
    # Prices in USD. First job free story: keep one SO at $0 to demo that talk.
    "roofer": {
        "partners": [
            "Lone Star Roofing Co — Bryan TX",
            "Alamo City Roof Pros — San Antonio TX",
            "Hill Country Roofing — Austin TX",
            "Gulf Coast Roofing LLC — Houston TX",
        ],
        "products": [
            ("Elevate Base — Job Processing / job", 325),
            ("Elevate Base — Per Square", 20),
            ("Elevate RMS — Monthly / user pack", 60),
            ("Elevate Pro — Monthly base", 30),
            ("Elevate Pro — Job add-on / job", 200),
        ],
        "n_orders": 6,
    },
}


def connect(url, db, user, api_key):
    common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
    uid = common.authenticate(db, user, api_key, {})
    if not uid:
        print("auth failed — check ODOO_USER / ODOO_API_KEY / ODOO_DB", file=sys.stderr)
        sys.exit(1)
    models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")
    do = lambda model, method, *args: models.execute_kw(
        db, uid, api_key, model, method, *args
    )
    return do


def seed(do, scenario):
    cfg = SCENARIOS[scenario]
    partner_ids = []
    for name in cfg["partners"]:
        pid = do("res.partner", "create", [{
            "name": f"{PREFIX} {name}",
            "email": "demo@example.com",
            "customer_rank": 1,
        }])
        partner_ids.append(pid)
    print(f"partners: {partner_ids}")

    product_ids = []
    for name, price in cfg["products"]:
        prod_tmpl = do("product.template", "create", [{
            "name": f"{PREFIX} {name}",
            "list_price": price,
            "type": "consu",
        }])
        prod = do("product.product", "search", [[["product_tmpl_id", "=", prod_tmpl]]], {"limit": 1})
        product_ids.append(prod[0])
    print(f"products: {product_ids}")

    for i in range(cfg["n_orders"]):
        partner = partner_ids[i % len(partner_ids)]
        prod = product_ids[i % len(product_ids)]
        so = do("sale.order", "create", [{
            "partner_id": partner,
            "order_line": [(0, 0, {
                "product_id": prod,
                "product_uom_qty": (i % 3) + 1,
            })],
        }])
        # confirm every other order so demo has both draft + confirmed states
        if i % 2 == 0:
            try:
                do("sale.order", "action_confirm", [[so]])
            except Exception as e:
                print(f"warn: confirm SO {so} failed: {e}")
        print(f"SO {so} ({'confirmed' if i % 2 == 0 else 'draft'})")
    print(f"done — scenario '{scenario}' injected, all prefixed {PREFIX}")


def clear(do):
    for model, field in [("sale.order", "name"), ("product.template", "name"), ("res.partner", "name")]:
        ids = do(model, "search", [[[field, "ilike", PREFIX]]])
        if ids:
            # SO must be cancelled before unlink
            if model == "sale.order":
                try:
                    do(model, "action_cancel", [ids])
                except Exception:
                    pass
            do(model, "unlink", [ids])
            print(f"{model}: removed {len(ids)}")
    print("cleared all [DEMO] records")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scenario", choices=list(SCENARIOS), default="retail")
    ap.add_argument("--clear", action="store_true")
    args = ap.parse_args()

    url = os.environ.get("ODOO_URL", "https://odoo-demo.aivory.id")
    db = os.environ.get("ODOO_DB", "demo")
    user = os.environ.get("ODOO_USER", "aivory-agent")
    api_key = os.environ.get("ODOO_API_KEY", "")
    if not api_key:
        print("set ODOO_API_KEY env first", file=sys.stderr)
        sys.exit(1)

    do = connect(url, db, user, api_key)
    if args.clear:
        clear(do)
    else:
        seed(do, args.scenario)


if __name__ == "__main__":
    main()
