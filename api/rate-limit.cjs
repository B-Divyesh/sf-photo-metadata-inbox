'use strict';

const UPSTREAM = 'https://api.sociobot.in/api/v1/products/photo-metadata-inbox/verify';
const DEFAULT_LIMIT = 3;
const DEFAULT_WINDOW_MS = 60_000;

function requestHeader(request, name) {
  const headers = request.headers || {};
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || '';
}

function clientKey(request) {
  const forwarded = String(requestHeader(request, 'x-forwarded-for'));
  const addresses = forwarded.split(',').map((value) => value.trim()).filter(Boolean);
  // The platform appends its observed peer to X-Forwarded-For. The last value
  // is therefore the only address callers cannot rotate with request headers.
  // Never use X-Client-IP: Azure Static Web Apps passes caller values through.
  const address = String(addresses.at(-1) || 'unknown').trim();
  const bracketedIpv6 = address.match(/^\[([^\]]+)](?::\d+)?$/);
  if (bracketedIpv6) return bracketedIpv6[1];
  return address.replace(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/, '$1');
}

function createVerifyHandler(options = {}) {
  const limit = options.limit || DEFAULT_LIMIT;
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const now = options.now || Date.now;
  const fetchImpl = options.fetchImpl || fetch;
  const buckets = new Map();

  return async function verifyLicense(request) {
    const timestamp = now();
    const key = clientKey(request);
    let bucket = buckets.get(key);
    if (!bucket || timestamp >= bucket.resetAt) {
      bucket = { count: 0, resetAt: timestamp + windowMs };
      buckets.set(key, bucket);
    }

    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - timestamp) / 1000));
    const rateHeaders = {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'RateLimit-Limit': String(limit),
      'RateLimit-Remaining': String(Math.max(0, limit - bucket.count - 1)),
      'RateLimit-Reset': String(retryAfter)
    };
    if (bucket.count >= limit) {
      return {
        status: 429,
        headers: { ...rateHeaders, 'RateLimit-Remaining': '0', 'Retry-After': String(retryAfter) },
        body: JSON.stringify({ valid: false, reason: 'rate_limited' })
      };
    }
    bucket.count += 1;

    if (buckets.size > 2_000) {
      for (const [address, entry] of buckets) if (timestamp >= entry.resetAt) buckets.delete(address);
    }

    const token = typeof request.query?.license === 'string' ? request.query.license.trim() : '';
    if (!token || token.length > 4096) {
      return { status: 400, headers: rateHeaders, body: JSON.stringify({ valid: false, reason: 'invalid_request' }) };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const upstream = await fetchImpl(`${UPSTREAM}?license=${encodeURIComponent(token)}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      const body = await upstream.text();
      const headers = { ...rateHeaders };
      const upstreamRetry = upstream.headers.get('retry-after');
      if (upstreamRetry) headers['Retry-After'] = upstreamRetry;
      return { status: upstream.status, headers, body };
    } catch {
      return {
        status: 503,
        headers: { ...rateHeaders, 'Retry-After': '10' },
        body: JSON.stringify({ valid: false, reason: 'temporarily_unavailable' })
      };
    } finally {
      clearTimeout(timeout);
    }
  };
}

module.exports = { clientKey, createVerifyHandler };
