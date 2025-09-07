import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost" | "glass";
  floating?: boolean;
  large?: boolean; // For larger icons when floating
}

export function ThemeToggle({ 
  className, 
  size = "default", 
  variant = "ghost", 
  floating = false,
  large = false
}: ThemeToggleProps) {
  const { theme, currentTheme, toggleTheme, isInTelegram } = useTheme();

  const getIcon = () => {
    const iconSize = large || floating ? "h-8 w-8" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
    
    if (theme === 'system') {
      return <Monitor className={iconSize} />;
    }
    return currentTheme === 'dark' ? <Moon className={iconSize} /> : <Sun className={iconSize} />;
  };

  const getLabel = () => {
    if (theme === 'system') {
      return `System (${currentTheme})`;
    }
    return currentTheme === 'dark' ? 'Dark mode' : 'Light mode';
  };

  const buttonClass = variant === 'glass' ? 'liquid-glass-button' : '';
  
  const floatingClasses = floating 
    ? "fixed bottom-6 right-6 z-50 shadow-2xl border-2 border-primary/20 bg-background/90 backdrop-blur-xl hover:bg-background hover:shadow-primary/30 hover:border-primary/40" 
    : "";

  return (
    <Button
      variant={variant === 'glass' ? 'ghost' : variant}
      size={size}
      onClick={toggleTheme}
      className={cn(
        "transition-all duration-300 hover:scale-110",
        buttonClass,
        floatingClasses,
        className
      )}
      aria-label={`Switch theme (currently ${getLabel()})`}
      title={`Switch theme (currently ${getLabel()})`}
    >
      <div className="flex items-center gap-2">
        {getIcon()}
        {size !== "sm" && !floating && (
          <span className="text-sm hidden sm:inline font-medium">
            {isInTelegram ? (theme === 'system' ? 'Auto' : theme === 'dark' ? 'Dark' : 'Light') : getLabel()}
          </span>
        )}
      </div>
    </Button>
  );
}