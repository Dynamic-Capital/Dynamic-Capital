import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import { ChevronUp, Mail, MessageCircle, Phone, Plus } from "lucide-react";

interface MobileFloatingActionButtonProps {
  variant?: "add" | "contact" | "chat" | "scroll-top";
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  pulse?: boolean;
  size?: "sm" | "default" | "lg";
}

const getDefaultIcon = (variant: string) => {
  switch (variant) {
    case "add":
      return <Plus className="h-5 w-5" />;
    case "contact":
      return <Phone className="h-5 w-5" />;
    case "chat":
      return <MessageCircle className="h-5 w-5" />;
    case "scroll-top":
      return <ChevronUp className="h-5 w-5" />;
    default:
      return <Plus className="h-5 w-5" />;
  }
};

const positionClasses = {
  "bottom-right": "fixed bottom-4 right-4 safe-area-bottom safe-area-right",
  "bottom-left": "fixed bottom-4 left-4 safe-area-bottom safe-area-left",
  "bottom-center":
    "fixed bottom-4 left-1/2 transform -translate-x-1/2 safe-area-bottom",
};

const sizeClasses = {
  sm: "h-12 w-12",
  default: "h-14 w-14",
  lg: "h-16 w-16",
};

export function MobileFloatingActionButton({
  variant = "add",
  position = "bottom-right",
  onClick,
  className,
  children,
  icon,
  pulse = false,
  size = "default",
}: MobileFloatingActionButtonProps) {
  return (
    <AnimatePresence>
      <motion.div
        className={cn(
          positionClasses[position],
          "z-50 touch-target",
          className,
        )}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
      >
        <Button
          onClick={onClick}
          className={cn(
            sizeClasses[size],
            "rounded-full shadow-lg backdrop-blur-md",
            "bg-primary/90 hover:bg-primary border border-primary/20",
            "text-primary-foreground transition-all duration-300",
            pulse && "animate-pulse",
            "touch-manipulation",
          )}
          size="icon"
        >
          <motion.div
            animate={pulse ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {children || icon || getDefaultIcon(variant)}
          </motion.div>
        </Button>

        {/* Ripple effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20"
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
