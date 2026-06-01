/** Two-letter uppercase initials from a name ("Anupam Sarkar" → "AS"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic avatar tone class for a name/index. */
export function avatarTone(index: number): string {
  return ["pa-blue", "pa-purple", "pa-teal", "pa-amber"][index % 4];
}
