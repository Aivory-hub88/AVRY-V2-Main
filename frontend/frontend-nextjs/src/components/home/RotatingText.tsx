'use client';

import { useEffect, useRef, useState } from 'react';

const messages = [
  'Start with clarity.<br>End with a system that runs.',
  'Know what to build.<br>Before you build anything.',
  'Discover where AI creates value.',
  'Turn AI ambition into execution.',
  'From opportunity to operation.',
  'AI made practical.<br>Built for real business outcomes.',
];

export default function RotatingText() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'visible' | 'fading-out' | 'fading-in'>('visible');
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setPhase('fading-out');

      setTimeout(() => {
        // Switch text and prepare fade in
        setCurrentIndex((prev) => (prev + 1) % messages.length);
        setPhase('fading-in');

        // Force reflow then fade in
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setPhase('visible');
          });
        });
      }, 500);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const getTransformStyle = () => {
    switch (phase) {
      case 'fading-out':
        return { opacity: 0, transform: 'translateY(calc(-50% - 14px))' };
      case 'fading-in':
        return { opacity: 0, transform: 'translateY(calc(-50% + 14px))', transition: 'none' };
      case 'visible':
      default:
        return { opacity: 1, transform: 'translateY(-50%)' };
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        height: '5.5rem',
        overflow: 'hidden',
        width: '100%',
        marginBottom: '2.5rem',
      }}
    >
      <p
        ref={textRef}
        className="text-[21px] md:text-[33.6px] font-light text-[#a3a59d] text-center w-full leading-tight"
        style={{
          fontFamily: "'Manrope', sans-serif",
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          margin: 0,
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
          ...getTransformStyle(),
        }}
        dangerouslySetInnerHTML={{ __html: messages[currentIndex] }}
      />
    </div>
  );
}
