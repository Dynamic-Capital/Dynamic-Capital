import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedPromoInputProps {
  onApply: (code: string) => Promise<boolean>;
  isLoading?: boolean;
  appliedPromo?: {
    code: string;
    discount: string;
  } | null;
  onRemove?: () => void;
  className?: string;
}

export function EnhancedPromoInput({ 
  onApply, 
  isLoading = false, 
  appliedPromo, 
  onRemove,
  className 
}: EnhancedPromoInputProps) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"default" | "focus" | "success" | "error">("default");
  const [errorMessage, setErrorMessage] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  const handleSubmit = async () => {
    if (!code.trim()) return;
    
    setState("default");
    try {
      const success = await onApply(code);
      if (success) {
        setState("success");
        setCode("");
      } else {
        setState("error");
        setErrorMessage("Invalid promo code");
        setShakeKey(prev => prev + 1);
      }
    } catch (error) {
      setState("error");
      setErrorMessage("Failed to validate code");
      setShakeKey(prev => prev + 1);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  if (appliedPromo) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 ui-rounded-lg", className)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-subheading font-medium text-green-700 dark:text-green-300">
              {appliedPromo.code} applied
            </span>
            <Badge variant="outline" className="text-green-600 border-green-200">
              {appliedPromo.discount}
            </Badge>
          </div>
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-950/20"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <motion.div
        key={shakeKey}
        animate={state === "error" ? { x: [-4, 4, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="relative"
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              onFocus={() => setState("focus")}
              onBlur={() => setState(state === "error" ? "error" : "default")}
              placeholder="Enter promo code"
              className={cn(
                "w-full min-h-[44px] px-4 py-2 ui-rounded-lg border transition-all duration-200",
                "placeholder:text-muted-foreground font-medium",
                state === "focus" && "border-primary ring-2 ring-primary/20",
                state === "success" && "border-green-500 ring-2 ring-green-500/20",
                state === "error" && "border-red-500 ring-2 ring-red-500/20",
                state === "default" && "border-border hover:border-border/80"
              )}
            />
            <AnimatePresence>
              {code && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!code.trim() || isLoading}
            className="min-h-[44px] px-6"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Apply"
            )}
          </Button>
        </div>
      </motion.div>
      
      <AnimatePresence>
        {state === "error" && errorMessage && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-body-sm text-red-600 dark:text-red-400"
          >
            {errorMessage}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}