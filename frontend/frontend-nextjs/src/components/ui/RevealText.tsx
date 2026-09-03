'use client'

import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SplitType from 'split-type'

gsap.registerPlugin(ScrollTrigger)

interface RevealTextProps {
  children: React.ReactNode
  className?: string
  as?: keyof JSX.IntrinsicElements
}

export default function RevealText({ children, className = '', as: Element = 'div' }: RevealTextProps) {
  const textRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!textRef.current) return

    // Allow a tiny delay so custom fonts render and split-type calculates widths accurately
    const timeoutId = setTimeout(() => {
      if (!textRef.current) return;
      
      const textSplit = new SplitType(textRef.current, { types: 'lines, words' })
      
      if (textSplit.lines) {
        textSplit.lines.forEach((line) => {
          const wrapper = document.createElement('div')
          wrapper.classList.add('split-parent')
          line.parentNode?.insertBefore(wrapper, line)
          wrapper.appendChild(line)
          line.classList.add('split-child')
        })

        gsap.fromTo(textSplit.lines, 
          {
            y: '100%',
            opacity: 0,
          },
          {
            y: '0%',
            opacity: 1,
            duration: 1.2,
            stagger: 0.1,
            ease: "power4.out",
            scrollTrigger: {
              trigger: textRef.current,
              start: "top 85%",
              end: "bottom 20%",
              toggleActions: "play none none reverse",
            }
          }
        )
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    }
  }, [])

  return (
    <Element ref={textRef as any} className={`reveal-text ${className}`}>
      {children}
    </Element>
  )
}
