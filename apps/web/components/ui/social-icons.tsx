import React from "react";
import { motion } from "framer-motion";
import { Facebook, Instagram } from "lucide-react";
import { cn } from "@/utils";
import logger from "@/utils/logger";

interface SocialIconProps {
  platform: "instagram" | "facebook" | "tiktok" | "tradingview";
  href: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "glass" | "glow";
}

// Custom TikTok icon since Lucide doesn't have one
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

// Custom TradingView icon
const TradingViewIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.07 18.28c.43-.9 3.05-1.78 4.93-1.78s4.51.88 4.93 1.78c-.71.61-1.63.95-2.63.95H9.7c-1-.01-1.92-.34-2.63-.95zM18.36 16.83c-.74-1.25-3.03-2.05-5.04-2.05H10.68c-2.01 0-4.3.8-5.04 2.05C4.62 15.48 4 13.78 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.78-.62 3.48-1.64 4.83z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const iconMap = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: TikTokIcon,
  tradingview: TradingViewIcon,
};

const brandColors: Record<
  SocialIconProps["platform"],
  {
    default: string;
    hover: string;
    gradient: string;
  }
> = {
  instagram: {
    default:
      "bg-[hsl(var(--brand-instagram))] dark:bg-[hsl(var(--brand-instagram-dark))]",
    hover:
      "hover:bg-[hsl(var(--brand-instagram-hover))] dark:hover:bg-[hsl(var(--brand-instagram-dark-hover))]",
    gradient:
      "from-[hsl(var(--brand-instagram-from))] via-[hsl(var(--brand-instagram-via))] to-[hsl(var(--brand-instagram-to))] dark:from-[hsl(var(--brand-instagram-dark-from))] dark:via-[hsl(var(--brand-instagram-dark-via))] dark:to-[hsl(var(--brand-instagram-dark-to))]",
  },
  facebook: {
    default:
      "bg-[hsl(var(--brand-facebook))] dark:bg-[hsl(var(--brand-facebook-dark))]",
    hover:
      "hover:bg-[hsl(var(--brand-facebook-hover))] dark:hover:bg-[hsl(var(--brand-facebook-dark-hover))]",
    gradient:
      "from-[hsl(var(--brand-facebook-from))] to-[hsl(var(--brand-facebook-to))] dark:from-[hsl(var(--brand-facebook-dark-from))] dark:to-[hsl(var(--brand-facebook-dark-to))]",
  },
  tiktok: {
    default:
      "bg-[hsl(var(--brand-tiktok))] dark:bg-[hsl(var(--brand-tiktok-dark))]",
    hover:
      "hover:bg-[hsl(var(--brand-tiktok-hover))] dark:hover:bg-[hsl(var(--brand-tiktok-dark-hover))]",
    gradient:
      "from-[hsl(var(--brand-tiktok-from))] to-[hsl(var(--brand-tiktok-to))] dark:from-[hsl(var(--brand-tiktok-dark-from))] dark:to-[hsl(var(--brand-tiktok-dark-to))]",
  },
  tradingview: {
    default:
      "bg-[hsl(var(--brand-tradingview))] dark:bg-[hsl(var(--brand-tradingview-dark))]",
    hover:
      "hover:bg-[hsl(var(--brand-tradingview-hover))] dark:hover:bg-[hsl(var(--brand-tradingview-dark-hover))]",
    gradient:
      "from-[hsl(var(--brand-tradingview-from))] to-[hsl(var(--brand-tradingview-to))] dark:from-[hsl(var(--brand-tradingview-dark-from))] dark:to-[hsl(var(--brand-tradingview-dark-to))]",
  },
};

export const SocialIcon: React.FC<SocialIconProps> = ({
  platform,
  href,
  className,
  size = "md",
  variant = "default",
}) => {
  const Icon = iconMap[platform];

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const containerSizeClasses = {
    sm: "w-8 h-8 p-1.5",
    md: "w-10 h-10 p-2",
    lg: "w-12 h-12 p-2.5",
  };

  const baseClasses = cn(
    "inline-flex items-center justify-center rounded-lg transition-all duration-300 group",
    containerSizeClasses[size],
    className,
  );

  const colors = brandColors[platform];

  const variantClasses = {
    default: cn(
      colors.default,
      colors.hover,
      "text-muted-foreground hover:text-foreground",
    ),
    glass:
      "bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white hover:border-white/40",
    glow: cn(
      "bg-gradient-to-r text-white shadow-lg hover:shadow-xl hover:scale-110",
      colors.gradient,
    ),
  };

  const handleClick = () => {
    // Track social media clicks with console log for debugging
    logger.log(`Social media click: ${platform} -> ${href}`);

    // Track with any available analytics
    if (typeof window !== "undefined") {
      // You can integrate with Google Analytics or other analytics here
      try {
        // Example: window.gtag?.('event', 'social_click', { platform, destination: href });
      } catch (error) {
        logger.log("Analytics tracking not available");
      }
    }
  };

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(baseClasses, variantClasses[variant])}
      onClick={handleClick}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      aria-label={`Visit our ${platform} page`}
    >
      <Icon
        className={cn(
          sizeClasses[size],
          "group-hover:scale-110 transition-transform duration-200",
        )}
      />
    </motion.a>
  );
};

interface SocialLinksProps {
  links: Array<{
    platform: "instagram" | "facebook" | "tiktok" | "tradingview";
    href: string;
  }>;
  variant?: "default" | "glass" | "glow";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const SocialLinks: React.FC<SocialLinksProps> = ({
  links,
  variant = "default",
  size = "md",
  className,
}) => {
  return (
    <motion.div
      className={cn("flex items-center gap-3", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, staggerChildren: 0.1 }}
    >
      {links.map((link, index) => (
        <motion.div
          key={link.platform}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          <SocialIcon
            platform={link.platform}
            href={link.href}
            variant={variant}
            size={size}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default SocialLinks;
