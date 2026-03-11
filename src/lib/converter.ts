const CONVERTER_URL = process.env.CONVERTER_URL;

export interface ConvertResult {
  previewPath: string | null;
  ocrText: string | null;
  /** null on success, error message when conversion failed */
  error: string | null;
}

/**
 * Calls the converter microservice to generate a PNG preview (and OCR text for images).
 * Returns null when the converter is not configured (CONVERTER_URL unset) — callers
 * treat this as a silent skip. Returns ConvertResult with error set when the converter
 * is configured but fails.
 */
export async function generatePreview(
  filePath: string,
  mimeType: string
): Promise<ConvertResult | null> {
  if (!CONVERTER_URL) return null;

  try {
    const res = await fetch(`${CONVERTER_URL}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath, mimeType }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Converter returned HTTP ${res.status}`);
    }
    const data = await res.json();
    return { previewPath: data.previewPath, ocrText: data.ocrText ?? null, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[converter] Preview generation failed:", message);
    return { previewPath: null, ocrText: null, error: message };
  }
}
