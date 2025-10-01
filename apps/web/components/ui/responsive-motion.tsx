"use client";

import React from "react";
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import { cn } from "@/utils";
import { useIsMobile } from "@/hooks/useMobile";

interface ResponsiveMotionProps {
  children: React.ReactNode;
  className?: string;
  mobileVariant?: "fade" | "slide" | "scale" | "bounce";
  desktopVariant?: "fade" | "slide" | "scale" | "bounce" | "parallax";
  delay?: number;
  duration?: number;
}

const mobileVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -30 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  bounce: {
    initial: { opacity: 0, y: 30, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -30, scale: 0.9 },
  },
};

const desktopVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, x: -60 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 60 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
  bounce: {
    initial: { opacity: 0, y: 60, scale: 0.8 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -60, scale: 0.8 },
  },
  parallax: {
    initial: { opacity: 0, y: 100, rotateX: -15 },
    animate: { opacity: 1, y: 0, rotateX: 0 },
    exit: { opacity: 0, y: -100, rotateX: 15 },
  },
};

export const ResponsiveMotion: React.FC<ResponsiveMotionProps> = ({
  children,
  className,
  mobileVariant = "fade",
  desktopVariant = "slide",
  delay = 0,
  duration = 0.6,
}) => {
  const isMobile = useIsMobile();
  const variants = isMobile
    ? mobileVariants[mobileVariant]
    : desktopVariants[desktopVariant];

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="initial"
      whileInView="animate"
      exit="exit"
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: isMobile ? duration * 0.8 : duration,
        delay,
        type: "spring",
        stiffness: isMobile ? 300 : 260,
        damping: isMobile ? 25 : 20,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

interface FullscreenAdaptiveProps {
  children: React.ReactNode;
  className?: string;
  fullscreenScale?: number;
  mobileScale?: number;
  tabletScale?: number;
  desktopScale?: number;
}

export const FullscreenAdaptive: React.FC<FullscreenAdaptiveProps> = ({
  children,
  className,
  fullscreenScale = 1.2,
  mobileScale = 0.9,
  tabletScale = 1,
  desktopScale = 1.1,
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const getScale = () => {
    if (isFullscreen) return fullscreenScale;
    if (window.innerWidth < 768) return mobileScale;
    if (window.innerWidth < 1024) return tabletScale;
    return desktopScale;
  };

  return (
    <motion.div
      className={className}
      animate={{
        scale: getScale(),
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 25,
        duration: 0.8,
      }}
    >
      {children}
    </motion.div>
  );
};

interface ParallaxScrollProps {
  children: React.ReactNode;
  className?: string;
  offset?: number;
  speed?: number;
}

export const ParallaxScroll: React.FC<ParallaxScrollProps> = ({
  children,
  className,
  offset = 50,
  speed = 0.5,
}) => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, offset * speed]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [
    1,
    1,
    1,
    0.8,
  ]);

  return (
    <motion.div
      className={className}
      style={{ y, opacity }}
    >
      {children}
    </motion.div>
  );
};

interface ViewportAwareProps {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  triggerOnce?: boolean;
}

export const ViewportAware: React.FC<ViewportAwareProps> = ({
  children,
  className,
  threshold = 0.1,
  triggerOnce = true,
}) => {
  const isMobile = useIsMobile();

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: isMobile ? 20 : 40,
        scale: isMobile ? 0.98 : 0.95,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      viewport={{
        once: triggerOnce,
        amount: threshold,
      }}
      transition={{
        duration: isMobile ? 0.4 : 0.6,
        type: "spring",
        stiffness: isMobile ? 350 : 260,
        damping: isMobile ? 30 : 20,
      }}
    >
      {children}
    </motion.div>
  );
};

interface MultiBreakpointProps {
  children: React.ReactNode;
  className?: string;
  mobile?: any;
  tablet?: any;
  desktop?: any;
  fullscreen?: any;
}

export const MultiBreakpoint: React.FC<MultiBreakpointProps> = ({
  children,
  className,
  mobile = { scale: 0.95, y: 20 },
  tablet = { scale: 1, y: 30 },
  desktop = { scale: 1.02, y: 40 },
  fullscreen = { scale: 1.05, y: 50 },
}) => {
  const [viewport, setViewport] = React.useState("mobile");

  React.useEffect(() => {
    const updateViewport = () => {
      if (document.fullscreenElement) {
        setViewport("fullscreen");
      } else if (window.innerWidth >= 1024) {
        setViewport("desktop");
      } else if (window.innerWidth >= 768) {
        setViewport("tablet");
      } else {
        setViewport("mobile");
      }
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    document.addEventListener("fullscreenchange", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
      document.removeEventListener("fullscreenchange", updateViewport);
    };
  }, []);

  const getVariant = () => {
    switch (viewport) {
      case "fullscreen":
        return fullscreen;
      case "desktop":
        return desktop;
      case "tablet":
        return tablet;
      default:
        return mobile;
    }
  };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...getVariant() }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: viewport === "mobile" ? 0.4 : 0.6,
        type: "spring",
        stiffness: viewport === "mobile" ? 350 : 260,
        damping: viewport === "mobile" ? 30 : 20,
      }}
    >
      {children}
    </motion.div>
  );
};

export default {
  ResponsiveMotion,
  FullscreenAdaptive,
  ParallaxScroll,
  ViewportAware,
  MultiBreakpoint,
};
