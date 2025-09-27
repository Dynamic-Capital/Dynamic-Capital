"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useState } from "react";
import { Toaster } from "../components";
const ToastContext = createContext(undefined);
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
const ToastProvider = ({ children }) => {
  // Use the same Toast interface type for the state
  const [toasts, setToasts] = useState([]);
  const addToast = (toast) => {
    const newToast = {
      id: Math.random().toString(36).substring(7),
      ...toast,
    };
    setToasts((prev) => [...prev, newToast]);
  };
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };
  return (_jsxs(ToastContext.Provider, {
    value: {
      toasts,
      addToast,
      removeToast,
    },
    children: [
      children,
      _jsx(Toaster, { toasts: toasts, removeToast: removeToast }),
    ],
  }));
};
ToastProvider.displayName = "ToastProvider";
export { ToastProvider };
//# sourceMappingURL=ToastProvider.js.map
