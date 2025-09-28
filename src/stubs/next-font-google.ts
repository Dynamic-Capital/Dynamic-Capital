export interface NextFontOptions {
  subsets?: string[];
  weight?: string | string[];
  style?: string;
  display?: string;
  variable?: string;
  preload?: boolean;
  adjustFontFallback?: boolean;
  fallback?: string[];
}

export interface NextFontStyle {
  fontFamily: string;
  fontWeight?: number;
  fontStyle?: string;
}

export interface NextFontResult {
  className: string;
  variable: string;
  style: NextFontStyle;
}

function createFont(name: string) {
  const fontFamily = name.replace(/_/g, " ");

  return function loadFont(options: NextFontOptions = {}): NextFontResult {
    const variable = options.variable ?? `--font-${fontFamily.toLowerCase()}`;
    const className = variable.replace(/^--/, "");

    return {
      className,
      variable,
      style: {
        fontFamily,
        fontStyle: options.style,
      },
    };
  };
}

export const Geist = createFont("Geist");
export const Geist_Mono = createFont("Geist_Mono");
