import { describe, it, expect } from 'vitest'

const ROUTE_PATH = '@/app/api/auth/login/route'

describe('POST /api/auth/login', () => {
  it('should export a POST handler', async () => {
    let mod: Record<string, unknown>
    try {
      mod = await import(/* @vite-ignore */ ROUTE_PATH)
    } catch {
      throw new Error(
        `Route handler not found at ${ROUTE_PATH}. ` +
        'Implement app/api/auth/login/route.ts with a named POST export.'
      )
    }
    expect(typeof mod.POST).toBe('function')
  })

  it.todo('should return 200 and a JWT on valid credentials')
  it.todo('should return 401 on invalid email')
  it.todo('should return 401 on wrong password')
  it.todo('should return the user role in the response body')
})
