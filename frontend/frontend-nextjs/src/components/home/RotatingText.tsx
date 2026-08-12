'use client';

import { useEffect, useRef, useState } from 'react';

const messages = [
  'Make AI Make Sense&reg;',
  'For your business operation.',
  'Start with clarity.',
  'Discover where AI creates measurable value.',
  'Know what to build before you build anything.',
  'Turn AI ambition into execution.',
  'Transform operations with confidence.',
  'Build intelligence that delivers business outcomes.',
  'Transforming business complexity into operational clarity.',
  'From Data &rarr; Decisions &rarr; Action.',
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
        className="text-[21px] md:text-[33.6px] font-light text-[#d2d4cc] text-center w-full leading-tight"
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
