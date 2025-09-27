import React from "react";
import { InputProps } from ".";
interface TagInputProps extends Omit<InputProps, "onChange" | "value"> {
  value: string[];
  onChange: (value: string[]) => void;
}
declare const TagInput: React.ForwardRefExoticComponent<
  TagInputProps & React.RefAttributes<HTMLInputElement>
>;
export { TagInput };
export type { TagInputProps };
//# sourceMappingURL=TagInput.d.ts.map
