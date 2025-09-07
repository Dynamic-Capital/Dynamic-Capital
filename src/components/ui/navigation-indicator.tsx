import React from 'react';
import { cn } from '@/lib/utils';

interface NavigationIndicatorProps {
  isActive?: boolean;
  variant?: 'dot' | 'line' | 'glow';
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const NavigationIndicator: React.FC<NavigationIndicatorProps> = ({
  isActive = false,
  variant = 'line',
  position = 'bottom',
  className
}) => {
  const baseClasses = cn(
    'absolute transition-all duration-300',
    {
      'bottom-0 left-1/2 transform -translate-x-1/2': position === 'bottom',
      'top-0 left-1/2 transform -translate-x-1/2': position === 'top',
      'left-0 top-1/2 transform -translate-y-1/2': position === 'left',
      'right-0 top-1/2 transform -translate-y-1/2': position === 'right',
    },
    className
  );

  if (variant === 'dot') {
    return (
      <div
        className={cn(
          baseClasses,
          'w-1.5 h-1.5 rounded-full bg-primary',
          'opacity-0 scale-0',
          isActive && 'opacity-100 scale-100'
        )}
      />
    );
  }

  if (variant === 'glow') {
    return (
      <div
        className={cn(
          baseClasses,
          'w-8 h-0.5 bg-gradient-brand rounded-full',
          'opacity-0 scale-x-0 origin-center',
          'shadow-lg shadow-primary/50',
          isActive && 'opacity-100 scale-x-100 animate-pulse-glow'
        )}
      />
    );
  }

  // Default line variant
  return (
    <div
      className={cn(
        baseClasses,
        'h-0.5 w-full bg-gradient-brand rounded-full',
        'opacity-0 scale-x-0 origin-center',
        isActive && 'opacity-100 scale-x-100'
      )}
    />
  );
};

export default NavigationIndicator;