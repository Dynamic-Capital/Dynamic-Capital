import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost" | "glass";
}

export function ThemeToggle({ className, size = "default", variant = "ghost" }: ThemeToggleProps) {
  const { theme, currentTheme, toggleTheme, isInTelegram } = useTheme();

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="h-4 w-4" />;
    }
    return currentTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (theme === 'system') {
      return `System (${currentTheme})`;
    }
    return currentTheme === 'dark' ? 'Dark mode' : 'Light mode';
  };

  const buttonClass = variant === 'glass' ? 'liquid-glass-button' : '';

  return (
    <Button
      variant={variant === 'glass' ? 'ghost' : variant}
      size={size}
      onClick={toggleTheme}
      className={cn(
        "transition-all duration-300 hover:scale-105",
        buttonClass,
        className
      )}
      aria-label={`Switch theme (currently ${getLabel()})`}
      title={`Switch theme (currently ${getLabel()})`}
    >
      <div className="flex items-center gap-2">
        {getIcon()}
        {size !== "sm" && (
          <span className="text-sm hidden sm:inline">
            {isInTelegram ? (theme === 'system' ? 'Auto' : theme === 'dark' ? 'Dark' : 'Light') : getLabel()}
          </span>
        )}
      </div>
    </Button>
  );
}