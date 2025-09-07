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
  itemWidth = "280px",
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
      return () => scrollElement.removeEventListener('scroll', checkScrollability);
    }
  }, [children]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const scrollAmount = parseInt(itemWidth) + parseInt(gap.replace('rem', '') || '1') * 16;
    const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    
    scrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  return (
    <div className="relative group">
      {/* Left gradient fade */}
      {showArrows && canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 gradient-fade-left z-10 pointer-events-none" />
      )}
      
      {/* Right gradient fade */}
      {showArrows && canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 gradient-fade-right z-10 pointer-events-none" />
      )}

      {/* Left arrow */}
      {showArrows && canScrollLeft && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Right arrow */}
      {showArrows && canScrollRight && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className={cn(
          "flex overflow-x-auto scrollbar-hide snap-x py-2",
          className
        )}
        style={{ gap }}
      >
        {React.Children.map(children, (child, index) => (
          <div 
            key={index}
            className="snap-start flex-none animate-fade-in-up"
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