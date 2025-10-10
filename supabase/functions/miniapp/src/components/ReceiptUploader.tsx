import { ChangeEvent, useEffect, useState } from "react";

interface Props {
  onChange: (file: File | null) => void;
}

const isSafeObjectUrl = (value: string | null): value is string =>
  typeof value === "string" && value.startsWith("blob:");

export default function ReceiptUploader({ onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  function handle(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;

    // Revoke previous object URL to avoid memory leaks
    if (isSafeObjectUrl(preview)) URL.revokeObjectURL(preview);

    onChange(file);

    if (file && file.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  }

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (isSafeObjectUrl(preview)) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const safePreview = isSafeObjectUrl(preview) ? preview : null;

  return (
    <div>
      {safePreview && (
        <img
          src={safePreview}
          alt="Receipt preview"
          className="mb-2 w-full rounded-lg"
        />
      )}
      <input
        type="file"
        accept="image/*"
        onChange={handle}
        className="dc-input"
        aria-label="Upload receipt"
      />
    </div>
  );
}
