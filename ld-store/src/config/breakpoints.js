/**
 * Storefront layout breakpoints.
 * CSS media queries must use these same pixel values; custom properties cannot
 * be interpolated into @media conditions.
 */
export const BP = Object.freeze({
  sm: 360,
  md: 640,
  lg: 768,
  xl: 1024,
  xxl: 1280,
  xxxl: 1440,
  shortHeight: 800
})

export function catalogColumns(width) {
  if (width >= BP.xl) return 4
  if (width >= BP.lg) return 3
  return 2
}

export function isMobileNav(width) {
  return width < BP.lg
}
