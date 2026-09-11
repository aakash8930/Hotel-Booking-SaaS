'use client';

import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { Mesh } from 'three';

/**
 * Modular 3D Building Component
 * This component replaces the distorted sphere with a stylized building
 * that assembles itself using linear interpolation (lerp).
 */
function BuildingBlock({
  initialPos,
  targetPos,
  size,
  color = '#ffffff'
}: {
  initialPos: [number, number, number],
  targetPos: [number, number, number],
  size: [number, number, number],
  color?: string
}) {
  const meshRef = useRef<Mesh>(null);

  // Use a simple animation state that increments over time
  // In a real app, this could be linked to scroll progress via a store or context
  useFrame((state) => {
    if (!meshRef.current) return;

    // Assembly speed
    const t = (Math.sin(state.clock.elapsedTime * 0.5) + 1) / 2; // Oscillate between 0 and 1

    // For a "one-time" assembly, we'd use a different trigger.
    // Here we use a slow oscillation to keep the scene dynamic.

    meshRef.current.position.lerp(
      new THREE.Vector3(...(t > 0.8 ? targetPos : initialPos)),
      0.05
    );

    // Subtle rotation
    meshRef.current.rotation.y += 0.002;
  });

  return (
    <mesh ref={meshRef} position={initialPos}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        metalness={0.8}
        roughness={0.2}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

function HotelBuilding() {
  // Define the architectural structure of the building
  const blocks = useMemo(() => [
    // Base
    { initialPos: [-5, -2, -5] as [number, number, number], targetPos: [0, -1, 0] as [number, number, number], size: [2, 0.5, 2] as [number, number, number], color: '#a1a1aa' },
    // Floor 1
    { initialPos: [5, 2, 5] as [number, number, number], targetPos: [0, 0, 0] as [number, number, number], size: [1.8, 1, 1.8] as [number, number, number], color: '#e4e4e7' },
    // Floor 2
    { initialPos: [-5, 5, 5] as [number, number, number], targetPos: [0, 1, 0] as [number, number, number], size: [1.8, 1, 1.8] as [number, number, number], color: '#ffffff' },
    // Top Accent
    { initialPos: [5, -5, -5] as [number, number, number], targetPos: [0.5, 1.5, 0.5] as [number, number, number], size: [0.5, 0.5, 0.5] as [number, number, number], color: '#d4841e' },
    // Roof
    { initialPos: [0, 10, 0] as [number, number, number], targetPos: [0, 2, 0] as [number, number, number], size: [2.2, 0.2, 2.2] as [number, number, number], color: '#71717a' },
    // Side Wing
    { initialPos: [10, 0, 0] as [number, number, number], targetPos: [1.5, 0, 0] as [number, number, number], size: [0.8, 1, 1.2] as [number, number, number], color: '#e4e4e7' },
  ], []);

  return (
    <group>
      {blocks.map((block, i) => (
        <BuildingBlock key={i} {...block} />
      ))}
    </group>
  );
}

export function Scene3D() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [4, 3, 6], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['transparent']} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        <Suspense fallback={null}>
          <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2}>
            <HotelBuilding />
          </Float>
          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.4}
            scale={10}
            blur={2}
            far={4.5}
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}
