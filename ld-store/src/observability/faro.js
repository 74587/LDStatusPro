import { sanitizeError, sanitizeTelemetryItem } from './privacy'

const DEFAULT_SAMPLE_RATE = 0.1
const DEFAULT_API_ORIGINS = [
  'https://api1.ldspro.qzz.io',
  'https://api2.ldspro.qzz.io'
]
const pendingErrors = []
const BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION

let faroInstance = null
let initializationPromise = null

function envFlag(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

function clampSampleRate(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_SAMPLE_RATE
  return Math.min(1, Math.max(0, parsed))
}

function isAutomatedBrowser(navigatorLike) {
  if (!navigatorLike) return false
  return Boolean(
    navigatorLike.webdriver
    || /(?:bot|crawler|spider|headlesschrome|lighthouse)/i.test(navigatorLike.userAgent || '')
  )
}

function privacySignalEnabled(navigatorLike) {
  if (!navigatorLike) return false
  return navigatorLike.globalPrivacyControl === true || navigatorLike.doNotTrack === '1'
}

function validCollectorUrl(value, locationLike, isProduction) {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const url = new URL(value, locationLike?.origin)
    const isLocalDevelopment = !isProduction && ['localhost', '127.0.0.1'].includes(url.hostname)
    if (url.protocol !== 'https:' && !isLocalDevelopment) return ''
    if (url.username || url.password) return ''
    if (!url.pathname.endsWith('/collect')) return ''
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return ''
  }
}

export function resolveTelemetryConfig(
  env = import.meta.env,
  navigatorLike = globalThis.navigator,
  locationLike = globalThis.location
) {
  const enabled = envFlag(env.VITE_FARO_ENABLED)
  const collectorUrl = validCollectorUrl(env.VITE_FARO_COLLECTOR_URL, locationLike, env.PROD === true)
  const apiKey = String(env.VITE_FARO_API_KEY || '').trim()
  const blocked = privacySignalEnabled(navigatorLike) || isAutomatedBrowser(navigatorLike)

  return {
    enabled: Boolean(enabled && collectorUrl && apiKey.length >= 16 && !blocked),
    collectorUrl,
    apiKey,
    sampleRate: clampSampleRate(env.VITE_FARO_SESSION_SAMPLE_RATE),
    environment: env.VITE_DEPLOYMENT_ENVIRONMENT || (env.PROD === true ? 'production' : 'development'),
    version: env.VITE_APP_VERSION || env.VITE_BUILD_VERSION || BUILD_VERSION || 'development'
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function traceOrigins(env = import.meta.env) {
  const candidates = [
    ...DEFAULT_API_ORIGINS,
    env.VITE_API_BASE,
    env.VITE_AUTH_API_BASE
  ]

  return [...new Set(candidates.filter(Boolean).flatMap((candidate) => {
    try {
      const url = new URL(candidate, globalThis.location?.origin)
      if (!['http:', 'https:'].includes(url.protocol)) return []
      return [url.origin]
    } catch {
      return []
    }
  }))].map((origin) => new RegExp(`^${escapeRegExp(origin)}(?:/|$)`))
}

function routeViewName(route) {
  const routeRecord = route?.matched?.[route.matched.length - 1]
  return String(routeRecord?.path || route?.name || 'unknown').slice(0, 120)
}

function flushPendingErrors() {
  if (!faroInstance) return
  pendingErrors.splice(0).forEach(({ error, context }) => {
    faroInstance.api.pushError(error, { context })
  })
}

export function captureStorefrontError(error, context = {}) {
  const config = resolveTelemetryConfig()
  if (!config.enabled) return

  const safeError = sanitizeError(error)
  const safeContext = sanitizeTelemetryItem({ ...context }) || {}
  if (faroInstance) {
    faroInstance.api.pushError(safeError, { context: safeContext })
    return
  }

  if (pendingErrors.length < 5) pendingErrors.push({ error: safeError, context: safeContext })
}

export function initializeStorefrontTelemetry(router) {
  if (initializationPromise) return initializationPromise

  const config = resolveTelemetryConfig()
  if (!config.enabled) return Promise.resolve(null)

  initializationPromise = Promise.all([
    import('@grafana/faro-web-sdk'),
    import('@grafana/faro-web-tracing')
  ]).then(([{ getWebInstrumentations, initializeFaro }, { TracingInstrumentation }]) => {
    faroInstance = initializeFaro({
      url: config.collectorUrl,
      apiKey: config.apiKey,
      app: {
        name: 'ldstore-web',
        version: config.version,
        environment: config.environment
      },
      sessionTracking: {
        samplingRate: config.sampleRate
      },
      instrumentations: [
        ...getWebInstrumentations({ captureConsole: false }),
        new TracingInstrumentation({
          instrumentationOptions: {
            propagateTraceHeaderCorsUrls: traceOrigins()
          }
        })
      ],
      beforeSend(item) {
        try {
          return sanitizeTelemetryItem(item)
        } catch {
          return null
        }
      }
    })

    const updateView = (route) => faroInstance?.api.setView({ name: routeViewName(route) })
    updateView(router?.currentRoute?.value)
    router?.afterEach((to) => updateView(to))
    flushPendingErrors()
    return faroInstance
  }).catch(() => {
    faroInstance = null
    pendingErrors.splice(0)
    return null
  })

  return initializationPromise
}
