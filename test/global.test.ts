import { describe, it, expect } from 'vitest'

describe('global setup', () => {
  it('should have vitest configured correctly', () => {
    expect(true).toBe(true)
  })

  it('should have required env variables defined', () => {
    expect(process.env.DATABASE_URL).toBeDefined()
    expect(process.env.JWT_SECRET).toBeDefined()
  })
})
