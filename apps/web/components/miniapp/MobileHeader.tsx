import React from "react";
import { motion } from "framer-motion";
import { Bell, Menu, Settings } from "lucide-react";
import { TouchFeedback } from "@/components/ui/mobile-gestures";

interface MobileHeaderProps {
  title: string;
  showBackButton?: boolean;
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showBackButton = false,
  onMenuClick,
  onNotificationClick,
  onSettingsClick,
}) => {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-pt"
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side */}
        <div className="flex items-center space-x-3">
          {showBackButton && (
            <TouchFeedback onClick={onMenuClick}>
              <motion.div
                className="p-2 rounded-full bg-muted/50"
                whileTap={{ scale: 0.9 }}
              >
                <Menu size={20} />
              </motion.div>
            </TouchFeedback>
          )}

          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent"
          >
            {title}
          </motion.h1>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2">
          <TouchFeedback onClick={onNotificationClick}>
            <motion.div
              className="relative p-2 rounded-full bg-muted/50"
              whileTap={{ scale: 0.9 }}
            >
              <Bell size={20} />
              {/* Notification badge */}
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              />
            </motion.div>
          </TouchFeedback>

          <TouchFeedback onClick={onSettingsClick}>
            <motion.div
              className="p-2 rounded-full bg-muted/50"
              whileTap={{ scale: 0.9 }}
              whileHover={{ rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              <Settings size={20} />
            </motion.div>
          </TouchFeedback>
        </div>
      </div>
    </motion.header>
  );
};
