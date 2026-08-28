import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createVerifyHandler } from '../api/rate-limit.cjs';
import { saveLicense, verifyLicense } from '../src/license';

describe('license verification response policy', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('routes browser verification through the same-origin policy endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ valid: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    saveLicense('license token');

    await expect(verifyLicense(true)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/license/verify?license=license%20token', { headers: { Accept: 'application/json' } });
  });

  it('returns 429 with Retry-After after the production burst threshold', async () => {
    let timestamp = 1_000;
    const upstream = vi.fn(async () => new Response(JSON.stringify({ valid: false, reason: 'invalid' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    const handler = createVerifyHandler({ now: () => timestamp, fetchImpl: upstream });
    const request = { headers: { 'x-forwarded-for': '198.51.100.4' }, query: { license: 'invalid-token' } };

    const burst = await Promise.all(Array.from({ length: 25 }, () => handler(request)));
    expect(burst.filter((response) => response.status === 200)).toHaveLength(20);
    expect(burst.filter((response) => response.status === 429)).toHaveLength(5);
    expect(burst[20]?.headers['Retry-After']).toBe('60');
    expect(JSON.parse(burst[20]?.body ?? '{}')).toEqual({ valid: false, reason: 'rate_limited' });
    expect(upstream).toHaveBeenCalledTimes(20);

    timestamp += 60_000;
    expect((await handler(request)).status).toBe(200);
  });
});
