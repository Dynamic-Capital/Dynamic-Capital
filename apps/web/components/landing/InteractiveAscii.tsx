"use client";

import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMotionValue, useReducedMotion, useSpring } from "framer-motion";

const characterSets = {
  detailed:
    "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'.",
  standard: "@%#*+=-:",
  blocks: "█▓▒░ ",
  binary: "01",
  hex: "0123456789ABCDEF",
} as const;

const DEFAULT_IMAGE =
  "https://framerusercontent.com/images/rMjuVOUhT39Hdz1kbwue16ZOySE.png";

const DEFAULT_FONT: CSSProperties = {
  fontFamily: '"DM Mono", "Fira Code", monospace',
  fontSize: "12px",
  fontWeight: 400,
  letterSpacing: "0em",
  lineHeight: "1em",
};

const fontAspectRatioCache = new Map<string, number>();

function normalizeFontProperties(font: CSSProperties | undefined) {
  const appliedFont: CSSProperties = { ...DEFAULT_FONT, ...font };

  const fontFamily = appliedFont.fontFamily ?? "monospace";
  const fontWeight = String(appliedFont.fontWeight ?? 400);
  const fontSize = typeof appliedFont.fontSize === "number"
    ? `${appliedFont.fontSize}px`
    : appliedFont.fontSize ?? "12px";
  const lineHeight = typeof appliedFont.lineHeight === "number"
    ? `${appliedFont.lineHeight}px`
    : (appliedFont.lineHeight as string | undefined) ?? "1em";
  const letterSpacing = typeof appliedFont.letterSpacing === "number"
    ? `${appliedFont.letterSpacing}px`
    : (appliedFont.letterSpacing as string | undefined) ?? "0em";

  return {
    fontFamily,
    fontWeight,
    fontSize,
    lineHeight,
    letterSpacing,
  } as const;
}

type CharacterSetKey = keyof typeof characterSets | "custom";

type DitheringMode = "none" | "floyd" | "atkinson" | "noise" | "ordered";

type WhiteMode = "keep" | "ignore";

type CursorStyle = "gradient" | "circle" | "image";

interface CursorConfig {
  style?: CursorStyle;
  width?: number;
  invert?: boolean;
  smoothing?: number;
  imageSrc?: string;
}

interface GlowConfig {
  blur: number;
  opacity: number;
}

interface StaticEffectConfig {
  interval: number;
}

interface ColorConfig {
  mode?: "color" | "gradient" | "glow";
  color?: string;
  color1?: string;
  color1Point?: number;
  color2?: string;
  color2Point?: number;
  threshold?: number;
}

export interface InteractiveAsciiProps {
  imageSrc?: string;
  imageAlt?: string;
  backgroundColor?: string;
  color?: ColorConfig;
  cursor?: CursorConfig;
  glow?: GlowConfig;
  staticEffect?: StaticEffectConfig;
  outputWidth?: number;
  characterSet?: CharacterSetKey;
  customCharacterSet?: string;
  ditheringMode?: DitheringMode;
  invertColors?: boolean;
  whiteMode?: WhiteMode;
  blur?: number;
  brightness?: number;
  contrast?: number;
  font?: CSSProperties;
  sizing?: "fit" | "fill";
  style?: CSSProperties;
  className?: string;
}

interface GenerateProps {
  outputWidth: number;
  ditheringMode: DitheringMode;
  characterSet: CharacterSetKey;
  customCharacterSet?: string;
  invertColors: boolean;
  whiteMode: WhiteMode;
  brightness: number;
  contrast: number;
  blur: number;
  font: CSSProperties;
  cursorConfig: CursorConfig;
}

type RGBA = { r: number; g: number; b: number; a: number };

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const mapRange = (
  value: number,
  fromLow: number,
  fromHigh: number,
  toLow: number,
  toHigh: number,
) => {
  if (fromLow === fromHigh) {
    return toLow;
  }
  const percentage = (value - fromLow) / (fromHigh - fromLow);
  return toLow + percentage * (toHigh - toLow);
};

