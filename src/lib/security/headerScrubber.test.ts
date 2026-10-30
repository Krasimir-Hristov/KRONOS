import { describe, expect, it } from 'vitest';
import { scrubExternalHeaders } from '@/lib/security/headerScrubber';

describe('scrubExternalHeaders (CVE-2025-29927 mitigation)', () => {
  it('strips x-middleware-subrequest and arbitrary x-* headers case-insensitively', () => {
    const incoming = new Headers({
      host: 'kronos.local',
      cookie: 'session=abc',
      'x-middleware-subrequest': 'src/middleware:src/middleware',
      'X-Middleware-Invoke': '1',
      'x-invoke-path': '/admin',
      'X-Custom-Spoof': 'injected',
    });

    const sanitized = scrubExternalHeaders(incoming);

    expect(sanitized.get('x-middleware-subrequest')).toBeNull();
    expect(sanitized.get('x-middleware-invoke')).toBeNull();
    expect(sanitized.get('x-invoke-path')).toBeNull();
    expect(sanitized.get('x-custom-spoof')).toBeNull();
    expect(sanitized.get('host')).toBe('kronos.local');
    expect(sanitized.get('cookie')).toBe('session=abc');
  });

  it('preserves allowlisted proxy headers required for Next.js Server Actions CSRF', () => {
    const incoming = new Headers({
      origin: 'https://kronos.example.com',
      'x-forwarded-host': 'kronos.example.com',
      'X-Forwarded-Proto': 'https',
      'x-forwarded-for': '203.0.113.10',
      'x-real-ip': '203.0.113.10',
      'x-middleware-subrequest': 'bypass',
    });

    const sanitized = scrubExternalHeaders(incoming);

    expect(sanitized.get('x-forwarded-host')).toBe('kronos.example.com');
    expect(sanitized.get('x-forwarded-proto')).toBe('https');
    expect(sanitized.get('x-forwarded-for')).toBe('203.0.113.10');
    expect(sanitized.get('x-real-ip')).toBe('203.0.113.10');
    expect(sanitized.get('origin')).toBe('https://kronos.example.com');
    expect(sanitized.get('x-middleware-subrequest')).toBeNull();
  });

  it('does not mutate the original Headers instance', () => {
    const incoming = new Headers({
      'x-middleware-subrequest': 'keep-on-original',
    });

    const sanitized = scrubExternalHeaders(incoming);

    expect(incoming.get('x-middleware-subrequest')).toBe('keep-on-original');
    expect(sanitized.get('x-middleware-subrequest')).toBeNull();
  });
});
