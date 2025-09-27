import React, { ReactNode } from "react";
interface Toast {
  id: string;
  variant: "success" | "danger";
  message: ReactNode;
  action?: ReactNode;
}
interface ToastContextProps {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}
export declare const useToast: () => ToastContextProps;
declare const ToastProvider: React.FC<{
  children: ReactNode;
}>;
export { ToastProvider };
//# sourceMappingURL=ToastProvider.d.ts.map
