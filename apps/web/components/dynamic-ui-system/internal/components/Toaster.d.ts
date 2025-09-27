import React from "react";
interface ToasterProps {
  toasts: {
    id: string;
    variant: "success" | "danger";
    message: React.ReactNode;
    action?: React.ReactNode;
  }[];
  removeToast: (id: string) => void;
}
declare const Toaster: React.FC<ToasterProps>;
export { Toaster };
//# sourceMappingURL=Toaster.d.ts.map
