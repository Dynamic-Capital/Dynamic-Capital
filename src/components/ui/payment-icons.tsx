import React from "react";
import { cn } from "@/lib/utils";

interface PaymentIconsProps {
  className?: string;
}

export const PaymentIcons: React.FC<PaymentIconsProps> = ({ className }) => {
  const icons = ["visa", "mastercard", "usdt", "trc20"];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icons.map((icon) => (
        <img
          key={icon}
          src={`/icons/${icon}.svg`}
          alt={`${icon} icon`}
          className="h-5 w-auto"
        />
      ))}
    </div>
  );
};

export default PaymentIcons;
