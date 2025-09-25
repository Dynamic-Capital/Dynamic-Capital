"use client";

import React, { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, RoundedBox } from "@react-three/drei";
import { Group, MathUtils, type Mesh } from "three";

interface FloatingShapeDefinition {
  id: string;
  position: [number, number, number];
  color: string;
  geometry: React.ReactNode;
  delay: number;
}

interface FloatingShapeProps extends FloatingShapeDefinition {
  hovered: boolean;
}

function FloatingShape(
  { geometry, position, color, delay, hovered }: FloatingShapeProps,
) {
  const shapeRef = useRef<Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (!shapeRef.current) return;
    const t = clock.getElapsedTime() + delay;
    const floatOffset = Math.sin(t) * 0.2 + (hovered ? 0.1 : 0);
    const targetX = hovered ? position[0] * 1.12 : position[0];
    const targetZ = hovered ? position[2] * 1.12 : position[2];
    const targetScale = hovered ? 1.05 : 0.9;

    shapeRef.current.position.x = MathUtils.lerp(
      shapeRef.current.position.x,
      targetX,
      6 * delta,
    );
    shapeRef.current.position.y = MathUtils.lerp(
      shapeRef.current.position.y,
      position[1] + floatOffset,
      5 * delta,
    );
    shapeRef.current.position.z = MathUtils.lerp(
      shapeRef.current.position.z,
      targetZ,
      6 * delta,
    );
    shapeRef.current.rotation.x += delta * 0.6;
    shapeRef.current.rotation.y += delta * 0.4;
    const s = MathUtils.lerp(shapeRef.current.scale.x, targetScale, 6 * delta);
    shapeRef.current.scale.setScalar(s);
  });

  return (
    <mesh ref={shapeRef} position={position} scale={0.85} castShadow>
      {geometry}
      <meshStandardMaterial
        color={color}
        metalness={0.55}
        roughness={0.25}
        emissive={color}
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

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
  const groupRef = useRef<Group>(null);
  const glowRef = useRef<Mesh>(null);

  const shapes = useMemo<FloatingShapeDefinition[]>(
    () => [
      {
        id: "sphere",
        position: [-0.95, 0.45, 0.25],
        color: "#60a5fa",
        geometry: <icosahedronGeometry args={[0.28, 0]} />,
        delay: 0,
      },
      {
        id: "torus",
        position: [0.35, 0.65, -0.45],
        color: "#a855f7",
        geometry: <torusGeometry args={[0.25, 0.06, 24, 96]} />,
        delay: 0.35,
      },
      {
        id: "cone",
        position: [0.95, -0.35, 0.15],
        color: "#f97316",
        geometry: <coneGeometry args={[0.22, 0.55, 32]} />,
        delay: 0.7,
      },
      {
        id: "pyramid",
        position: [-0.45, -0.55, -0.35],
        color: "#34d399",
        geometry: <tetrahedronGeometry args={[0.28, 0]} />,
        delay: 1.05,
      },
    ],
    [],
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const targetScale = active ? 0.92 : hovered ? 1.05 : 1;
    const targetRotX = hovered ? MathUtils.degToRad(-8) : 0;
    const targetRotY = hovered ? MathUtils.degToRad(8) : 0;
    const targetY = hovered ? 0.04 : 0;

    const scale = MathUtils.lerp(
      groupRef.current.scale.x,
      targetScale,
      8 * delta,
    );
    groupRef.current.scale.setScalar(scale);
    groupRef.current.rotation.x = MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotX,
      8 * delta,
    );
    groupRef.current.rotation.y = MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotY,
      8 * delta,
    );
    groupRef.current.position.y = MathUtils.lerp(
      groupRef.current.position.y,
      targetY,
      8 * delta,
    );

    if (glowRef.current) {
      const targetGlow = hovered ? 1.08 : 1;
      const glowScale = MathUtils.lerp(
        glowRef.current.scale.x,
        targetGlow,
        8 * delta,
      );
      glowRef.current.scale.set(glowScale, glowScale, glowScale);
    }
  });

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true }}
      >
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 6, 6]} intensity={1.1} />
        <group
          ref={groupRef}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => {
            setHovered(false);
            setActive(false);
          }}
          onPointerDown={() => setActive(true)}
          onPointerUp={() => setActive(false)}
          onClick={onClick}
        >
          <RoundedBox args={[2.6, 0.82, 0.4]} radius={0.28} smoothness={12}>
            <meshStandardMaterial
              color={hovered ? hoverColor : color}
              metalness={0.35}
              roughness={0.32}
              emissive={hovered ? hoverColor : color}
              emissiveIntensity={0.08}
            />
          </RoundedBox>

          <RoundedBox
            ref={glowRef}
            position={[0, 0, -0.22]}
            args={[2.4, 0.78, 0.08]}
            radius={0.26}
            smoothness={10}
          >
            <meshStandardMaterial
              color={hovered ? hoverColor : color}
              transparent
              opacity={0.25}
              roughness={0.1}
              metalness={0.6}
            />
          </RoundedBox>

          <Html
            transform
            position={[0, 0, 0.25]}
            wrapperClass="pointer-events-none"
          >
            <div className="pointer-events-none select-none">{children}</div>
          </Html>
        </group>

        {shapes.map((shape) => (
          <FloatingShape key={shape.id} {...shape} hovered={hovered} />
        ))}
      </Canvas>
    </div>
  );
}

export default ThreeButton;
