import { marked } from 'marked'
import { sanitizeHtml } from './sanitizeHtml'

// 商品描述渲染：基础 Markdown 子集（加粗 / 斜体 / 下划线 / 链接 / 列表 / 代码等）
// 与公告渲染共用 marked 实例；链接统一新标签页打开
marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens)
      const titleAttr = title ? ` title="${title}"` : ''
      return `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow"${titleAttr}>${text}</a>`
    }
  }
})

// ++下划线++（非标准 Markdown 扩展，GitLab 风格，在解析前转成 <u> 后交给 marked 透传 + DOMPurify 净化）
// 开标记要求位于行首或空白/括号后，避免把 "C++" 这类词中的 ++ 误判为下划线
const UNDERLINE_RE = /(^|[\s(（"'“])\+\+([\s\S]+?)\+\+(?!\+)/gs

export function renderProductDescription(description) {
  const raw = String(description ?? '').trim()
  if (!raw) return ''
  const withUnderline = raw.replace(UNDERLINE_RE, (_, prefix, text) => `${prefix}<u>${text}</u>`)
  return sanitizeHtml(marked.parse(withUnderline))
}

/**
 * 剥掉常见 Markdown 标记，得到纯文本（用于列表/卡片等单行截断预览）
 * @param {string} description
 * @returns {string}
 */
export function stripMarkdown(description) {
  return String(description ?? '')
    .replace(UNDERLINE_RE, '$1$2')
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/__(.+?)__/gs, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
}
