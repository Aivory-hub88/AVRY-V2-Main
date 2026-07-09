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
      uPixelSize: { value: isMobile ? 5.0 : 6.0 }, 
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
          rim = smoothstep(0.5, 1.0, rim);
          
          // NEW: Top-down spotlight (sharper and more elegant)
          vec3 topLightDir = normalize(vec3(0.0, 1.0, 0.4));
          float topLightDiff = max(0.0, dot(normal, topLightDir));
          // Fade spotlight heavily on scroll to protect readability in lower sections
          float spotlightFade = 1.0 - smoothstep(0.0, 0.4, uScroll);
          float spotlight = pow(topLightDiff, 3.2) * 0.42 * spotlightFade;
          
          // Enhanced density for subtle but more 3D ASCII
          // Reduced spotlight influence on density to avoid solid bright blocks
          float density = 1.0 - normalizedDepth + (rim * 0.5) + (spotlight * 0.2);
          density -= uScroll * 0.3; // Fade out slightly as it spreads
          density = clamp(density, 0.0, 0.9); // Clamp below 1.0 to prevent full solid blocks
          
          // 2. ASCII SCREEN-SPACE GRID
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
          
          // Original Colors (Dimmed amber / Cyan / Purple)
          vec3 origCore = vec3(0.5, 0.25, 0.05);
          vec3 origEdge = vec3(0.04, 0.18, 0.32);
          vec3 origIndigo = vec3(0.16, 0.02, 0.32);
          
          // Hero Colors (Premium Elegance: Midnight Core / Deep Blue-Purple Edges)
          vec3 heroCore = vec3(0.02, 0.03, 0.06); // Deep midnight core (slightly brighter)
          vec3 heroEdge = vec3(0.15, 0.08, 0.65);  // Deep blue-purple edges (brighter blue)
          vec3 heroIndigo = vec3(0.2, 0.1, 0.4);  // Subtle purple/indigo glow (brighter)
          
          vec3 coreColor = mix(heroCore, origCore, scrollT);
          vec3 edgeColor = mix(heroEdge, origEdge, scrollT);
          vec3 indigoColor = mix(heroIndigo, origIndigo, scrollT);
          
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
          float shimmer = 0.5 + 0.5 * sin(uTime * 0.6 + vLocalPos.y * 3.0 + vLocalPos.x * 2.0);
          vec3 accent = mix(accentA, accentB, shimmer);
          // More noticeable now: ~2x amount, and applied across the whole
          // bloom (not just the rim) with edges still a touch stronger.
          float accentGate = mix(0.5, 1.0, indigoGradient);
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
    const geometry = new THREE.SphereGeometry(1, 96, 96);
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
          
          float radius = 2.5 + (petalDepth * 2.0) + (petalDepth * spread * 1.5);
          float bend = spread * 0.8;
          
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

    // ==========================================
    // Premium drifting petals — appear only while the "Operational Framework"
    // section is active. Soft-edged, palette-matched orchid petals with a
    // blue-violet → lavender gradient and a gentle inner sheen; they drift down
    // with organic sway + slow tumble. Desktop only (kept light), and rendered
    // behind page content (z-0 background) so text stays readable.
    // ==========================================
    const petals: {
      mesh: THREE.Mesh;
      mode: 'drift' | 'orbit';
      // drift (floating fall)
      sx: number; sy: number; fall: number;
      swayAmp: number; swayFreq: number;
      // orbit (satellite around the flower, on a tilted plane)
      orbitR: number; inclSin: number; inclCos: number;
      orbitSpeed: number; orbitPhase: number;
      // shared
      phase: number;
      baseRotX: number; baseRotY: number; baseRotZ: number;
      wobbleAmp: number; wobbleFreq: number;
    }[] = [];
    const petalUniforms = { uOpacity: { value: 0.0 }, uPixelSize: { value: isMobile ? 5.0 : 6.0 }, uBright: { value: 1.0 }, uTint: { value: new THREE.Vector3(0.05, 0.17, 0.46) } };
    let petalGeo: THREE.PlaneGeometry | null = null;
    let petalMat: THREE.ShaderMaterial | null = null;
    let petalOpacity = 0;
    if (!isMobile) {
      // Near-round petal geometry (square plane) with a soft cup so it still
      // reads as a 3D disc, not a flat coin.
      petalGeo = new THREE.PlaneGeometry(1, 1, 8, 8);
      {
        const pos = petalGeo.attributes.position;
        for (let vi = 0; vi < pos.count; vi++) {
          const vx = pos.getX(vi);
          const vy = pos.getY(vi);
          const z = -0.45 * (vx * vx + vy * vy);
          pos.setZ(vi, z);
        }
        pos.needsUpdate = true;
        petalGeo.computeVertexNormals();
      }
      petalMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: petalUniforms,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uOpacity;
          uniform float uPixelSize;
          uniform float uBright;
          uniform vec3 uTint;
          void main() {
            vec2 pp = vUv - vec2(0.5);
            // Near-round silhouette → density (denser at the core, soft at the
            // rim). Radial mask instead of the old petal-width profile.
            float rad = length(pp) * 2.0;   // 0 center .. 1 edge
            float density = smoothstep(1.0, 0.32, rad);
            if (density < 0.06) discard;

            // 4x4 Bayer Dither for retro depth (scaled up for even larger radius)
            float dx = mod(floor(gl_FragCoord.x * 0.33), 4.0);
            float dy = mod(floor(gl_FragCoord.y * 0.33), 4.0);
            float dither = 0.0;
            if (dx < 1.0) {
              if (dy < 1.0) dither = 0.0;
              else if (dy < 2.0) dither = 0.75;
              else if (dy < 3.0) dither = 0.1875;
              else dither = 0.9375;
            } else if (dx < 2.0) {
              if (dy < 1.0) dither = 0.5;
              else if (dy < 2.0) dither = 0.25;
              else if (dy < 3.0) dither = 0.6875;
              else dither = 0.4375;
            } else if (dx < 3.0) {
              if (dy < 1.0) dither = 0.125;
              else if (dy < 2.0) dither = 0.875;
              else if (dy < 3.0) dither = 0.0625;
              else dither = 0.8125;
            } else {
              if (dy < 1.0) dither = 0.625;
              else if (dy < 2.0) dither = 0.375;
              else if (dy < 3.0) dither = 0.5625;
              else dither = 0.3125;
            }
            // Perturb the density for the ASCII lookup (max intensity/spread)
            float ditheredDensity = density + (dither - 0.5) * 1.1;

            // Same ASCII screen-space grid as the main flower, so petals share
            // its exact halftone character style (one continuous material feel).
            vec2 localc = fract(gl_FragCoord.xy / uPixelSize);
            vec2 p5 = floor(localc * 5.0);
            int charIndex = int(floor(ditheredDensity * 5.99));
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

            // Per-petal tint drawn from the flower's palette family (blue-
            // indigo / violet / teal) so the drift isn't monotone but still
            // harmonizes with the bloom. Edge = darker rim, core = the tint.
            vec3 coreC = uTint;
            vec3 edgeC = uTint * 0.34;
            vec3 col = mix(edgeC, coreC, density);
            col += uTint * 0.5 * pow(density, 2.0);
            // Atmospheric perspective: brightness scales with petal size so
            // small = far (dimmer/hazier), large = near (brighter).
            col *= uBright;
            gl_FragColor = vec4(col, uOpacity);
          }
        `,
      });
      // Reduced from 18 to 8 petals to prevent massive GPU overdraw and frame drops 
      // when scrolling into the operations stack section, keeping the page very lightweight.
      const PETAL_COUNT = 8;
      // Palette harmonized with the flower (toned-down blue-indigo / violet /
      // teal family) so petals vary in hue without clashing with the bloom.
      const petalPalette = [
        new THREE.Vector3(0.05, 0.17, 0.46), // blue-indigo (base)
        new THREE.Vector3(0.02, 0.08, 0.60), // deep blue 2 (was teal)
        new THREE.Vector3(0.10, 0.13, 0.52), // deep blue
        new THREE.Vector3(0.05, 0.15, 0.44), // blue
        new THREE.Vector3(0.12, 0.12, 0.44), // muted indigo (subtle violet hint)
      ];
      for (let i = 0; i < PETAL_COUNT; i++) {
        // Depth-varied size for a richer 3D feel: bigger overall with a higher
        // floor so far petals still read as discs, never single dots.
        const r = Math.random();
        const size = 0.55 + r * r * 1.5;         // ~0.55 .. 2.05, skewed small
        // Per-petal material so brightness can vary with size (atmospheric
        // perspective): small = far/dim, medium closer, large = near/brightest.
        const normSize = Math.min(Math.max((size - 0.55) / 1.5, 0), 1);
        const bright = (0.6 + normSize * 0.75) * 1.05;    // ~0.6 (far) .. 1.35 (near), +5% brighter
        const tint = petalPalette[(Math.random() * petalPalette.length) | 0].clone();
        const mat = petalMat!.clone();
        mat.uniforms.uOpacity = petalUniforms.uOpacity; // share fade opacity
        mat.uniforms.uBright.value = bright;
        mat.uniforms.uTint.value = tint;
        const m = new THREE.Mesh(petalGeo, mat);
        m.scale.setScalar(size);

        // All petals now orbit the flower like satellites
        const mode: 'drift' | 'orbit' = 'orbit';

        const sx = (Math.random() * 2 - 1) * 8.5;
        const sy = Math.random() * 18;

        // Each orbit sits on its own tilted plane so they cross in 3D.
        const incl = Math.random() * Math.PI;
        const orbitR = 4.0 + Math.random() * 3.0;   // 4.0 .. 7.0, outside bloom

        // Base orientation faces the camera (+z) with a gentle tilt; in-plane
        // spin (Z) is free, but X/Y tilt stays small and wobbles softly so the
        // petal never turns fully edge-on (avoids the flat "coin" flip).
        const baseRotX = (Math.random() - 0.5) * 0.7;
        const baseRotY = (Math.random() - 0.5) * 0.7;
        const baseRotZ = Math.random() * 6.28;

        if (mode === 'drift') {
          const depth = -4.0 + size * 2.6;          // bigger => nearer camera
          m.position.set(sx, sy - 9, depth + (Math.random() * 2 - 1));
        }
        m.rotation.set(baseRotX, baseRotY, baseRotZ);

        petals.push({
          mesh: m, mode,
          sx, sy,
          fall: 0.08 + size * 0.15,               // ~0.10 .. 0.26 (floaty)
          swayAmp: 0.45 + Math.random() * 0.95,
          swayFreq: 0.16 + Math.random() * 0.32,
          orbitR,
          inclSin: Math.sin(incl),
          inclCos: Math.cos(incl),
          orbitSpeed: (0.10 + Math.random() * 0.14) * (Math.random() < 0.5 ? 1 : -1),
          orbitPhase: Math.random() * 6.28,
          phase: Math.random() * 6.28,
          baseRotX, baseRotY, baseRotZ,
          wobbleAmp: 0.16 + Math.random() * 0.2,   // gentle, never edge-on
          wobbleFreq: 0.28 + Math.random() * 0.45,
        });
        scene.add(m);
      }
    }

    // Scroll Transition Setup
    // Start position: Shifted up slightly
    const startX = 0;
    const startY = isMobile ? -0.2 : -0.3; 
    const endX = isMobile ? 0 : 5;
    const endY = isMobile ? 3 : -0.2;

    // Initial positioning (Immersive, framing the text from below)
    group.position.set(startX, startY, 0);
    group.scale.set(1.6, 1.6, 1.6); 

    // Scroll mapping state
    let targetScroll = 0;
    let targetRotationX = 0.5; 
    let currentScrollRotationX = 0.5;
    let targetX = startX;
    let targetY = startY;
    let targetScale = 1.6;

    // ── Cached section anchors (layout read only on mount / resize) ──
    // Reading getBoundingClientRect() on every scroll event forced a
    // synchronous reflow of the whole zoomed+sticky+WebGL page — the cause of
    // the scroll stutter. We cache the anchor offsets instead.
    let centerAt = Infinity;
    let rightAt = Infinity;
    let petalStartAt = Infinity;
    let footerAt = Infinity;
    const computeAnchors = () => {
      const vh = window.innerHeight;
      const showcaseEl = document.getElementById('showcase');
      if (showcaseEl) {
        const scTop = showcaseEl.getBoundingClientRect().top + window.scrollY;
        centerAt = scTop - vh * 0.45; // Operational Framework becomes active → center
      }
      const langEl = document.getElementById('agent-language');
      if (langEl) {
        const lgTop = langEl.getBoundingClientRect().top + window.scrollY;
        rightAt = lgTop - vh * 0.45; // "speaks your customer's language" → right
      }
      // Petals begin drifting when the "Turn your AI Confusion Into AI
      // Execution" section (#features) scrolls into view. Fall back to the
      // Operational Framework anchor on pages without that section.
      const featEl = document.getElementById('features');
      if (featEl) {
        const ftTop = featEl.getBoundingClientRect().top + window.scrollY;
        petalStartAt = ftTop - vh * 0.5;
      } else {
        petalStartAt = centerAt;
      }
      const footerEl = document.querySelector('footer');
      if (footerEl) {
        footerAt = footerEl.getBoundingClientRect().top + window.scrollY - vh;
      }
    };

    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      // Calculate transition progress (0 to 1 over 800px scroll)
      const progress = Math.min(scrollY / 800, 1.0);
      
      targetY = startY + (endY - startY) * progress;
      targetScale = 1.6 - (0.6 * progress); // Shrink perfectly back from 1.6 to 1.0

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
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const smooth = (e0: number, e1: number, v: number) => {
        if (e1 <= e0) return v >= e1 ? 1 : 0;
        const t = Math.min(Math.max((v - e0) / (e1 - e0), 0), 1);
        return t * t * (3 - 2 * t);
      };
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
          const band = Math.min(600, Math.max(1, centerAt));
          x = lerp(heroX, 0, smooth(centerAt - band, centerAt, scrollY)); // right → center
        }
      }
      
      // Footer right-shift override
      if (footerAt !== Infinity) {
         const shiftStart = Math.max(0, footerAt - 800);
         if (scrollY > shiftStart) {
            const shiftProgress = smooth(shiftStart, footerAt, scrollY);
            x = lerp(x, endX, shiftProgress);
         }
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
    canvas.addEventListener('pointerdown', onPointerDown);
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
        // Constant 60fps cadence. Previously this stepped from 60→30fps the
        // instant scrollY crossed 400px, which halved the frame rate (and the
        // per-frame position/scale easing below) right in the middle of the
        // hero transition — reading as a scroll stutter. A fixed cadence keeps
        // the motion smooth through the whole scroll gesture.
        const fpsLimit = 16.66;
        const elapsed = timestamp - lastRenderTime;
        if (elapsed < fpsLimit) return;
        // Align to the frame grid so throttled sections pace evenly
        // (prevents the 24-30fps oscillation that reads as stutter).
        lastRenderTime = timestamp - (elapsed % fpsLimit);

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

        // ── Drifting petals (Operational Framework only) ──
        if (petals.length) {
          let targetPetal = 0;
          if (petalStartAt !== Infinity) {
            const sY = window.scrollY;
            const fadeIn = Math.min(Math.max((sY - (petalStartAt - 300)) / 500, 0), 1);
            let fadeOut = 1;
            if (rightAt !== Infinity) {
              fadeOut = 1 - Math.min(Math.max((sY - (rightAt - 250)) / 250, 0), 1);
            }
            targetPetal = fadeIn * fadeOut;
          }
          petalOpacity += (targetPetal - petalOpacity) * 0.06;
          petalUniforms.uOpacity.value = petalOpacity * 0.72;
          if (petalOpacity > 0.002) {
            const cx = group.position.x;
            const cy = group.position.y;
            const cz = group.position.z;
            for (const pt of petals) {
              const m = pt.mesh;
              if (pt.mode === 'orbit') {
                // Satellite-style orbit around the flower on a tilted plane,
                // so petals sweep in front of and behind the bloom in 3D.
                const a = pt.orbitPhase + time * pt.orbitSpeed;
                m.position.x = cx + Math.cos(a) * pt.orbitR;
                m.position.y = cy + Math.sin(a) * pt.orbitR * pt.inclSin;
                m.position.z = cz + Math.sin(a) * pt.orbitR * pt.inclCos;
              } else {
                let ny = (pt.sy - time * pt.fall) % 18;
                if (ny < 0) ny += 18;
                m.position.y = ny - 9; // wrap off-screen, top → bottom
                m.position.x = pt.sx + Math.sin(time * pt.swayFreq + pt.phase) * pt.swayAmp;
              }
              // Gentle wobble around a camera-facing base — the curved petal
              // sways in 3D but never goes flat/edge-on (no "coin" spin).
              m.rotation.x = pt.baseRotX + Math.sin(time * pt.wobbleFreq + pt.phase) * pt.wobbleAmp;
              m.rotation.y = pt.baseRotY + Math.cos(time * pt.wobbleFreq * 0.8 + pt.phase) * pt.wobbleAmp;
              m.rotation.z = pt.baseRotZ + Math.sin(time * pt.wobbleFreq * 0.6 + pt.phase) * pt.wobbleAmp * 0.5;
            }
          }
        }

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
      canvas.removeEventListener('pointerdown', onPointerDown);
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
