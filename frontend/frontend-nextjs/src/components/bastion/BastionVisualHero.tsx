'use client';

import { useState, useEffect } from 'react';

export default function BastionVisualHero() {
  const [isGlitching, setIsGlitching] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsGlitching(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex items-end justify-center bg-transparent overflow-hidden pt-20 pb-0 md:pb-2">
      {/* Video Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.85 }}
        >
          <source src="/Bastion_Knight_optimized.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay gradient for readability */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.45) 100%)',
          }}
        />
        {/* Cover Veo watermark in bottom-right corner */}
        <div
          className="absolute bottom-0 right-0 z-10"
          style={{
            width: '120px',
            height: '60px',
            background: 'radial-gradient(ellipse at bottom right, rgba(0,0,0,1) 40%, rgba(0,0,0,0.85) 70%, transparent 100%)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 md:px-12 flex justify-center items-center">
        <div className="w-full flex justify-center items-center">
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes imageGlitch {
              0% { clip-path: inset(20% 0 80% 0); transform: translate(-2px, 2px); filter: drop-shadow(-2px 0 cyan) drop-shadow(2px 0 red); }
              10% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -2px); filter: drop-shadow(2px 0 red) drop-shadow(-2px 0 cyan); }
              20% { clip-path: inset(40% 0 50% 0); transform: translate(-2px, 2px); filter: drop-shadow(-2px 0 red) drop-shadow(2px 0 cyan); }
              30% { clip-path: inset(80% 0 5% 0); transform: translate(2px, -2px); filter: drop-shadow(2px 0 cyan) drop-shadow(-2px 0 red); }
              40% { clip-path: inset(10% 0 70% 0); transform: translate(-2px, 2px); filter: drop-shadow(-2px 0 red) drop-shadow(2px 0 cyan); }
              50% { clip-path: inset(30% 0 40% 0); transform: translate(2px, -2px); filter: drop-shadow(2px 0 cyan) drop-shadow(-2px 0 red); }
              60% { clip-path: inset(70% 0 20% 0); transform: translate(-2px, 2px); filter: drop-shadow(-2px 0 red) drop-shadow(2px 0 cyan); }
              70% { clip-path: inset(5% 0 90% 0); transform: translate(2px, -2px); filter: drop-shadow(2px 0 red) drop-shadow(-2px 0 cyan); }
              80% { clip-path: inset(50% 0 30% 0); transform: translate(-2px, 2px); filter: drop-shadow(-2px 0 cyan) drop-shadow(2px 0 red); }
              90% { clip-path: inset(90% 0 5% 0); transform: translate(2px, -2px); filter: drop-shadow(2px 0 red) drop-shadow(-2px 0 cyan); }
              100% { clip-path: inset(0 0 0 0); transform: translate(0); filter: none; }
            }
            .glitch-anim {
              animation: imageGlitch 0.2s cubic-bezier(.25, .46, .45, .94) both infinite;
              opacity: 0.8;
            }
            .silver-swipe-image {
              background: linear-gradient(
                105deg,
                rgba(255,255,255,1) 35%,
                rgba(180,180,180,1) 48%,
                rgba(255,255,255,1) 52%,
                rgba(180,180,180,1) 56%,
                rgba(255,255,255,1) 65%
              );
              background-size: 200% auto;
              animation: silver-swipe 5s linear infinite;
            }
          `}} />
          <div className={`relative w-[100%] md:w-[110%] h-auto transition-opacity duration-300 ${isGlitching ? 'glitch-anim' : 'opacity-100'}`}>
            <img
              src="/Bastion_2_copy.svg"
              alt="Bastion"
              width={1716}
              height={363}
              className="w-full h-auto opacity-0 pointer-events-none"
            />
            <div 
              className="absolute inset-0 silver-swipe-image"
              style={{
                WebkitMaskImage: 'url(/Bastion_2_copy.svg)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: 'url(/Bastion_2_copy.svg)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
