import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/utils";
import { Button } from "@/components/ui/button";
import { ChevronUp, Mail, MessageSquare, Phone, Plus } from "lucide-react";

interface FloatingActionButtonProps {
  variant?: "primary" | "contact" | "chat" | "scroll-top";
  size?: "sm" | "md" | "lg";
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  tooltip?: string;
}

const getDefaultIcon = (variant: string) => {
  switch (variant) {
    case "contact":
      return <Phone className="h-5 w-5" />;
    case "chat":
      return <MessageSquare className="h-5 w-5" />;
    case "scroll-top":
      return <ChevronUp className="h-5 w-5" />;
    default:
      return <Plus className="h-5 w-5" />;
  }
};

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  variant = "primary",
  size = "md",
  position = "bottom-right",
  onClick,
  className,
  children,
  icon,
  tooltip,
}) => {
  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-14 w-14",
    lg: "h-16 w-16",
  };

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "bottom-center": "bottom-6 left-1/2 transform -translate-x-1/2",
  };

  const variantClasses = {
    primary: "bg-gradient-brand hover:shadow-2xl hover:shadow-primary/40",
    contact:
      "bg-gradient-to-br from-green-500 to-green-600 hover:shadow-2xl hover:shadow-green-500/40",
    chat:
      "bg-gradient-to-br from-blue-500 to-blue-600 hover:shadow-2xl hover:shadow-blue-500/40",
    "scroll-top":
      "bg-gradient-to-br from-gray-500 to-gray-600 hover:shadow-2xl hover:shadow-gray-500/40",
  };

  return (
    <motion.div
      className={cn(
        "fixed z-50",
        positionClasses[position],
      )}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 0.2,
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <Button
        onClick={onClick}
        className={cn(
          "rounded-full shadow-2xl transition-all duration-300",
          "border-2 border-white/20 backdrop-blur-sm group relative overflow-hidden",
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        title={tooltip}
        aria-label={tooltip}
      >
        <motion.div
          className="relative z-10"
          whileHover={{ rotate: variant === "primary" ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {children || icon || getDefaultIcon(variant)}
        </motion.div>

        {/* Animated ripple effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-white/20"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />

        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{
            opacity: [0, 1, 0],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </Button>
    </motion.div>
  );
};

export default FloatingActionButton;
