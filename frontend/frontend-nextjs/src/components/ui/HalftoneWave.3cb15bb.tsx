commit 3cb15bb5ce97c0cf2ae26c56a9c95fc56d5b89ed
Author: Aivory-hub88 <irfan.reichmann@aivory.id>
Date:   Thu Jul 9 16:47:26 2026 +0700

    fix(flower): kill muddy brown scroll palette + hold shape + smoother edges
    
    Three fixes for the hero flower reported from live:
    - Muddy/berantakan on scroll: the shader transitioned the flower's core
      color to a warm amber (vec3(0.5,0.25,0.05)) as uScroll rose, turning the
      bloom brown and making overlapping translucent petals read as a messy
      tangle. Recolored the scrolled-state palette to stay in the hero's cool
      blue/indigo family.
    - Shape blowing apart on scroll: reduced the scroll spread (1.5->0.7) and
      bend (0.8->0.45) so petals keep their silhouette.
    - Not smooth at some angles: finer halftone dots on desktop (uPixelSize
      6.0->4.5) for both the main flower and the drifting petals.
    
    Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>

diff --git a/src/components/ui/HalftoneWave.tsx b/src/components/ui/HalftoneWave.tsx
index c4765cd..c4d5c41 100644
--- a/src/components/ui/HalftoneWave.tsx
+++ b/src/components/ui/HalftoneWave.tsx
@@ -31,7 +31,7 @@ export function HalftoneWave() {
     const uniforms = {
       uTime: { value: 0.0 },
       uResolution: { value: new THREE.Vector2(width * baseDPR, height * baseDPR) },
-      uPixelSize: { value: isMobile ? 5.0 : 6.0 }, 
+      uPixelSize: { value: isMobile ? 5.0 : 4.5 }, // finer dots on desktop = smoother silhouette at grazing angles
       uScroll: { value: 0.0 }, // Used to trigger the spreading petals effect
       uMouse: { value: new THREE.Vector2(0, 0) }
     };
@@ -103,10 +103,13 @@ export function HalftoneWave() {
           // 3. ELEGANT COLOR MAPPING (Transition based on scroll)
           float scrollT = smoothstep(0.0, 0.4, uScroll);
           
-          // Original Colors (Dimmed amber / Cyan / Purple)
-          vec3 origCore = vec3(0.5, 0.25, 0.05);
-          vec3 origEdge = vec3(0.04, 0.18, 0.32);
-          vec3 origIndigo = vec3(0.16, 0.02, 0.32);
+          // Scrolled-state colors — kept in the SAME cool blue/indigo family as
+          // the hero (was a warm amber core: vec3(0.5,0.25,0.05), which turned
+          // the flower muddy brown on scroll and made overlapping petals read
+          // as a messy tangle). Now it only deepens slightly, never goes warm.
+          vec3 origCore = vec3(0.04, 0.07, 0.16);
+          vec3 origEdge = vec3(0.06, 0.20, 0.36);
+          vec3 origIndigo = vec3(0.16, 0.06, 0.34);
           
           // Hero Colors (Premium Elegance: Midnight Core / Deep Blue-Purple Edges)
           vec3 heroCore = vec3(0.02, 0.03, 0.06); // Deep midnight core (slightly brighter)
@@ -202,8 +205,10 @@ export function HalftoneWave() {
           float idleBloom = (sin(uTime * 1.5) * 0.5 + 0.5) * 0.1;
           float spread = smoothstep(0.0, 1.0, uScroll) + (idleBloom * (1.0 - smoothstep(0.0, 1.0, uScroll)));
           
-          float radius = 2.5 + (petalDepth * 2.0) + (petalDepth * spread * 1.5);
-          float bend = spread * 0.8;
+          // Gentler spread + bend on scroll (was 1.5 / 0.8) so the petals keep
+          // their silhouette instead of blowing apart into a messy overlap.
+          float radius = 2.5 + (petalDepth * 2.0) + (petalDepth * spread * 0.7);
+          float bend = spread * 0.45;
           
           vec3 displacedPos = p * radius;
           displacedPos.y -= bend * petalDepth;
@@ -248,7 +253,7 @@ export function HalftoneWave() {
       baseRotX: number; baseRotY: number; baseRotZ: number;
       wobbleAmp: number; wobbleFreq: number;
     }[] = [];
-    const petalUniforms = { uOpacity: { value: 0.0 }, uPixelSize: { value: isMobile ? 5.0 : 6.0 }, uBright: { value: 1.0 }, uTint: { value: new THREE.Vector3(0.05, 0.17, 0.46) } };
+    const petalUniforms = { uOpacity: { value: 0.0 }, uPixelSize: { value: isMobile ? 5.0 : 4.5 }, uBright: { value: 1.0 }, uTint: { value: new THREE.Vector3(0.05, 0.17, 0.46) } };
     let petalGeo: THREE.PlaneGeometry | null = null;
     let petalMat: THREE.ShaderMaterial | null = null;
     let petalOpacity = 0;
