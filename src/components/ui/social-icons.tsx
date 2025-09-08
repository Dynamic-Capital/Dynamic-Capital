import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import logger from "@/utils/logger";

interface SocialIconProps {
  platform: "instagram" | "facebook" | "tiktok" | "tradingview";
  href: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "glass" | "glow";
}

// Brand SVG icons
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103.389.056.774.123 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044 24 5.417 18.627.044 12 .044S0 5.417 0 12.044c0 5.628 3.874 10.35 9.101 11.647Z"/>
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

const TradingViewIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M15.8654 8.2789c0 1.3541-1.0978 2.4519-2.452 2.4519-1.354 0-2.4519-1.0978-2.4519-2.452 0-1.354 1.0978-2.4518 2.452-2.4518 1.3541 0 2.4519 1.0977 2.4519 2.4519zM9.75 6H0v4.9038h4.8462v7.2692H9.75Zm8.5962 0H24l-5.1058 12.173h-5.6538z"/>
  </svg>
);

const iconMap = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
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
    className
  );

  const colors = brandColors[platform];

  const variantClasses = {
    default: cn(
      colors.default,
      colors.hover,
      "text-muted-foreground hover:text-foreground"
    ),
    glass:
      "bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white hover:border-white/40",
    glow: cn(
      "bg-gradient-to-r text-white shadow-lg hover:shadow-xl hover:scale-110",
      colors.gradient
    ),
  };

  const handleClick = () => {
    // Track social media clicks with console log for debugging
    logger.log(`Social media click: ${platform} -> ${href}`);

    // Track with any available analytics
    if (typeof window !== 'undefined') {
      try {
        // Example: window.gtag?.('event', 'social_click', { platform, destination: href });
      } catch (error) {
        logger.log('Analytics tracking not available');
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
      <Icon className={cn(sizeClasses[size], "group-hover:scale-110 transition-transform duration-200")} />
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
