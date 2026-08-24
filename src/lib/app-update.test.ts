import { describe, expect, it } from 'vitest'
import { isRemoteVersionNewer } from './app-update'

describe('isRemoteVersionNewer', () => {
  it('detects any version change as newer', () => {
    expect(isRemoteVersionNewer('1.336', '1.333')).toBe(true)
    expect(isRemoteVersionNewer('1.336', '1.336')).toBe(false)
  })
})
