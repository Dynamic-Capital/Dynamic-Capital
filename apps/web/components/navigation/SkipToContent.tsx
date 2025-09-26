import React from "react";
import { cn } from "@/utils";

export const SkipToContent: React.FC = () => {
  const handleSkip = () => {
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <button
      onClick={handleSkip}
      className={cn(
        "sr-only focus:not-sr-only",
        "fixed top-4 left-4 z-[100]",
        "bg-primary text-primary-foreground",
        "px-4 py-2 rounded-md",
        "font-medium text-sm",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "transition-all duration-200",
      )}
    >
      Skip to main content
    </button>
  );
};

export default SkipToContent;
