"use client";

import { useEffect } from "react";

// This hook is deprecated in favor of the new useTheme hook
// Keeping it for backward compatibility
export function useThemeSync() {
  useEffect(() => {
    console.warn(
      "useThemeSync is deprecated. Please use useTheme hook instead.",
    );
  }, []);
}
