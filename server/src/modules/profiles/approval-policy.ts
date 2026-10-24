// These fields are presented during account review. Compare values, not merely
// keys: clients routinely submit a complete form even when editing one field.
export function requiresProfileReview(
  current: { displayName: string; bio: string | null },
  next: { displayName?: string; bio?: string | null },
): boolean {
  return (next.displayName !== undefined && next.displayName !== current.displayName) ||
    (next.bio !== undefined && next.bio !== current.bio);
}
