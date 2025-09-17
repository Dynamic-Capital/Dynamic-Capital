"use client";

import React, { useState, useEffect } from 'react';
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
    const timer = setTimeout(() => {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(interval);
          setIsComplete(true);
          onComplete?.();
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
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
  FloatingWords
};