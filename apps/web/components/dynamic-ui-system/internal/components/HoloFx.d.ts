import React from "react";
import { Flex } from ".";
import { CSSProperties } from "react";
interface MaskOptions {
  maskPosition?: string;
}
interface HoloFxProps extends React.ComponentProps<typeof Flex> {
  children: React.ReactNode;
  shine?: {
    opacity?: number;
    filter?: string;
    blending?: CSSProperties["mixBlendMode"];
    mask?: MaskOptions;
  };
  burn?: {
    opacity?: number;
    filter?: string;
    blending?: CSSProperties["mixBlendMode"];
    mask?: MaskOptions;
  };
  texture?: {
    opacity?: number;
    filter?: string;
    blending?: CSSProperties["mixBlendMode"];
    image?: string;
    mask?: MaskOptions;
  };
}
declare const HoloFx: React.FC<HoloFxProps>;
export { HoloFx };
//# sourceMappingURL=HoloFx.d.ts.map
