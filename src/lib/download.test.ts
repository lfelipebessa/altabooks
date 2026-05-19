import { describe, it, expect } from 'vitest'
import { slug, filename } from './download'

describe('slug', () => {
  it('lowercases e troca espaços por hifens', () => {
    expect(slug('Café com Teu Pai')).toBe('cafe-com-teu-pai')
  })

  it('remove acentos e cedilhas', () => {
    expect(slug('Tradução em Português')).toBe('traducao-em-portugues')
  })

  it('colapsa múltiplos separadores', () => {
    expect(slug('A  B   C__D')).toBe('a-b-c-d')
  })

  it('remove hifens nas extremidades', () => {
    expect(slug('  hello!  ')).toBe('hello')
  })

  it('lida com string vazia', () => {
    expect(slug('')).toBe('')
  })
})

describe('filename', () => {
  it('monta padrão {slug}-{kind}-{YYYYMMDD}.{ext}', () => {
    const result = filename('Café com Teu Pai', 'livro', 'docx', new Date('2026-05-19T12:00:00Z'))
    expect(result).toBe('cafe-com-teu-pai-livro-20260519.docx')
  })

  it('usa data atual quando não fornecida', () => {
    const result = filename('Foo', 'executivo', 'pdf')
    expect(result).toMatch(/^foo-executivo-\d{8}\.pdf$/)
  })
})