function measureFontAspectRatio(font: CSSProperties | undefined) {
  const normalized = normalizeFontProperties(font);
  const cacheKey = JSON.stringify(normalized);
  const cachedRatio = fontAspectRatioCache.get(cacheKey);
  if (cachedRatio !== undefined) {
    return cachedRatio;
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    return 1;
  }

  const temp = document.createElement("div");
  temp.style.position = "absolute";
  temp.style.visibility = "hidden";
  temp.style.whiteSpace = "nowrap";
  temp.style.fontFamily = normalized.fontFamily;
  temp.style.fontWeight = normalized.fontWeight;
  temp.style.fontSize = normalized.fontSize;
  temp.style.lineHeight = normalized.lineHeight;
  temp.style.letterSpacing = normalized.letterSpacing;
  temp.textContent = "W";
  document.body.appendChild(temp);
  const width = temp.offsetWidth || 1;
  const height = temp.offsetHeight || 1;
  document.body.removeChild(temp);
  const ratio = width / height;
  fontAspectRatioCache.set(cacheKey, ratio);
  return ratio;
}

function parseColor(color: string | undefined): RGBA {
  if (!color) {
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  const trimmed = color.trim();
  const hexMatch = trimmed.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    let value = hexMatch[1];
    if (value.length === 3 || value.length === 4) {
      value = value
        .split("")
        .map((char) => char + char)
        .join("");
    }
    const hasAlpha = value.length === 8;
    const r = parseInt(value.substring(0, 2), 16);
    const g = parseInt(value.substring(2, 4), 16);
    const b = parseInt(value.substring(4, 6), 16);
    const a = hasAlpha ? parseInt(value.substring(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d*\.?\d+))?\s*\)$/i,
  );
  if (rgbaMatch) {
    return {
      r: clamp(parseInt(rgbaMatch[1], 10), 0, 255),
      g: clamp(parseInt(rgbaMatch[2], 10), 0, 255),
      b: clamp(parseInt(rgbaMatch[3], 10), 0, 255),
      a: rgbaMatch[4] ? clamp(parseFloat(rgbaMatch[4]), 0, 1) : 1,
    };
  }

  // Fallback to white
  return { r: 255, g: 255, b: 255, a: 1 };
}

function interpolateColor(
  color1: RGBA,
  color2: RGBA,
  percentage: number,
): RGBA {
  const t = clamp(percentage, 0, 1);
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * t),
    g: Math.round(color1.g + (color2.g - color1.g) * t),
    b: Math.round(color1.b + (color2.b - color1.b) * t),
    a: color1.a + (color2.a - color1.a) * t,
  };
}

function createMaskLookup(color: ColorConfig | undefined) {
  if (!color?.mode || color.mode === "color") {
    return undefined;
  }

  const isGradientMode = color.mode === "gradient";
  const color1 = parseColor(color.color1 ?? "#ffffff");
  const color2 = parseColor(color.color2 ?? "#00f0ff");
  const transparentGlow = isGradientMode ? undefined : { ...color2, a: 0 };
  const point1 = clamp(
    (isGradientMode ? color.color1Point ?? 0 : color.threshold ?? 50) / 100,
    0,
    1,
  );
  const point2 = clamp(
    (isGradientMode ? color.color2Point ?? 100 : 100) / 100,
    0,
    1,
  );
  const minPoint = Math.min(point1, point2);
  const maxPoint = Math.max(point1, point2);
  const lookup = new Uint8ClampedArray(256 * 4);

  for (let value = 0; value < 256; value++) {
    const gray = value / 255;
    let percent: number;
    if (point1 === point2) {
      percent = gray < point1 ? 0 : 1;
    } else {
      percent = clamp(mapRange(gray, minPoint, maxPoint, 0, 1), 0, 1);
    }

    const interpolated = percent <= point1
      ? color1
      : percent >= point2
      ? color2
      : isGradientMode
      ? interpolateColor(color1, color2, percent)
      : interpolateColor(color2, transparentGlow!, percent);

    const idx = value * 4;
    lookup[idx] = interpolated.r;
    lookup[idx + 1] = interpolated.g;
    lookup[idx + 2] = interpolated.b;
    lookup[idx + 3] = Math.round((interpolated.a ?? 1) * 255);
  }

  return lookup;
}

class SeededRandom {
  seed: number;

  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) {
      this.seed += 2147483646;
    }
  }

  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

