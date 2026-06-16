import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PAYMENT_CONFIG,
  getPaymentAmount,
  reconcileCatalog,
  reconcilePaymentConfig,
  describeReconciliation,
  assertCatalogReconciled,
  type CatalogProductDefinition,
} from "./payment";
import {
  ALL_PRODUCTS,
  PRODUCT_IDS,
  getProductPrice,
  getProductName,
} from "./pricing";

// payment.ts consumes pricing.ts as the single source of truth. These tests
// lock in (a) the corrected prices sourced from pricing.ts (Req 8.2/8.4) and
// (b) the reconciliation check that surfaces divergence by product id while
// retaining the pricing-config value as published (Req 8.6, 8.8).

describe("PAYMENT_CONFIG sourced from pricing.ts", () => {
  it("uses the corrected subscription prices from pricing.ts (Req 8.2)", () => {
    expect(PAYMENT_CONFIG.foundationPrice).toBe(20);
    expect(PAYMENT_CONFIG.proPrice).toBe(44);
    expect(PAYMENT_CONFIG.enterprisePrice).toBe(499);

    expect(PAYMENT_CONFIG.foundationPrice).toBe(getProductPrice(PRODUCT_IDS.FOUNDATION));
    expect(PAYMENT_CONFIG.proPrice).toBe(getProductPrice(PRODUCT_IDS.PRO));
    expect(PAYMENT_CONFIG.enterprisePrice).toBe(getProductPrice(PRODUCT_IDS.ENTERPRISE));
  });

  it("keeps the already-correct one-time prices from pricing.ts (Req 8.3)", () => {
    expect(PAYMENT_CONFIG.snapshotPrice).toBe(29);
    expect(PAYMENT_CONFIG.blueprintPrice).toBe(85);
    expect(PAYMENT_CONFIG.snapshotPrice).toBe(getProductPrice(PRODUCT_IDS.DEEP_DIAGNOSTIC));
    expect(PAYMENT_CONFIG.blueprintPrice).toBe(getProductPrice(PRODUCT_IDS.BLUEPRINT));
  });

  it("adds the Full Stack product ($99, full_stack) from pricing.ts (Req 8.4)", () => {
    expect(PAYMENT_CONFIG.products.FULL_STACK).toBe("full_stack");
    expect(PAYMENT_CONFIG.fullStackPrice).toBe(99);
    expect(PAYMENT_CONFIG.fullStackPrice).toBe(getProductPrice(PRODUCT_IDS.FULL_STACK));
  });

  it("resolves the Full Stack payment amount via getPaymentAmount", () => {
    expect(getPaymentAmount(PAYMENT_CONFIG.products.FULL_STACK)).toBe(99);
  });

  it("derives credit prices from the pricing.ts credit packs", () => {
    expect(PAYMENT_CONFIG.creditPrices[500]).toBe(getProductPrice("credits_500"));
    expect(PAYMENT_CONFIG.creditPrices[50]).toBe(getProductPrice("credits_50"));
  });
});

