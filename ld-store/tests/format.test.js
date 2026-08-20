import { describe, expect, it } from 'vitest'
import { formatCompactCount } from '../src/utils/format'

describe('紧凑计数格式', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1 k'],
    [1050, '1.1 k'],
    [23099, '23.1 k'],
    [45623, '45.6 k'],
    [100000, '100 k'],
    ['1200', '1.2 k'],
    [-12, '0'],
    ['invalid', '0']
  ])('将 %s 格式化为 %s', (value, expected) => {
    expect(formatCompactCount(value)).toBe(expected)
  })
})
