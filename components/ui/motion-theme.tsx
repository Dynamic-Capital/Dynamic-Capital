import React from 'react';
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from 'framer-motion';
import { cn } from '@/utils';
import { MotionConfigProvider } from './motion-config';
import { parentVariants, childVariants } from '@/lib/motion-variants';
import { sectionVariants, SectionVariant } from '@/lib/section-variants';
import { useIsMobile } from '@/hooks/useMobile';

interface MotionThemeProviderProps {
  children: React.ReactNode;
  className?: string;
  reducedMotion?: boolean;
}

// Global motion configuration
const motionConfig = {
  transition: {
    type: "spring" as const,
    stiffness: 260,
    damping: 20,
    mass: 0.8,
  },
  transformTemplate: ({ x, y, rotate }: any) => {
    return `translate3d(${x}, ${y}, 0) rotateZ(${rotate})`;
  },
};

export const MotionThemeProvider: React.FC<MotionThemeProviderProps> = ({
  children,
  className,
  reducedMotion = false
}) => {
  const shouldReduceMotion = useReducedMotion();
  const isReduced = reducedMotion || shouldReduceMotion;

  return (
    <MotionConfigProvider>
      <motion.div
        className={cn(
          "motion-theme-provider",
          "min-h-screen",
          "transition-all duration-500 ease-out",
          className
        )}
        variants={parentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, hsl(var(--primary) / 0.05) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, hsl(var(--accent) / 0.05) 0%, transparent 50%),
            linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)
          `,
        }}
      >
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </motion.div>
    </MotionConfigProvider>
  );
};

// Page wrapper with consistent animations
interface MotionPageProps {
  children: React.ReactNode;
  className?: string;
  pageKey?: string;
}

export const MotionPage: React.FC<MotionPageProps> = ({
  children,
  className,
  pageKey = "page"
}) => {
  return (
    <motion.div
      key={pageKey}
      className={cn("motion-page", className)}
      variants={childVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {children}
    </motion.div>
  );
};

// Section wrapper with viewport animations
interface MotionSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  viewport?: {
    once?: boolean;
    amount?: number;
  };
  variant?: SectionVariant;
}

export const MotionSection: React.FC<MotionSectionProps> = ({
  children,
  className,
  delay = 0,
  viewport = { once: true, amount: 0.2 },
  variant = "fadeUp",
}) => {
  const isMobile = useIsMobile();
  const selectedVariant = sectionVariants[variant] || sectionVariants.fadeUp;
  return (
    <motion.section
      className={cn("motion-section", className)}
      variants={selectedVariant}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      transition={{
        type: "spring",
        stiffness: isMobile ? 300 : 260,
        damping: isMobile ? 25 : 20,
        delay,
      }}
    >
      {children}
    </motion.section>
  );
};

// Grid container with stagger animations
interface MotionGridProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  columns?: number;
}

export const MotionGrid: React.FC<MotionGridProps> = ({
  children,
  className,
  staggerDelay = 0.1,
  columns = 1
}) => {
  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  }[columns] || "grid-cols-1";

  return (
    <motion.div
      className={cn("grid gap-6", gridClass, className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 20, scale: 0.95 },
            visible: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                type: "spring",
                stiffness: 260,
                damping: 20,
              },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Button with consistent motion
interface MotionButtonWrapperProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const MotionButtonWrapper: React.FC<MotionButtonWrapperProps> = ({
  children,
  className,
  disabled = false
}) => {
  return (
    <motion.div
      className={className}
      whileHover={disabled ? {} : { scale: 1.05, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
    >
      {children}
    </motion.div>
  );
};

// Modal wrapper with backdrop
interface MotionModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  className?: string;
}

export const MotionModal: React.FC<MotionModalProps> = ({
  children,
  isOpen,
  onClose,
  className
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              "fixed inset-0 z-50 flex items-center justify-center p-4",
              className
            )}
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default {
  MotionThemeProvider,
  MotionPage,
  MotionSection,
  MotionGrid,
  MotionButtonWrapper,
  MotionModal,
};