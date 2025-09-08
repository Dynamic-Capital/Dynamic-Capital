import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { motion } from "framer-motion-3d";

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

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <motion.mesh
          whileHover={{ scale: 1.1, rotateX: -0.05, rotateY: 0.05 }}
          whileTap={{ scale: 0.95 }}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onClick={onClick}
        >
          <boxGeometry args={[1.6, 0.6, 0.3]} />
          <meshStandardMaterial color={hovered ? hoverColor : color} />
          <Html center>
            <div className="pointer-events-none select-none">{children}</div>
          </Html>
        </motion.mesh>
      </Canvas>
    </div>
  );
}

export default ThreeButton;
