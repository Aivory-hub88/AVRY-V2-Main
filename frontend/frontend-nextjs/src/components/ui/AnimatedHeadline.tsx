'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// A simple utility to merge class names if a library like clsx/tailwind-merge isn't imported
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

interface AnimatedHeadlineProps {
  text: string;
  className?: string;
  delay?: number;
  trigger?: 'onLoad' | 'onScroll';
  as?: React.ElementType;
}

export function AnimatedHeadline({
  text,
  className,
  delay = 0,
  trigger = 'onScroll',
  as: Component = 'h2',
}: AnimatedHeadlineProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const shouldAnimate = trigger === 'onLoad' ? true : isInView;

  const letterVariants = {
    hidden: { 
      opacity: 0, 
      y: 15,
      filter: 'blur(4px)'
    },
    visible: { 
      opacity: 1, 
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.5,
        ease: [0.215, 0.61, 0.355, 1], // Cubic bezier for an elegant, natural ease-out
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03, // Delicate stagger delay (30ms per letter)
        delayChildren: delay,
      }
    }
  };

  const lines = text.split('\n');

  return (
    <Component
      ref={ref}
      className={cn("whitespace-pre-line relative", className)}
      aria-label={text.replace(/\n/g, ' ')}
    >
      <motion.span
        variants={containerVariants}
        initial="hidden"
        animate={shouldAnimate ? "visible" : "hidden"}
        aria-hidden="true"
        className="block" 
      >
        {lines.map((line, lineIndex) => (
          <React.Fragment key={lineIndex}>
            {line.split(' ').map((word, wordIndex, wordArr) => (
              <React.Fragment key={wordIndex}>
                <span className="inline-block whitespace-nowrap">
                  {word.split('').map((letter, letterIndex) => (
                    <motion.span
                      key={letterIndex}
                      variants={letterVariants}
                      className="inline-block"
                    >
                      {letter}
                    </motion.span>
                  ))}
                </span>
                {/* Render a normal space to preserve natural word wrapping */}
                {wordIndex !== wordArr.length - 1 && ' '}
              </React.Fragment>
            ))}
            {/* Render a line break if there are multiple lines separated by \n */}
            {lineIndex !== lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </motion.span>
    </Component>
  );
}
