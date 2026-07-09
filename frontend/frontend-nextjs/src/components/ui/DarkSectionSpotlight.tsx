'use client';

import { useRef, ReactNode } from 'react';

export function DarkSectionSpotlight({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ref.current.style.setProperty('--mouse-x', `${x}px`);
    ref.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`group relative ${className}`}
    >
      {/* The Glow Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(800px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(255, 255, 255, 0.04), transparent 40%)'
        }}
      />
      {/* Make sure children sit above the glow by giving them relative positioning if needed, 
          though DOM order usually handles this if z-index is not explicitly negative */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
