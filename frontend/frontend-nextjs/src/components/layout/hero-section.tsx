/**
 * Hero Section Component
 *
 * A wrapper component that renders the Hero component as a client component.
 */

'use client';

import React from 'react';
import { Hero } from './hero';

export interface HeroSectionProps {
  className?: string;
}

/**
 * HeroSection component wrapper
 */
export function HeroSection({ className = '' }: HeroSectionProps) {
  return <Hero className={className} />;
}

export default HeroSection;
