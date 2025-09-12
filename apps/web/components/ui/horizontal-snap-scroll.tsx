"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';
import { cardVariants } from '@/lib/motion-variants';

interface HorizontalSnapScrollProps {
  children: React.ReactNode;
  className?: string;
  showArrows?: boolean;
  itemWidth?: string;
  gap?: string;
  autoScroll?: boolean;
  autoScrollInterval?: number;
  pauseOnHover?: boolean;
}

export function HorizontalSnapScroll({ 
  children, 
  className,
  showArrows = true,
  itemWidth = "clamp(280px, 30vw, 350px)",
  gap = "1rem",
  autoScroll = false,
  autoScrollInterval = 3000,
  pauseOnHover = true
}: HorizontalSnapScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  const checkScrollability = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // Auto-scroll functionality
  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;

    const startAutoScroll = () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
      
      autoScrollRef.current = setInterval(() => {
        if (!scrollRef.current || (pauseOnHover && isHovered)) return;
        
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 10; // Small buffer
        
        if (isAtEnd) {
          // Reset to beginning smoothly
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // Calculate proper item width and scroll to next
          const firstItem = scrollRef.current.firstElementChild as HTMLElement;
          if (firstItem) {
            const itemWidth = firstItem.offsetWidth;
            const gap = parseFloat(getComputedStyle(scrollRef.current).gap) || 16;
            const scrollAmount = itemWidth + gap;
            const newScrollLeft = scrollLeft + scrollAmount;
            scrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
          }
        }
      }, autoScrollInterval);
    };

    startAutoScroll();

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    };
  }, [autoScroll, autoScrollInterval, isHovered, pauseOnHover]);

  useEffect(() => {
    checkScrollability();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollability);
      scrollElement.addEventListener('resize', checkScrollability);
      return () => {
        scrollElement.removeEventListener('scroll', checkScrollability);
        scrollElement.removeEventListener('resize', checkScrollability);
      };
    }
  }, [children]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const containerWidth = scrollRef.current.clientWidth;
    // Calculate item width from CSS
    const computedStyle = getComputedStyle(scrollRef.current.firstElementChild as Element);
    const itemWidth = parseFloat(computedStyle.width) || 300;
    const gap = parseFloat(getComputedStyle(scrollRef.current).gap) || 16;
    
    // Scroll by one item plus gap
    const scrollAmount = itemWidth + gap;
    const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    
    scrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scroll('left');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scroll('right');
    }
  };

  return (
    <div 
      className="relative group"
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="region"
      aria-label="Horizontal scroll container"
    >
      {/* Left gradient fade */}
      {showArrows && canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 md:w-12 gradient-fade-left z-10 pointer-events-none" />
      )}
      
      {/* Right gradient fade */}
      {showArrows && canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 md:w-12 gradient-fade-right z-10 pointer-events-none" />
      )}

      {/* Left arrow */}
      {showArrows && canScrollLeft && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 md:group-hover:opacity-90 transition-all duration-300 shadow-lg hover:scale-110 focus:opacity-100"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Right arrow */}
      {showArrows && canScrollRight && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 md:group-hover:opacity-90 transition-all duration-300 shadow-lg hover:scale-110 focus:opacity-100"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className={cn(
          "flex overflow-x-auto scrollbar-hide snap-x snap-mandatory py-3 px-2",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg",
          "scroll-smooth", // Enable smooth scrolling
          className
        )}
        style={{ 
          gap,
          scrollPaddingLeft: '1rem',
          scrollPaddingRight: '1rem'
        }}
        tabIndex={-1}
      >
        {React.Children.map(children, (child, index) => (
          <motion.div 
            key={index}
            className="snap-center flex-none flex items-stretch"
            style={{ 
              width: itemWidth,
              minHeight: 'fit-content'
            }}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            whileTap="tap"
            transition={{ delay: index * 0.1 }}
          >
            <div className="w-full h-full flex">
              {child}
            </div>
          </motion.div>
        ))}
        {/* Add spacer at the end for better scrolling */}
        <div className="flex-none w-4" />
      </div>
    </div>
  );
}