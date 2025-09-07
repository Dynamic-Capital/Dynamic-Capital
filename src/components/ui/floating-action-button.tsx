import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Phone, Mail, ChevronUp } from 'lucide-react';

interface FloatingActionButtonProps {
  variant?: 'primary' | 'contact' | 'chat' | 'scroll-top';
  size?: 'sm' | 'md' | 'lg';
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  tooltip?: string;
}

const getDefaultIcon = (variant: string) => {
  switch (variant) {
    case 'contact': return <Phone className="h-5 w-5" />;
    case 'chat': return <MessageSquare className="h-5 w-5" />;
    case 'scroll-top': return <ChevronUp className="h-5 w-5" />;
    default: return <Plus className="h-5 w-5" />;
  }
};

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  variant = 'primary',
  size = 'md',
  position = 'bottom-right',
  onClick,
  className,
  children,
  icon,
  tooltip
}) => {
  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-14 w-14',
    lg: 'h-16 w-16'
  };

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 transform -translate-x-1/2'
  };

  const variantClasses = {
    primary: 'bg-gradient-brand hover:shadow-2xl hover:shadow-primary/40',
    contact: 'bg-gradient-to-br from-green-500 to-green-600 hover:shadow-2xl hover:shadow-green-500/40',
    chat: 'bg-gradient-to-br from-blue-500 to-blue-600 hover:shadow-2xl hover:shadow-blue-500/40',
    'scroll-top': 'bg-gradient-to-br from-gray-500 to-gray-600 hover:shadow-2xl hover:shadow-gray-500/40'
  };

  return (
    <Button
      onClick={onClick}
      className={cn(
        'fixed z-50 rounded-full shadow-2xl transition-all duration-300',
        'hover:scale-110 active:scale-95 group',
        'border-2 border-white/20 backdrop-blur-sm',
        sizeClasses[size],
        positionClasses[position],
        variantClasses[variant],
        className
      )}
      title={tooltip}
      aria-label={tooltip}
    >
      <div className="relative">
        {children || icon || getDefaultIcon(variant)}
        
        {/* Ripple effect */}
        <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-active:scale-100 transition-transform duration-200" />
        
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </Button>
  );
};

export default FloatingActionButton;