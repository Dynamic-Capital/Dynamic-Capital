"use client";

import {
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type ComponentType,
  forwardRef,
  type Ref,
  useId,
} from "react";

import { Switch as OnceSwitch } from "@/components/dynamic-ui-system";

type OnceSwitchProps = ComponentPropsWithoutRef<typeof OnceSwitch>;

interface SwitchProps
  extends Omit<OnceSwitchProps, "isChecked" | "onToggle" | "id"> {
  id?: string;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      id: providedId,
      checked,
      onCheckedChange,
      onChange,
      disabled,
      ariaLabel,
      className,
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;

    const handleToggle = () => {
      if (disabled) {
        return;
      }
      const nextValue = !checked;
      onCheckedChange?.(nextValue);
      if (onChange) {
        const syntheticEvent = {
          target: { checked: nextValue },
        } as unknown as ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    const BaseSwitch = OnceSwitch as unknown as ComponentType<
      OnceSwitchProps & { ref?: Ref<HTMLInputElement> }
    >;

    return (
      <BaseSwitch
        ref={ref}
        id={id}
        className={className}
        isChecked={checked}
        disabled={disabled}
        ariaLabel={ariaLabel}
        onToggle={handleToggle}
        {...rest}
      />
    );
  },
);

Switch.displayName = "Switch";

export { Switch };
