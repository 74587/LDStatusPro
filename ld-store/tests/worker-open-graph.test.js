import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, {
  canonicalizePageUrl,
  handleOembed,
  injectMetadataIntoHtml,
  resolvePageMetadata
} from '../public/_worker.js'

const env = {
  LD_STORE_SITE_URL: 'https://ldcstore.com/',
  LD_STORE_META_API_BASE: 'https://api2.example.com'
}

const productMetadata = {
  kind: 'product',
  canonicalPath: '/product/42',
  title: '测试商品 & 服务 - LD士多',
  description: '商品描述',
  ogType: 'product',
  revision: 'abc123',
  image: {
    path: '/og/product/42.png?v=abc123',
    alt: '测试商品分享图',
    type: 'image/png',
    width: 1200,
    height: 630
  },
  product: {
    priceAmount: '80.00',
    priceCurrency: 'LDC',
    availability: 'in stock'
  }
}

function apiResponse(data = productMetadata, status = 200) {
  return new Response(JSON.stringify(status === 200
    ? { success: true, data }
    : { success: false, error: { code: 'SHARE_NOT_FOUND', status } }), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

function htmlAsset() {
  return new Response(`<!doctype html><html><head>
    <title>旧标题</title><title>重复标题</title>
    <meta name="description" content="旧描述">
    <meta name="robots" content="index">
    <meta property="og:title" content="旧标题">
    <meta property="og:title" content="重复标题">
    <meta property="product:price:amount" content="1">
    <link rel="canonical" href="https://old.example/path">
    <link rel="alternate" type="application/json+oembed" href="/old.json">
  </head><body><div id="app"></div></body></html>`, {
    headers: { 'content-type': 'text/html', 'content-length': '999' }
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Open Graph canonical URLs', () => {
  it('removes tracking and presentation queries from content routes', () => {
    expect(canonicalizePageUrl('https://ldcstore.com/product/42/?utm_source=linuxdo&tab=comments', env))
      .toBe('https://ldcstore.com/product/42')
  })

  it('keeps only the search keyword on search pages', () => {
    expect(canonicalizePageUrl('https://ldcstore.com/search?q=AI+service&page=3&sort=price', env))
      .toBe('https://ldcstore.com/search?q=AI+service')
  })
})

describe('share metadata resolution', () => {
  it.each([
    '/product/42',
    '/merchant/alice',
    '/shop/7',
    '/buy-request/9',
    '/coupon/coupon-token',
    '/category/AI%20%E6%9C%8D%E5%8A%A1'
  ])('uses the unified side-effect-free endpoint for %s', async path => {
    const fetchMock = vi.fn(async () => apiResponse({
      ...productMetadata,
      canonicalPath: path,
      image: { ...productMetadata.image, path: `/og/product/42.png?v=abc123` }
    }))
    vi.stubGlobal('fetch', fetchMock)
    const metadata = await resolvePageMetadata(`https://ldcstore.com${path}?utm_source=linuxdo`, env)
    expect(metadata.notFound).toBe(false)
    expect(metadata.image).toBe('https://ldcstore.com/og/product/42.png?v=abc123')
    const calledUrl = new URL(fetchMock.mock.calls[0][0])
    expect(calledUrl.pathname).toBe('/api/shop/share-meta')
    expect(calledUrl.searchParams.get('path')).toBe(path)
  })

  it('distinguishes a real 404 from a transient upstream failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => apiResponse(null, 404)))
    const missing = await resolvePageMetadata('https://ldcstore.com/product/404', env)
    expect(missing).toMatchObject({ notFound: true, title: '页面未找到 - LD士多' })

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout') }))
    const unavailable = await resolvePageMetadata('https://ldcstore.com/product/42', env)
    expect(unavailable).toMatchObject({ notFound: false, title: '商品详情 - LD士多' })
  })

  it('does not trust malformed or cross-origin image metadata', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => apiResponse({
      ...productMetadata,
      image: { ...productMetadata.image, path: 'https://evil.example/track.png' }
    })))
    const metadata = await resolvePageMetadata('https://ldcstore.com/product/42', env)
    expect(metadata.title).toBe('商品详情 - LD士多')
    expect(metadata.image).not.toContain('evil.example')
  })

  it('drops malformed product pricing fields instead of injecting them', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => apiResponse({
      ...productMetadata,
      product: { priceAmount: 'free', priceCurrency: 'USD', availability: 'unknown' }
    })))
    const metadata = await resolvePageMetadata('https://ldcstore.com/product/42', env)
    expect(metadata.product).toBeNull()
  })

  it('uses query-aware static metadata and a real not-found state for unknown routes', async () => {
    const search = await resolvePageMetadata('https://ldcstore.com/search?q=%E4%BA%91%E6%9C%8D%E5%8A%A1&page=2', env)
    expect(search.title).toBe('搜索「云服务」 - LD士多')
    expect(search.url).toBe('https://ldcstore.com/search?q=%E4%BA%91%E6%9C%8D%E5%8A%A1')
    expect((await resolvePageMetadata('https://ldcstore.com/not-a-route', env)).notFound).toBe(true)
  })
})

