"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  variant?: "default" | "minimal" | "brand";
  animated?: boolean;
}

const BrandLogo: React.FC<BrandLogoProps> = ({
  className = "",
  size = "md",
  showText = true,
  variant = "default",
  animated = false,
}) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const sizeDimensions: Record<NonNullable<BrandLogoProps["size"]>, number> = {
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64,
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const logoClasses = cn(
    sizeClasses[size],
    "object-contain transition-all duration-300",
    animated && "hover:scale-110 hover:rotate-3",
    variant === "brand" && "drop-shadow-lg",
  );

  const containerClasses = cn(
    "flex items-center gap-3 group",
    animated && "transition-all duration-300",
    className,
  );

  const textClasses = cn(
    "font-bold transition-all duration-300",
    textSizeClasses[size],
    variant === "brand" && "bg-gradient-brand bg-clip-text text-transparent",
    variant === "minimal" && "text-foreground/80",
    variant === "default" && "text-foreground",
    animated && "group-hover:text-primary",
  );

  const MotionImage = motion(Image);

  return (
    <motion.div
      className={containerClasses}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.5,
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      whileHover={animated ? { scale: 1.05 } : undefined}
      whileTap={animated ? { scale: 0.95 } : undefined}
    >
      <MotionImage
        src="/icon-mark.svg"
        alt="Dynamic Capital Icon"
        width={sizeDimensions[size]}
        height={sizeDimensions[size]}
        className={logoClasses}
        sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
        loading="lazy"
        animate={animated ? { rotate: [0, 5, -5, 0] } : undefined}
        transition={animated
          ? {
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }
          : undefined}
        whileHover={animated ? { rotate: 10, scale: 1.1 } : undefined}
      />
      {showText && (
        <motion.span
          className={textClasses}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.span
            animate={variant === "brand"
              ? {
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }
              : undefined}
            transition={variant === "brand"
              ? {
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }
              : undefined}
            style={variant === "brand"
              ? {
                backgroundSize: "200% 200%",
              }
              : undefined}
          >
            Dynamic Capital
          </motion.span>
        </motion.span>
      )}
    </motion.div>
  );
};

export default BrandLogo;
