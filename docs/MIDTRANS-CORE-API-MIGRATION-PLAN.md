# Midtrans Core API Migration Plan — Aivory-owned checkout UI

**Status:** Phase 0 passed; Phase 1 built + deployed (inert), awaiting a real test transaction per channel
**Created:** 2026-08-29
**Goal:** keep Midtrans as the payment processor, but stop it owning the checkout interface.
**Related:** `services/avry-payments/app/services/payment_gateway.py`, `frontend/frontend-nextjs/src/components/payment/CheckoutForm.tsx`, `src/lib/payment.ts`

---

## Why

Today, choosing a payment channel on `/checkout/<productId>` hands the screen to Midtrans: Snap's popup replaces the Aivory checkout entirely. The visitor leaves an Aivory-designed flow mid-purchase and lands in a generic gateway UI.

A second, less visible cost: because Snap owns the flow, Aivory only learns the outcome through Snap's callbacks — and `startMidtransSnap` resolves from **both** `onSuccess` and `onPending`. That ambiguity is what caused the Google Ads Purchase conversion to count unpaid bank-transfer orders (fixed defensively in `d0633be` by gating on `transaction_status`, but the underlying "we do not own the state machine" problem remains).

## What is actually achievable

Honest split, because "full Aivory UI" is only true for part of it:

| Channel | Achievable | Why |
| --- | --- | --- |
| GoPay, ShopeePay | **100% Aivory UI** | Core API returns a deeplink / QR string; we render it |
| DANA | **Snap only** | Core API: `payment_type is not supported: dana`. Keep on Snap, or serve via QRIS (the DANA app scans it) |
| QRIS | **100% Aivory UI** | Core API returns the QR string |
| Bank transfer / VA | **100% Aivory UI** | Core API returns the VA number and bank |
| Credit / debit card | **Form is 100% Aivory; two hand-offs remain** | See below |

**The two card hand-offs cannot be removed** (they are the same under Snap, so this is not a regression):

1. **Tokenisation** must go through Midtrans' browser JS (`MidtransNew3ds.getCardToken`) unless Aivory holds PCI DSS certification. The card *form* — fields, layout, validation, styling — is entirely ours; only the transmission of the card data bypasses our server, which is the point.
2. **3DS** returns a `redirect_url` belonging to the **issuing bank**, opened via `MidtransNew3ds.authenticate`. Nobody but the bank can own that OTP screen.

## What is already verified

- `avry-payments` currently calls `POST {app.midtrans.com}/snap/v1/transactions` (`payment_gateway.py:254`). `core_url` (`https://api.midtrans.com`) is already configured on line 47 but unused for charging.
- Credentials on the VPS are **production**, not sandbox: `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY` both `Mid-…` prefixed, `MIDTRANS_IS_PRODUCTION=true`.
- **Core API authenticates with the existing server key.** A status probe for a non-existent order against `https://api.midtrans.com/v2/{order_id}/status` returned `"Transaction doesn't exist."` rather than an authorisation error. No new credentials are needed for the API itself.
- Channels offered today in `CheckoutForm.tsx`: `credit_card`, `gopay`, `dana`, `qris`.

## Phase 0 — Channel enablement — **PASSED 2026-08-29**

Probed `POST /v2/charge` on production for all four channels with `gross_amount: 0`, which can never create a transaction. Every channel returned a **400 payload-validation** error, not the 402 "Merchant cannot use this payment channel" that a disabled channel produces — and each ran its *own* validator:

| Channel | Response |
| --- | --- |
| `gopay`, `qris` | 400 — `gross_amount must be between 0.01 - 99999999999.00` |
| `bank_transfer` | 400 — `gross_amount must be greater than or equal to 1` |
| `credit_card` | 400 — `credit_card is required`, plus range `0.01 - 999999999.00` |

Distinct amount ranges per channel, and `credit_card` demanding its own object (the `token_id` container), mean the request reached per-channel payload validation — i.e. it was past channel routing and authorisation. Card Core API therefore appears **not** to be gated behind separate activation on this account.

