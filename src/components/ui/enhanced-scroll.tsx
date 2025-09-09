import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';
import { cardVariants, staggerContainerVariants, staggerItemVariants } from '@/lib/motion-variants';

interface EnhancedScrollProps {
  children: React.ReactNode;
  className?: string;
  showArrows?: boolean;
  itemWidth?: string;
  gap?: string;
  autoScroll?: boolean;
  autoScrollInterval?: number;
  pauseOnHover?: boolean;
  parallax?: boolean;
  stagger?: boolean;
  glowEffect?: boolean;
}

export function EnhancedScrollContainer({ 
  children, 
  className,
  showArrows = true,
  itemWidth = "clamp(280px, 30vw, 350px)",
  gap = "1.5rem",
  autoScroll = false,
  autoScrollInterval = 4000,
  pauseOnHover = true,
  parallax = true,
  stagger = true,
  glowEffect = true
}: EnhancedScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  const { scrollX } = useScroll({ container: scrollRef });
  const opacity = useTransform(scrollX, [0, 100], [1, 0.8]);
  const scale = useTransform(scrollX, [0, 100], [1, 0.98]);

  const checkScrollability = useCallback(() => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);

    // Calculate active index based on scroll position
    const itemWidthPx = parseFloat(itemWidth.replace(/[^\d.]/g, '')) || 300;
    const gapPx = parseFloat(gap) * 16 || 24; // Convert rem to px
    const newActiveIndex = Math.round(scrollLeft / (itemWidthPx + gapPx));
    setActiveIndex(newActiveIndex);
  }, [itemWidth, gap]);

  // Enhanced auto-scroll with smooth transitions
  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;

    const startAutoScroll = () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
      
      autoScrollRef.current = setInterval(() => {
        if (!scrollRef.current || (pauseOnHover && isHovered)) return;
        
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 10;
        
        if (isAtEnd) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          const firstItem = scrollRef.current.firstElementChild as HTMLElement;
          if (firstItem) {
            const itemWidth = firstItem.offsetWidth;
            const gap = parseFloat(getComputedStyle(scrollRef.current).gap) || 24;
            const scrollAmount = itemWidth + gap;
            const newScrollLeft = scrollLeft + scrollAmount;
            scrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
          }
        }
      }, autoScrollInterval);
    };

    startAutoScroll();
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [autoScroll, autoScrollInterval, isHovered, pauseOnHover]);

  useEffect(() => {
    checkScrollability();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      return () => {
        scrollElement.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [children, checkScrollability]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const firstItem = scrollRef.current.firstElementChild as HTMLElement;
    if (firstItem) {
      const itemWidth = firstItem.offsetWidth;
      const gap = parseFloat(getComputedStyle(scrollRef.current).gap) || 24;
      const scrollAmount = itemWidth + gap;
      const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      
      scrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    
    const firstItem = scrollRef.current.firstElementChild as HTMLElement;
    if (firstItem) {
      const itemWidth = firstItem.offsetWidth;
      const gap = parseFloat(getComputedStyle(scrollRef.current).gap) || 24;
      const scrollAmount = index * (itemWidth + gap);
      
      scrollRef.current.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <motion.div 
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={parallax ? { opacity, scale } : undefined}
      whileHover={glowEffect ? { 
        boxShadow: "0 0 20px hsl(var(--primary) / 0.3)" 
      } : undefined}
      transition={{ duration: 0.3 }}
    >
      {/* Enhanced gradient fades with glow */}
      <AnimatePresence>
        {showArrows && canScrollLeft && (
          <motion.div 
            className={cn(
              "absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none",
              "bg-gradient-to-r from-background via-background/80 to-transparent",
              glowEffect && "shadow-[-10px_0_20px_hsl(var(--background))]"
            )}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showArrows && canScrollRight && (
          <motion.div 
            className={cn(
              "absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none",
              "bg-gradient-to-l from-background via-background/80 to-transparent",
              glowEffect && "shadow-[10px_0_20px_hsl(var(--background))]"
            )}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* Enhanced navigation arrows */}
      <AnimatePresence>
        {showArrows && canScrollLeft && (
          <motion.div
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20"
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              variant="glass"
              size="icon"
              className="glass-card backdrop-blur-xl shadow-xl border-primary/20 hover:border-primary/40 transition-all duration-300"
              onClick={() => scroll('left')}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showArrows && canScrollRight && (
          <motion.div
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20"
            initial={{ opacity: 0, scale: 0.8, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 10 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              variant="glass"
              size="icon"
              className="glass-card backdrop-blur-xl shadow-xl border-primary/20 hover:border-primary/40 transition-all duration-300"
              onClick={() => scroll('right')}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced scrollable container */}
      <motion.div
        ref={scrollRef}
        className={cn(
          "flex overflow-x-auto scrollbar-hide snap-x snap-mandatory py-4 px-3",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-xl",
          "scroll-smooth",
          className
        )}
        style={{ gap }}
        variants={stagger ? staggerContainerVariants : undefined}
        initial={stagger ? "hidden" : undefined}
        animate={stagger ? "visible" : undefined}
      >
        {React.Children.map(children, (child, index) => (
          <motion.div 
            key={index}
            className="snap-center flex-none flex items-stretch"
            style={{ 
              width: itemWidth,
              minHeight: 'fit-content'
            }}
            variants={stagger ? staggerItemVariants : cardVariants}
            whileHover="hover"
            whileTap="tap"
            custom={index}
          >
            <div className="w-full h-full flex">
              {child}
            </div>
          </motion.div>
        ))}
        <div className="flex-none w-6" />
      </motion.div>

      {/* Progress dots */}
      {React.Children.count(children) > 1 && (
        <motion.div 
          className="flex justify-center gap-2 mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {Array.from({ length: React.Children.count(children) }).map((_, index) => (
            <motion.button
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === activeIndex 
                  ? "bg-primary shadow-[0_0_10px_hsl(var(--primary))]" 
                  : "bg-muted hover:bg-muted-foreground/50"
              )}
              onClick={() => scrollToIndex(index)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 + 0.6 }}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

// Parallax scroll container for content
interface ParallaxScrollProps {
  children: React.ReactNode;
  className?: string;
  offset?: number;
}

export function ParallaxScroll({ children, className, offset = 50 }: ParallaxScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-10%" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ y, opacity }}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}