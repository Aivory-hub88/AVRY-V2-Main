'use client';

import { useEffect, useRef } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export default function VideoDemoSection() {
  const { ref, isVisible } = useScrollAnimation();
  const videoRef = useRef<HTMLVideoElement>(null);

  // The demo freezes part-way through without this. `autoPlay` starts the
  // video at page load, while the section is still far below the fold, and
  // Chrome suspends muted autoplay video it considers off-screen -- measured
  // on production, it stops at ~15.8s with readyState 4, no error, and 59s
  // already buffered. It is never resumed when the section is scrolled into
  // view, so the visitor meets a still frame.
  //
  // `autoPlay` stays so the demo still moves if this effect never runs; the
  // observer owns playback from here, and the pause handler covers the case
  // where the browser suspends it again just as the section reveals.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let intersecting = false;
    let retried = false;

    // Rejects only when playback is blocked outright, which is nothing we
    // can recover from -- and an unhandled rejection would land in the
    // console on every scroll past.
    const attemptPlay = () => void video.play().catch(() => {});

    const onPause = () => {
      // Only a browser-initiated pause can happen while the video is in
      // view; retry once so a suspension that lands mid-reveal does not
      // strand it, then leave it alone rather than fighting in a loop.
      if (!intersecting || retried) return;
      retried = true;
      attemptPlay();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting;
        if (intersecting) {
          retried = false;
          attemptPlay();
        } else {
          video.pause();
        }
      },
      { threshold: 0.15 },
    );

    video.addEventListener('pause', onPause);
    observer.observe(video);
    return () => {
      video.removeEventListener('pause', onPause);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} w-full relative overflow-hidden`}
      style={{ padding: '12px 0 24px 0' }}
    >
      <div className="relative z-[1] mx-auto max-w-[820px] px-5 lg:px-8">
        <div className="overflow-hidden rounded-[20px] border border-white/[0.09] bg-white/[0.035] backdrop-blur-md">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
            <span className="h-[10px] w-[10px] rounded-full bg-[#e5665a]" />
            <span className="h-[10px] w-[10px] rounded-full bg-[#e0b64f]" />
            <span className="h-[10px] w-[10px] rounded-full bg-[#6bb35a]" />
            <div
              className="ml-3 flex-1 truncate rounded-md border border-white/[0.07] bg-white/[0.04] px-3 py-1 text-center text-[11px] text-white/40 sm:text-[12px]"
              style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}
            >
              Aivory
            </div>
          </div>

          {/* Video */}
          <div className="relative w-full bg-black leading-none">
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              className="block w-full h-auto"
            >
              {/* -v2: the old filename is cached at the Cloudflare edge with
                  s-maxage=1yr, so an in-place overwrite would keep serving
                  the old 5.9MB file there regardless of origin changes. */}
              <source src="/aivory-console-demo-v2.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </div>
    </div>
  );
}
