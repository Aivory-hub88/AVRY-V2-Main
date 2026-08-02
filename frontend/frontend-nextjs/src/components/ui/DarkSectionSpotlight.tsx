'use client';

import { ReactNode } from 'react';

export function DarkSectionSpotlight({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`group relative ${className}`}>
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
