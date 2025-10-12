declare module "qrcode" {
  export type QRCodeErrorCorrectionLevel = "L" | "M" | "Q" | "H";

  export interface QRCodeColorMask {
    readonly dark?: string;
    readonly light?: string;
  }

  export interface QRCodeToDataURLOptions {
    readonly width?: number;
    readonly margin?: number;
    readonly color?: QRCodeColorMask;
    readonly errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
    readonly scale?: number;
  }

  export function toDataURL(
    text: string,
    options?: QRCodeToDataURLOptions,
  ): Promise<string>;

  export interface QRCodeModule {
    readonly toDataURL: typeof toDataURL;
  }

  const QRCode: QRCodeModule;
  export default QRCode;
}
