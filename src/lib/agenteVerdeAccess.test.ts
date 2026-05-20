import { describe, it, expect } from 'vitest'
import { hasAgenteVerdeAccess, AGENTE_VERDE_ALLOWED_EMAILS } from './agenteVerdeAccess'

describe('hasAgenteVerdeAccess', () => {
  it('retorna false para email null', () => {
    expect(hasAgenteVerdeAccess(null)).toBe(false)
  })

  it('retorna false para email undefined', () => {
    expect(hasAgenteVerdeAccess(undefined)).toBe(false)
  })

  it('retorna false para email vazio', () => {
    expect(hasAgenteVerdeAccess('')).toBe(false)
  })

  it('retorna false para email não autorizado', () => {
    expect(hasAgenteVerdeAccess('aleatorio@gmail.com')).toBe(false)
  })

  it('retorna true para email autorizado', () => {
    const primeiro = AGENTE_VERDE_ALLOWED_EMAILS[0]
    expect(hasAgenteVerdeAccess(primeiro)).toBe(true)
  })

  it('é case-insensitive', () => {
    const primeiro = AGENTE_VERDE_ALLOWED_EMAILS[0]
    expect(hasAgenteVerdeAccess(primeiro.toUpperCase())).toBe(true)
  })

  it('whitelist inclui bessalfs@gmail.com', () => {
    expect(hasAgenteVerdeAccess('bessalfs@gmail.com')).toBe(true)
  })
})
