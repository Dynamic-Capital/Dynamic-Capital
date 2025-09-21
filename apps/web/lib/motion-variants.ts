import type { Transition, Variants } from "framer-motion";

type Direction = "up" | "down" | "left" | "right";

type SpringTransition = Transition & { type: "spring" };

const spring = (config: SpringTransition): Transition => config;

export const ONCE_MOTION_SPRINGS = {
  base: spring({ type: "spring", stiffness: 320, damping: 28, mass: 1 }),
  soft: spring({ type: "spring", stiffness: 260, damping: 24, mass: 1.05 }),
  snappy: spring({ type: "spring", stiffness: 400, damping: 25, mass: 0.9 }),
  modal: spring({ type: "spring", stiffness: 300, damping: 30, mass: 1.05 }),
} as const;

export const ONCE_MOTION_DURATIONS = {
  instant: 0.12,
  quick: 0.2,
  base: 0.32,
  slow: 0.48,
  slower: 0.6,
} as const;

export const ONCE_MOTION_EASING = {
  standard: [0.4, 0, 0.2, 1] as const,
  entrance: [0.16, 1, 0.3, 1] as const,
  exit: [0.4, 0, 0.6, 1] as const,
} as const;

export const ONCE_MOTION_STAGGERS = {
  base: 0.12,
  dense: 0.06,
  spacious: 0.2,
  delay: 0.18,
} as const;

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: ONCE_MOTION_DURATIONS.base,
      ease: ONCE_MOTION_EASING.entrance,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: ONCE_MOTION_DURATIONS.quick,
      ease: ONCE_MOTION_EASING.exit,
    },
  },
};

const badge: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ONCE_MOTION_DURATIONS.quick,
      ease: ONCE_MOTION_EASING.entrance,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: ONCE_MOTION_DURATIONS.instant,
      ease: ONCE_MOTION_EASING.exit,
    },
  },
};

const slideUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: ONCE_MOTION_SPRINGS.base,
  },
  exit: {
    opacity: 0,
    y: -24,
    transition: {
      duration: ONCE_MOTION_DURATIONS.quick,
      ease: ONCE_MOTION_EASING.exit,
    },
  },
};

const slideDown: Variants = {
  hidden: { opacity: 0, y: -24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: ONCE_MOTION_SPRINGS.base,
  },
  exit: {
    opacity: 0,
    y: 24,
    transition: {
      duration: ONCE_MOTION_DURATIONS.quick,
      ease: ONCE_MOTION_EASING.exit,
    },
  },
};

const slideLeft: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: ONCE_MOTION_SPRINGS.base,
  },
  exit: {
    opacity: 0,
    x: -24,
    transition: {
      duration: ONCE_MOTION_DURATIONS.quick,
      ease: ONCE_MOTION_EASING.exit,
    },
  },
};

const slideRight: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: ONCE_MOTION_SPRINGS.base,
  },
  exit: {
    opacity: 0,
    x: 24,
    transition: {
      duration: ONCE_MOTION_DURATIONS.quick,
      ease: ONCE_MOTION_EASING.exit,
    },
  },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: ONCE_MOTION_SPRINGS.soft,
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    transition: {
      duration: ONCE_MOTION_DURATIONS.quick,
      ease: ONCE_MOTION_EASING.exit,
    },
  },
};

const stack: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: ONCE_MOTION_STAGGERS.base,
      delayChildren: ONCE_MOTION_STAGGERS.delay,
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: ONCE_MOTION_STAGGERS.dense,
      staggerDirection: -1,
      when: "afterChildren",
    },
  },
};

const stackFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: ONCE_MOTION_STAGGERS.dense,
      delayChildren: ONCE_MOTION_STAGGERS.base,
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: ONCE_MOTION_STAGGERS.dense,
      staggerDirection: -1,
      when: "afterChildren",
    },
  },
};

const stackSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: ONCE_MOTION_STAGGERS.spacious,
      delayChildren: ONCE_MOTION_STAGGERS.spacious,
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: ONCE_MOTION_STAGGERS.base,
      staggerDirection: -1,
      when: "afterChildren",
    },
  },
};

