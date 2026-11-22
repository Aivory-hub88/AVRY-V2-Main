import type { ReactNode } from 'react';
import s from './landing.module.css';

/** The landing's link button: fill slide-up plus a rolling label (motion in landing.module.css).
 *  Server-safe; the ↗ badge comes from <CtaCursor /> mounted once on the page. `children` must be
 *  text, because the label is rendered twice for the roll. */
export default function LandingCta({
  href,
  ghost = false,
  external = false,
  children,
}: {
  href: string;
  ghost?: boolean;
  external?: boolean;
  children: string;
}) {
  return (
    <a
      className={`${s.btn} ${ghost ? s.ghost : ''}`}
      href={href}
      data-cta-cursor
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <span className={s.btnFill} aria-hidden="true" />
      <span className={s.btnRoll}>
        <span>{children}</span>
        <span aria-hidden="true">{children}</span>
      </span>
    </a>
  );
}
