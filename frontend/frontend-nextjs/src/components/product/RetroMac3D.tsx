"use client";
import React, { useRef } from 'react';
import { useFrame, Canvas } from '@react-three/fiber';
import { RoundedBox, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useInViewMount } from '@/hooks/useInViewMount';
import { useCanvasQuality } from '@/hooks/useCanvasQuality';
export function RetroMac3D() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });
  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      {/* Mac Body — classic Macintosh beige/platinum */}
      <RoundedBox args={[1.2, 1.4, 1.2]} radius={0.1} smoothness={2}>
        <meshStandardMaterial color="#cabf9f" roughness={0.65} metalness={0.05} />
      </RoundedBox>
      {/* Screen Frame — slightly darker beige recess */}
      <RoundedBox args={[1, 0.9, 0.1]} position={[0, 0.1, 0.6]} radius={0.02} smoothness={2}>
        <meshStandardMaterial color="#8f866c" />
      </RoundedBox>
      {/* Screen (Glowing) */}
      <RoundedBox args={[0.85, 0.75, 0.05]} position={[0, 0.1, 0.63]} radius={0.02} smoothness={2}>
        <meshStandardMaterial 
          color="#aec99d" 
          emissive="#aec99d" 
          emissiveIntensity={1.5} 
          toneMapped={false} 
        />
      </RoundedBox>
      {/* Floppy Drive Slot */}
      <mesh position={[0.2, -0.45, 0.61]}>
        <boxGeometry args={[0.4, 0.03, 0.05]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      {/* Drive Light */}
      <mesh position={[-0.1, -0.45, 0.61]}>
        <boxGeometry args={[0.04, 0.04, 0.05]} />
        <meshStandardMaterial color="#ff3333" emissive="#ff3333" emissiveIntensity={1} />
      </mesh>
      {/* Lines / Vents */}
      <mesh position={[0, -0.6, 0.61]}>
        <boxGeometry args={[0.8, 0.02, 0.05]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <mesh position={[0, -0.65, 0.61]}>
        <boxGeometry args={[0.8, 0.02, 0.05]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
    </group>
  );
}
export function RetroMacCanvas() {
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
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 5, 5]} intensity={1.4} color="#fff6e6" />
          <pointLight position={[-6, -2, 4]} intensity={0.5} color="#ffffff" />
          <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <RetroMac3D />
          </Float>
        </Canvas>
      )}
    </div>
  );
}
