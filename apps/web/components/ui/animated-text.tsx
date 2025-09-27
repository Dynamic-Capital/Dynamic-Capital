"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

interface TypewriterTextProps {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  cursorColor?: string;
  onComplete?: () => void;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  delay = 0,
  speed = 50,
  className = '',
  cursorColor = 'text-primary',
  onComplete
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timer = setTimeout(() => {
      let currentIndex = 0;
      intervalId = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          setIsComplete(true);
          onComplete?.();
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [text, delay, speed, onComplete]);

  return (
    <span className={className}>
      {displayText}
      <motion.span
        className={`inline-block ${cursorColor}`}
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        |
      </motion.span>
    </span>
  );
};

interface StaggeredTextProps {
  text: string;
  delay?: number;
  staggerDelay?: number;
  className?: string;
  wordClassName?: string;
  animationType?: 'fadeUp' | 'scale' | 'rotate' | 'elastic';
}

export const StaggeredText: React.FC<StaggeredTextProps> = ({
  text,
  delay = 0,
  staggerDelay = 0.1,
  className = '',
  wordClassName = '',
  animationType = 'fadeUp'
}) => {
  const words = text.split(' ');

  const animations = {
    fadeUp: {
      initial: { opacity: 0, y: 50 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }
    },
    scale: {
      initial: { opacity: 0, scale: 0.5 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.5, type: 'spring', stiffness: 260, damping: 20 }
    },
    rotate: {
      initial: { opacity: 0, rotate: -10, scale: 0.8 },
      animate: { opacity: 1, rotate: 0, scale: 1 },
      transition: { duration: 0.6, ease: 'easeOut' }
    },
    elastic: {
      initial: { opacity: 0, y: 100, scale: 0.3 },
      animate: { opacity: 1, y: 0, scale: 1 },
      transition: { duration: 0.8, type: 'spring', stiffness: 100, damping: 10 }
    }
  };

  const selectedAnimation = animations[animationType];

  return (
    <motion.div className={className}>
      {words.map((word, index) => (
        <motion.span
          key={index}
          className={`inline-block mr-2 ${wordClassName}`}
          initial={selectedAnimation.initial}
          animate={selectedAnimation.animate}
      transition={{
        ...selectedAnimation.transition,
        delay: delay + index * staggerDelay
      } as any}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

interface GradientTextProps {
  text: string;
  gradient?: string;
  className?: string;
  animate?: boolean;
  animationDuration?: number;
}

export const GradientText: React.FC<GradientTextProps> = ({
  text,
  gradient = 'from-primary via-accent to-accent',
  className = '',
  animate = true,
  animationDuration = 3
}) => {
  return (
    <motion.span
      className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent bg-300% ${className}`}
      animate={animate ? {
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
      } : undefined}
      transition={animate ? {
        duration: animationDuration,
        repeat: Infinity,
        ease: 'linear'
      } : undefined}
      style={{
        backgroundSize: '300% 300%'
      }}
    >
      {text}
    </motion.span>
  );
};

interface MorphingTextProps {
  texts: string[];
  interval?: number;
  className?: string;
  morphDuration?: number;
}

export const MorphingText: React.FC<MorphingTextProps> = ({
  texts,
  interval = 3000,
  className = '',
  morphDuration = 0.5
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % texts.length);
    }, interval);

    return () => clearInterval(timer);
  }, [texts.length, interval]);

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 1.2 }}
          transition={{ duration: morphDuration, ease: 'easeInOut' }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {texts[currentIndex]}
        </motion.span>
      </AnimatePresence>
      {/* Invisible text for layout */}
      <span className="opacity-0 pointer-events-none">
        {texts.reduce((a, b) => a.length > b.length ? a : b)}
      </span>
    </div>
  );
};

interface LetterRevealProps {
  text: string;
  delay?: number;
  duration?: number;
  className?: string;
  letterClassName?: string;
}

export const LetterReveal: React.FC<LetterRevealProps> = ({
  text,
  delay = 0,
  duration = 1.5,
  className = '',
  letterClassName = ''
}) => {
  const letters = text.split('');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: duration / letters.length,
        delayChildren: delay
      }
    }
  };

  const letterVariants = {
    hidden: { 
      opacity: 0, 
      y: 50,
      rotateX: -90,
      scale: 0.5
    },
    visible: { 
      opacity: 1, 
      y: 0,
      rotateX: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.6, -0.05, 0.01, 0.99] as [number, number, number, number]
      }
    }
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          variants={letterVariants}
          className={`inline-block ${letterClassName}`}
          style={{ transformOrigin: 'center bottom' }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </motion.div>
  );
};

const DEFAULT_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*';

type LetterFxSpeed = 'slow' | 'medium' | 'fast';
type LetterFxTrigger = 'instant' | 'hover' | 'inView';

interface LetterFxProps {
  children: React.ReactNode;
  speed?: LetterFxSpeed;
  trigger?: LetterFxTrigger;
  charset?: string;
  className?: string;
  letterClassName?: string;
}

export const LetterFx: React.FC<LetterFxProps> = ({
  children,
  speed = 'medium',
  trigger = 'instant',
  charset = DEFAULT_CHARSET,
  className = '',
  letterClassName = ''
}) => {
  const resolvedText = useMemo(() => {
    return React.Children.toArray(children)
      .map((child) => {
        if (typeof child === 'string' || typeof child === 'number') {
          return String(child);
        }
        return '';
      })
      .join('');
  }, [children]);

  const letters = useMemo(() => resolvedText.split(''), [resolvedText]);
  const [displayText, setDisplayText] = useState<string[]>(letters);
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const intervalsRef = useRef<{
    scramble?: ReturnType<typeof setInterval>;
    reveal?: ReturnType<typeof setInterval>;
  }>({});
  const charsetToUse = charset && charset.length > 0 ? charset : DEFAULT_CHARSET;

  const cleanup = useCallback(() => {
    if (intervalsRef.current.scramble) {
      clearInterval(intervalsRef.current.scramble);
    }
    if (intervalsRef.current.reveal) {
      clearInterval(intervalsRef.current.reveal);
    }
    intervalsRef.current = {};
  }, []);

  const randomChar = useCallback(() => {
    const index = Math.floor(Math.random() * charsetToUse.length);
    return charsetToUse[index];
  }, [charsetToUse]);

  const startAnimation = useCallback(() => {
    if (letters.length === 0) {
      return;
    }

    cleanup();

    let revealIndex = 0;

    setDisplayText(
      letters.map((letter) => (letter === ' ' ? ' ' : randomChar()))
    );

    intervalsRef.current.scramble = setInterval(() => {
      setDisplayText(
        letters.map((letter, index) => {
          if (index < revealIndex) {
            return letter;
          }
          return letter === ' ' ? ' ' : randomChar();
        })
      );
    }, 45);

    const speedMap: Record<LetterFxSpeed, number> = {
      slow: 140,
      medium: 90,
      fast: 60
    };

    intervalsRef.current.reveal = setInterval(() => {
      revealIndex += 1;

      if (revealIndex > letters.length) {
        cleanup();
        setDisplayText(letters);
      }
    }, speedMap[speed]);
  }, [cleanup, letters, randomChar, speed]);

  useEffect(() => {
    setDisplayText(letters);
    if (trigger === 'instant') {
      startAnimation();
    }
    return cleanup;
  }, [letters, trigger, startAnimation, cleanup]);

  useEffect(() => {
    if (trigger !== 'inView') {
      return;
    }

    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startAnimation();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [trigger, startAnimation]);

  const handleHover = useCallback(() => {
    if (trigger === 'hover') {
      startAnimation();
    }
  }, [trigger, startAnimation]);

  const outerClassName = ['relative inline-block', className]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      ref={containerRef}
      className={outerClassName}
      onMouseEnter={handleHover}
      onFocus={handleHover}
      aria-label={resolvedText}
      role="text"
    >
      <span aria-hidden="true" className="inline-flex flex-wrap">
        {displayText.map((character, index) => (
          <span
            key={`${character}-${index}`}
            className={['inline-block', letterClassName].filter(Boolean).join(' ')}
          >
            {character === ' ' ? '\u00A0' : character}
          </span>
        ))}
      </span>
    </span>
  );
};

interface FloatingWordsProps {
  text: string;
  className?: string;
  wordClassName?: string;
  intensity?: 'subtle' | 'medium' | 'strong';
}

export const FloatingWords: React.FC<FloatingWordsProps> = ({
  text,
  className = '',
  wordClassName = '',
  intensity = 'medium'
}) => {
  const words = text.split(' ');
  
  const intensityMap = {
    subtle: { y: [-2, 2], duration: 3 },
    medium: { y: [-5, 5], duration: 2.5 },
    strong: { y: [-10, 10], duration: 2 }
  };

  const settings = intensityMap[intensity];

  return (
    <div className={className}>
      {words.map((word, index) => (
        <motion.span
          key={index}
          className={`inline-block mr-2 ${wordClassName}`}
          animate={{
            y: settings.y,
            rotate: [-1, 1, -1]
          }}
          transition={{
            duration: settings.duration + (index * 0.1),
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
            delay: index * 0.2
          }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
};

export default {
  TypewriterText,
  StaggeredText,
  GradientText,
  MorphingText,
  LetterReveal,
  FloatingWords,
  LetterFx
};
