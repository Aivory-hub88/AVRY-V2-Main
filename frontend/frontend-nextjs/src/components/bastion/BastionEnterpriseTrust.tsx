'use client';

import { useRef, useEffect } from 'react';
import { FadeUp, FadeUpChild } from './FadeUp';
import { MetallicBorder } from './MetallicBorder';

const s = "stroke-white/20 stroke-[0.5] fill-transparent";

const SvgIso = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full absolute inset-0 z-0">
    <path d="M50 -20 L-20 20 V80 C-20 130 30 160 50 180 C70 160 120 130 120 80 V20 Z" className={s} />
    <circle cx="50" cy="80" r="40" className={s} />
    <circle cx="50" cy="80" r="20" className={s} />
    <circle cx="50" cy="80" r="60" className={s} strokeDasharray="4 4" />
  </svg>
);

const SvgSoc = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full absolute inset-0 z-0">
    <rect x="-10" y="10" width="120" height="100" rx="10" className={s} />
    <rect x="10" y="30" width="80" height="60" rx="5" className={s} />
    <line x1="-20" y1="60" x2="120" y2="60" className={s} />
    <line x1="50" y1="-20" x2="50" y2="140" className={s} />
    <circle cx="50" cy="60" r="10" className={s} />
    <circle cx="10" cy="30" r="8" className={s} />
    <circle cx="90" cy="30" r="8" className={s} />
    <circle cx="10" cy="90" r="8" className={s} />
    <circle cx="90" cy="90" r="8" className={s} />
  </svg>
);

const SvgZeroTrust = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full absolute inset-0 z-0">
    <circle cx="50" cy="60" r="30" className={s} />
    <circle cx="50" cy="60" r="60" className={s} />
    <circle cx="50" cy="60" r="90" className={s} />
    <line x1="50" y1="-30" x2="50" y2="150" className={s} strokeDasharray="4 4" />
    <line x1="-40" y1="60" x2="140" y2="60" className={s} strokeDasharray="4 4" />
    <path d="M-10 0 L110 120" className={s} />
    <path d="M110 0 L-10 120" className={s} />
  </svg>
);

const SvgAudit = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full absolute inset-0 z-0">
    <rect x="10" y="10" width="80" height="100" rx="8" className={s} />
    <line x1="25" y1="30" x2="75" y2="30" className={s} />
    <line x1="25" y1="50" x2="60" y2="50" className={s} />
    <line x1="25" y1="70" x2="75" y2="70" className={s} strokeDasharray="4 4" />
    <line x1="25" y1="90" x2="50" y2="90" className={s} />
    <circle cx="80" cy="90" r="25" className={s} />
    <circle cx="80" cy="90" r="15" className={s} />
    <line x1="97" y1="107" x2="120" y2="130" className={s} />
  </svg>
);

