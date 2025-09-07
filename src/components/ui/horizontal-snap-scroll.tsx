import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HorizontalSnapScrollProps {
  children: React.ReactNode;
  className?: string;
  showArrows?: boolean;
  itemWidth?: string;
  gap?: string;
}

export function HorizontalSnapScroll({ 
  children, 
  className,
  showArrows = true,
  itemWidth = "clamp(280px, 30vw, 350px)",
  gap = "1rem"
}: HorizontalSnapScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollability = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

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
    const scrollAmount = Math.min(containerWidth * 0.8, 320);
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
          "flex overflow-x-auto scrollbar-hide snap-x py-2 px-1 md:px-2",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg",
          className
        )}
        style={{ gap }}
        tabIndex={-1}
      >
        {React.Children.map(children, (child, index) => (
          <div 
            key={index}
            className="snap-start flex-none animate-fade-in-up hover:scale-[1.02] transition-transform duration-200"
            style={{ 
              width: itemWidth,
              animationDelay: `${index * 100}ms`
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}