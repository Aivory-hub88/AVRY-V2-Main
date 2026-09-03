'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export function HalftoneWave({ active = true, purpleColor }: { active?: boolean; purpleColor?: string } = {}) {
  const mountRef = useRef<HTMLDivElement>(null);
  // Mirrors the `active` prop into a ref so the render loop (set up once
  // below) can read the latest value without needing to tear down and
  // rebuild the whole WebGL scene whenever the caller toggles visibility.
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!mountRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const scene = new THREE.Scene();
    
    // True 3D perspective
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 15;

    // antialias off: the fragment shader renders a deliberately blocky ASCII/
    // dot pattern via discard, so MSAA smoothing is wasted GPU fill-rate --
    // there are no soft edges here for it to actually improve.
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false });
    renderer.setSize(width, height);
    
    const isMobile = window.innerWidth < 1024;
    const hwConcurrency = (navigator as unknown as { hardwareConcurrency?: number }).hardwareConcurrency ?? 4;
    const deviceMem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
    let isLowEnd = hwConcurrency <= 4 || deviceMem <= 4;
    let isOnBattery = false;
    const baseDPR = isMobile ? 1 : isLowEnd ? 1 : Math.min(window.devicePixelRatio, 1.2);
    renderer.setPixelRatio(baseDPR);
    const navigatorWithBattery = navigator as unknown as { getBattery?: () => Promise<{ charging: boolean; addEventListener: (type: string, cb: () => void) => void }> };
    if (navigatorWithBattery.getBattery) {
      navigatorWithBattery.getBattery().then((b) => {
        isOnBattery = !b.charging;
        if (isOnBattery) {
          isLowEnd = true;
          renderer.setPixelRatio(1);
          uniforms.uResolution.value.set(width * 1, height * 1);
        }
        b.addEventListener('chargingchange', () => {
          isOnBattery = !b.charging;
          isLowEnd = hwConcurrency <= 4 || deviceMem <= 4 || isOnBattery;
          const dpr = isMobile ? 1 : isLowEnd ? 1 : Math.min(window.devicePixelRatio, 1.2);
          renderer.setPixelRatio(dpr);
          uniforms.uResolution.value.set(width * dpr, height * dpr);
        });
      });
    }
    
    // React runs this effect twice in development (StrictMode), and a canvas
    // left behind by the discarded pass keeps a live WebGL context on the GPU
    // while sitting on top of the running one -- which reads as a flower that
    // renders but never moves. Claim the mount point before attaching.
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    mountRef.current.appendChild(renderer.domElement);

    const hexToRgb = (hex: string) => {
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
      const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
      const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
      return new THREE.Vector3(r, g, b);
    };
    const customPurpleVec = purpleColor ? hexToRgb(purpleColor) : new THREE.Vector3(0.202, 0.0, 0.596);

    const uniforms = {
      uTime: { value: 0.0 },
      uResolution: { value: new THREE.Vector2(width * baseDPR, height * baseDPR) },
      // Glyph cell edge, in device pixels, against a 3x3 sub-grid — so the lit
      // feature is exactly a third of this. At 3.0 that is a clean 1px dot on a
      // 3px pitch, the finest the mesh goes before features fall under a
      // physical pixel and the GPU starts rounding them back up.
      uPixelSize: { value: 3.0 },
      uScroll: { value: 0.0 }, // Used to trigger the spreading petals effect
      uMouse: { value: new THREE.Vector2(0, 0) },
      uCustomPurple: { value: customPurpleVec },
      uUseCustomPurple: { value: purpleColor ? 1.0 : 0.0 }
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
        uniform vec3 uCustomPurple;
        uniform float uUseCustomPurple;

        void main() {
          // 1. LIGHTING & DENSITY
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          
          float normalizedDepth = smoothstep(2.0, 6.0, vDepth);
          
          // Elegant Rim Lighting for 3D depth -- wider radius than the original
          // so the effect carries further across the surface (visible at more
          // rotation angles, not just the most grazing edges)
          float rimRaw = 1.0 - max(0.0, dot(viewDir, normal));
          // Smoothstep but with a very wide radius so the rim reaches deep inside
          float rimSmooth = smoothstep(0.1, 1.0, rimRaw);
          // Quantize (posterize) into 4 distinct sharp bands (patahan tegas dan banyak)
          float rim = floor(rimSmooth * 4.0) / 3.0;
          
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
          // Ceiling trimmed from 0.9 to 0.82. A 3x3 glyph packs more coverage
          // per level than the 5x5 it replaced (5/9 at the top where the old
          // grid peaked at 9/25), so the same density would read brighter and
          // heavier than the hero had before; this holds the bloom's weight.
          density = clamp(density, 0.0, 0.82);
          
          // 2. ASCII SCREEN-SPACE GRID
          // LIGHT ordered (4x4 Bayer) dither on the character selection, keyed to
          // the glyph cell — softens the hard level-boundary contours (the
          // "pembatas") so the shading spreads smoothly. Kept light (0.12 vs the
          // earlier heavy 0.167 that dulled the color); on the current rich
          // palette this smooths banding without flattening. Color + silhouette
          // still use the raw, undithered density.
          // The glyph is drawn on a 3x3 sub-grid, not 5x5. A 5x5 glyph spends a
          // fifth of the cell edge on its lit feature, so shrinking the cell to
          // tighten the mesh pushed that feature under one physical pixel — the
          // GPU rounded it back up to a full pixel and the dots read as fatter
          // inside a smaller cell, coarsening the pattern instead of refining
          // it. At 3x3 the feature is exactly a third of the edge, so a 3px cell
          // puts a crisp 1px dot on a 3px pitch: smaller cell, tighter gap, and
          // nothing left to round.
          vec2 cell = floor(gl_FragCoord.xy / uPixelSize);
          vec2 local = fract(gl_FragCoord.xy / uPixelSize);
          vec2 p3 = floor(local * 3.0);

          // 8-level dispersed-dot growth (center -> corners -> edges) instead
          // of the old 5-shape diagonal/X set. Same 3x3 sub-grid, same 3px
          // cell, same one-fragment-shader-invocation-per-pixel cost -- this
          // is purely a richer branch tree, so it reads denser/smoother with
          // zero extra GPU work. Never reaches a fully-lit sub-cell (max is
          // 7/9) so the halftone dot silhouette never collapses into a block.
          int charIndex = int(floor(density * 8.99));
          if (charIndex == 0) discard; // empty cell: skip glyph branches
          float shape = 0.0;

          float rank;
          if (p3.x == 1.0 && p3.y == 1.0) rank = 0.0;      // centre
          else if (p3.x == 0.0 && p3.y == 0.0) rank = 1.0; // corners
          else if (p3.x == 2.0 && p3.y == 2.0) rank = 2.0;
          else if (p3.x == 0.0 && p3.y == 2.0) rank = 3.0;
          else if (p3.x == 2.0 && p3.y == 0.0) rank = 4.0;
          else if (p3.x == 1.0 && p3.y == 0.0) rank = 5.0; // edges
          else if (p3.x == 1.0 && p3.y == 2.0) rank = 6.0;
          else rank = 7.0;

          if (rank < float(charIndex)) shape = 1.0;
          
          if (shape == 0.0) discard;
          
          // 3. ELEGANT COLOR MAPPING (Transition based on scroll)
          float scrollT = smoothstep(0.0, 0.4, uScroll);
          
          // Original Colors (Override ALL purple/indigo/violet with #2a545b when uUseCustomPurple is 1.0)
          vec3 primaryCore = vec3(0.737, 0.306, 0.208); // #bc4e35
          vec3 pinkCore = vec3(0.808, 0.004, 0.310);  // #ce014f (Deep pink/red)
          vec3 corePurple = mix(vec3(0.202, 0.0, 0.596), uCustomPurple, uUseCustomPurple);
          vec3 origEdge = mix(vec3(0.04, 0.18, 0.32), uCustomPurple * 0.4, uUseCustomPurple);
          vec3 origIndigo = mix(vec3(0.215, 0.078, 0.474), uCustomPurple * 0.7, uUseCustomPurple);
          
          // Hero Colors (Override purple/indigo with #2a545b for Bastion)
          vec3 heroCore = vec3(0.02, 0.03, 0.06); 
          vec3 heroEdge = mix(vec3(0.127, 0.063, 0.555), uCustomPurple * 1.3, uUseCustomPurple);  
          vec3 heroIndigo = mix(vec3(0.159, 0.079, 0.317), uCustomPurple * 0.8, uUseCustomPurple);
          
          // The core transitions from Pink to Orange as you scroll down
          vec3 dynamicCore = mix(pinkCore, primaryCore, scrollT);
          
          // Create a shimmering effect mixing the dynamic core color and Purple/#2a545b
          float purpleAmount = (1.0 - scrollT) * 0.977;
           float coreShimmer = 0.5 + 0.5 * sin(uTime * 1.8 + vLocalPos.x * 4.0);
          vec3 mixedCore = mix(dynamicCore, corePurple, coreShimmer * purpleAmount);
          
          // Keep the orange/purple transition smoothly fading towards the edge.
          float radiusGateEnd = mix(0.75, 0.4, scrollT); 
          float coreRadiusGate = 1.0 - smoothstep(0.1, radiusGateEnd, normalizedDepth);
          
          float coreMixFactor = max(0.35, scrollT) * coreRadiusGate; 
          vec3 coreColor = mix(heroCore, mixedCore, coreMixFactor);
          vec3 edgeColor = mix(heroEdge, mix(vec3(0.08, 0.04, 0.35), uCustomPurple * 0.6, uUseCustomPurple), scrollT); 
          vec3 indigoColor = mix(heroIndigo, mix(vec3(0.1, 0.05, 0.2), uCustomPurple * 0.5, uUseCustomPurple), scrollT); 
          
          // Base mix between core and edge
          vec3 finalColor = mix(coreColor, edgeColor, normalizedDepth + rim * 0.5);
          
          // Add elegant, slightly tinted spotlight to final color
          finalColor += vec3(0.9, 0.95, 1.0) * spotlight * 0.7;
          
          // Apply Indigo as a subtle additive glow
          float indigoGradient = smoothstep(0.2, 0.8, normalizedDepth + rim);
          finalColor += indigoColor * indigoGradient * 0.4;
          

          // Living color nuance - override violet accent with #2a545b
          vec3 accentA = mix(vec3(0.30, 0.16, 0.55), uCustomPurple * 1.1, uUseCustomPurple); 
          vec3 accentB = mix(vec3(0.08, 0.28, 0.42), uCustomPurple * 0.9, uUseCustomPurple); 
           float shimmer = 0.5 + 0.5 * sin(uTime * 1.2 + vLocalPos.y * 3.0);
          vec3 accent = mix(accentA, accentB, shimmer);
          float accentGate = mix(0.5, 1.0, indigoGradient);
          finalColor += accent * ((0.11 + uScroll * 0.12) * accentGate);
          







          // 4. RADIAL VIGNETTE -- disabled entirely (was darkening the edges
          // toward the corners; finalColor now passes through unmodified).

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
    // 128 segments, not 256. The vertex shader runs the procedural orchid
    // displacement per vertex, so tessellation is the dominant vertex cost:
    // 256 spends ~66k vertices on it, 128 spends ~17k. The output is quantised
    // to a 3.6px halftone cell downstream, which discards far more detail than
    // the extra subdivisions ever resolved.
    const segs = isMobile ? 64 : isLowEnd ? 64 : 96;
    const geometry = new THREE.SphereGeometry(1, segs, segs);
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
    const initialScale = isMobile ? 1.6 : 2.24;
    group.scale.set(initialScale, initialScale, initialScale); 

    // Scroll mapping state
    let targetScroll = 0;
    let targetRotationX = 0.5; 
    let currentScrollRotationX = 0.5;
    let targetX = startX;
    let targetY = startY;
    let targetScale = isMobile ? 1.6 : 2.24;

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
      targetScale = (isMobile ? 1.84 : 2.576) - ((isMobile ? 0.84 : 1.576) * progress); // Shrink perfectly back to 1.0 // Shrink perfectly back from 1.6 to 1.0

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
      // User requested flower to stay on the right instead of centering
      // x is simply heroX across the whole scroll
      
      // }
      
      // Footer right-shift override
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

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    const onVisibility = () => {
      if (document.hidden) isVisible = false;
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onContextLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    };
    const onContextRestored = () => {
      if (!animationFrameId) renderLoop();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    let batteryFrame = 0;
    // Deliberately uncapped when plugged: renders at display refresh (60/120Hz).
    // On battery (isOnBattery) we throttle to every 2nd frame (~60→30, 120→60)
    // to keep motion smooth under macOS low-power GPU throttling.
    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);
      if (document.hidden) return;
      if (isOnBattery) {
        batteryFrame = (batteryFrame + 1) % 2;
        if (batteryFrame === 0) return;
      }
      // Skip the render (and all the per-frame math above it) while the
      // caller has faded this out (e.g. scrolled into a section that hides
      // it) -- this is the actual GPU-saving gate, IntersectionObserver
      // alone can't catch this since the canvas is a fixed full-viewport
      // background that's always "intersecting".
      if (isVisible && activeRef.current) {
        const rawTime = clock.getElapsedTime();
        const time = rawTime % 1000;
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

        // Lock the Y-axis facing direction to a fixed pose (no automatic
        // idle wobble) so the hero flower holds that angle -- only user
        // interaction (drag / mouse parallax) nudges it. All the visible
        // motion instead comes from the elegant, continuous Z-axis turbine
        // spin below.
        group.rotation.y = (Math.PI / 1.5) + dragRotationY + smoothMouseX * 0.15;
        group.rotation.z = rawTime * 0.15; // Counter-clockwise turbine spin
        
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

        if (prefersReducedMotion) {
          // Serve a single static frame and stop the GPU loop entirely
          cancelAnimationFrame(animationFrameId);
          animationFrameId = 0;
        }
      }
    };
    renderLoop();

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
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('mousemove', handleMouseMove);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      // dispose() releases three's own objects but leaves the GL context alive
      // until GC gets to it; browsers cap concurrent contexts, so hand it back
      // explicitly.
      renderer.forceContextLoss();
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
