import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const REQUIRED_TOKENS = [
  '--surface-canvas',
  '--surface-card',
  '--surface-elevated',
  '--surface-subtle',
  '--surface-overlay',
  '--text-primary-semantic',
  '--text-secondary-semantic',
  '--text-muted-semantic',
  '--text-inverse',
  '--text-link',
  '--border-default-semantic',
  '--border-strong-semantic',
  '--border-interactive',
  '--focus-ring',
  '--action-primary',
  '--action-secondary',
  '--action-danger',
  '--status-success',
  '--status-warning',
  '--status-danger',
  '--status-info',
  '--elevation-sm',
  '--radius-md',
  '--space-4',
  '--font-sans',
  '--motion-duration-fast',
  '--ui-density',
  '--page-max',
  '--page-gutter',
  '--section-gap',
  '--grid-gap',
  '--header-control-size',
  '--text-display',
  '--card-cover-h',
  '--banner-pad',
  '--detail-pad'
]

export const CONTRACT_LAYOUT_FILES = [
  'src/styles/tokens.css',
  'src/styles/main.css',
  'src/components/layout/AppHeader.vue',
  'src/components/layout/AppFooter.vue',
  'src/views/Home.vue',
  'src/components/product/ProductCard.vue',
  'src/components/product/PurchaseLimitSelector.vue',
  'src/components/home/ProductsMarketplace.vue',
  'src/components/home/StoresMarketplace.vue',
  'src/components/home/BuyRequestMarketplace.vue',
  'src/components/home/HotboardMarketplace.vue',
  'src/components/home/HotboardProductRow.vue',
  'src/components/home/CatalogFilterSheet.vue',
  'src/components/common/LiquidTabs.vue',
  'src/components/common/Dialog.vue',
  'src/components/common/Toast.vue',
  'src/components/common/ThemeToggle.vue',
  'src/components/common/CornerActionMenu.vue',
  'src/components/common/StarRatingInput.vue',
  'src/components/common/AnnouncementBar.vue',
  'src/components/common/AnnouncementPopup.vue',
  'src/App.vue',
  'src/views/Login.vue',
  'src/views/NotFound.vue',
  'src/views/Maintenance.vue',
  'src/views/Announcements.vue',
  'src/views/Docs.vue',
  'src/components/docs/doc-styles.css',
  'src/components/shop/ShopCard.vue',
  'src/views/Search.vue',
  'src/views/Category.vue',
  'src/views/ProductDetail.vue',
  'src/components/product-detail/ProductMedia.vue',
  'src/components/product-detail/ProductInteractionPanel.vue',
  'src/components/checkout/CouponPickerDialog.vue',
  'src/views/OrderConfirm.vue',
  'src/views/Orders.vue',
  'src/views/OrderDetail.vue',
  'src/views/User.vue',
  'src/views/BuyRequestDetail.vue',
  'src/views/BuyOrderDetail.vue',
  'src/views/MyBuyRequests.vue',
  'src/views/MyCoupons.vue',
  'src/views/MyFavorites.vue',
  'src/views/MyBuyChats.vue',
  'src/views/ShopDetail.vue',
  'src/views/Support.vue',
  'src/views/Settings.vue',
  'src/views/CouponClaim.vue',
  'src/views/MerchantProfile.vue',
  'src/views/MyReports.vue',
  'src/views/MyReportDetail.vue'
]

const ALLOWED_MIN_WIDTH = new Set([360, 640, 768, 1024, 1280, 1440])
const ALLOWED_MAX_WIDTH = new Set([359, 639, 767, 1023, 1279, 1439])
const ALLOWED_MAX_HEIGHT = new Set([800])

function layoutQueryViolations(relativePath, source) {
  const violations = []
  for (const match of source.matchAll(/@media([^{]+)\{/g)) {
    const query = match[1]
    for (const dimension of query.matchAll(/(min|max)-(width|height)\s*:\s*(\d+)px/gi)) {
      const edge = dimension[1].toLowerCase()
      const axis = dimension[2].toLowerCase()
      const value = Number(dimension[3])
      const allowed = axis === 'width'
        ? (edge === 'min' ? ALLOWED_MIN_WIDTH : ALLOWED_MAX_WIDTH)
        : (edge === 'max' ? ALLOWED_MAX_HEIGHT : new Set())
      if (!allowed.has(value)) {
        violations.push(
          `${relativePath}:${lineNumber(source, match.index)} layout media ${edge}-${axis}:${value}px is outside the breakpoint contract`
        )
      }
    }
  }
  return violations
}

const CONTRAST_PAIRS = [
  ['--text-primary-semantic', '--surface-canvas', 4.5],
  ['--text-primary-semantic', '--surface-card', 4.5],
  ['--text-secondary-semantic', '--surface-canvas', 4.5],
  ['--text-secondary-semantic', '--surface-card', 4.5],
  ['--text-muted-semantic', '--surface-card', 4.5],
  ['--focus-ring', '--surface-canvas', 3],
  ['--focus-ring', '--surface-card', 3],
  ['--border-interactive', '--surface-canvas', 3],
  ['--action-primary-text', '--action-primary', 4.5],
  ['--action-danger-text', '--action-danger', 4.5]
]

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(absolutePath)
    return /\.(?:vue|css|scss)$/.test(entry.name) ? [absolutePath] : []
  })
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length
}