describe('HTML metadata injection', () => {
  it('emits one complete OG/Twitter/canonical set and product fields', async () => {
    const metadata = {
      title: '测试商品 & 服务 - LD士多',
      description: '商品描述',
      ogType: 'product',
      url: 'https://ldcstore.com/product/42',
      siteName: 'LD士多',
      image: 'https://ldcstore.com/og/product/42.png?v=abc123',
      imageAlt: '测试商品分享图',
      imageType: 'image/png',
      imageWidth: 1200,
      imageHeight: 630,
      locale: 'zh_CN',
      twitterCard: 'summary_large_image',
      product: productMetadata.product
    }
    const output = injectMetadataIntoHtml(await htmlAsset().text(), metadata, env)
    for (const marker of [
      '<title>', 'name="description"', 'name="robots"', 'rel="canonical"',
      'property="og:title"', 'property="og:image:secure_url"', 'property="og:image:type"',
      'property="og:image:width"', 'property="og:image:height"', 'property="og:image:alt"',
      'name="twitter:image:alt"', 'property="product:price:amount"',
      'property="product:price:currency"', 'property="product:availability"',
      'type="application/json+oembed"'
    ]) {
      expect(output.split(marker)).toHaveLength(2)
    }
    expect(output).toContain('<title>测试商品 &amp; 服务 - LD士多</title>')
    expect(output).toContain('content="noindex, nofollow, noarchive"')
    expect(output).toContain('content="1200"')
    expect(output).toContain('content="630"')
    expect(output).toContain('content="80.00"')
  })

  it('removes stale product fields from non-product pages', async () => {
    const base = await htmlAsset().text()
    const output = injectMetadataIntoHtml(base, {
      title: '首页', description: '描述', ogType: 'website', url: 'https://ldcstore.com/',
      siteName: 'LD士多', image: 'https://ldcstore.com/og/default/base.png', imageAlt: '首页',
      imageType: 'image/png', imageWidth: 1200, imageHeight: 630, locale: 'zh_CN', product: null
    }, env)
    expect(output).not.toContain('product:price:amount')
  })
})

describe('Worker responses and oEmbed', () => {
  it('returns rewritten HTML with no-store/noindex and preserves HEAD semantics', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => apiResponse()))
    const workerEnv = { ...env, ASSETS: { fetch: vi.fn(async () => htmlAsset()) } }
    const response = await worker.fetch(new Request('https://ldcstore.com/product/42'), workerEnv)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive')
    expect(response.headers.get('content-length')).toBeNull()
    expect(await response.text()).toContain('property="og:title"')

    const head = await worker.fetch(new Request('https://ldcstore.com/product/42', { method: 'HEAD' }), workerEnv)
    expect(head.status).toBe(200)
    expect(await head.text()).toBe('')
  })

  it('returns HTTP 404 only for confirmed missing or unknown pages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => apiResponse(null, 404)))
    const workerEnv = { ...env, ASSETS: { fetch: vi.fn(async () => htmlAsset()) } }
    expect((await worker.fetch(new Request('https://ldcstore.com/product/404'), workerEnv)).status).toBe(404)
    expect((await worker.fetch(new Request('https://ldcstore.com/unknown'), workerEnv)).status).toBe(404)
  })

  it('rejects cross-origin oEmbed targets and returns dynamic same-origin thumbnails', async () => {
    const invalid = await handleOembed(new Request('https://ldcstore.com/oembed.json?url=https%3A%2F%2Fevil.example%2F'), env)
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toEqual({ error: 'invalid_origin' })

    vi.stubGlobal('fetch', vi.fn(async () => apiResponse()))
    const valid = await handleOembed(new Request('https://ldcstore.com/oembed.json?url=https%3A%2F%2Fldcstore.com%2Fproduct%2F42'), env)
    expect(valid.status).toBe(200)
    expect(await valid.json()).toMatchObject({
      type: 'link',
      title: productMetadata.title,
      thumbnail_url: 'https://ldcstore.com/og/product/42.png?v=abc123',
      thumbnail_width: 1200,
      thumbnail_height: 630
    })
  })

  it('redirects legacy hosts without losing paths or queries', async () => {
    const response = await worker.fetch(new Request('https://ldst0re.qzz.io/product/42?from=old'), {
      ...env,
      ASSETS: { fetch: vi.fn() }
    })
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://ldcstore.com/product/42?from=old')
  })
})
