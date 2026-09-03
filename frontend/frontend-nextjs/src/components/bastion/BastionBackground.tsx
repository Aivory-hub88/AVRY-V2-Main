'use client';

import { HalftoneWaveWrapper } from '@/components/ui/HalftoneWaveWrapper';

interface BastionBackgroundProps {
  mode?: 'gradient-only' | 'flower-only' | 'all';
  scale?: number;
  className?: string;
  purpleColor?: string;
}

export default function BastionBackground({ 
  mode = 'all',
  scale = 1,
  className = "fixed inset-0 z-0 pointer-events-none overflow-hidden",
  purpleColor = "#2a545b"
}: BastionBackgroundProps) {
  if (mode === 'gradient-only') {
    return (
      <div className={className} aria-hidden="true">
        {/* Dark Grey ambient wash with grainy texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(60% 50% at 50% 30%, rgba(80,80,80,0.15) 0%, rgba(40,40,40,0.1) 50%, transparent 100%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(40% 40% at 30% 60%, rgba(60,60,60,0.12) 0%, transparent 70%), radial-gradient(45% 45% at 70% 50%, rgba(50,50,50,0.12) 0%, transparent 70%)',
          }}
        />
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
          }}
        />
      </div>
    );
  }

  return (
    <div className={className} aria-hidden="true">
      <div 
        className="w-full h-full flex items-center justify-center"
        style={scale !== 1 ? { transform: `scale(${scale})`, transformOrigin: 'center center' } : undefined}
      >
        <HalftoneWaveWrapper purpleColor={purpleColor} />
      </div>
    </div>
  );
}
