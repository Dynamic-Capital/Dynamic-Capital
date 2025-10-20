let warned = false;

export function ocrTextFromBlob(_blob: Blob): Promise<string> {
  if (!warned) {
    console.warn(
      "[telegram-bot] OCR support is disabled in this environment; returning empty text.",
    );
    warned = true;
  }
  return Promise.resolve("");
}

export function parseReceipt(text: string) {
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const join = lines.join(" ");
  const amtMatch = join.match(/([0-9]+[.,][0-9]{2})/);
  const total = amtMatch ? Number(amtMatch[1].replace(",", ".")) : null;

  const dtMatch = join.match(
    /\b(20\d{2}[./-]\d{1,2}[./-]\d{1,2})[ T]*(\d{1,2}:\d{2}(:\d{2})?)\b/,
  );
  const dateText = dtMatch ? `${dtMatch[1]} ${dtMatch[2]}` : null;

  const success = /\b(successful|completed|processed)\b/i.test(join);
  const beneficiary = lines.find((l) => /\b(Dynamic|Capital)\b/i.test(l)) ||
    null;
  const payCode = (join.match(/\bDC-[A-Z0-9]{6}\b/) || [null])[0];

  return { text, total, dateText, success, beneficiary, payCode };
}
