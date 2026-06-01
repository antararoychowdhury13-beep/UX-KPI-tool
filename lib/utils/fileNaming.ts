// Filename convention: {sequence}-{screen-label}.{ext}  e.g. 01-login-screen.png  (spec §11)

const SEQUENCE_RE = /^(\d+)[-_]/;

/** Parse the leading sequence number from a filename, or null if absent. */
export function parseSequence(fileName: string): number | null {
  const match = fileName.match(SEQUENCE_RE);
  return match ? parseInt(match[1], 10) : null;
}

/** Derive a human-readable screen label from a filename. */
export function parseScreenLabel(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/, "");
  const withoutSeq = withoutExt.replace(SEQUENCE_RE, "");
  return withoutSeq
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function isAcceptedImage(mimeType: string): boolean {
  return ACCEPTED.includes(mimeType);
}