const SvgEye = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full absolute inset-0 z-0">
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes blink {
        0%, 93%, 97%, 100% { transform: scaleY(1); }
        95% { transform: scaleY(0.1); }
      }
      .eye-group {
        transform-origin: 50px 60px;
        animation: blink 5s ease-in-out infinite;
      }
    `}} />
    <g className="eye-group">
      {/* Outer Eye Shape */}
      <path d="M 5 60 Q 50 15 95 60 Q 50 105 5 60 Z" className={s} />
      <path d="M 15 60 Q 50 25 85 60 Q 50 95 15 60 Z" className={s} strokeDasharray="4 6" />
      {/* Iris */}
      <circle cx="50" cy="60" r="14" className={s} />
      {/* Pupil */}
      <circle cx="50" cy="60" r="4" className={s} fill="currentColor" />
    </g>
    {/* Decorative Lines */}
    <line x1="50" y1="-20" x2="50" y2="140" className={s} strokeDasharray="2 4" />
    <line x1="-20" y1="60" x2="120" y2="60" className={s} strokeDasharray="2 4" />
  </svg>
);

const SvgPolicy = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full absolute inset-0 z-0">
    <line x1="30" y1="-20" x2="30" y2="140" className={s} />
    <line x1="70" y1="-20" x2="70" y2="140" className={s} />
    <rect x="15" y="30" width="30" height="20" rx="4" className={s} />
    <rect x="55" y="70" width="30" height="20" rx="4" className={s} />
    <circle cx="30" cy="40" r="4" className={s} />
    <circle cx="70" cy="80" r="4" className={s} />
    <line x1="0" y1="40" x2="15" y2="40" className={s} />
    <line x1="45" y1="40" x2="100" y2="40" className={s} strokeDasharray="2 4" />
    <line x1="0" y1="80" x2="55" y2="80" className={s} strokeDasharray="2 4" />
    <line x1="85" y1="80" x2="100" y2="80" className={s} />
  </svg>
);

const trustItems = [
  { name: 'ISO 27001 Ready', bg: SvgIso },
  { name: 'SOC 2 Ready', bg: SvgSoc },
  { name: 'Zero Trust Architecture', bg: SvgZeroTrust },
  { name: 'Audit Logging', bg: SvgAudit },
  { name: 'Encrypted Communications', bg: SvgEye },
  { name: 'Policy Governance', bg: SvgPolicy }
];

function TrustCard({ item }: { item: typeof trustItems[0] }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const Bg = item.bg;

  useEffect(() => {
    const startTime = Math.random() * 10000;
    let animationFrameId: number;
    let isHovering = false;

    const animate = (time: number) => {
      if (cardRef.current && !isHovering) {
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const radiusX = rect.width / 2;
        const radiusY = rect.height / 2;
        const speed = 0.001; 
        const angle = (time + startTime) * speed;
        
        const x = centerX + radiusX * Math.cos(angle);
        const y = centerY - radiusY * Math.sin(angle);
        
        cardRef.current.style.setProperty('--mouse-x', `${x}px`);
        cardRef.current.style.setProperty('--mouse-y', `${y}px`);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    const el = cardRef.current;
    if (el) {
      el.addEventListener('mouseenter', () => isHovering = true);
      el.addEventListener('mouseleave', () => isHovering = false);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (el) {
        el.removeEventListener('mouseenter', () => isHovering = true);
        el.removeEventListener('mouseleave', () => isHovering = false);
      }
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <FadeUpChild className="w-full">
      <MetallicBorder borderRadius="24px">
        <div 
          ref={cardRef}
          onMouseMove={handleMouseMove}
          className="group relative bg-transparent rounded-[24px] border border-white/10 overflow-hidden aspect-[3/4] transition-colors hover:border-white/20 flex items-end p-6 md:p-8 spotlight-card auto-spotlight w-full"
        >
          <div className="!absolute inset-0 z-0 pointer-events-none">
            <Bg />
          </div>
          <div className="!absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-transparent z-10 pointer-events-none" />
          <span className="relative z-20 text-sm md:text-base font-medium text-[#EAEAEA] group-hover:text-white transition-colors pointer-events-none">
            {item.name}
          </span>
        </div>
      </MetallicBorder>
    </FadeUpChild>
  );
}

import { AnimatedHeadline } from '../ui/AnimatedHeadline';

export default function BastionEnterpriseTrust() {
  return (
    <section className="bg-transparent text-white py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <FadeUp className="mb-16 md:mb-24">
          <AnimatedHeadline
            text="Trust every deployment."
            as="h2"
            className="text-3xl md:text-4xl lg:text-5xl tracking-tight font-light leading-tight text-[#FFFFFF] max-w-4xl mb-6"
          />
          <div className="max-w-3xl text-sm md:text-base text-[#B3B3B3] font-light leading-relaxed">
            <p>Security should accelerate innovation, not slow it down. With Bastion, teams deploy, operate, and scale knowing protection, visibility, and control stay intact.</p>
          </div>
        </FadeUp>

        <FadeUp staggerChildren={0.1} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
          {trustItems.map((item, index) => (
            <TrustCard key={index} item={item} />
          ))}
        </FadeUp>

        <FadeUp className="mt-8">
          <p className="text-xs text-[#B3B3B3]/50 font-light text-center md:text-left">
            * Designed to support enterprise security practices. Formal certifications in progress.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
