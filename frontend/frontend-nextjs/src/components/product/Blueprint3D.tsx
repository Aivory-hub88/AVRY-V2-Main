'use client';
import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Line, Sphere, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useInViewMount } from '@/hooks/useInViewMount';

function Node({ position, color, label }: { position: [number, number, number], color: string, label: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.5;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <group position={position}>
        <Sphere ref={meshRef} args={[0.2, 24, 24]}>
          {/* Cheap glass look: no transmission render pass (avoids GPU FBO churn) */}
          <meshPhysicalMaterial
            color={color}
            transparent
            opacity={0.85}
            roughness={0.15}
            metalness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </Sphere>
        <Text 
          position={[0, -0.4, 0]} 
          fontSize={0.15} 
          color="white" 
          anchorX="center" 
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          {label}
        </Text>
      </group>
    </Float>
  );
}

function Connections() {
  return (
    <group>
      <Line points={[[-2, 1, 0], [0, 0, 0]]} color="#aec99d" opacity={0.4} transparent lineWidth={1.5} />
      <Line points={[[2, 1, 0], [0, 0, 0]]} color="#aec99d" opacity={0.4} transparent lineWidth={1.5} />
      <Line points={[[-1.5, -1.5, 0], [0, 0, 0]]} color="#aec99d" opacity={0.4} transparent lineWidth={1.5} />
      <Line points={[[1.5, -1.5, 0], [0, 0, 0]]} color="#aec99d" opacity={0.4} transparent lineWidth={1.5} />
    </group>
  );
}

export function Blueprint3D() {
  const { ref, inView } = useInViewMount<HTMLDivElement>();
  return (
    <div ref={ref} className="w-full h-full min-h-[350px] relative">
      {inView && (
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          dpr={[1, 1.5]}
          gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            <Connections />
            <Node position={[-2, 1, 0]} color="#b2cca2" label="Data Source" />
            <Node position={[2, 1, 0]} color="#b2cca2" label="Trigger Event" />
            <Node position={[0, 0, 0]} color="#ffffff" label="Aivory Engine" />
            <Node position={[-1.5, -1.5, 0]} color="#b2cca2" label="Action Layer" />
            <Node position={[1.5, -1.5, 0]} color="#b2cca2" label="CRM Sync" />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
