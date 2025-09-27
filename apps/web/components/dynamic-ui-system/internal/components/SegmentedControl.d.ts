import { Scroller, ToggleButtonProps } from ".";
interface ButtonOption extends Omit<ToggleButtonProps, "selected"> {
  value: string;
}
interface SegmentedControlProps
  extends Omit<React.ComponentProps<typeof Scroller>, "onToggle"> {
  buttons: ButtonOption[];
  onToggle: (
    value: string,
    event?: React.MouseEvent<HTMLButtonElement>,
  ) => void;
  defaultSelected?: string;
  fillWidth?: boolean;
  selected?: string;
  className?: string;
  style?: React.CSSProperties;
}
declare const SegmentedControl: React.FC<SegmentedControlProps>;
export { SegmentedControl };
export type { ButtonOption, SegmentedControlProps };
//# sourceMappingURL=SegmentedControl.d.ts.map
