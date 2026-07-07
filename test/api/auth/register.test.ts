import { describe, it, expect } from 'vitest'

const ROUTE_PATH = '@/app/api/auth/register/route'

describe('POST /api/auth/register', () => {
  it('should export a POST handler', async () => {
    let mod: Record<string, unknown>
    try {
      mod = await import(/* @vite-ignore */ ROUTE_PATH)
    } catch {
      throw new Error(
        `Route handler not found at ${ROUTE_PATH}. ` +
        'Implement app/api/auth/register/route.ts with a named POST export.'
      )
    }
    expect(typeof mod.POST).toBe('function')
  })

  it.todo('should return 201 and create a user on valid input')
  it.todo('should return 400 if email already exists')
  it.todo('should return 400 if required fields are missing')
  it.todo('should hash the password before storing')
})
