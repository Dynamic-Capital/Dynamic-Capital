"use client";

import {
  type PointerEvent,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type HTMLMotionProps,
  motion,
  MotionConfigContext,
  type MotionConfigProps,
  type MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

import { cn } from "@/utils";

const transition = {
  type: "spring" as const,
  stiffness: 320,
  damping: 26,
  mass: 0.6,
};

const buttonVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
  press: { scale: 0.98 },
};

const contentVariants = {
  rest: { scale: 1, opacity: 1 },
  hover: { scale: 0.95, opacity: 1 },
  press: { scale: 1.08, opacity: 1 },
};

const shapesVariants = {
  rest: { opacity: 0 },
  hover: { opacity: 1 },
  press: { opacity: 1 },
};

interface MotionPlayButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  label?: string;
}

type TransitionValue = MotionConfigProps["transition"];

interface TransitionProps {
  value?: TransitionValue;
  children: ReactNode;
}

const Transition = ({ value, children }: TransitionProps) => {
  const config = useContext(MotionConfigContext);
  const transition = value ?? config.transition;
  const contextValue = useMemo(
    () => ({ ...config, transition }),
    [config, transition],
  );

  return (
    <MotionConfigContext.Provider value={contextValue}>
      {children}
    </MotionConfigContext.Provider>
  );
};

interface FloatingShapesProps {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  isPress: boolean;
}

function FloatingShapes({ mouseX, mouseY, isPress }: FloatingShapesProps) {
  const springX = useSpring(mouseX, {
    stiffness: 220,
    damping: 30,
    mass: 0.5,
  });
  const springY = useSpring(mouseY, {
    stiffness: 220,
    damping: 30,
    mass: 0.5,
  });

  const pinkTranslateX = useTransform(springX, (value) => value * 0.35);
  const pinkTranslateY = useTransform(springY, (value) => value * 0.35);
  const blueTranslateX = useTransform(springX, (value) => value * -0.3);
  const blueTranslateY = useTransform(springY, (value) => value * -0.3);
  const glowTranslateX = useTransform(springX, (value) => value * 0.18);
  const glowTranslateY = useTransform(springY, (value) => value * 0.18);

  const rotate = useTransform(springX, [-140, 140], [-16, 16]);
  const innerScale = useTransform(
    springY,
    [-120, 120],
    isPress ? [0.92, 1.02] : [0.96, 1.08],
  );
  const outlineOpacity = useTransform(
    springY,
    [-90, 90],
    isPress ? [0.85, 1] : [0.65, 0.95],
  );

  return (
    <div className="absolute inset-0">
      <motion.span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_20%_20%,rgba(244,114,182,0.55),rgba(168,85,247,0.25),transparent_75%)] blur-3xl"
        style={{ translateX: pinkTranslateX, translateY: pinkTranslateY }}
      />
      <motion.span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_80%_25%,rgba(56,189,248,0.55),rgba(14,165,233,0.25),transparent_70%)] blur-[90px]"
        style={{ translateX: blueTranslateX, translateY: blueTranslateY }}
      />
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-3xl bg-gradient-to-br from-white/70 via-white/30 to-white/5 p-3 shadow-[0_16px_45px_rgba(91,233,255,0.45)] backdrop-blur-2xl"
        style={{
          translateX: glowTranslateX,
          translateY: glowTranslateY,
          rotate,
        }}
      >
        <motion.div
          className="relative flex h-full w-full items-center justify-center rounded-2xl bg-[linear-gradient(145deg,rgba(15,23,42,0.85),rgba(30,41,59,0.65))] shadow-inner shadow-slate-950/40"
          style={{ scale: innerScale }}
        >
          <motion.div
            className="absolute inset-0 rounded-2xl border border-white/40"
            style={{ opacity: outlineOpacity }}
          />
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-300/20 via-transparent to-fuchsia-500/15"
            style={{ opacity: outlineOpacity }}
          />
          <motion.svg
            aria-hidden
            viewBox="0 0 24 24"
            className="relative h-9 w-9 fill-white drop-shadow-[0_10px_20px_rgba(56,189,248,0.35)]"
            style={{ scale: isPress ? 0.85 : 0.95 }}
          >
            <motion.path
              d="M8 6.5v11l8-5.5-8-5.5z"
              animate={{ opacity: isPress ? 0.9 : 1 }}
            />
          </motion.svg>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function MotionPlayButton({
  label = "Play",
  className,
  onHoverStart: externalHoverStart,
  onHoverEnd: externalHoverEnd,
  onTapStart: externalTapStart,
  onTapCancel: externalTapCancel,
  onTap: externalTap,
  onPointerMove: externalPointerMove,
  onPointerLeave: externalPointerLeave,
  ...props
}: MotionPlayButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [isHover, setIsHover] = useState(false);
  const [isPress, setIsPress] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const resetMousePosition = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const element = buttonRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    mouseX.set(event.clientX - rect.left - rect.width / 2);
    mouseY.set(event.clientY - rect.top - rect.height / 2);
  };

  return (
    <Transition value={transition}>
      <motion.button
        ref={buttonRef}
        type="button"
        className={cn(
          "group relative inline-flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.9),rgba(15,23,42,0.65))] text-white shadow-[0_24px_60px_rgba(90,225,255,0.35)] backdrop-blur-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
          className,
        )}
        initial="rest"
        animate={isHover ? "hover" : "rest"}
        whileTap="press"
        variants={buttonVariants}
        onHoverStart={(event, info) => {
          resetMousePosition();
          setIsHover(true);
          externalHoverStart?.(event, info);
        }}
        onHoverEnd={(event, info) => {
          resetMousePosition();
          setIsHover(false);
          setIsPress(false);
          externalHoverEnd?.(event, info);
        }}
        onTapStart={(event, info) => {
          setIsPress(true);
          externalTapStart?.(event, info);
        }}
        onTapCancel={(event, info) => {
          setIsPress(false);
          externalTapCancel?.(event, info);
        }}
        onTap={(event, info) => {
          setIsPress(false);
          externalTap?.(event, info);
        }}
        onPointerMove={(event) => {
          handlePointerMove(event);
          externalPointerMove?.(event);
        }}
        onPointerLeave={(event) => {
          setIsHover(false);
          setIsPress(false);
          resetMousePosition();
          externalPointerLeave?.(event);
        }}
        {...props}
      >
        <motion.div
          aria-hidden
          className="absolute inset-0"
          variants={shapesVariants}
        >
          <FloatingShapes mouseX={mouseX} mouseY={mouseY} isPress={isPress} />
        </motion.div>
        <motion.div
          className="relative z-10 flex flex-col items-center gap-1 text-center"
          variants={contentVariants}
        >
          <span className="text-xs uppercase tracking-[0.45em] text-slate-200/80">
            Launch
          </span>
          <span className="text-2xl font-semibold uppercase tracking-[0.35em]">
            {label}
          </span>
        </motion.div>
      </motion.button>
    </Transition>
  );
}
