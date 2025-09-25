"use client";

import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { MathUtils, type Mesh } from "three";

export interface ThreeButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  hoverColor?: string;
  className?: string;
}

export function ThreeButton({
  children,
  onClick,
  color = "#2563eb",
  hoverColor = "#1e40af",
  className = "w-32 h-12",
}: ThreeButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const targetScale = active ? 0.95 : hovered ? 1.1 : 1;
    const targetRotX = hovered ? -0.05 : 0;
    const targetRotY = hovered ? 0.05 : 0;
    const s = MathUtils.lerp(meshRef.current.scale.x, targetScale, 10 * delta);
    meshRef.current.scale.set(s, s, s);
    meshRef.current.rotation.x = MathUtils.lerp(
      meshRef.current.rotation.x,
      targetRotX,
      10 * delta,
    );
    meshRef.current.rotation.y = MathUtils.lerp(
      meshRef.current.rotation.y,
      targetRotY,
      10 * delta,
    );
  });

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <mesh
          ref={meshRef}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => {
            setHovered(false);
            setActive(false);
          }}
          onPointerDown={() => setActive(true)}
          onPointerUp={() => setActive(false)}
          onClick={onClick}
        >
          <boxGeometry args={[1.6, 0.6, 0.3]} />
          <meshStandardMaterial color={hovered ? hoverColor : color} />
          <Html center>
            <div className="pointer-events-none select-none">{children}</div>
          </Html>
        </mesh>
      </Canvas>
    </div>
  );
}

export default ThreeButton;
