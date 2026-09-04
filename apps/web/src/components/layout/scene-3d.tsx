'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Environment } from '@react-three/drei';
import type { Mesh } from 'three';

/**
 * Lightweight 3D showcase — the Spline-alternative called out in the
 * roadmap. There's no Spline scene file for this project (Spline scenes
 * are authored in their GUI, not generated from code), so this uses
 * React Three Fiber directly: a small, free, code-driven WebGL scene.
 *
 * Kept intentionally simple (one distorted sphere, soft float) to stay
 * light on a mobile GPU — this is a decorative accent, not a product tour.
 */
function KeyShape() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <Float speed={1.4} rotationIntensity={0.5} floatIntensity={0.8}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.4, 4]} />
        <MeshDistortMaterial
          color="#c96820"
          distort={0.35}
          speed={1.6}
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>
    </Float>
  );
}

export function Scene3D() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 3]} intensity={1.2} />
        <Suspense fallback={null}>
          <KeyShape />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}