const stackItem: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: ONCE_MOTION_SPRINGS.base,
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: { duration: ONCE_MOTION_DURATIONS.quick },
  },
};

const stackItemSoft: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: ONCE_MOTION_SPRINGS.soft,
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.97,
    transition: { duration: ONCE_MOTION_DURATIONS.quick },
  },
};

const stackItemSlow: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...ONCE_MOTION_SPRINGS.base,
      duration: ONCE_MOTION_DURATIONS.slow,
    },
  },
  exit: {
    opacity: 0,
    y: -28,
    scale: 0.94,
    transition: { duration: ONCE_MOTION_DURATIONS.quick },
  },
};

const messageBubble: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.96, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      ...ONCE_MOTION_SPRINGS.soft,
      damping: 26,
      mass: 0.95,
    },
  },
  exit: {
    opacity: 0,
    y: -18,
    scale: 0.96,
    filter: "blur(6px)",
    transition: {
      duration: ONCE_MOTION_DURATIONS.quick,
      ease: ONCE_MOTION_EASING.exit,
    },
  },
};

const button: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.02,
    y: -2,
    transition: ONCE_MOTION_SPRINGS.snappy,
  },
  tap: {
    scale: 0.96,
    transition: { duration: ONCE_MOTION_DURATIONS.instant },
  },
  disabled: { opacity: 0.6, scale: 1 },
};

const primaryButton: Variants = {
  ...button,
  hover: {
    scale: 1.05,
    y: -3,
    transition: ONCE_MOTION_SPRINGS.snappy,
  },
};

const ghostButton: Variants = {
  ...button,
  hover: {
    scale: 1.02,
    transition: ONCE_MOTION_SPRINGS.snappy,
  },
};

const card: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: ONCE_MOTION_SPRINGS.base,
  },
  hover: {
    scale: 1.02,
    y: -5,
    transition: {
      ...ONCE_MOTION_SPRINGS.snappy,
      stiffness: 420,
    },
  },
  tap: {
    scale: 0.96,
    transition: { duration: ONCE_MOTION_DURATIONS.instant },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -20,
    transition: { duration: ONCE_MOTION_DURATIONS.quick },
  },
};

const interactiveCard: Variants = {
  ...card,
  hover: {
    scale: 1.03,
    y: -8,
    rotateX: 1,
    transition: {
      ...ONCE_MOTION_SPRINGS.snappy,
      stiffness: 420,
    },
  },
  tap: {
    scale: 0.98,
    transition: { duration: ONCE_MOTION_DURATIONS.instant },
  },
};

const page: Variants = {
  initial: { opacity: 0, y: 30, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...ONCE_MOTION_SPRINGS.soft,
      duration: 0.8,
    },
  },
  exit: {
    opacity: 0,
    y: -30,
    scale: 0.98,
    transition: { duration: ONCE_MOTION_DURATIONS.slow },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: ONCE_MOTION_STAGGERS.base,
      delayChildren: ONCE_MOTION_STAGGERS.base,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: ONCE_MOTION_STAGGERS.dense,
      staggerDirection: -1,
    },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: ONCE_MOTION_SPRINGS.soft,
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: { duration: ONCE_MOTION_DURATIONS.quick },
  },
};

const modal: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 50 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: ONCE_MOTION_SPRINGS.modal,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: { duration: ONCE_MOTION_DURATIONS.slow },
  },
};

const backdrop: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: ONCE_MOTION_DURATIONS.base },
  },
  exit: {
    opacity: 0,
    transition: { duration: ONCE_MOTION_DURATIONS.base },
  },
};

const nav: Variants = {
  hidden: { y: -20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: ONCE_MOTION_SPRINGS.base,
  },
  exit: {
    y: -20,
    opacity: 0,
    transition: { duration: ONCE_MOTION_DURATIONS.base },
  },
};

