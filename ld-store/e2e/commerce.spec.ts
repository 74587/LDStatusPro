import { test, expect, signIn } from './fixtures'

const confirm = (page: import('@playwright/test').Page) => page.locator('.confirm-button:visible').last()

test('login guard, OAuth callback and logout use the real route flow', async ({ page }) => {
  await page.goto('/checkout/7')
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await page.locator('.checkbox-custom').click()
  await expect(page.getByRole('checkbox')).toBeChecked()
  await page.getByRole('button', { name: '使用 Linux.do 账号登录' }).click()
  await expect(page).toHaveURL(/\/checkout\/7$/)
  await expect(confirm(page)).toBeEnabled()
  await page.getByRole('button', { name: '返回物品详情' }).click()
  await expect(page.getByRole('button', { name: '已收藏', exact: true })).toBeVisible()
  await page.locator('[aria-controls="header-user-menu"]').click()
  await page.getByRole('button', { name: '退出登录' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.locator('a[href="/product/7"]').first().click()
  await expect(page.getByRole('button', { name: '收藏', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '已收藏', exact: true })).toHaveCount(0)
  await page.goto('/checkout/7')
  await expect(page).toHaveURL(/\/login/)
})

test('lost response recovers the original order and never submits twice', async ({ page, scenario }) => {
  await signIn(page)
  scenario.lostResponse = true
  await page.goto('/product/7')
  await page.locator('.buy-btn:visible').filter({ hasText: '立即兑换' }).last().click()
  await expect(page).toHaveURL(/\/checkout\/7$/)
  await confirm(page).click()
  await expect(page).toHaveURL(/\/order\/E2E_ORDER_31/)
  expect(scenario.submissions).toHaveLength(1)
  expect(scenario.submissions[0].submissionToken).toMatch(/^ord_/)
  await expect(page.getByText('E2E_ORDER_31', { exact: true }).first()).toBeVisible()
})

test('reload retains an uncertain order and resumes without creating a new intent', async ({ page, scenario }, testInfo) => {
  await signIn(page)
  scenario.lostResponse = true
  scenario.lookupAvailable = false
  await page.goto('/checkout/7')
  await confirm(page).click()
  await expect(page.getByRole('button', { name: '确认并继续本次订单' })).toBeEnabled()
  await page.screenshot({ path: testInfo.outputPath('uncertain-order.png'), fullPage: true })
  await page.reload()
  await expect(page.getByRole('button', { name: '确认并继续本次订单' })).toBeEnabled()
  scenario.lookupAvailable = true
  await page.getByRole('button', { name: '确认并继续本次订单' }).click()
  await expect(page).toHaveURL(/\/order\/E2E_ORDER_31/)
  expect(scenario.submissions).toHaveLength(1)
})

test('price changes require renewed confirmation before creation', async ({ page, scenario }) => {
  await signIn(page)
  scenario.priceChanged = true
  await page.goto('/checkout/7')
  await confirm(page).click()
  await expect(page.getByRole('alert').filter({ hasText: '物品价格或优惠券刚刚发生变化' })).toBeVisible()
  expect(scenario.submissions).toHaveLength(0)
  await expect(confirm(page)).toBeEnabled()
  await confirm(page).click()
  await expect(page).toHaveURL(/\/order\/E2E_ORDER_31/)
  expect(scenario.submissions[0].expectedAmount).toBe(12)
})

test('blocked payment popup still leads to an actionable order detail', async ({ page, scenario }) => {
  await signIn(page)
  await page.addInitScript(() => { window.open = () => null })
  await page.goto('/checkout/7')
  await confirm(page).click()
  await expect(page).toHaveURL(/\/order\/E2E_ORDER_31/)
  await expect(page.getByRole('button', { name: /立即支付/ }).first()).toBeVisible()
  expect(scenario.submissions).toHaveLength(1)
})

test('catalog filters recover from errors and survive a detail round trip', async ({ page, scenario }, testInfo) => {
  await page.goto('/')
  const mobile = testInfo.project.name === 'mobile'
  if (mobile) {
    await page.getByRole('button', { name: '筛选物品', exact: true }).click()
    await page.getByLabel('最低价', { exact: true }).fill('5')
    scenario.failFilter = true
    await page.getByRole('button', { name: '应用筛选' }).click()
    await expect(page.getByRole('dialog', { name: '筛选物品' })).toBeVisible()
    scenario.failFilter = false
    await page.getByRole('button', { name: '应用筛选' }).click()
    await expect(page.getByRole('dialog', { name: '筛选物品' })).not.toBeVisible()
  } else {
    await page.locator('#home-price-min').fill('5')
    await page.getByRole('button', { name: '筛选', exact: true }).click()
  }
  await expect.poll(() => scenario.reads.some(query => query.includes('priceMin=5'))).toBe(true)
  await page.locator('a[href="/product/7"]').first().click()
  await expect(page).toHaveURL(/\/product\/7/)
  await page.goBack()
  await expect(page.locator('a[href="/product/7"]').first()).toBeVisible()
  if (mobile) await expect(page.getByRole('button', { name: /筛选，已启用/ })).toBeVisible()
  else await expect(page.locator('#home-price-min')).toHaveValue('5')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})