describe("reconcileCatalog against pricing.ts (Req 8.6, 8.8)", () => {
  it("reports no discrepancies when the catalog matches pricing.ts", () => {
    const matching: CatalogProductDefinition[] = ALL_PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
    }));
    const result = reconcileCatalog(matching, "backend");
    expect(result.reconciled).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  it("surfaces a price divergence identified by product id and field (Req 8.8)", () => {
    const divergent: CatalogProductDefinition[] = ALL_PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.id === PRODUCT_IDS.PRO ? 500 : p.price,
    }));
    const result = reconcileCatalog(divergent, "midtrans");
    expect(result.reconciled).toBe(false);

    const priceDiff = result.discrepancies.find(
      (d) => d.productId === PRODUCT_IDS.PRO && d.field === "price"
    );
    expect(priceDiff).toBeDefined();
    expect(priceDiff?.found).toBe(500);
    // pricing.ts value is retained as the authoritative/expected price.
    expect(priceDiff?.expected).toBe(getProductPrice(PRODUCT_IDS.PRO));
    expect(priceDiff?.source).toBe("midtrans");
  });

  it("surfaces a name divergence identified by product id and field", () => {
    const divergent: CatalogProductDefinition[] = ALL_PRODUCTS.map((p) => ({
      id: p.id,
      name: p.id === PRODUCT_IDS.FOUNDATION ? "Starter" : p.name,
      price: p.price,
    }));
    const result = reconcileCatalog(divergent, "backend");
    const nameDiff = result.discrepancies.find(
      (d) => d.productId === PRODUCT_IDS.FOUNDATION && d.field === "name"
    );
    expect(nameDiff).toBeDefined();
    expect(nameDiff?.found).toBe("Starter");
    expect(nameDiff?.expected).toBe(getProductName(PRODUCT_IDS.FOUNDATION));
  });

  it("flags a pricing.ts product missing from the downstream catalog", () => {
    const missingFullStack: CatalogProductDefinition[] = ALL_PRODUCTS.filter(
      (p) => p.id !== PRODUCT_IDS.FULL_STACK
    ).map((p) => ({ id: p.id, name: p.name, price: p.price }));
    const result = reconcileCatalog(missingFullStack, "backend");
    const missing = result.discrepancies.find(
      (d) => d.productId === PRODUCT_IDS.FULL_STACK && d.field === "id"
    );
    expect(missing).toBeDefined();
    expect(missing?.found).toBeUndefined();
    expect(missing?.expected).toBe(PRODUCT_IDS.FULL_STACK);
  });

  it("flags a downstream product that pricing.ts does not define", () => {
    const extra: CatalogProductDefinition[] = [
      ...ALL_PRODUCTS.map((p) => ({ id: p.id, name: p.name, price: p.price })),
      { id: "legacy_unknown", name: "Legacy Bundle", price: 12 },
    ];
    const result = reconcileCatalog(extra, "midtrans");
    const orphan = result.discrepancies.find((d) => d.productId === "legacy_unknown");
    expect(orphan).toBeDefined();
    expect(orphan?.field).toBe("id");
    expect(orphan?.found).toBe("legacy_unknown");
    expect(orphan?.expected).toBeUndefined();
  });
});

describe("reconcilePaymentConfig (self-check)", () => {
  it("reports the payment module itself as reconciled with pricing.ts", () => {
    const result = reconcilePaymentConfig();
    expect(result.reconciled).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });
});

describe("describeReconciliation", () => {
  it("returns an empty string when reconciled", () => {
    expect(describeReconciliation({ reconciled: true, discrepancies: [] })).toBe("");
  });

  it("identifies the divergent product and field in the message", () => {
    const message = describeReconciliation({
      reconciled: false,
      discrepancies: [
        {
          productId: PRODUCT_IDS.PRO,
          source: "midtrans",
          field: "price",
          found: 500,
          expected: 44,
        },
      ],
    });
    expect(message).toContain(PRODUCT_IDS.PRO);
    expect(message).toContain("price");
    expect(message).toContain("44");
  });
});

describe("assertCatalogReconciled", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a reconciliation error on divergence and retains pricing.ts as published", () => {
    const divergent: CatalogProductDefinition[] = ALL_PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.id === PRODUCT_IDS.ENTERPRISE ? 1000 : p.price,
    }));
    const result = assertCatalogReconciled(divergent, "backend");
    expect(result.reconciled).toBe(false);
    expect(console.error).toHaveBeenCalledOnce();
    // pricing.ts remains the authoritative published price (unchanged).
    expect(getProductPrice(PRODUCT_IDS.ENTERPRISE)).toBe(499);
  });

  it("does not log when the catalog is reconciled", () => {
    const matching: CatalogProductDefinition[] = ALL_PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
    }));
    const result = assertCatalogReconciled(matching, "backend");
    expect(result.reconciled).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });
});
