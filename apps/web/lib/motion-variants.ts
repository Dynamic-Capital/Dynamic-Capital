// Universal Motion Variants for consistent animations across the app
import type { Variants } from 'framer-motion';

// === PARENT ORCHESTRATION VARIANTS ===
// These variants control children through stagger and orchestration
export const parentVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
      when: "afterChildren",
    },
  },
};

// Fast stagger for UI elements
export const fastParentVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
};

// Slow stagger for hero sections
export const slowParentVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.1,
      staggerDirection: -1,
    },
  },
};

// === CHILD VARIANTS ===
// These inherit from parent orchestration
export const childVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 320,
      damping: 28,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

// Child variant with custom direction
export const createChildVariant = (direction: 'up' | 'down' | 'left' | 'right' = 'up', distance = 20): Variants => ({
  hidden: {
    opacity: 0,
    ...(direction === 'up' && { y: distance }),
    ...(direction === 'down' && { y: -distance }),
    ...(direction === 'left' && { x: distance }),
    ...(direction === 'right' && { x: -distance }),
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 320,
      damping: 28,
    },
  },
  exit: {
    opacity: 0,
    ...(direction === 'up' && { y: -distance }),
    ...(direction === 'down' && { y: distance }),
    ...(direction === 'left' && { x: -distance }),
    ...(direction === 'right' && { x: distance }),
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
});

// Enhanced Card variants with better inheritance
export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 320,
      damping: 28,
    },
  },
  hover: {
    scale: 1.02,
    y: -5,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  tap: {
    scale: 0.96,
    transition: {
      duration: 0.1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -20,
    transition: {
      duration: 0.2,
    },
  },
};

// Interactive card variants
export const interactiveCardVariants: Variants = {
  ...cardVariants,
  hover: {
    scale: 1.03,
    y: -8,
    rotateX: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
    },
  },
};

// Page variants
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 30,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: 0.8,
    },
  },
  exit: {
    opacity: 0,
    y: -30,
    scale: 0.98,
    transition: {
      duration: 0.4,
    },
  },
};

// Enhanced Button variants with better micro-interactions
export const buttonVariants: Variants = {
  initial: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    y: -2,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  tap: {
    scale: 0.96,
    transition: {
      duration: 0.1,
    },
  },
  disabled: {
    opacity: 0.6,
    scale: 1,
  },
};

// Primary button with enhanced effects
export const primaryButtonVariants: Variants = {
  ...buttonVariants,
  hover: {
    scale: 1.05,
    y: -3,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
};

// Ghost button with subtle effects
export const ghostButtonVariants: Variants = {
  ...buttonVariants,
  hover: {
    scale: 1.02,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
};

// Stagger container variants
export const staggerContainerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

// Stagger item variants
export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
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
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

// Modal variants
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 50,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: {
      duration: 0.3,
    },
  },
};

// Backdrop variants
export const backdropVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
};

// Navigation variants
export const navVariants: Variants = {
  hidden: {
    y: -20,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    y: -20,
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
};

// Floating variants
export const floatingVariants: Variants = {
  floating: {
    y: [-10, 10, -10],
    x: [-5, 5, -5],
    rotate: [-2, 2, -2],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Pulse variants
export const pulseVariants: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Slide variants
export const slideVariants: Variants = {
  slideInFromLeft: {
    x: -100,
    opacity: 0,
  },
  slideInFromRight: {
    x: 100,
    opacity: 0,
  },
  slideInFromTop: {
    y: -100,
    opacity: 0,
  },
  slideInFromBottom: {
    y: 100,
    opacity: 0,
  },
  center: {
    x: 0,
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
  slideOutToLeft: {
    x: -100,
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
  slideOutToRight: {
    x: 100,
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
  slideOutToTop: {
    y: -100,
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
  slideOutToBottom: {
    y: 100,
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
};

// Tab variants
export const tabVariants: Variants = {
  inactive: {
    scale: 0.95,
    opacity: 0.7,
  },
  active: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
  hover: {
    scale: 1.02,
    opacity: 0.9,
    transition: {
      duration: 0.2,
    },
  },
};

export default {
  cardVariants,
  pageVariants,
  buttonVariants,
  staggerContainerVariants,
  staggerItemVariants,
  modalVariants,
  backdropVariants,
  navVariants,
  floatingVariants,
  pulseVariants,
  slideVariants,
  tabVariants,
};
