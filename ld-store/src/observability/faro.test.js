import { describe, expect, it } from 'vitest'
import { resolveTelemetryConfig, resolveTraceHeaderCorsUrls } from './faro'

const locationLike = { origin: 'https://store.ldspro.qzz.io' }

describe('frontend infrastructure configuration', () => {
  it('propagates trace context to every production API origin', () => {
    const matchers = resolveTraceHeaderCorsUrls({}, locationLike)

    for (const apiOrigin of [
      'https://api.ldspro.qzz.io',
      'https://api1.ldspro.qzz.io',
      'https://api2.ldspro.qzz.io'
    ]) {
      expect(matchers.some((matcher) => matcher.test(`${apiOrigin}/api/health`))).toBe(true)
    }
    expect(matchers.some((matcher) => matcher.test('https://example.com/api/health'))).toBe(false)
  })

  it('stays disabled unless the feature and endpoint are both configured', () => {
    expect(resolveTelemetryConfig({ PROD: true }, {}, locationLike).enabled).toBe(false)
    expect(resolveTelemetryConfig({
      PROD: true,
      VITE_FARO_ENABLED: '1',
      VITE_FARO_COLLECTOR_URL: ''
    }, {}, locationLike).enabled).toBe(false)
  })

  it('uses 10 percent session sampling by default', () => {
    const config = resolveTelemetryConfig({
      PROD: true,
      VITE_FARO_ENABLED: '1',
      VITE_FARO_COLLECTOR_URL: 'https://observe.ldspro.qzz.io/collect',
      VITE_FARO_API_KEY: 'public-ingestion-key'
    }, {}, locationLike)
    expect(config.enabled).toBe(true)
    expect(config.sampleRate).toBe(0.1)
  })

  it('honors global privacy control and do-not-track', () => {
    const env = {
      PROD: true,
      VITE_FARO_ENABLED: '1',
      VITE_FARO_COLLECTOR_URL: 'https://observe.ldspro.qzz.io/collect',
      VITE_FARO_API_KEY: 'public-ingestion-key'
    }
    expect(resolveTelemetryConfig(env, { globalPrivacyControl: true }, locationLike).enabled).toBe(false)
    expect(resolveTelemetryConfig(env, { doNotTrack: '1' }, locationLike).enabled).toBe(false)
  })

  it('rejects insecure production collectors and clamps explicit sampling', () => {
    const config = resolveTelemetryConfig({
      PROD: true,
      VITE_FARO_ENABLED: 'true',
      VITE_FARO_COLLECTOR_URL: 'http://observe.ldspro.qzz.io/collect',
      VITE_FARO_API_KEY: 'public-ingestion-key',
      VITE_FARO_SESSION_SAMPLE_RATE: '4'
    }, {}, locationLike)
    expect(config.enabled).toBe(false)
    expect(config.sampleRate).toBe(1)
  })
})
