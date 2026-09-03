/**
 * Midtrans browser tokenisation and 3-D Secure.
 *
 * Card details must never reach an Aivory server: this library exchanges them
 * with Midtrans directly, in the browser, for a single-use `token_id` that the
 * payments service can charge. That is what keeps card handling out of PCI DSS
 * scope while the form itself stays entirely ours.
 *
 * Before this existed, the checkout collected card number, expiry and CVV into
 * its own form and then handed the purchase to Snap — which asked for all of it
 * a second time. The details the customer typed on our page were discarded.
 */

type TokenCallbacks = {
  onSuccess: (response: { status_code: string; token_id: string }) => void;
  onFailure: (response: { status_message?: string }) => void;
};

type AuthCallbacks = {
  performAuthentication: (redirectUrl: string) => void;
  onSuccess: (response: unknown) => void;
  onPending: (response: unknown) => void;
  onFailure: (response: { status_message?: string }) => void;
};

declare global {
  interface Window {
    MidtransNew3ds?: {
      getCardToken: (card: Record<string, string>, cb: TokenCallbacks) => void;
      authenticate: (redirectUrl: string, cb: AuthCallbacks) => void;
      redirect: (redirectUrl: string, cb: AuthCallbacks) => void;
    };
    MIDTRANS_CLIENT_KEY?: string;
    MIDTRANS_IS_PRODUCTION?: boolean;
  }
}

const SCRIPT_ID = 'midtrans-new-3ds';

/**
 * Inject the library once and resolve when it is usable.
 *
 * The environment and client key travel as data attributes on the script tag —
 * the library reads them off itself at load time, so they cannot be passed in
 * later.
 */
export function loadMidtrans3ds(clientKey: string, isProduction: boolean): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.MidtransNew3ds) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load the card library')));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = isProduction
      ? 'https://api.midtrans.com/v2/assets/js/midtrans-new-3ds.min.js'
      : 'https://api.sandbox.midtrans.com/v2/assets/js/midtrans-new-3ds.min.js';
    script.setAttribute('data-environment', isProduction ? 'production' : 'sandbox');
    script.setAttribute('data-client-key', clientKey);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load the card library'));
    document.head.appendChild(script);
  });
}

/**
 * Exchange card details for a single-use token.
 *
 * `expiry` is the "MM/YY" string the form already holds; it is split here so no
 * caller has to know Midtrans wants the two halves separately.
 */
export function getCardToken(card: {
  number: string;
  expiry: string;
  cvv: string;
}): Promise<string> {
  const lib = typeof window !== 'undefined' ? window.MidtransNew3ds : undefined;
  if (!lib) return Promise.reject(new Error('Card library is not loaded'));

  const [month, year] = card.expiry.split('/').map((part) => part.trim());
  if (!month || !year) return Promise.reject(new Error('Enter the expiry date as MM/YY'));

  return new Promise((resolve, reject) => {
    lib.getCardToken(
      {
        card_number: card.number.replace(/\D/g, ''),
        card_exp_month: month,
        // Midtrans wants four digits; the form collects two.
        card_exp_year: year.length === 2 ? `20${year}` : year,
        card_cvv: card.cvv,
      },
      {
        onSuccess: (response) => resolve(response.token_id),
        onFailure: (response) =>
          // Midtrans' own wording here is customer-facing and specific
          // ("card is expired", "invalid card number"), so it is better than
          // anything generic this layer could substitute.
          reject(new Error(response.status_message || 'That card could not be verified')),
      },
    );
  });
}

/**
 * Run 3-D Secure for a charge that asked for it.
 *
 * The page behind `redirectUrl` belongs to the issuing bank — no integration
 * can restyle or replace it. `performAuthentication` is where we choose how to
 * surface it; an overlaid iframe keeps the customer on our checkout rather than
 * sending them away to a new tab.
 */
export function authenticate3ds(
  redirectUrl: string,
  showFrame: (url: string) => void,
  hideFrame: () => void,
): Promise<'success' | 'pending'> {
  const lib = typeof window !== 'undefined' ? window.MidtransNew3ds : undefined;
  if (!lib) return Promise.reject(new Error('Card library is not loaded'));

  return new Promise((resolve, reject) => {
    lib.authenticate(redirectUrl, {
      performAuthentication: (url) => showFrame(url),
      onSuccess: () => {
        hideFrame();
        resolve('success');
      },
      onPending: () => {
        hideFrame();
        resolve('pending');
      },
      onFailure: (response) => {
        hideFrame();
        reject(new Error(response.status_message || 'The bank declined the payment'));
      },
    });
  });
}
