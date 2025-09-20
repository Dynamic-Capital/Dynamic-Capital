import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { formatPrice } from "./format-price.ts";
// Route-related helpers rely on Node.js modules. Import them directly from
// `./routes.ts` in server-only contexts to avoid bundling Node-specific code in
// client modules.
