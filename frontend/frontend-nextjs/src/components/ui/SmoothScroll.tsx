'use client'

import { ReactLenis } from 'lenis/react'
import { ReactNode, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Keep ScrollTrigger in sync with Lenis
    gsap.registerPlugin(ScrollTrigger);
    
    const update = (time: number) => {
      ScrollTrigger.update();
    }
    
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0, 0);
    
    return () => {
      gsap.ticker.remove(update);
    }
  }, []);

  return (
    <ReactLenis root options={{ 
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smoothWheel: true,
      mouseMultiplier: 1,
      touchMultiplier: 2,
    }}>
      {children}
    </ReactLenis>
  )
}