**Caveat, stated plainly:** this proves routing and validation accept each channel. It does not prove a real charge settles end to end. Phase 1's exit gate is still a small real transaction per channel — that remains the only definitive proof.

## Phase 1 — Backend: charge alongside Snap, not instead of it

Add a Core API charge path to `avry-payments` **without removing the Snap path**, so the two can run side by side and the rollout is reversible per channel.

- `POST {api.midtrans.com}/v2/charge`, with `payment_type` per channel (`credit_card`, `gopay`, `qris`, `bank_transfer`).
- Return the method-specific payload the frontend must render: `actions[]` (GoPay deeplink), `qr_string`, `va_numbers[]`, or the 3DS `redirect_url`.
- Persist `transaction_status` / `fraud_status` on the order as the single source of truth.

**Built and deployed 2026-08-29** — `create_charge` + `CORE_API_CHANNELS` + `_render_payload` in `payment_gateway.py` (`04a0247`, merged with VPS-local channel-alias work as `c8e950c`). Nothing calls it yet; no route exposes it, so the deploy is inert.

**Payload shape verified against production without creating a transaction.** Called `create_charge` for all five channels with `resolve_gross_amount_idr` patched to 0, which Midtrans must reject. The only validation message returned for any channel was about `gross_amount` — the field deliberately broken. The `callback_url is required` / `credit_card is required` complaints seen in the Phase 0 bare probes are gone, which is what proves each payload is structurally complete.

**Exit gate — NOT met, and needs the account owner:** a small real transaction per channel, confirming the order row reflects the right status. This cannot be done from here; executing a real payment is the owner's call.

## Phase 2 — Webhook is the source of truth

Nothing in the current notification handling changes shape — Core API and Snap post the same notification payload. But with the frontend no longer inferring outcomes from Snap callbacks, the webhook becomes the *only* thing that settles an order.

**Exit gate:** an order left untouched in the browser (tab closed after a VA number is issued) still settles when the transfer lands.

## Phase 3 — Frontend: per-method Aivory UI

Replace `startMidtransSnap` with per-method rendering in `CheckoutForm`:

- **QRIS** — render `qr_string` as a QR code in the Aivory panel, poll status.
- **GoPay / DANA** — deeplink button on mobile, QR on desktop.
- **VA** — show bank + VA number with a copy button and clear "we will confirm once the transfer lands" wording.
- **Card** — Aivory-styled form → `getCardToken` → charge → `MidtransNew3ds.authenticate` if 3DS is required.

**Exit gate:** no Midtrans-branded surface appears for any non-card channel, and the card flow shows only the bank's own 3DS screen.

## Phase 4 — Correct the state machine

With Aivory owning the flow, replace the binary success/failure screens with the states that actually exist: `settlement`/`capture` → paid; `pending` → awaiting payment (with instructions); `deny`/`expire`/`cancel` → distinct outcomes.

This also closes two items already logged against the current flow:
- `setStep('success')` runs for pending orders, so a VA order that has not been paid reads as successful (`d0633be` commit message).
- The `purchase` analytics event can then key off the order's real status rather than a callback's timing.

**Exit gate:** a pending VA order never shows a success screen, and Google Ads records a Purchase only on settlement.

## Phase 5 — Retire Snap per channel

Remove the Snap path one channel at a time, only after its Core API equivalent has run in production. Keep Snap as the documented fallback for any channel Phase 0 found to be disabled.

## Sequencing note

Phase 0 first is not ceremony. Every later phase assumes Core API charge works for a given channel; discovering mid-Phase-3 that card Core API needs Midtrans approval would strand a half-built card form behind a support ticket of unknown length.

## Explicitly out of scope

- PCI DSS certification. The plan is built to *avoid* needing it, via client-side tokenisation.
- Replacing the issuer's 3DS screen — not possible for any integration.
- Changing pricing, FX handling, or the Turnstile gate on `/checkout`.
