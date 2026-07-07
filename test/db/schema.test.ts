import { describe, it, expect } from 'vitest'
import { users, roleEnum } from '@/db/schema'

describe('database schema', () => {
  it('should define users table with correct columns', () => {
    expect(users.id).toBeDefined()
    expect(users.name).toBeDefined()
    expect(users.email).toBeDefined()
    expect(users.password).toBeDefined()
    expect(users.role).toBeDefined()
    expect(users.createdAt).toBeDefined()
    expect(users.updatedAt).toBeDefined()
  })

  it('should define role enum with correct values', () => {
    const enumValues = roleEnum.enumValues
    expect(enumValues).toContain('client')
    expect(enumValues).toContain('technician')
    expect(enumValues).toContain('supportmanager')
    expect(enumValues).toContain('admin')
  })

  it('should have role default to client', () => {
    expect(users.role.default).toBe('client')
  })

  it('should have id as primary key with auto-increment', () => {
    expect(users.id.primary).toBe(true)
    expect(users.id.hasDefault).toBe(true)
  })

  it('should have email as unique', () => {
    expect(users.email.isUnique).toBe(true)
  })
})