function useFollowCursor(
  smoothing = 0,
  containerRef: React.RefObject<HTMLElement | null>,
) {
  const movementTransition = useMemo(
    () => ({ damping: 100, stiffness: mapRange(smoothing, 0, 100, 2000, 50) }),
    [smoothing],
  );

  const hasSpring = smoothing !== 0;
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, movementTransition);
  const springY = useSpring(mouseY, movementTransition);
  const initializedRef = useRef(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = "touches" in event
        ? event.touches[0]?.clientX
        : event.clientX;
      const clientY = "touches" in event
        ? event.touches[0]?.clientY
        : event.clientY;
      if (typeof clientX !== "number" || typeof clientY !== "number") return;
      const x = (clientX - rect.left) / (rect.width || 1);
      const y = (clientY - rect.top) / (rect.height || 1);
      mouseX.set(clamp(x, 0, 1));
      mouseY.set(clamp(y, 0, 1));
      if (!initializedRef.current) {
        springX.jump(mouseX.get());
        springY.jump(mouseY.get());
        initializedRef.current = true;
        setInitialized(true);
      }
    };

    const handlePointerLeave = () => {
      if (!initializedRef.current) return;
      // ease back to center when pointer leaves
      mouseX.set(0.5);
      mouseY.set(0.5);
    };

    const container = containerRef.current;
    container?.addEventListener("mousemove", handlePointerMove);
    container?.addEventListener("touchmove", handlePointerMove, {
      passive: true,
    });
    container?.addEventListener("mouseleave", handlePointerLeave);

    return () => {
      container?.removeEventListener("mousemove", handlePointerMove);
      container?.removeEventListener("touchmove", handlePointerMove);
      container?.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, [containerRef, mouseX, mouseY, springX, springY]);

  return {
    x: hasSpring ? springX : mouseX,
    y: hasSpring ? springY : mouseY,
    initialized,
    initializedRef,
  } as const;
}

