'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export function HalftoneWave() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const scene = new THREE.Scene();
    
    // True 3D perspective
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false });
    renderer.setSize(width, height);
    
    const isMobile = window.innerWidth < 1024;
    const baseDPR = isMobile ? 1 : Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(baseDPR);
    
    mountRef.current.appendChild(renderer.domElement);

    const uniforms = {
      uTime: { value: 0.0 },
      uResolution: { value: new THREE.Vector2(width * baseDPR, height * baseDPR) },
      uPixelSize: { value: 4.5 }, // Reduced by 10% from 5.0
      uScroll: { value: 0.0 }, // Used to trigger the spreading petals effect
      uMouse: { value: new THREE.Vector2(0, 0) }
    };

    // ==========================================
    // SHARED ASCII FRAGMENT SHADER
    // ==========================================
    const asciiFragShader = `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying float vDepth;
        varying vec3 vLocalPos;

        uniform float uPixelSize;
        uniform vec2 uResolution;
        uniform float uScroll;
        uniform float uTime;
        uniform vec2 uMouse;

        void main() {
          // 1. LIGHTING & DENSITY
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          
          float normalizedDepth = smoothstep(2.0, 6.0, vDepth);
          
          // Elegant Rim Lighting for 3D depth
          float rim = 1.0 - max(0.0, dot(viewDir, normal));
          rim = smoothstep(0.25, 1.0, rim); // Widened rim radius
          
          // NEW: Top-down spotlight (sharper and more elegant)
          vec3 topLightDir = normalize(vec3(0.0, 1.0, 0.4));
          float topLightDiff = max(0.0, dot(normal, topLightDir));
          // Fade spotlight on scroll to protect text readability, but keep a
          // floor instead of dropping to 0 -- fading it out completely was
          // starving the density term, thinning the dot coverage at the
          // flower's outer edges for the rest of the page past this scroll point.
          float spotlightFade = mix(1.0, 0.4, smoothstep(0.0, 0.4, uScroll));
          float spotlight = pow(topLightDiff, 2.6) * 0.58 * spotlightFade; // broader + stronger top-down key light
          
          // Enhanced density for subtle but more 3D ASCII
          // Reduced spotlight influence on density to avoid solid bright blocks
          float density = 1.0 - normalizedDepth + (rim * 0.5) + (spotlight * 0.2);
          // + 0.1 boost to density as requested by user (10% increase)
          density = clamp(density, 0.0, 0.9); // Clamp below 1.0 to prevent full solid blocks
          
          // 2. ASCII SCREEN-SPACE GRID
          // LIGHT ordered (4x4 Bayer) dither on the character selection, keyed to
          // the glyph cell — softens the hard level-boundary contours (the
          // "pembatas") so the shading spreads smoothly. Kept light (0.12 vs the
          // earlier heavy 0.167 that dulled the color); on the current rich
          // palette this smooths banding without flattening. Color + silhouette
          // still use the raw, undithered density.
          vec2 cell = floor(gl_FragCoord.xy / uPixelSize);
          vec2 local = fract(gl_FragCoord.xy / uPixelSize);
          vec2 p5 = floor(local * 5.0); 
          
          int charIndex = int(floor(density * 5.99));
          if (charIndex == 0) discard; // empty cell: skip glyph branches
          float shape = 0.0;
          
          if (charIndex == 1) {
              if (p5.x == 2.0 && p5.y == 2.0) shape = 1.0;
          } else if (charIndex == 2) {
              if (p5.x == 2.0 && p5.y > 0.0 && p5.y < 4.0) shape = 1.0;
              if (p5.y == 2.0 && p5.x > 0.0 && p5.x < 4.0) shape = 1.0;
          } else if (charIndex == 3) {
              if (p5.x == p5.y && p5.x > 0.0 && p5.x < 4.0) shape = 1.0;
              if (p5.x == (4.0 - p5.y) && p5.x > 0.0 && p5.x < 4.0) shape = 1.0;
          } else if (charIndex == 4) {
              if ((p5.x == 1.0 || p5.x == 3.0) && p5.y >= 1.0 && p5.y <= 3.0) shape = 1.0;
              if ((p5.y == 1.0 || p5.y == 3.0) && p5.x >= 1.0 && p5.x <= 3.0) shape = 1.0;
          } else if (charIndex >= 5) {
              if (p5.x >= 1.0 && p5.x <= 3.0 && p5.y >= 1.0 && p5.y <= 3.0) shape = 1.0;
          }
          
          if (shape == 0.0) discard;
          
          // 3. ELEGANT COLOR MAPPING (Transition based on scroll)
          float scrollT = smoothstep(0.0, 0.4, uScroll);
          
          // Original Colors
          vec3 primaryCore = vec3(0.737, 0.306, 0.208); // #bc4e35
          vec3 pinkCore = vec3(0.808, 0.004, 0.310);  // #ce014f (Deep pink/red requested for hero)
          vec3 corePurple = vec3(0.176, 0.0, 0.518); // #2d0084 (Deep violet/purple)
          vec3 origEdge = vec3(0.04, 0.18, 0.32);
          vec3 origIndigo = vec3(0.215, 0.078, 0.474); // #371479
          
          // Hero Colors (Premium Elegance: Midnight Core / Deep Blue-Purple Edges)
          vec3 heroCore = vec3(0.02, 0.03, 0.06); // Deep midnight core (slightly brighter)
          vec3 heroEdge = vec3(0.15, 0.08, 0.65);  // Deep blue-purple edges (brighter blue)
          vec3 heroIndigo = vec3(0.2, 0.1, 0.4);  // Subtle purple/indigo glow (brighter)
          
          // The core transitions from Pink to Orange as you scroll down
          vec3 dynamicCore = mix(pinkCore, primaryCore, scrollT);
          
          // Create a shimmering effect mixing the dynamic core color and #2d0084 Purple
          // The purple fades out on scroll, leaving only the orange core.
          float purpleAmount = (1.0 - scrollT) * 0.85;
          float coreShimmer = 0.5 + 0.5 * sin(uTime * 2.0 + vLocalPos.x * 6.0 - vLocalPos.y * 5.0 + cos(uTime + vLocalPos.z * 4.0));
          vec3 mixedCore = mix(dynamicCore, corePurple, coreShimmer * purpleAmount);
          
          // Keep the orange/purple transition smoothly fading towards the edge.
          // Tighter radius in hero section (scrollT = 0), widening as you scroll down.
          float radiusGateEnd = mix(0.4, 0.75, scrollT); 
          float coreRadiusGate = 1.0 - smoothstep(0.1, radiusGateEnd, normalizedDepth);
          
          // Reduced intensity in hero section (0.35) so it's not overpowering, scales to 1.0 on scroll
          float coreMixFactor = max(0.35, scrollT) * coreRadiusGate; 
          vec3 coreColor = mix(heroCore, mixedCore, coreMixFactor);
          vec3 edgeColor = heroEdge; // Keep hero blue color when scrolled
          vec3 indigoColor = heroIndigo; // Keep hero indigo color when scrolled
          
          // Base mix between core and edge
          vec3 finalColor = mix(coreColor, edgeColor, normalizedDepth + rim * 0.5);
          
          // Add elegant, slightly tinted spotlight to final color
          finalColor += vec3(0.9, 0.95, 1.0) * spotlight * 0.7;
          
          // Apply Indigo as a subtle additive glow
          float indigoGradient = smoothstep(0.2, 0.8, normalizedDepth + rim);
          finalColor += indigoColor * indigoGradient * 0.4;
          // Subtle living color nuance — a soft violet <-> teal shimmer that
          // harmonizes with the midnight / indigo palette. Kept low so it never
          // looks monotone, and a touch stronger while the flower moves (scroll).
          vec3 accentA = vec3(0.30, 0.16, 0.55); // soft violet
          vec3 accentB = vec3(0.08, 0.28, 0.42); // soft teal
          // More complex and dramatic shimmer pattern
          float shimmer = 0.5 + 0.5 * sin(uTime * 1.2 + vLocalPos.y * 5.0 + vLocalPos.x * 4.0 + sin(uTime * 0.8 + vLocalPos.z * 3.0));
          vec3 accent = mix(accentA, accentB, shimmer);
          float accentGate = mix(0.5, 1.0, indigoGradient);
          // Moderately increased the accent multiplier for turbulence without being too neon
          // Moderately increased the accent multiplier for turbulence without being too neon
          finalColor += accent * ((0.11 + uScroll * 0.12) * accentGate);
          







          // 4. RADIAL VIGNETTE (Abyss Effect)
          vec2 screenPos = gl_FragCoord.xy / uResolution.xy;
          vec2 vignetteCenter = vec2(0.5) + uMouse * 0.05;
          float distFromCenter = distance(screenPos, vignetteCenter);
          // 0.85 -> 0.35 smoothly fades to pitch black at edges
          float vignette = smoothstep(0.85, 0.35, distFromCenter);
          finalColor *= vignette * 1.05; // 5% brighter

          // Soft alpha falloff at the true silhouette: fades opacity out as
          // density approaches 0 (the outer edge of the bloom), instead of the
          // dot grid winking off at full opacity. Purely alpha -- no color or
          // glow change -- so it just smooths the blocky boundary.
          float silhouetteAlpha = smoothstep(0.0, 0.12, density);

          gl_FragColor = vec4(finalColor, silhouetteAlpha);
        }
    `;

    // ==========================================
    // 1. MAIN 6-LOBE FLOWER (Base)
    // ==========================================
    const geometry = new THREE.SphereGeometry(1, 128, 128);
    const material = new THREE.ShaderMaterial({
      uniforms,
      side: THREE.FrontSide, 
      transparent: true,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying float vDepth; 
        varying vec3 vLocalPos;
        uniform float uTime;
        uniform float uScroll;

        // --- SANTIAGO SARES ORCHID MATH ---
        float getOrchidDepth(vec3 p, float timeVal) {
            float theta = atan(p.z, p.x);
            float phi = acos(p.y);
            
            // Reverting to the elegant 6-lobe mathematical flower
            float numPetals = 6.0;
            float petal = abs(sin(theta * (numPetals / 2.0)));
            float taper = sin(phi);
            float breathing = sin(timeVal * 0.5 + phi * 2.0) * 0.1;
            
            // Keep a touch of Sares fluid turbulence so it breathes organically.
            float noise = sin(p.x * 5.0 + timeVal) * sin(p.y * 6.0 - timeVal * 0.5) * sin(p.z * 4.0 + timeVal * 0.8);
            // Gentler amplitude, and it fades further as the flower spreads on
            // scroll — keeps the petal silhouette clean and pretty in motion.
            float turbulence = noise * 0.042 * (1.0 - uScroll * 0.78);
            
            return (petal * taper) + breathing + turbulence;
        }
        // -----------------------------------

        void main() {
          vec3 p = normalize(position);
          
          float petalDepth = getOrchidDepth(p, uTime);

          // Add an idle bloom so it pulses beautifully even before scrolling
          float idleBloom = (sin(uTime * 1.5) * 0.5 + 0.5) * 0.1;
          float spread = smoothstep(0.0, 1.0, uScroll) + (idleBloom * (1.0 - smoothstep(0.0, 1.0, uScroll)));
          
          // Extremely gentle spread + bend on scroll so the petals maintain
          // a highly stable, solid 3D silhouette instead of separating into pieces.
          float radius = 2.5 + (petalDepth * 2.0) + (petalDepth * spread * 0.25);
          float bend = spread * 0.15;
          
          vec3 displacedPos = p * radius;
          displacedPos.y -= bend * petalDepth;

          vDepth = radius; 
          
          vec4 mvPosition = modelViewMatrix * vec4(displacedPos, 1.0);
          vViewPosition = -mvPosition.xyz;
          
          vNormal = normalMatrix * normalize(displacedPos);
          vLocalPos = position;
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: asciiFragShader
    });
    const mesh = new THREE.Mesh(geometry, material);

    const group = new THREE.Group();
    group.add(mesh);
    scene.add(group);


    // Scroll Transition Setup
    // Start position: Shifted up slightly
    const startX = 0;
    const startY = isMobile ? 1.8 : 2.2; 
    const endX = isMobile ? 0 : 5;
    const endY = isMobile ? 3 : -0.2;

    // Initial positioning (Immersive, framing the text from below)
    group.position.set(startX, startY, 0);
    group.scale.set(2.24, 2.24, 2.24); 

    // Scroll mapping state
    let targetScroll = 0;
    let targetRotationX = 0.5; 
    let currentScrollRotationX = 0.5;
    let targetX = startX;
    let targetY = startY;
    let targetScale = 2.24;

    // ── Cached section anchors (layout read only on mount / resize) ──
    // Reading getBoundingClientRect() on every scroll event forced a
    // synchronous reflow of the whole zoomed+sticky+WebGL page — the cause of
    // the scroll stutter. We cache the anchor offsets instead.
    let centerAt = Infinity;
    let rightAt = Infinity;
    let privacyAt = Infinity;
    let footerAt = Infinity;
    const computeAnchors = () => {
      const vh = window.innerHeight;
      // The section containing "From Assessment to Staged Autonomy" on the home page has id="showcase"
      const showcaseEl = document.getElementById('showcase');
      if (showcaseEl) {
        const scTop = showcaseEl.getBoundingClientRect().top + window.scrollY;
        // Shift the center anchor lower so the flower waits longer on the right
        centerAt = scTop - vh * 0.15; 
      }
      const langEl = document.getElementById('agent-language');
      if (langEl) {
        const lgTop = langEl.getBoundingClientRect().top + window.scrollY;
        rightAt = lgTop - vh * 0.45; // "speaks your customer's language" → right
      }
      const privacyEl = document.getElementById('privacy');
      if (privacyEl) {
        privacyAt = privacyEl.getBoundingClientRect().top + window.scrollY;
      }
      const footerEl = document.querySelector('footer');
      if (footerEl) {
        footerAt = footerEl.getBoundingClientRect().top + window.scrollY - vh;
      }
    };

    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const smooth = (e0: number, e1: number, v: number) => {
        if (e1 <= e0) return v >= e1 ? 1 : 0;
        const t = Math.min(Math.max((v - e0) / (e1 - e0), 0), 1);
        return t * t * (3 - 2 * t);
      };

      // Calculate transition progress (0 to 1 over 800px scroll)
      const progress = Math.min(scrollY / 800, 1.0);
      
      targetY = startY + (endY - startY) * progress;
      targetScale = 2.24 - (0.84 * progress); // Shrink perfectly back from 1.6 to 1.0

      if (privacyAt !== Infinity) {
        const shrinkStart = Math.max(0, privacyAt - window.innerHeight); // Start shrinking when it enters viewport
        const shrinkProgress = smooth(shrinkStart, privacyAt, scrollY);
        targetScale = targetScale - (0.15 * shrinkProgress); // Scale down by only 15% to make it much larger
      }

      targetScroll = Math.min(scrollY / 1500, 1.0);
      targetRotationX = 0.5 + (scrollY * 0.001);

      // ── Section-aware horizontal choreography ──────────────────────────
      // Hero exit → flower drifts right. At the "Operational Framework"
      // section (#showcase) it returns to CENTER, then eases back to the RIGHT
      // as the "speaks your customer's language" section (#agent-language)
      // becomes active.
      if (endX === 0) {
        targetX = startX; // Mobile: keep centered throughout
        return;
      }
      const heroX = startX + (endX - startX) * progress; // hero → right
      let x = heroX;
      if (centerAt !== Infinity) {
        if (rightAt !== Infinity && scrollY >= rightAt) {
          x = endX; // "speaks your customer's language" section → right
        } else if (scrollY >= centerAt) {
          if (rightAt !== Infinity) {
            // Stay centered through the middle, then ease center → right over
            // the last stretch (max 600px) before the language section.
            const band = Math.min(600, Math.max(1, rightAt - centerAt));
            x = lerp(0, endX, smooth(rightAt - band, rightAt, scrollY));
          } else {
            x = 0; // Operational Framework → center (no right anchor found)
          }
        } else {
          // It should stay on the right until reaching the 'showcase' section,
          // then quickly transition to the center. We'll use a shorter band
          // so it waits until the section actually enters before moving.
          const transitionBand = 300; // transition happens over 300px of scrolling
          const startTransitionAt = centerAt - transitionBand;
          if (scrollY >= startTransitionAt) {
            x = lerp(heroX, 0, smooth(startTransitionAt, centerAt, scrollY)); // right → center
          } else {
            x = heroX; // strictly right
          }
        }
      }
      
      // Footer right-shift override
      if (footerAt !== Infinity) {
         const shiftStart = Math.max(0, footerAt - 800);
         if (scrollY > shiftStart) {
            const shiftProgress = smooth(shiftStart, footerAt, scrollY);
            x = lerp(x, endX, shiftProgress);
            targetY = lerp(targetY, targetY - 1.2, shiftProgress); // Shift flower down slightly to center behind Aivory logo
         }
      }
      
      // Privacy section further right-shift
      if (privacyAt !== Infinity && !isMobile) {
        const shiftStart = Math.max(0, privacyAt - window.innerHeight);
        const shiftProgress = smooth(shiftStart, privacyAt, scrollY);
        // Shift it to exactly endX. Since the flower is bigger, endX will prevent right-side clipping
        x = lerp(x, endX, shiftProgress);
      }
      
      targetX = x;
    };

    let scrollTicking = false;
    // NOTE: We intentionally do NOT change renderer.setPixelRatio() during
    // scroll. setPixelRatio() reallocates the WebGL drawing buffer, which
    // stalls the GPU pipeline for a frame — doing that at the start of every
    // scroll gesture (and again 200ms after it ends) was the main cause of the
    // visible scroll stutter. The DPR is fixed to baseDPR for the whole session.
    const onScroll = () => {
      if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(() => { scrollTicking = false; handleScroll(); });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    computeAnchors();
    handleScroll();
    // Recompute once more after layout settles (fonts / lazy 3D canvases / images).
    const anchorTimer = window.setTimeout(computeAnchors, 1200);

    const clock = new THREE.Clock();
    let animationFrameId: number;
    let isVisible = true;

    // --- Interactive Mouse Drag Setup ---
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let dragRotationX = 0;
    let dragRotationY = 0;
    let targetDragRotationX = 0;
    let targetDragRotationY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
      if (mountRef.current) mountRef.current.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      
      targetDragRotationY += deltaX * 0.003; // Base rotation speed (reduced for subtlety)
      targetDragRotationX += deltaY * 0.003;
      
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDragging = false;
      if (mountRef.current) mountRef.current.style.cursor = 'grab';
    };

    const canvas = renderer.domElement;
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    if (mountRef.current) mountRef.current.style.cursor = 'grab';

    // --- Passive Mouse Hover Parallax ---
    let targetMouseX = 0;
    let targetMouseY = 0;
    let smoothMouseX = 0;
    let smoothMouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
      targetMouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    // -------------------------------------

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0.0 });
    observer.observe(renderer.domElement);

    let lastRenderTime = 0;
    const renderLoop = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(renderLoop);
      if (isVisible) {
        // Remove artificial fps limit to let requestAnimationFrame run at native display refresh rate (60Hz/120Hz)
        // This fixes the "turun frame rate" and stuttering issues.
        const time = clock.getElapsedTime();
        uniforms.uTime.value = time;
        
        // Immersive gentle floating motion when in Hero (progress = 0)
        // We use (1.0 - Math.min(targetScroll * 5.0, 1.0)) to fade out the float as user scrolls
        const floatIntensity = Math.max(0, 1.0 - (window.scrollY / 400));
        const floatY = Math.sin(time * 1.5) * 0.2 * floatIntensity; 
        const floatRot = Math.cos(time * 0.8) * 0.08 * floatIntensity;

        // --- Smooth Drag Interpolation & Auto-Return ---
        dragRotationX += (targetDragRotationX - dragRotationX) * 0.08;
        dragRotationY += (targetDragRotationY - dragRotationY) * 0.08;
        if (!isDragging) {
          targetDragRotationX *= 0.95; // Graceful auto-center
          targetDragRotationY *= 0.95;
        }

        // Smooth mouse for parallax and vignette
        smoothMouseX += (targetMouseX - smoothMouseX) * 0.05;
        smoothMouseY += (targetMouseY - smoothMouseY) * 0.05;
        uniforms.uMouse.value.set(smoothMouseX, smoothMouseY);

        // Lock the Y-axis facing direction, add mouse drag offset, hover parallax, spin on Z-axis
        group.rotation.y = (Math.PI / 1.5) + (floatRot * 0.5) + dragRotationY + smoothMouseX * 0.15;
        group.rotation.z = time * 0.15; // Counter-clockwise pinwheel spin
        
        uniforms.uScroll.value += (targetScroll - uniforms.uScroll.value) * 0.05;
        
        // Smoothly interpolate scroll rotation separately, then add drag & hover as a positional offset
        currentScrollRotationX += (targetRotationX - currentScrollRotationX) * 0.05;
        group.rotation.x = currentScrollRotationX + dragRotationX + smoothMouseY * 0.15;
        
        // Smoothly interpolate position and scale
        group.position.x += (targetX - group.position.x) * 0.05;
        group.position.y += (targetY + floatY - group.position.y) * 0.05;
        const currentScale = group.scale.x + (targetScale - group.scale.x) * 0.05;
        group.scale.set(currentScale, currentScale, currentScale);


        renderer.render(scene, camera);
      }
    };
    renderLoop(0);

    const handleResize = () => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      uniforms.uResolution.value.set(rect.width * renderer.getPixelRatio(), rect.height * renderer.getPixelRatio());
      computeAnchors();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(anchorTimer);
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('mousemove', handleMouseMove);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      petals.forEach((pt) => {
        scene.remove(pt.mesh);
        (pt.mesh.material as THREE.Material).dispose();
      });
      petalGeo?.dispose();
      petalMat?.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="absolute inset-0 z-0"
      style={{ overflow: 'hidden' }}
    />
  );
}
