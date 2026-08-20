import { describe, expect, it, vi } from 'vitest'
import {
  MAX_PRODUCT_IMAGE_URL_LENGTH,
  getProductImageUrlError,
  preloadProductImage
} from '../src/utils/productImageValidation'

describe('物品图片链接校验', () => {
  it('接受 HTTPS 动态图片地址，不强制要求文件后缀', () => {
    expect(getProductImageUrlError('https://images.example.com/render?id=42')).toBe('')
    expect(getProductImageUrlError('HTTPS://images.example.com/photo')).toBe('')
  })

  it('按主机名拦截 linux.do 图床但不误伤查询参数', () => {
    expect(getProductImageUrlError('https://LINUX.DO/photo.jpg')).toContain('linux.do')
    expect(getProductImageUrlError('https://img.linux.do/photo.jpg')).toContain('linux.do')
    expect(getProductImageUrlError('https://example.com/photo.jpg?source=linux.do')).toBe('')
  })

  it('拒绝非 HTTPS、非法和超长链接', () => {
    expect(getProductImageUrlError('http://example.com/photo.jpg')).toContain('HTTPS')
    expect(getProductImageUrlError('not-a-url')).toContain('格式无效')
    expect(getProductImageUrlError(`https://example.com/${'a'.repeat(MAX_PRODUCT_IMAGE_URL_LENGTH)}`)).toContain('不能超过')
  })
})

describe('物品图片预加载', () => {
  it('使用显式图片构造器并在加载完成后返回图片', async () => {
    class FakeImage {
      set src(value) {
        this.currentSrc = value
        Promise.resolve().then(() => this.onload?.())
      }
    }

    const image = await preloadProductImage('https://example.com/photo', {
      ImageConstructor: FakeImage,
      timeout: 50
    })

    expect(image.currentSrc).toBe('https://example.com/photo')
  })

  it('加载失败时清理定时器并返回明确错误', async () => {
    vi.useFakeTimers()
    class BrokenImage {
      set src(_value) {
        Promise.resolve().then(() => this.onerror?.())
      }
    }

    const result = preloadProductImage('https://example.com/broken', {
      ImageConstructor: BrokenImage,
      timeout: 10000
    })
    await expect(result).rejects.toThrow('图片加载失败')
    expect(vi.getTimerCount()).toBe(0)
    vi.useRealTimers()
  })
})
