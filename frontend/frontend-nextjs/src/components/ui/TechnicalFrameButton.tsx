import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type TechnicalFrameButtonCommonProps = {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'compact' | 'heroCompact';
};

type TechnicalFrameLinkProps = TechnicalFrameButtonCommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'className' | 'href'> & {
    href: string;
  };

type TechnicalFrameNativeButtonProps = TechnicalFrameButtonCommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & {
    href?: never;
  };

export type TechnicalFrameButtonProps =
  | TechnicalFrameLinkProps
  | TechnicalFrameNativeButtonProps;

const baseClassName =
  'group relative inline-flex items-center justify-center border border-white/20 bg-black font-mono font-medium uppercase text-white/85 transition-[border-color,color,box-shadow,transform] duration-300 active:scale-[0.97] active:duration-[160ms] hover:border-white/45 hover:bg-black hover:text-white hover:shadow-[0_0_24px_rgba(255,255,255,0.07)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-45';

const sizeClassNames = {
  default: 'min-h-[52px] px-8 py-3.5 text-[11px] tracking-[0.16em]',
  compact: 'min-h-[29px] px-[18px] py-2 text-[10px] tracking-[0.08em]',
  // ~15% down from `default` -- used where the button needs to sit lighter
  // (e.g. the hero CTA) without touching every other TechnicalFrameButton.
  heroCompact: 'min-h-[44px] px-7 py-3 text-[9px] tracking-[0.14em]',
} as const;

function TechnicalFrameContent({ children }: { children: ReactNode }) {
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l border-t border-white/60 transition-colors group-hover:border-white" />
      <span aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-2 w-2 border-r border-t border-white/60 transition-colors group-hover:border-white" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-2 w-2 border-b border-l border-white/60 transition-colors group-hover:border-white" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b border-r border-white/60 transition-colors group-hover:border-white" />
      <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
    </>
  );
}

export function TechnicalFrameButton(props: TechnicalFrameButtonProps) {
  if (typeof props.href === 'string') {
    const { href, children, className = '', size = 'default', ...linkProps } =
      props as TechnicalFrameLinkProps;
    return (
      <Link
        href={href}
        {...linkProps}
        data-button-style="technical-frame-black"
        className={`${baseClassName} ${sizeClassNames[size]} ${className}`.trim()}
      >
        <TechnicalFrameContent>{children}</TechnicalFrameContent>
      </Link>
    );
  }

  const { children, className = '', size = 'default', type = 'button', ...buttonProps } =
    props as TechnicalFrameNativeButtonProps;
  return (
    <button
      {...buttonProps}
      type={type}
      data-button-style="technical-frame-black"
      className={`${baseClassName} ${sizeClassNames[size]} ${className}`.trim()}
    >
      <TechnicalFrameContent>{children}</TechnicalFrameContent>
    </button>
  );
}
