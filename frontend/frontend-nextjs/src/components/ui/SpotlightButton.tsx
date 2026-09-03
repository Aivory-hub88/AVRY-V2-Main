'use client';
import { useRef, useEffect, ReactNode } from 'react';
interface SpotlightButtonProps {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  icon?: boolean | ReactNode;
  roundedClass?: string;
  iconClassName?: string;
  style?: React.CSSProperties;
  autoplay?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

export function SpotlightButton({ href, onClick, children, className = '', icon = true, roundedClass = 'rounded-[24px]', iconClassName = 'w-4 h-4 text-[#a3aa96] shrink-0', style, autoplay = true, type = 'button', disabled = false }: SpotlightButtonProps) {
  const btnRef = useRef<HTMLAnchorElement & HTMLButtonElement>(null);

  useEffect(() => {
    const startTime = Math.random() * 10000;
    let animationFrameId: number;
    let isHovering = false;

    const animate = (time: number) => {
      if (btnRef.current && !isHovering && autoplay) {
        const rect = btnRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const radiusX = rect.width / 2;
        const radiusY = rect.height / 2;
        const speed = 0.0015;
        const angle = (time + startTime) * speed;

        const x = centerX + radiusX * Math.cos(angle);
        const y = centerY - radiusY * Math.sin(angle);

        btnRef.current.style.setProperty('--mouse-x', `${x}px`);
        btnRef.current.style.setProperty('--mouse-y', `${y}px`);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    if (autoplay) {
      animationFrameId = requestAnimationFrame(animate);
    }

    const el = btnRef.current;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty('--mouse-x', `${x}px`);
      el.style.setProperty('--mouse-y', `${y}px`);
    };

    if (el) {
      el.addEventListener('mouseenter', () => (isHovering = true));
      el.addEventListener('mouseleave', () => (isHovering = false));
      el.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (el) {
        el.removeEventListener('mouseenter', () => (isHovering = true));
        el.removeEventListener('mouseleave', () => (isHovering = false));
        el.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  const baseClasses = `inline-flex items-center gap-3 text-white no-underline uppercase cursor-pointer transition-all duration-500 min-h-[44px] pointer-events-auto spotlight-card auto-spotlight ${roundedClass} border-none shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(174,201,157,0.05)] justify-center`;
  const combinedClasses = `${baseClasses} ${className}`;

  const defaultStyle = {
    padding: '0.75rem 1.5rem',
    fontFamily: "var(--font-manrope), 'Manrope', sans-serif",
    fontWeight: 400,
    fontSize: '0.75rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as any,
    backgroundColor: 'var(--card-bg, rgba(20, 20, 26, 0.6))',
    backdropFilter: 'var(--card-frost, none)',
    WebkitBackdropFilter: 'var(--card-frost, none)'
  };

  const IconEl = typeof icon === 'boolean' && icon ? (
    <svg
      className={iconClassName}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 7v10H7" />
      <path d="M7 7l10 10" />
    </svg>
  ) : (icon !== false ? icon : null);

  const getRadius = () => {
    if (roundedClass.includes('rounded-full')) return '9999px';
    const match = roundedClass.match(/rounded-\[([^\]]+)\]/);
    if (match) return match[1];
    return '24px';
  };

  const innerContent = (
    <>
      {IconEl}
      <span className="relative z-10 w-auto text-left">{children}</span>
    </>
  );

  const widthMatch = className?.match(/\bw-(full|fit|auto|[0-9a-zA-Z%\[\]\-]+)\b/);
  const widthClass = widthMatch ? widthMatch[0] : '';
  const wrapperClasses = `relative inline-flex group ${widthClass}`.trim();

  if (href) {
    return (
      <a
        ref={btnRef as any}
        href={href}
        className={combinedClasses}
        style={{ ...defaultStyle, ...style }}
      >
        {innerContent}
      </a>
    );
  }

  return (
    <button
      ref={btnRef as any}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${combinedClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
      style={{ ...defaultStyle, ...style }}
    >
      {innerContent}
    </button>
  );
}
