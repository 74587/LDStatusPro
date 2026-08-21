import { describe, expect, it } from 'vitest'
import { resolveTelemetryConfig } from './faro'

const locationLike = { origin: 'https://store.ldspro.qzz.io' }

describe('frontend infrastructure configuration', () => {
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
      VITE_FARO_COLLECTOR_URL: 'https://observe.ldspro.qzz.io/collect'
    }, {}, locationLike)
    expect(config.enabled).toBe(true)
    expect(config.sampleRate).toBe(0.1)
  })

  it('honors global privacy control and do-not-track', () => {
    const env = {
      PROD: true,
      VITE_FARO_ENABLED: '1',
      VITE_FARO_COLLECTOR_URL: 'https://observe.ldspro.qzz.io/collect'
    }
    expect(resolveTelemetryConfig(env, { globalPrivacyControl: true }, locationLike).enabled).toBe(false)
    expect(resolveTelemetryConfig(env, { doNotTrack: '1' }, locationLike).enabled).toBe(false)
  })

  it('rejects insecure production collectors and clamps explicit sampling', () => {
    const config = resolveTelemetryConfig({
      PROD: true,
      VITE_FARO_ENABLED: 'true',
      VITE_FARO_COLLECTOR_URL: 'http://observe.ldspro.qzz.io/collect',
      VITE_FARO_SESSION_SAMPLE_RATE: '4'
    }, {}, locationLike)
    expect(config.enabled).toBe(false)
    expect(config.sampleRate).toBe(1)
  })
})
