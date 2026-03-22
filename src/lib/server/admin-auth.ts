/**
 * Admin auth stub for Hub.
 * TODO: Implement proper admin authentication.
 */

export async function verifyAdmin(): Promise<{ id: string } | null> {
  // No admin auth in Hub yet — return null (unauthenticated)
  return null;
}
