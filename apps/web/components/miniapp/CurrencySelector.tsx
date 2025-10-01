import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Globe } from "lucide-react";

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  disabled?: boolean;
}

export function CurrencySelector(
  { value, onChange, disabled }: CurrencySelectorProps,
) {
  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="USD">
            <div className="flex items-center gap-2">
              <DollarSign className="h-3 w-3" />
              USD
            </div>
          </SelectItem>
          <SelectItem value="MVR">
            <div className="flex items-center gap-2">
              <span className="text-xs">Rf</span>
              MVR
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
