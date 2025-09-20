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

export interface NextFontResult {
  className: string;
  variable?: string;
  style: Record<string, string>;
}

function createFont(name: string) {
  const fontFamily = name.replace(/_/g, ' ');

  return function loadFont(options: NextFontOptions = {}): NextFontResult {
    const variable = options.variable;
    const className = variable ? variable.replace(/^--/, '') : `font-${fontFamily.toLowerCase().replace(/\s+/g, '-')}`;

    return {
      className,
      variable,
      style: {
        fontFamily,
        fontDisplay: options.display ?? 'swap',
      },
    };
  };
}

export const Geist = createFont('Geist');
export const Geist_Mono = createFont('Geist_Mono');