function styleSources(filePath, source) {
  if (!filePath.endsWith('.vue')) return [{ source, offset: 0 }]
  const blocks = []
  const pattern = /<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g
  for (const match of source.matchAll(pattern)) {
    blocks.push({ source: match[1], offset: match.index + match[0].indexOf(match[1]) })
  }
  return blocks
}

function parseHexColor(value) {
  const digits = value.trim().slice(1)
  const normalized = digits.length === 3
    ? [...digits].map((digit) => digit.repeat(2)).join('')
    : digits
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null
  return [0, 2, 4].map((start) => Number.parseInt(normalized.slice(start, start + 2), 16) / 255)
}

function relativeLuminance(rgb) {
  const linear = rgb.map((channel) => (
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  ))
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2])
}

function contrastRatio(left, right) {
  const leftRgb = parseHexColor(left)
  const rightRgb = parseHexColor(right)
  if (!leftRgb || !rightRgb) return null
  const leftLuminance = relativeLuminance(leftRgb)
  const rightLuminance = relativeLuminance(rightRgb)
  return (Math.max(leftLuminance, rightLuminance) + 0.05)
    / (Math.min(leftLuminance, rightLuminance) + 0.05)
}

function declarations(block) {
  return new Map(
    [...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)]
      .map((match) => [match[1], match[2].trim()])
  )
}

function findThemeBlock(tokens, selector) {
  const start = tokens.indexOf(`${selector} {`)
  if (start < 0) return ''
  const bodyStart = tokens.indexOf('{', start) + 1
  let depth = 1
  for (let index = bodyStart; index < tokens.length; index += 1) {
    if (tokens[index] === '{') depth += 1
    if (tokens[index] === '}') depth -= 1
    if (depth === 0) return tokens.slice(bodyStart, index)
  }
  return ''
}

export function validateStylePolicy({ rootDir = path.resolve(import.meta.dirname, '..') } = {}) {
  const sourceRoot = path.join(rootDir, 'src')
  const tokenFile = path.join(sourceRoot, 'styles', 'tokens.css')
  const violations = []
  const files = walk(sourceRoot)

  for (const filePath of files) {
    if (filePath.endsWith('theme-bootstrap.css')) continue
    const source = fs.readFileSync(filePath, 'utf8')
    const relativePath = path.relative(rootDir, filePath).split(path.sep).join('/')

    if (CONTRACT_LAYOUT_FILES.includes(relativePath)) {
      violations.push(...layoutQueryViolations(relativePath, source))
    }

    if (filePath === tokenFile) continue

    const rawColorPattern = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\([^\n)]*\)/g
    for (const match of source.matchAll(rawColorPattern)) {
      if (!match[0].startsWith('#')) {
        const body = match[0].slice(match[0].indexOf('(') + 1, -1)
        if (!/^[\d\s.,/%+-]+$/.test(body)) continue
      }
      violations.push(`${relativePath}:${lineNumber(source, match.index)} raw color ${match[0]}`)
    }

    for (const block of styleSources(filePath, source)) {
      const withoutWhiteSpaceProperties = block.source.replace(/white-space/g, '')
      for (const match of withoutWhiteSpaceProperties.matchAll(/(?<![-\w])(?:white|black)(?![-\w])/gi)) {
        violations.push(`${relativePath}:${lineNumber(source, block.offset + match.index)} named raw color ${match[0]}`)
      }

      for (const match of block.source.matchAll(/transition\s*:\s*all\b|\btransition-all\b/g)) {
        violations.push(`${relativePath}:${lineNumber(source, block.offset + match.index)} broad transition ${match[0]}`)
      }
    }
  }

  const tokens = fs.readFileSync(tokenFile, 'utf8')
  const lightTokens = declarations(findThemeBlock(tokens, ':root'))
  const darkTokens = declarations(findThemeBlock(tokens, 'html.dark'))

  for (const name of REQUIRED_TOKENS) {
    if (!lightTokens.has(name)) violations.push(`src/styles/tokens.css missing ${name} in :root`)
    if (!darkTokens.has(name) && [
      '--surface-canvas',
      '--surface-card',
      '--text-primary-semantic',
      '--text-secondary-semantic',
      '--text-muted-semantic',
      '--focus-ring',
      '--border-interactive',
      '--action-primary',
      '--action-danger'
    ].includes(name)) {
      violations.push(`src/styles/tokens.css missing ${name} in html.dark`)
    }
  }

  for (const [theme, values] of [['light', lightTokens], ['dark', darkTokens]]) {
    for (const [foreground, background, minimum] of CONTRAST_PAIRS) {
      const ratio = contrastRatio(values.get(foreground), values.get(background))
      if (ratio === null || ratio < minimum) {
        violations.push(`${theme} contrast ${foreground}/${background} is ${ratio?.toFixed(2) || 'unresolved'}; expected >= ${minimum}`)
      }
    }
  }

  return { files: files.length, violations }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = validateStylePolicy()
  if (result.violations.length) {
    console.error(`Style token policy failed with ${result.violations.length} violation(s):`)
    for (const violation of result.violations) console.error(`- ${violation}`)
    process.exit(1)
  }
  console.log(`Style token policy passed for ${result.files} source files.`)
}
