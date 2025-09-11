"use client";

import * as React from "react";
import { MotionConfig, LazyMotion, domAnimation } from "framer-motion";
import { useReducedMotion } from "framer-motion";

interface MotionConfigProviderProps {
  children: React.ReactNode;
}

export const MotionConfigProvider: React.FC<MotionConfigProviderProps> = ({ children }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig
        transition={{
          type: "spring",
          stiffness: 320,
          damping: 28,
        }}
        reducedMotion={shouldReduceMotion ? "always" : "user"}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
};