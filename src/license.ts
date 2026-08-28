const SLUG = 'photo-metadata-inbox';
const API = 'https://api.sociobot.in/api/v1';
const VERIFY_API = '/api/license/verify';
const TOKEN_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `sb_license_verdict:${SLUG}`;

export const checkoutUrl = `${API}/products/${SLUG}/checkout`;

interface Verdict {
  valid: boolean;
  checkedAt: number;
}

export function captureLicenseFromUrl(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: true, checkedAt: 0 } satisfies Verdict));
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function hasOptimisticLicense(): boolean {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  try {
    const verdict = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? '') as Verdict;
    return verdict.valid;
  } catch {
    return true;
  }
}

export function saveLicense(token: string): void {
  const clean = token.trim();
  if (!clean) throw new Error('Paste the license token from your receipt.');
  localStorage.setItem(TOKEN_KEY, clean);
  localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: true, checkedAt: 0 } satisfies Verdict));
}

export async function verifyLicense(force = false): Promise<boolean> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  try {
    const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? '') as Verdict;
    if (!force && Date.now() - cached.checkedAt < 86_400_000) return cached.valid;
  } catch { /* verify below */ }
  const response = await fetch(`${VERIFY_API}?license=${encodeURIComponent(token)}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(response.status === 429 ? 'Too many verification attempts. Try again shortly.' : 'License verification is temporarily unavailable.');
  const result = await response.json() as { valid: boolean };
  localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: result.valid, checkedAt: Date.now() } satisfies Verdict));
  return result.valid;
}

export function removeLicense(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(VERDICT_KEY);
}