function generateGrayValues(
  img: HTMLImageElement,
  props: GenerateProps,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cursorX: number,
  cursorY: number,
  cursorInitialized: boolean,
  font: CSSProperties,
  cursorImage?: HTMLImageElement,
) {
  const {
    cursorConfig,
    outputWidth,
    brightness,
    contrast,
    blur,
    invertColors,
  } = props;

  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const fontAspectRatio = measureFontAspectRatio(font);
  const asciiHeight = Math.round(
    (img.height / img.width) * outputWidth * fontAspectRatio,
  );
  canvas.width = outputWidth;
  canvas.height = asciiHeight;
  ctx.filter = blur > 0 ? `blur(${blur}px)` : "none";
  ctx.drawImage(img, 0, 0, outputWidth, asciiHeight);

  if (cursorConfig.width && cursorInitialized) {
    const mappedX = cursorX * outputWidth;
    const mappedY = cursorY * (asciiHeight / fontAspectRatio);
    ctx.save();
    ctx.scale(1, fontAspectRatio);
    const radius = cursorConfig.width / 2;
    if (cursorConfig.style === "gradient") {
      const gradient = ctx.createRadialGradient(
        mappedX,
        mappedY,
        0,
        mappedX,
        mappedY,
        radius,
      );
      if (cursorConfig.invert) {
        gradient.addColorStop(0, "rgba(255,255,255,1)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
      } else {
        gradient.addColorStop(0, "rgba(0,0,0,1)");
        gradient.addColorStop(1, "rgba(0,0,0,0)");
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, outputWidth, asciiHeight / fontAspectRatio);
    } else if (cursorConfig.style === "circle") {
      ctx.fillStyle = cursorConfig.invert
        ? "rgba(255,255,255,1)"
        : "rgba(0,0,0,1)";
      ctx.beginPath();
      ctx.arc(mappedX, mappedY, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (cursorConfig.style === "image" && cursorImage) {
      const cursorHeight = (cursorImage.height / cursorImage.width) *
        cursorConfig.width;
      ctx.save();
      if (cursorConfig.invert) {
        ctx.filter = `${
          ctx.filter === "none" ? "" : `${ctx.filter} `
        }invert(1)`;
      }
      ctx.drawImage(
        cursorImage,
        mappedX - cursorConfig.width / 2,
        mappedY - cursorHeight / 2,
        cursorConfig.width,
        cursorHeight,
      );
      ctx.restore();
    }
    ctx.restore();
  }

  const imageData = ctx.getImageData(0, 0, outputWidth, asciiHeight);
  const data = imageData.data;
  const gray: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    let lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (invertColors) {
      lum = 255 - lum;
    }
    const adjusted = clamp(
      contrastFactor * (lum - 128) + 128 + brightness,
      0,
      255,
    );
    gray.push(adjusted);
  }

  return { gray, asciiHeight };
}

function generateAscii(
  img: HTMLImageElement,
  props: GenerateProps,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cursorX: number,
  cursorY: number,
  cursorInitialized: boolean,
  font: CSSProperties,
  cursorImage: HTMLImageElement | undefined,
  rngSeed: number,
) {
  const gradient = props.characterSet === "custom"
    ? props.customCharacterSet || "0 "
    : characterSets[props.characterSet];
  const levels = Math.max(gradient.length, 1);
  const levelChars = Array.from(gradient);
  const { gray: grayOriginal, asciiHeight } = generateGrayValues(
    img,
    props,
    canvas,
    ctx,
    cursorX,
    cursorY,
    cursorInitialized,
    font,
    cursorImage,
  );

  const gray = [...grayOriginal];
  const ignoreWhite = props.whiteMode === "ignore";
  const asciiRows = new Array<string>(asciiHeight);

  const canDiffuse = levels > 1;
  const levelsMinusOne = Math.max(levels - 1, 1);
  const levelToChar = (level: number) =>
    levelChars[level] ?? levelChars[0] ?? " ";
  const toLevel = (value: number) =>
    canDiffuse ? Math.round((clamp(value, 0, 255) / 255) * levelsMinusOne) : 0;
  const levelToPixel = (level: number) =>
    canDiffuse ? (level / levelsMinusOne) * 255 : 0;

  if (props.ditheringMode === "floyd" && canDiffuse) {
    for (let y = 0; y < asciiHeight; y++) {
      const rowChars = new Array<string>(props.outputWidth);
      for (let x = 0; x < props.outputWidth; x++) {
        const idx = y * props.outputWidth + x;
        if (ignoreWhite && grayOriginal[idx] === 255) {
          rowChars[x] = " ";
          continue;
        }
        const level = toLevel(gray[idx]);
        rowChars[x] = levelToChar(level);
        const newPixel = levelToPixel(level);
        const error = gray[idx] - newPixel;
        if (x + 1 < props.outputWidth) {
          gray[idx + 1] = clamp(gray[idx + 1] + (error * 7) / 16, 0, 255);
        }
        if (x - 1 >= 0 && y + 1 < asciiHeight) {
          gray[idx - 1 + props.outputWidth] = clamp(
            gray[idx - 1 + props.outputWidth] + (error * 3) / 16,
            0,
            255,
          );
        }
        if (y + 1 < asciiHeight) {
          gray[idx + props.outputWidth] = clamp(
            gray[idx + props.outputWidth] + (error * 5) / 16,
            0,
            255,
          );
        }
        if (x + 1 < props.outputWidth && y + 1 < asciiHeight) {
          gray[idx + props.outputWidth + 1] = clamp(
            gray[idx + props.outputWidth + 1] + error / 16,
            0,
            255,
          );
        }
      }
      asciiRows[y] = rowChars.join("");
    }
  } else if (props.ditheringMode === "atkinson" && canDiffuse) {
    for (let y = 0; y < asciiHeight; y++) {
      const rowChars = new Array<string>(props.outputWidth);
      for (let x = 0; x < props.outputWidth; x++) {
        const idx = y * props.outputWidth + x;
        if (ignoreWhite && grayOriginal[idx] === 255) {
          rowChars[x] = " ";
          continue;
        }
        const level = toLevel(gray[idx]);
        rowChars[x] = levelToChar(level);
        const newPixel = levelToPixel(level);
        const error = gray[idx] - newPixel;
        const diffusion = error / 8;
        if (x + 1 < props.outputWidth) {
          gray[idx + 1] = clamp(gray[idx + 1] + diffusion, 0, 255);
        }
        if (x + 2 < props.outputWidth) {
          gray[idx + 2] = clamp(gray[idx + 2] + diffusion, 0, 255);
        }
        if (y + 1 < asciiHeight) {
          if (x - 1 >= 0) {
            gray[idx - 1 + props.outputWidth] = clamp(
              gray[idx - 1 + props.outputWidth] + diffusion,
              0,
              255,
            );
          }
          gray[idx + props.outputWidth] = clamp(
            gray[idx + props.outputWidth] + diffusion,
            0,
            255,
          );
          if (x + 1 < props.outputWidth) {
            gray[idx + props.outputWidth + 1] = clamp(
              gray[idx + props.outputWidth + 1] + diffusion,
              0,
              255,
            );
          }
        }
        if (y + 2 < asciiHeight) {
          gray[idx + 2 * props.outputWidth] = clamp(
            gray[idx + 2 * props.outputWidth] + diffusion,
            0,
            255,
          );
        }
      }
      asciiRows[y] = rowChars.join("");
    }
  } else if (props.ditheringMode === "noise") {
    const rng = new SeededRandom(rngSeed);
    for (let y = 0; y < asciiHeight; y++) {
      const rowChars = new Array<string>(props.outputWidth);
      for (let x = 0; x < props.outputWidth; x++) {
        const idx = y * props.outputWidth + x;
        if (ignoreWhite && grayOriginal[idx] === 255) {
          rowChars[x] = " ";
          continue;
        }
        const noise = (rng.next() - 0.4) * (255 / levels);
        const noisyValue = clamp(gray[idx] + noise, 0, 255);
        const level = toLevel(noisyValue);
        rowChars[x] = levelToChar(level);
      }
      asciiRows[y] = rowChars.join("");
    }
  } else if (props.ditheringMode === "ordered" && canDiffuse) {
    const bayer = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ] as const;
    const matrixSize = 4;
    for (let y = 0; y < asciiHeight; y++) {
      const rowChars = new Array<string>(props.outputWidth);
      for (let x = 0; x < props.outputWidth; x++) {
        const idx = y * props.outputWidth + x;
        if (ignoreWhite && grayOriginal[idx] === 255) {
          rowChars[x] = " ";
          continue;
        }
        const p = gray[idx] / 255;
        const t = (bayer[y % matrixSize][x % matrixSize] + 0.5) /
          (matrixSize * matrixSize);
        let valueWithDither = p + t - 0.5;
        valueWithDither = Math.min(Math.max(valueWithDither, 0), 1);
        let level = Math.floor(valueWithDither * levels);
        if (level >= levels) level = levels - 1;
        rowChars[x] = levelToChar(level);
      }
      asciiRows[y] = rowChars.join("");
    }
  } else {
    for (let y = 0; y < asciiHeight; y++) {
      const rowChars = new Array<string>(props.outputWidth);
      for (let x = 0; x < props.outputWidth; x++) {
        const idx = y * props.outputWidth + x;
        if (ignoreWhite && grayOriginal[idx] === 255) {
          rowChars[x] = " ";
          continue;
        }
        const level = toLevel(gray[idx]);
        rowChars[x] = levelToChar(level);
      }
      asciiRows[y] = rowChars.join("");
    }
  }

  const ascii = asciiRows.length > 0 ? `${asciiRows.join("\n")}\n` : "";
  return { ascii, grayValues: grayOriginal, asciiHeight };
}

function useResizeObserver(
  elementRef: React.RefObject<HTMLElement | null>,
  callback: () => void,
) {
  useEffect(() => {
    if (!elementRef.current) return;
    const observer = new ResizeObserver(() => callback());
    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [elementRef, callback]);
}

export function InteractiveAscii({
  imageSrc = DEFAULT_IMAGE,
  imageAlt,
  backgroundColor = "#000",
  color = {
    mode: "gradient",
    color1: "#ffffff",
    color1Point: 0,
    color2: "#00f0ff",
    color2Point: 100,
  },
  cursor = {
    style: "gradient",
    width: 24,
    invert: false,
    smoothing: 40,
  },
  glow,
  staticEffect,
  outputWidth = 120,
  characterSet = "detailed",
  customCharacterSet,
  ditheringMode = "none",
  invertColors = false,
  whiteMode = "ignore",
  blur = 0,
  brightness = 0,
  contrast = 0,
  font,
  sizing = "fit",
  style,
  className,
}: InteractiveAsciiProps) {
  const [text, setText] = useState("");
  const [maskUrl, setMaskUrl] = useState<string | undefined>(undefined);
  const maskObjectUrlRef = useRef<string | undefined>(undefined);
  const maskGenerationRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [image, setImage] = useState<HTMLImageElement>();
  const [cursorImage, setCursorImage] = useState<HTMLImageElement>();
  const rngSeedRef = useRef(Math.random());
  const frameRef = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isInView, setIsInView] = useState<boolean>(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState<boolean>(true);

  const { x: cursorX, y: cursorY, initialized, initializedRef } =
    useFollowCursor(
      cursor?.smoothing ?? 0,
      containerRef,
    );

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = imageSrc;
    return () => {
      img.onload = null;
    };
  }, [imageSrc]);

  useEffect(() => {
    if (cursor?.style === "image" && cursor?.imageSrc) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setCursorImage(img);
      img.src = cursor.imageSrc;
      return () => {
        img.onload = null;
      };
    }
    setCursorImage(undefined);
    return undefined;
  }, [cursor?.imageSrc, cursor?.style]);

  useEffect(() => () => {
    if (maskObjectUrlRef.current) {
      URL.revokeObjectURL(maskObjectUrlRef.current);
      maskObjectUrlRef.current = undefined;
    }
  }, []);

  const maskLookup = useMemo(
    () => createMaskLookup(color),
    [
      color?.mode,
      color?.color1,
      color?.color1Point,
      color?.color2,
      color?.color2Point,
      color?.threshold,
    ],
  );

  const generate = useCallback(() => {
    if (!image) return;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    if (!ctxRef.current) {
      ctxRef.current = canvasRef.current.getContext("2d", {
        willReadFrequently: true,
      });
    }
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement("canvas");
    }
    if (!maskCtxRef.current) {
      maskCtxRef.current = maskCanvasRef.current.getContext("2d", {
        willReadFrequently: true,
      });
    }

    const ctx = ctxRef.current;
    const maskCtx = maskCtxRef.current;
    if (!ctx || !maskCtx) return;

    const props: GenerateProps = {
      outputWidth,
      ditheringMode,
      characterSet,
      customCharacterSet,
      invertColors,
      whiteMode,
      brightness,
      contrast,
      blur,
      font: { ...DEFAULT_FONT, ...font },
      cursorConfig: cursor ?? {},
    };

    const { ascii, grayValues, asciiHeight } = generateAscii(
      image,
      props,
      canvasRef.current,
      ctx,
      cursorX.get(),
      cursorY.get(),
      initializedRef.current,
      props.font,
      cursorImage,
      rngSeedRef.current,
    );
    setText(ascii);

    if (maskLookup) {
      const asciiWidth = outputWidth;
      maskCanvasRef.current.width = asciiWidth;
      maskCanvasRef.current.height = asciiHeight;
      const imageData = maskCtx.createImageData(asciiWidth, asciiHeight);
      for (let i = 0; i < grayValues.length; i++) {
        const value = Math.round(clamp(grayValues[i], 0, 255));
        const lookupIdx = value * 4;
        const idx = i * 4;
        imageData.data[idx] = maskLookup[lookupIdx];
        imageData.data[idx + 1] = maskLookup[lookupIdx + 1];
        imageData.data[idx + 2] = maskLookup[lookupIdx + 2];
        imageData.data[idx + 3] = maskLookup[lookupIdx + 3];
      }
      maskCtx.putImageData(imageData, 0, 0);
      const generationId = ++maskGenerationRef.current;
      const canvas = maskCanvasRef.current;
      const toBlob = canvas.toBlob?.bind(canvas);
      if (toBlob) {
        toBlob((blob) => {
          if (!blob || generationId !== maskGenerationRef.current) {
            return;
          }
          const nextUrl = URL.createObjectURL(blob);
          if (maskObjectUrlRef.current) {
            URL.revokeObjectURL(maskObjectUrlRef.current);
          }
          maskObjectUrlRef.current = nextUrl;
          setMaskUrl(nextUrl);
        }, "image/png");
      } else {
        const nextUrl = canvas.toDataURL("image/png");
        if (maskObjectUrlRef.current) {
          URL.revokeObjectURL(maskObjectUrlRef.current);
          maskObjectUrlRef.current = undefined;
        }
        setMaskUrl(nextUrl);
      }
    } else {
      if (maskObjectUrlRef.current) {
        URL.revokeObjectURL(maskObjectUrlRef.current);
        maskObjectUrlRef.current = undefined;
      }
      setMaskUrl(undefined);
    }
  }, [
    image,
    outputWidth,
    ditheringMode,
    characterSet,
    customCharacterSet,
    invertColors,
    whiteMode,
    brightness,
    contrast,
    blur,
    font,
    cursor,
    cursorX,
    cursorY,
    initializedRef,
    cursorImage,
    maskLookup,
  ]);

  useEffect(() => {
    generate();
  }, [generate]);

  useEffect(() => {
    const handleChange = () => {
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(() => {
        generate();
        frameRef.current && cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      });
    };
    const unsubscribeX = cursorX.on("change", handleChange);
    const unsubscribeY = cursorY.on("change", handleChange);
    return () => {
      unsubscribeX();
      unsubscribeY();
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [cursorX, cursorY, generate]);

  useEffect(() => {
    if (typeof document === "undefined") {
      setIsDocumentVisible(true);
      return;
    }
    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState !== "hidden");
    };
    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      setIsInView(true);
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      setIsInView(entry?.isIntersecting ?? false);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!staticEffect?.interval) return;
    if (prefersReducedMotion) return;
    if (!isInView) return;
    if (!isDocumentVisible) return;

    const intervalSeconds = Math.max(staticEffect.interval, 1);
    const interval = window.setInterval(() => {
      rngSeedRef.current = Math.random();
      generate();
    }, intervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [
    staticEffect?.interval,
    generate,
    prefersReducedMotion,
    isInView,
    isDocumentVisible,
  ]);

  const updateScale = useCallback(() => {
    if (!textRef.current || !containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth || 0;
    const containerHeight = containerRef.current.offsetHeight || 0;
    const textWidth = textRef.current.scrollWidth || 1;
    const textHeight = textRef.current.scrollHeight || 1;
    let scale = 1;
    if (sizing === "fit") {
      const widthScale = containerWidth / textWidth;
      const heightScale = containerHeight / textHeight;
      scale = Math.min(widthScale, heightScale);
    } else if (sizing === "fill") {
      const widthScale = containerWidth / textWidth;
      const heightScale = containerHeight / textHeight;
      scale = Math.max(widthScale, heightScale);
    }
    const transform = `translate(-50%, -50%) scale(${scale})`;
    textRef.current.style.transform = transform;
    if (glowRef.current) {
      glowRef.current.style.transform = transform;
    }
  }, [sizing]);

  useResizeObserver(containerRef, updateScale);

  useEffect(() => {
    updateScale();
  }, [text, updateScale]);

  const appliedFont = useMemo(() => ({ ...DEFAULT_FONT, ...font }), [font]);

  const textStyle: CSSProperties = {
    width: "fit-content",
    height: "fit-content",
    userSelect: "none",
    whiteSpace: "pre",
    textAlign: "center",
    transformOrigin: "center",
    fontVariantNumeric: "tabular-nums",
    color: color?.mode === "color" ? color.color ?? "#ffffff" : "transparent",
    backgroundImage: color?.mode && color.mode !== "color" && maskUrl
      ? `url(${maskUrl})`
      : undefined,
    backgroundRepeat: "no-repeat",
    backgroundSize: "100% 100%",
    imageRendering: "pixelated",
    backgroundClip: color?.mode && color.mode !== "color" ? "text" : undefined,
    WebkitBackgroundClip: color?.mode && color.mode !== "color"
      ? "text"
      : undefined,
    ...appliedFont,
  };

  const baseStyle: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    backgroundColor,
    ...style,
  };

  return (
    <div ref={containerRef} className={className} style={baseStyle}>
      {glow && glow.blur > 0 && glow.opacity > 0
        ? (
          <div
            ref={glowRef}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              filter: `blur(${glow.blur}px)`,
              opacity: glow.opacity,
              ...textStyle,
              transform: "translate(-50%, -50%)",
            }}
            aria-hidden="true"
          >
            {text}
          </div>
        )
        : <div ref={glowRef} style={{ display: "none" }} />}
      <div
        ref={textRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          ...textStyle,
        }}
        aria-label={imageAlt}
      >
        {text}
      </div>
    </div>
  );
}

export default InteractiveAscii;
