"use client";

import React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface ThreeDEmoticonProps {
  emoji: string;
  size?: number;
  intensity?: number;
  className?: string;
  onClick?: () => void;
  animate?: boolean;
}

export const ThreeDEmoticon: React.FC<ThreeDEmoticonProps> = ({
  emoji,
  size = 48,
  intensity = 0.3,
  className = "",
  onClick,
  animate = true,
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(
    useTransform(y, [-100, 100], [intensity * 30, -intensity * 30]),
  );
  const rotateY = useSpring(
    useTransform(x, [-100, 100], [-intensity * 30, intensity * 30]),
  );

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={`inline-block cursor-pointer select-none ${className}`}
      style={{
        fontSize: `${size}px`,
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={{ scale: 1.1, z: 50 }}
      whileTap={{ scale: 0.95 }}
      animate={animate
        ? {
          rotateY: [0, 10, -10, 0],
          rotateX: [0, 5, -5, 0],
        }
        : undefined}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <motion.div
        initial={{
          filter: "drop-shadow(0 5px 10px rgba(0,0,0,0.1))",
        }}
        style={{
          filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.2))",
        }}
        whileHover={{
          filter: "drop-shadow(0 15px 30px rgba(0,0,0,0.3))",
        }}
        transition={{ duration: 0.3 }}
      >
        {emoji}
      </motion.div>
    </motion.div>
  );
};

interface FloatingEmoticonProps {
  emoji: string;
  delay?: number;
  duration?: number;
  className?: string;
}

export const FloatingEmoticon: React.FC<FloatingEmoticonProps> = ({
  emoji,
  delay = 0,
  duration = 6,
  className = "",
}) => {
  return (
    <motion.div
      className={`absolute pointer-events-none select-none ${className}`}
      initial={{ opacity: 0, scale: 0, y: 100 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0, 1.2, 1, 0],
        y: [-100, -200, -300, -400],
        x: [0, 20, -20, 0],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration,
        delay,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: Math.random() * 5 + 3,
      }}
      style={{
        fontSize: "24px",
        left: `${Math.random() * 100}%`,
        bottom: "0%",
        zIndex: 1,
      }}
    >
      {emoji}
    </motion.div>
  );
};

interface EmoticonRainProps {
  emojis: string[];
  count?: number;
  active?: boolean;
}

export const EmoticonRain: React.FC<EmoticonRainProps> = ({
  emojis,
  count = 10,
  active = true,
}) => {
  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: count }).map((_, i) => (
        <FloatingEmoticon
          key={i}
          emoji={emojis[Math.floor(Math.random() * emojis.length)]}
          delay={Math.random() * 2}
          duration={Math.random() * 3 + 4}
        />
      ))}
    </div>
  );
};

interface TradingEmoticonSetProps {
  variant: "success" | "profit" | "celebration" | "focus" | "vip";
  className?: string;
}

export const TradingEmoticonSet: React.FC<TradingEmoticonSetProps> = ({
  variant,
  className = "",
}) => {
  const emojiSets = {
    success: ["📈", "💰", "🚀", "⭐", "🏆"],
    profit: ["💎", "💵", "📊", "🔥", "⚡"],
    celebration: ["🎉", "🥳", "🍾", "🎊", "🎁"],
    focus: ["🎯", "🧠", "⚡", "🔍", "💡"],
    vip: ["👑", "💎", "⭐", "🏆", "🌟"],
  };

  const emojis = emojiSets[variant];

  return (
    <div className={`flex gap-2 ${className}`}>
      {emojis.map((emoji, index) => (
        <ThreeDEmoticon
          key={index}
          emoji={emoji}
          size={24}
          intensity={0.2}
          animate={index % 2 === 0}
        />
      ))}
    </div>
  );
};

export default ThreeDEmoticon;
