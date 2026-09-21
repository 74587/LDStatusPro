import { test, expect, signIn } from './fixtures'

function densityExpectation(width: number, height: number) {
  const standard = width >= 1280 && height > 800
  const compact = width >= 768 && !standard
  return {
    density: standard ? 'standard' : compact ? 'compact' : 'comfortable',
    columns: width >= 1024 ? 4 : width >= 768 ? 3 : 2,
    cover: standard ? 140 : compact ? 112 : 120,
    display: standard ? 28 : 22,
    footer: width < 768,
    search: width >= 768,
    identity: standard ? 'visible' : width >= 768 ? 'hidden' : 'absent'
  }
}

test('storefront density follows the breakpoint contract', async ({ page }) => {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('viewport is required')
  const expected = densityExpectation(viewport.width, viewport.height)

  await signIn(page)
  await page.goto('/')
  await expect(page.locator('.products-grid')).toBeVisible()
  await expect(page.locator('.product-card').first()).toBeVisible()

  const tokens = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    return {
      density: root.getPropertyValue('--ui-density').trim(),
      cover: Number.parseFloat(root.getPropertyValue('--card-cover-h')),
      display: Number.parseFloat(root.getPropertyValue('--text-display')),
      userWidth: root.getPropertyValue('--header-user-width').trim()
    }
  })
  expect(tokens.density).toBe(expected.density)
  expect(tokens.cover).toBe(expected.cover)
  expect(tokens.display).toBe(expected.display)

  const columns = await page.locator('.products-grid').evaluate((element) => (
    getComputedStyle(element).gridTemplateColumns.split(/\s+/).filter(Boolean).length
  ))
  expect(columns).toBe(expected.columns)

  const coverHeight = await page.locator('.product-cover').first().evaluate((element) => (
    Number.parseFloat(getComputedStyle(element).height)
  ))
  expect(coverHeight).toBe(expected.cover)

  await expect(page.locator('.app-footer')).toHaveCount(1)
  if (expected.footer) await expect(page.locator('.app-footer')).toBeVisible()
  else await expect(page.locator('.app-footer')).toBeHidden()

  if (expected.search) await expect(page.locator('.header-search')).toBeVisible()
  else await expect(page.locator('.header-search')).toHaveCount(0)

  if (expected.identity === 'absent') {
    await expect(page.locator('.user-identity')).toHaveCount(0)
  } else if (expected.identity === 'hidden') {
    await expect(page.locator('.user-identity')).toBeHidden()
    expect(tokens.userWidth).toBe('auto')
  } else {
    await expect(page.locator('.user-identity')).toBeVisible()
    expect(tokens.userWidth).toBe('180px')
  }

  if (expected.footer) {
    const filterHeight = await page.locator('.mobile-filter-trigger').evaluate((element) => (
      element.getBoundingClientRect().height
    ))
    expect(filterHeight).toBeGreaterThanOrEqual(44)
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})
