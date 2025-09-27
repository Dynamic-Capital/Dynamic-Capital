"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Column, Row, Toast } from ".";
import styles from "./Toaster.module.scss";
const Toaster = ({ toasts, removeToast }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  if (!mounted) {
    return null;
  }
  return createPortal(
    _jsx(Column, {
      zIndex: 10,
      fillWidth: true,
      maxWidth: 32,
      position: "fixed",
      className: styles.toastContainer,
      children: toasts.map((
        toast,
        index,
        array,
      ) => (_jsx(Row, {
        padding: "4",
        fillWidth: true,
        position: "absolute",
        className: styles.toastWrapper,
        style: {
          transformOrigin: "bottom center",
          transform: `scale(${
            1 - (array.length - 1 - index) * 0.05
          }) translateY(${1 - (array.length - 1 - index) * 10}%)`,
          opacity: array.length - 1 - index === 0 ? 1 : 0.9,
        },
        children: _jsx(Toast, {
          className: styles.toastAnimation,
          variant: toast.variant,
          onClose: () => removeToast(toast.id),
          action: toast.action,
          children: toast.message,
        }),
      }, toast.id))),
    }),
    document.body,
  );
};
Toaster.displayName = "Toaster";
export { Toaster };
//# sourceMappingURL=Toaster.js.map
