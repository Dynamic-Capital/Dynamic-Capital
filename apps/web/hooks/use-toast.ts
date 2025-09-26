import { useState } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive" | "success" | "warning";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = ({ ...props }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...props, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);

    return {
      id,
      dismiss: () => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
    };
  };

  return {
    toast,
    toasts,
    dismiss: (toastId?: string) => {
      if (toastId) {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      } else {
        setToasts([]);
      }
    },
  };
}
