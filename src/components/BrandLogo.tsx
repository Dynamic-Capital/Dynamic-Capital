import React from 'react';
import logoImage from '@/assets/logo.png';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'default' | 'minimal' | 'brand';
  animated?: boolean;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = '', 
  size = 'md', 
  showText = true,
  variant = 'default',
  animated = false
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const logoClasses = cn(
    sizeClasses[size],
    'object-contain transition-all duration-300',
    animated && 'hover:scale-110 hover:rotate-3',
    variant === 'brand' && 'drop-shadow-lg'
  );

  const containerClasses = cn(
    'flex items-center gap-3 group',
    animated && 'transition-all duration-300',
    className
  );

  const textClasses = cn(
    'font-bold transition-all duration-300',
    textSizeClasses[size],
    variant === 'brand' && 'bg-gradient-brand bg-clip-text text-transparent',
    variant === 'minimal' && 'text-foreground/80',
    variant === 'default' && 'text-foreground',
    animated && 'group-hover:text-primary'
  );

  return (
    <div className={containerClasses}>
      <img 
        src={logoImage} 
        alt="Dynamic Capital Logo" 
        className={logoClasses}
      />
      {showText && (
        <span className={textClasses}>
          Dynamic Capital
        </span>
      )}
    </div>
  );
};

export default BrandLogo;