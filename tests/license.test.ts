import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clientKey, createVerifyHandler } from '../api/rate-limit.cjs';
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

  it('@claim:daily-license verifies an active license no more than once per day', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ valid: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    saveLicense('daily-license');
    await expect(verifyLicense(true)).resolves.toBe(true);
    await expect(verifyLicense()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/license/verify?license=daily-license', { headers: { Accept: 'application/json' } });
  });

  it('@claim:rate-limited-license returns 429 with Retry-After after the production burst threshold', async () => {
    let timestamp = 1_000;
    const upstream = vi.fn(async () => new Response(JSON.stringify({ valid: false, reason: 'invalid' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    const handler = createVerifyHandler({ now: () => timestamp, fetchImpl: upstream });
    const request = { headers: { 'x-forwarded-for': '203.0.113.8:4000' }, query: { license: 'invalid-token' } };

    const burst = await Promise.all(Array.from({ length: 6 }, (_, index) => handler({
      ...request,
      headers: { 'x-forwarded-for': `203.0.113.8:${4000 + index}`, 'x-client-ip': `198.51.100.${index}` }
    })));
    expect(burst.filter((response) => response.status === 200)).toHaveLength(3);
    expect(burst.filter((response) => response.status === 429)).toHaveLength(3);
    expect(burst[3]?.headers['Retry-After']).toBe('60');
    expect(JSON.parse(burst[3]?.body ?? '{}')).toEqual({ valid: false, reason: 'rate_limited' });
    expect(upstream).toHaveBeenCalledTimes(3);

    timestamp += 60_000;
    expect((await handler(request)).status).toBe(200);
  });

  it('ignores forged client identity and trusts the platform-appended address', () => {
    expect(clientKey({ headers: { 'x-client-ip': '198.51.100.1', 'x-forwarded-for': 'spoofed, 203.0.113.9:443' } })).toBe('203.0.113.9');
    expect(clientKey({ headers: { 'x-client-ip': '198.51.100.2', 'x-forwarded-for': 'different, 203.0.113.9:8443' } })).toBe('203.0.113.9');
    expect(clientKey({ headers: { 'x-client-ip': '198.51.100.3' } })).toBe('unknown');
  });
});