const floating: Variants = {
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

const pulse: Variants = {
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

const slidePresets: Variants = {
  slideInFromLeft: { x: -100, opacity: 0 },
  slideInFromRight: { x: 100, opacity: 0 },
  slideInFromTop: { y: -100, opacity: 0 },
  slideInFromBottom: { y: 100, opacity: 0 },
  center: {
    x: 0,
    y: 0,
    opacity: 1,
    transition: ONCE_MOTION_SPRINGS.soft,
  },
  slideOutToLeft: {
    x: -100,
    opacity: 0,
    transition: { duration: ONCE_MOTION_DURATIONS.base },
  },
  slideOutToRight: {
    x: 100,
    opacity: 0,
    transition: { duration: ONCE_MOTION_DURATIONS.base },
  },
  slideOutToTop: {
    y: -100,
    opacity: 0,
    transition: { duration: ONCE_MOTION_DURATIONS.base },
  },
  slideOutToBottom: {
    y: 100,
    opacity: 0,
    transition: { duration: ONCE_MOTION_DURATIONS.base },
  },
};

const tab: Variants = {
  inactive: { scale: 0.95, opacity: 0.7 },
  active: {
    scale: 1,
    opacity: 1,
    transition: ONCE_MOTION_SPRINGS.modal,
  },
  hover: {
    scale: 1.02,
    opacity: 0.9,
    transition: { duration: ONCE_MOTION_DURATIONS.quick },
  },
};

export const onceRevealVariantKeys = [
  "fadeIn",
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "scaleIn",
] as const;

export type OnceRevealVariantKey = (typeof onceRevealVariantKeys)[number];

export const onceMotionVariants = {
  fade: fadeIn,
  fadeIn,
  slideUp,
  slideDown,
  slideLeft,
  slideRight,
  scaleIn,
  stack,
  stackFast,
  stackSlow,
  stackItem,
  stackItemSoft,
  stackItemSlow,
  messageBubble,
  button,
  primaryButton,
  ghostButton,
  badge,
  card,
  interactiveCard,
  page,
  staggerContainer,
  staggerItem,
  modal,
  backdrop,
  nav,
  floating,
  pulse,
  slidePresets,
  tab,
} satisfies Record<string, Variants>;

export type OnceMotionVariantKey = keyof typeof onceMotionVariants;

export const parentVariants = stack;
export const fastParentVariants = stackFast;
export const slowParentVariants = stackSlow;
export const childVariants = stackItem;

export const cardVariants = card;
export const interactiveCardVariants = interactiveCard;
export const pageVariants = page;
export const buttonVariants = button;
export const primaryButtonVariants = primaryButton;
export const ghostButtonVariants = ghostButton;
export const messageBubbleVariants = messageBubble;
export const staggerContainerVariants = staggerContainer;
export const staggerItemVariants = staggerItem;
export const modalVariants = modal;
export const backdropVariants = backdrop;
export const navVariants = nav;
export const floatingVariants = floating;
export const pulseVariants = pulse;
export const slideVariants = slidePresets;
export const tabVariants = tab;

export const createChildVariant = (
  direction: Direction = "up",
  distance = 20,
  springPreset: keyof typeof ONCE_MOTION_SPRINGS = "base"
): Variants => {
  const hiddenPosition: Record<Direction, Partial<Record<"x" | "y", number>>> = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
  };

  const exitPosition: Record<Direction, Partial<Record<"x" | "y", number>>> = {
    up: { y: -distance },
    down: { y: distance },
    left: { x: -distance },
    right: { x: distance },
  };

  return {
    hidden: {
      opacity: 0,
      ...hiddenPosition[direction],
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: ONCE_MOTION_SPRINGS[springPreset],
    },
    exit: {
      opacity: 0,
      ...exitPosition[direction],
      scale: 0.95,
      transition: { duration: ONCE_MOTION_DURATIONS.quick },
    },
  };
};

export default {
  tokens: {
    springs: ONCE_MOTION_SPRINGS,
    durations: ONCE_MOTION_DURATIONS,
    easing: ONCE_MOTION_EASING,
    stagger: ONCE_MOTION_STAGGERS,
  },
  onceMotionVariants,
  cardVariants,
  pageVariants,
  buttonVariants,
  messageBubbleVariants,
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
