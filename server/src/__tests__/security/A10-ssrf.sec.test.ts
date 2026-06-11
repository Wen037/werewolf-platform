/**
 * OWASP A10 (2021) — Server-Side Request Forgery.
 * The map module forwards user input to external geocoding services.
 * Verify the request TARGET is always the fixed OneMap/Nominatim host and
 * user input only ever travels as a query parameter — never as the URL.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const axiosGet = vi.fn();
vi.mock('axios', () => ({
  default: { get: (...args: unknown[]) => axiosGet(...args) },
}));

import { MapService } from '../../modules/map/coreLogic/MapService';

const service = new MapService();

const ALLOWED_HOSTS = ['www.onemap.gov.sg', 'nominatim.openstreetmap.org'];

function requestedUrls(): string[] {
  return axiosGet.mock.calls.map(c => String(c[0]));
}

beforeEach(() => {
  axiosGet.mockReset();
  axiosGet.mockRejectedValue(new Error('blocked by test')); // exercise all fallbacks
});

describe('OWASP A10 — SSRF via geocode input', () => {
  const PAYLOADS = [
    'http://169.254.169.254/latest/meta-data/',   // cloud metadata endpoint
    'http://localhost:5000/api/admin/users',      // internal service
    'file:///etc/passwd',
    '//attacker.example.com/exfil',
    'https://www.onemap.gov.sg@attacker.example.com/', // userinfo trick
  ];

  it('SSRF-1: geocodeAddress never uses user input as the request URL', async () => {
    for (const payload of PAYLOADS) {
      axiosGet.mockClear();
      await service.geocodeAddress(payload);

      const urls = requestedUrls();
      expect(urls.length).toBeGreaterThan(0);
      for (const url of urls) {
        const host = new URL(url).host;
        expect(ALLOWED_HOSTS).toContain(host);
      }
    }
  });

  it('SSRF-2: user input only appears in query params, not the URL', async () => {
    await service.geocodeAddress('http://169.254.169.254/');

    for (const call of axiosGet.mock.calls) {
      expect(String(call[0])).not.toContain('169.254.169.254');
      // the payload is allowed to appear in params (it is a search string there)
      const opts = call[1] as { params?: Record<string, unknown> } | undefined;
      expect(opts?.params).toBeDefined();
    }
  });

  it('SSRF-3: reverseGeocode targets only the fixed Nominatim host', async () => {
    await service.reverseGeocode(1.3521, 103.8198);

    const urls = requestedUrls();
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(new URL(url).host).toBe('nominatim.openstreetmap.org');
    }
  });

  it('SSRF-4: external-service failure degrades gracefully (no throw, fallback result)', async () => {
    const geo = await service.geocodeAddress('Orchard Road');
    expect(geo).toBeNull(); // both providers failed → null, not a crash

    const rev = await service.reverseGeocode(1.4304, 103.8354);
    expect(typeof rev.area).toBe('string'); // centroid fallback
    expect(rev.area.length).toBeGreaterThan(0);
  });
});
