import React from 'react';

/**
 * Payment acceptance marks shown under the pricing currency toggle.
 * Heights are set per logo so the marks sit on the same optical baseline —
 * a wordmark (Visa, QRIS, GoPay) reads larger than a symbol (Mastercard)
 * at identical pixel heights.
 */
const METHODS = [
  { src: '/payments/visa.svg', alt: 'Visa', height: 17 },
  { src: '/payments/mastercard.svg', alt: 'Mastercard', height: 20 },
  { src: '/payments/qris.svg', alt: 'QRIS', height: 17 },
  { src: '/payments/gopay.svg', alt: 'GoPay', height: 15 },
];

export default function PaymentMethods() {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-[10px] uppercase tracking-[0.16em] text-[#494949] font-medium">
        We accept
      </span>
      <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-4 list-none m-0 p-0">
        {METHODS.map((method, index) => (
          <li
            key={method.alt}
            className="payment-mark"
            style={{ animationDelay: `${index * 55}ms` }}
          >
            <img
              src={method.src}
              alt={method.alt}
              height={method.height}
              style={{ height: method.height, width: 'auto' }}
              decoding="async"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
