import { useMemo } from "react";
import { Select } from "@/components/ui/select";
import { DollarSign, Globe } from "lucide-react";

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  disabled?: boolean;
}

export function CurrencySelector(
  { value, onChange, disabled }: CurrencySelectorProps,
) {
  const currencyOptions = useMemo(
    () => [
      {
        value: "USD",
        label: (
          <div className="flex items-center gap-2">
            <DollarSign className="h-3 w-3" />
            USD
          </div>
        ),
      },
      {
        value: "MVR",
        label: (
          <div className="flex items-center gap-2">
            <span className="text-xs">Rf</span>
            MVR
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select
        value={value}
        onValueChange={(selected) => {
          const nextValue = Array.isArray(selected) ? selected[0] : selected;
          if (nextValue) {
            onChange(nextValue);
          }
        }}
        options={currencyOptions}
        disabled={disabled}
        surfaceClassName="w-[100px] border border-border/60 bg-background"
        inputClassName="text-sm"
      />
    </div>
  );
}
