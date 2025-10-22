import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const loggedTwMergeFailures = new Set<string>();

export function cn(...inputs: ClassValue[]) {
  const classes = clsx(inputs);

  try {
    return twMerge(classes);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const message = error instanceof Error
        ? error.message
        : "Unknown Tailwind merge error";
      const signature = `${message}::${classes}`;

      if (!loggedTwMergeFailures.has(signature)) {
        loggedTwMergeFailures.add(signature);
        console.warn(
          `[cn] Falling back to clsx due to tailwind-merge error: ${message}`,
          {
            classes,
          },
        );
      }
    }

    return classes;
  }
}

export { formatPrice } from "./format-price.ts";
export { normalizeThemePassTokens, validateThemePass } from "./theme-pass.ts";
// Route-related helpers rely on Node.js modules. Import them directly from
// `./routes.ts` in server-only contexts to avoid bundling Node-specific code in
// client modules.
