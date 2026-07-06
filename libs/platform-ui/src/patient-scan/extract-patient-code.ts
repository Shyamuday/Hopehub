/** Extract patient code from raw scan text (ID, URL, or QR payload). */
export function extractPatientCodeFromScan(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const fromUrl =
    trimmed.match(/\/go\/p\/([^/?#]+)/i)?.[1] ??
    trimmed.match(/\/scan\/patient\/([^/?#]+)/i)?.[1] ??
    trimmed.match(/[?&]patientCode=([^&#]+)/i)?.[1];

  if (fromUrl) {
    return decodeURIComponent(fromUrl).trim().toUpperCase();
  }

  return trimmed.toUpperCase();
}

export function isPatientCodeFormat(value: string): boolean {
  return /^[A-Z]{2,12}-\d{4,8}$/i.test(value.trim());
}
