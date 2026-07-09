"use client";
import React, { useRef } from 'react';
import { useFrame, Canvas } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { useInViewMount } from '@/hooks/useInViewMount';
import { useCanvasQuality } from '@/hooks/useCanvasQuality';
export function Flask3D() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
    }
  });
  return (
    <group ref={groupRef} position={[0, -0.6, 0]}>
      {/* Flask Body (Cone-ish shape) - cheap glass, no transmission render pass */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.3, 0.8, 1.2, 24]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.35}
          roughness={0.1}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>
      {/* Flask Neck */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.5, 24]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.35}
          roughness={0.1}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>
      {/* Flask Rim */}
      <mesh position={[0, 1.45, 0]}>
        <torusGeometry args={[0.32, 0.06, 12, 24]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.45}
          roughness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>
      {/* Liquid inside — cone matched to the flask's inner taper so it never pokes through the glass */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.5, 0.72, 0.62, 24]} />
        <meshStandardMaterial 
          color="#aec99d" 
          emissive="#aec99d" 
          emissiveIntensity={0.8} 
          transparent 
          opacity={0.9} 
        />
      </mesh>
      {/* Bubbles */}
      {[...Array(6)].map((_, i) => (
        <Bubble key={i} index={i} />
      ))}
    </group>
  );
}
function Bubble({ index }: { index: number }) {
  const bubbleRef = useRef<THREE.Mesh>(null);
  // Constrain bubbles to rise inside the liquid cone (y: -0.15 -> 0.35, radius tapers in)
  const startX = Math.sin(index * 123.456) * 0.22;
  const startZ = Math.cos(index * 654.321) * 0.22;
  const speed = 0.5 + (index % 4) * 0.12;
  const phase = index * 0.35;
  const size = 0.018 + ((index % 3) * 0.012);
  useFrame((state) => {
    if (bubbleRef.current) {
      const t = ((state.clock.elapsedTime * speed) + phase) % 1; // 0..1 loop
      const y = -0.15 + t * 0.5;
      const shrink = 1 - t * 0.45; // narrow inward as the cone tapers upward
      bubbleRef.current.position.set(startX * shrink, y, startZ * shrink);
    }
  });
  return (
    <mesh ref={bubbleRef}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.6} emissive="#ffffff" emissiveIntensity={0.5} />
    </mesh>
  );
}
export function LabFlaskCanvas() {
  const { ref, inView } = useInViewMount<HTMLDivElement>();
  const { dpr } = useCanvasQuality();
  return (
    <div ref={ref} className="w-full h-full pointer-events-none">
      {inView && (
        <Canvas
          camera={{ position: [0, 0, 4.5], fov: 40 }}
          dpr={dpr}
          gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
        >
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#aec99d" />
          <pointLight position={[-6, -4, 4]} intensity={0.6} color="#ffffff" />
          <Float speed={2.5} rotationIntensity={0.3} floatIntensity={0.6}>
            <Flask3D />
          </Float>
        </Canvas>
      )}
    </div>
  );
}
