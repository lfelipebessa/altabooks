import { describe, it, expect } from 'vitest'
import { buildExecutivoHtml, buildSumarioHtml, buildLivroHtml, buildTraducaoHtml } from './buildHtml'
import type { Projeto, Sumario, CapituloLivro, Traducao, CapituloTraducao } from '../types'

const baseProjeto: Projeto = {
  id: 'p1', nome_projeto: 'Café com Teu Pai', autor_nome: 'Breno Leonardi',
  drive_url: null, drive_executivo_url: null, conteudo_executivo: '<p>Conteúdo</p>',
  status: 'concluido', created_at: '2026-01-01T00:00:00Z', updated_at: null,
  qtd_capitulos: 13, qtd_subcapitulos_min: 2, qtd_subcapitulos_max: 4,
  paginas_min: 100, paginas_max: 200, auto_start: true, tipo: 'livro',
}

describe('buildExecutivoHtml', () => {
  it('envelopa conteudo_executivo com título e autor', () => {
    const html = buildExecutivoHtml(baseProjeto)
    expect(html).toContain('<h1>Café com Teu Pai</h1>')
    expect(html).toContain('Breno Leonardi')
    expect(html).toContain('<p>Conteúdo</p>')
  })

  it('lida com conteudo_executivo null', () => {
    const html = buildExecutivoHtml({ ...baseProjeto, conteudo_executivo: null })
    expect(html).toContain('<h1>Café com Teu Pai</h1>')
    expect(html).not.toContain('null')
  })
})

const baseSumario: Sumario = {
  id: 's1', projeto_id: 'p1', opcao: 2, abordagem: 'tematica',
  titulo_sumario: 'A Jornada do Pai',
  capitulos: [
    { numero: 1, titulo: 'Início', descricao: 'O começo', subassuntos: ['origem', 'contexto'] },
    { numero: 2, titulo: 'Meio',   descricao: 'A jornada', subassuntos: [] },
  ],
  drive_doc_id: null, drive_url: null, selecionado: false, conteudo: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: null,
}

describe('buildSumarioHtml', () => {
  it('renderiza título do projeto, opção, abordagem e título do sumário', () => {
    const html = buildSumarioHtml(baseSumario, baseProjeto)
    expect(html).toContain('Café com Teu Pai')
    expect(html).toContain('Opção 2')
    expect(html).toContain('Temática')
    expect(html).toContain('A Jornada do Pai')
  })

  it('renderiza cada capítulo com número, título e descrição', () => {
    const html = buildSumarioHtml(baseSumario, baseProjeto)
    expect(html).toContain('Capítulo 1: Início')
    expect(html).toContain('O começo')
    expect(html).toContain('Capítulo 2: Meio')
  })

  it('renderiza subassuntos como lista quando existem', () => {
    const html = buildSumarioHtml(baseSumario, baseProjeto)
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>origem</li>')
    expect(html).toContain('<li>contexto</li>')
  })

  it('lida com capitulos null', () => {
    const html = buildSumarioHtml({ ...baseSumario, capitulos: null }, baseProjeto)
    expect(html).toContain('Café com Teu Pai')
    expect(html).not.toContain('Capítulo')
  })
})

const baseCapitulos: CapituloLivro[] = [
  { id: 'c2', projeto_id: 'p1', sumario_id: 's1', numero: 2, titulo: 'Segundo',
    conteudo: '<p>HTML real</p>', resumo: '', palavras: 100, status: 'escrito',
    descricao: '', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c1', projeto_id: 'p1', sumario_id: 's1', numero: 1, titulo: 'Primeiro',
    conteudo: 'Texto plano\n\nSegundo parágrafo', resumo: '', palavras: 50, status: 'escrito',
    descricao: '', created_at: '2026-01-01T00:00:00Z' },
]

describe('buildLivroHtml', () => {
  it('inclui capa com nome do projeto e autor', () => {
    const html = buildLivroHtml(baseProjeto, baseCapitulos)
    expect(html).toContain('Café com Teu Pai')
    expect(html).toContain('Breno Leonardi')
  })

  it('ordena capítulos por numero ascendente', () => {
    const html = buildLivroHtml(baseProjeto, baseCapitulos)
    const idxCap1 = html.indexOf('Capítulo 1')
    const idxCap2 = html.indexOf('Capítulo 2')
    expect(idxCap1).toBeGreaterThan(-1)
    expect(idxCap2).toBeGreaterThan(idxCap1)
  })

  it('insere page-break antes de cada capítulo', () => {
    const html = buildLivroHtml(baseProjeto, baseCapitulos)
    const matches = html.match(/page-break-before:\s*always/g)
    expect(matches?.length).toBe(2)
  })

  it('converte texto plano para parágrafos HTML', () => {
    const html = buildLivroHtml(baseProjeto, baseCapitulos)
    expect(html).toContain('<p>Texto plano</p>')
    expect(html).toContain('<p>Segundo parágrafo</p>')
  })

  it('preserva conteúdo que já é HTML', () => {
    const html = buildLivroHtml(baseProjeto, baseCapitulos)
    expect(html).toContain('<p>HTML real</p>')
  })

  it('lida com array vazio de capítulos', () => {
    const html = buildLivroHtml(baseProjeto, [])
    expect(html).toContain('Café com Teu Pai')
    expect(html).not.toContain('Capítulo')
  })
})

const baseTraducao: Traducao = {
  id: 't1', projeto_id: 'p1', idioma: 'EN-US', status: 'concluido',
  drive_url: null, created_at: '2026-01-01T00:00:00Z', updated_at: null,
}

const baseCapitulosTrad: CapituloTraducao[] = [
  { id: 'ct2', traducao_id: 't1', numero: 2, titulo: 'Second', conteudo: '<p>HTML content</p>', created_at: '' },
  { id: 'ct1', traducao_id: 't1', numero: 1, titulo: 'First',  conteudo: 'Plain\n\ntext',         created_at: '' },
]

describe('buildTraducaoHtml', () => {
  it('inclui capa com nome do projeto, autor e idioma legível', () => {
    const html = buildTraducaoHtml(baseProjeto, baseTraducao, baseCapitulosTrad)
    expect(html).toContain('Café com Teu Pai')
    expect(html).toContain('Breno Leonardi')
    expect(html).toContain('Inglês (EUA)')
  })

  it('ordena capítulos por numero ascendente', () => {
    const html = buildTraducaoHtml(baseProjeto, baseTraducao, baseCapitulosTrad)
    const idx1 = html.indexOf('First')
    const idx2 = html.indexOf('Second')
    expect(idx1).toBeGreaterThan(-1)
    expect(idx2).toBeGreaterThan(idx1)
  })

  it('insere page-break antes de cada capítulo', () => {
    const html = buildTraducaoHtml(baseProjeto, baseTraducao, baseCapitulosTrad)
    expect(html.match(/page-break-before:\s*always/g)?.length).toBe(2)
  })
})
