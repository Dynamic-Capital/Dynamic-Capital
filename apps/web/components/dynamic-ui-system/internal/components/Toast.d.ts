import React from "react";
interface ToastProps {
  className?: string;
  variant: "success" | "danger";
  icon?: boolean;
  onClose?: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}
declare const Toast: React.ForwardRefExoticComponent<
  ToastProps & React.RefAttributes<HTMLDivElement>
>;
export { Toast };
//# sourceMappingURL=Toast.d.ts.map
