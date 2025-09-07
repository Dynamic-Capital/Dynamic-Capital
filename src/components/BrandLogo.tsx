import React from 'react';
import logoImage from '@/assets/logo.png';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = '', 
  size = 'md', 
  showText = true 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logoImage} 
        alt="Dynamic Capital Logo" 
        className={`${sizeClasses[size]} object-contain`}
      />
      {showText && (
        <span className="font-bold text-xl">Dynamic Capital</span>
      )}
    </div>
  );
};

export default BrandLogo;