/**
 * Generates and persists a random 5-digit user ID in localStorage.
 * This ID identifies the user across sessions and is sent with alerts
 * so that operators can distinguish between users in clusters.
 *
 * Returns '' during SSR to avoid hydration mismatch — the client
 * useEffect in the consuming component will immediately set the real value.
 */

const STORAGE_KEY = 'aegis_user_id';

/** Generate a random 5-digit numeric string (10000–99999). */
function generate5Digit(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return String(num);
}

/**
 * Returns the current user's persistent 5-digit ID.
 * Returns '' on the server so SSR and CSR render the same initial markup,
 * avoiding React hydration mismatches.
 */
export function getUserId(): string {
  if (typeof window === 'undefined') {
    return '';  // SSR — return empty; client will fill in via useEffect
  }

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && /^\d{5}$/.test(existing)) return existing;

    const id = generate5Digit();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // localStorage blocked (incognito etc.)
    const id = generate5Digit();
    return id;
  }
}
