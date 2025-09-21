"use client";

import * as React from "react";
import { MotionConfig, LazyMotion, domAnimation, useReducedMotion } from "framer-motion";

import { ONCE_MOTION_SPRINGS } from "@/lib/motion-variants";

interface MotionConfigProviderProps {
  children: React.ReactNode;
}

export const MotionConfigProvider: React.FC<MotionConfigProviderProps> = ({ children }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig
        transition={ONCE_MOTION_SPRINGS.base}
        reducedMotion={shouldReduceMotion ? "always" : "user"}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
};