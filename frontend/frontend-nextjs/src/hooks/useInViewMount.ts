"use client";
import { useEffect, useRef, useState } from 'react';

/**
 * Mounts children only while the observed element is near/within the viewport.
 * When the element scrolls out of view the caller can unmount heavy WebGL
 * canvases so the browser releases their GPU context, preventing the GPU
 * process from running out of memory (the cause of the tab crash on the
 * "AI System Blueprint" section).
 */
export function useInViewMount<T extends HTMLElement = HTMLDivElement>(rootMargin = '200px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      // No observer support (or SSR fallback): render eagerly.
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setInView(entry.isIntersecting);
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}
