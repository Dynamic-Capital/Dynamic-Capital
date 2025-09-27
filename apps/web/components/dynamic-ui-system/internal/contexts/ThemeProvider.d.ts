import { Schemes } from "../types";
export type Theme = "dark" | "light" | "system";
export type NeutralColor = "sand" | "gray" | "slate";
export type SolidType = "color" | "contrast" | "inverse";
export type SolidStyle = "flat" | "plastic";
export type BorderStyle = "rounded" | "playful" | "conservative";
export type SurfaceStyle = "filled" | "translucent";
export type TransitionStyle = "all" | "micro" | "macro" | "none";
export type ScalingSize = "90" | "95" | "100" | "105" | "110";
export type DataStyle = "categorical" | "divergent" | "sequential";
interface StyleOptions {
  theme: Theme;
  neutral: NeutralColor | "custom";
  brand: Schemes | "custom";
  accent: Schemes | "custom";
  solid: SolidType;
  solidStyle: SolidStyle;
  border: BorderStyle;
  surface: SurfaceStyle;
  transition: TransitionStyle;
  scaling: ScalingSize;
}
type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};
type StyleProviderState = StyleOptions & {
  setStyle: (style: Partial<StyleOptions>) => void;
};
type ThemeProviderProps = {
  children: React.ReactNode;
  theme?: Theme;
  neutral?: NeutralColor | "custom";
  brand?: Schemes | "custom";
  accent?: Schemes | "custom";
  solid?: SolidType;
  solidStyle?: SolidStyle;
  border?: BorderStyle;
  surface?: SurfaceStyle;
  transition?: TransitionStyle;
  scaling?: ScalingSize;
};
declare const defaultStyleOptions: StyleOptions;
export declare function ThemeProvider(
  {
    children,
    theme: propTheme,
    neutral,
    brand,
    accent,
    solid,
    solidStyle,
    border,
    surface,
    transition,
    scaling,
  }: ThemeProviderProps,
): import("react/jsx-runtime").JSX.Element;
export declare const useTheme: () => ThemeProviderState;
export declare const useStyle: () => StyleProviderState;
export { defaultStyleOptions };
//# sourceMappingURL=ThemeProvider.d.ts.map
