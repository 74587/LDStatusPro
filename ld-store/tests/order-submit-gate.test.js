import { describe, expect, it } from 'vitest'
import { createSubmissionGate } from '../src/utils/submissionGate'

describe('订单确认提交锁', () => {
  it('快速重复触发时只允许第一个请求进入', () => {
    const gate = createSubmissionGate()

    expect(gate.tryLock()).toBe(true)
    expect(gate.tryLock()).toBe(false)
    expect(gate.tryLock()).toBe(false)
    expect(gate.isLocked()).toBe(true)
  })

  it('请求完成后允许用户重试', () => {
    const gate = createSubmissionGate()

    expect(gate.tryLock()).toBe(true)
    gate.unlock()
    expect(gate.isLocked()).toBe(false)
    expect(gate.tryLock()).toBe(true)
  })
})
