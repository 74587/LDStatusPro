export const MAX_PRODUCT_IMAGE_URL_LENGTH = 2048

function isBlockedImageHost(hostname) {
  const normalizedHost = String(hostname || '').toLowerCase()
  return normalizedHost === 'linux.do' || normalizedHost.endsWith('.linux.do')
}

export function getProductImageUrlError(value, { required = false } = {}) {
  const url = String(value || '').trim()

  if (!url) return required ? '请填写物品图片链接' : ''
  if (url.length > MAX_PRODUCT_IMAGE_URL_LENGTH) {
    return `图片链接不能超过 ${MAX_PRODUCT_IMAGE_URL_LENGTH} 个字符`
  }

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return '图片链接必须使用 HTTPS'
    if (isBlockedImageHost(parsed.hostname)) {
      return '不支持使用 linux.do 图床，请使用其他图床服务'
    }
    return ''
  } catch {
    return '图片链接格式无效'
  }
}

export function preloadProductImage(
  url,
  { ImageConstructor = globalThis.Image, timeout = 10000 } = {}
) {
  return new Promise((resolve, reject) => {
    if (typeof ImageConstructor !== 'function') {
      reject(new Error('当前环境不支持图片预加载'))
      return
    }

    const image = new ImageConstructor()
    let settled = false

    const finish = (callback, value) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      image.onload = null
      image.onerror = null
      callback(value)
    }

    const timeoutId = setTimeout(() => {
      finish(reject, new Error('图片加载超时'))
      image.src = ''
    }, timeout)

    image.onload = () => finish(resolve, image)
    image.onerror = () => finish(reject, new Error('图片加载失败'))
    image.src = url
  })
}
