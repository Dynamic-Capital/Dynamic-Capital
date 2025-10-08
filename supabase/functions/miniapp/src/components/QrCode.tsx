import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

import { cn } from "../lib/utils";

interface QrCodeProps {
  readonly value: string;
  readonly caption?: string;
  readonly className?: string;
  readonly size?: number;
}

const QR_FOREGROUND = "#0f172a"; // slate-900
const QR_BACKGROUND = "#ffffff";

export default function QrCode({
  value,
  caption,
  className,
  size = 176,
}: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const qrOptions = useMemo(
    () => ({
      width: size,
      margin: 1,
      color: {
        dark: QR_FOREGROUND,
        light: QR_BACKGROUND,
      },
      errorCorrectionLevel: "H" as const,
    }),
    [size],
  );

  useEffect(() => {
    let isMounted = true;
    setError(null);
    setDataUrl(null);

    QRCode.toDataURL(value, qrOptions)
      .then((url: string) => {
        if (isMounted) {
          setDataUrl(url);
        }
      })
      .catch((qrError: unknown) => {
        console.error("Failed to generate QR code", qrError);
        if (isMounted) {
          setError("QR unavailable");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, qrOptions]);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {dataUrl
        ? (
          <img
            src={dataUrl}
            alt="QR code"
            style={{ width: size, height: size }}
            className="rounded-lg border border-border/40 bg-background"
          />
        )
        : (
          <div
            className="flex items-center justify-center rounded-lg border border-dashed border-border/60 bg-secondary/40 text-xs text-muted-foreground"
            style={{ width: size, height: size }}
          >
            {error ?? "Generating QR…"}
          </div>
        )}
      {caption
        ? <p className="text-center text-xs text-muted-foreground">{caption}</p>
        : null}
    </div>
  );
}
