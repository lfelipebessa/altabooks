# Download de Artefatos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar download local (DOCX + PDF) dos artefatos gerados (Projeto Executivo, Sumários, Livro Completo, Tradução) na plataforma AltaBooks.

**Architecture:** Util compartilhada `src/lib/download.ts` (slug/filename/downloadDocx/downloadPdf) + builders puros `src/lib/buildHtml.ts` (um por artefato) + componente reusável `DownloadButton` com dropdown DOCX/PDF. PDF via `pdfmake + html-to-pdfmake`, lazy-loaded para não inflar o bundle inicial. DOCX mantém o helper HTML-wrapped-as-Word existente (extraído para a util).

**Tech Stack:** React 19 + TypeScript + Vite 7 + Tailwind 4 + pdfmake (novo, lazy) + html-to-pdfmake (novo, lazy) + vitest (já instalado, sem config ainda).

**Spec:** `docs/superpowers/specs/2026-05-19-download-artefatos-design.md`

---

## Resumo de arquivos

**Criar:**
- `src/lib/download.ts` — slug, filename, downloadDocx, downloadPdf
- `src/lib/buildHtml.ts` — buildExecutivoHtml, buildSumarioHtml, buildLivroHtml, buildTraducaoHtml
- `src/components/DownloadButton.tsx` — dropdown DOCX/PDF reusável
- `vitest.config.ts` — setup mínimo
- `src/lib/download.test.ts` — testes de slug e filename
- `src/lib/buildHtml.test.ts` — testes dos builders

**Modificar:**
- `package.json` — add pdfmake, html-to-pdfmake, scripts test/test:run
- `src/components/ExecutivoPanel.tsx` — remove `htmlToWordBlob` local, adiciona `DownloadButton` no header + dentro do banner de revisão
- `src/components/SumarioCard.tsx` — adiciona `DownloadButton` no header
- `src/pages/DetalheProjeto.tsx` — adiciona `DownloadButton` na aba Livro e em cada `TraducaoSetor`

---

## Task 1: Instalar dependências e configurar vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Instalar pdfmake e html-to-pdfmake (deps de runtime)**

Run: `npm install pdfmake html-to-pdfmake`
Expected: 2 pacotes adicionados em `dependencies`.

- [ ] **Step 2: Instalar @types/pdfmake e @types/html-to-pdfmake (dev)**

Run: `npm install -D @types/pdfmake @types/html-to-pdfmake`
Expected: 2 pacotes adicionados em `devDependencies`. Se @types/html-to-pdfmake não existir no npm, ignorar e seguir — a lib expõe seus próprios tipos.

- [ ] **Step 3: Criar vitest.config.ts**

Write file `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 4: Adicionar scripts test no package.json**

Editar `package.json`, adicionar dentro de `"scripts"`:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Verificar config rodando vitest com zero testes**

Run: `npm run test:run`
Expected: Vitest inicia, reporta "No test files found, exiting with code 0" ou similar (pode ser code 1 sem testes — aceitável). Sem erro de configuração.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add pdfmake/html-to-pdfmake and vitest config"
```

---

## Task 2: Util `download.ts` — slug e filename (com testes)

**Files:**
- Create: `src/lib/download.ts`
- Create: `src/lib/download.test.ts`

- [ ] **Step 1: Escrever testes falhando para slug e filename**

Write file `src/lib/download.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar testes para garantir que falham**

Run: `npm run test:run -- src/lib/download.test.ts`
Expected: FAIL com "Cannot find module './download'" ou similar.

- [ ] **Step 3: Implementar slug e filename**

Write file `src/lib/download.ts`:

```ts
export function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function filename(
  projetoNome: string,
  kind: string,
  ext: 'docx' | 'pdf',
  date: Date = new Date(),
): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${slug(projetoNome)}-${kind}-${yyyy}${mm}${dd}.${ext}`
}
```

- [ ] **Step 4: Rodar testes para garantir que passam**

Run: `npm run test:run -- src/lib/download.test.ts`
Expected: PASS — 7 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/download.ts src/lib/download.test.ts
git commit -m "feat(download): add slug and filename utilities"
```

---

## Task 3: Util `download.ts` — downloadDocx (HTML-wrapped-as-Word)

**Files:**
- Modify: `src/lib/download.ts`

- [ ] **Step 1: Adicionar função downloadDocx**

Editar `src/lib/download.ts`, adicionar no final do arquivo:

```ts
const wrapDocxHtml = (html: string): string => `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Calibri, sans-serif; font-size: 12pt; line-height: 1.5; }
      h1 { font-size: 18pt; } h2 { font-size: 14pt; } h3 { font-size: 13pt; }
    </style>
  </head>
  <body>${html}</body>
</html>`

export function downloadDocx(html: string, filenameFull: string): void {
  const blob = new Blob(['﻿', wrapDocxHtml(html)], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filenameFull
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Type-check passa**

Run: `npx tsc -b`
Expected: Sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/download.ts
git commit -m "feat(download): add downloadDocx (HTML wrapped as Word)"
```

---

## Task 4: Util `download.ts` — downloadPdf (lazy pdfmake)

**Files:**
- Modify: `src/lib/download.ts`

- [ ] **Step 1: Adicionar função downloadPdf com import dinâmico**

Editar `src/lib/download.ts`, adicionar no final:

```ts
export async function downloadPdf(html: string, filenameFull: string): Promise<void> {
  const [{ default: pdfMake }, { default: pdfFonts }, { default: htmlToPdfmake }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
    import('html-to-pdfmake'),
  ])

  // pdfmake precisa do vfs (virtual file system) com as fontes
  ;(pdfMake as unknown as { vfs: unknown }).vfs = (pdfFonts as unknown as { pdfMake?: { vfs: unknown }; vfs?: unknown }).pdfMake?.vfs ?? (pdfFonts as unknown as { vfs: unknown }).vfs

  const content = htmlToPdfmake(html, { window })

  const docDefinition = {
    content,
    pageMargins: [60, 60, 60, 60] as [number, number, number, number],
    defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.4 },
  }

  await new Promise<void>((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).download(filenameFull, () => resolve())
    } catch (err) {
      reject(err)
    }
  })
}
```

- [ ] **Step 2: Type-check passa**

Run: `npx tsc -b`
Expected: Sem erros. Se houver erro em `pdfmake/build/vfs_fonts`, declarar módulo em `src/declarations.d.ts`:

```ts
declare module 'pdfmake/build/vfs_fonts' {
  const fonts: { pdfMake?: { vfs: Record<string, string> }; vfs?: Record<string, string> }
  export default fonts
}
declare module 'html-to-pdfmake' {
  const fn: (html: string, options?: Record<string, unknown>) => unknown
  export default fn
}
```

- [ ] **Step 3: Smoke test manual no browser**

Run: `npm run dev` (se não estiver rodando)
Abrir DevTools console em qualquer página da app e executar:

```js
const { downloadPdf } = await import('/src/lib/download.ts')
await downloadPdf('<h1>Teste</h1><p>Olá mundo!</p>', 'teste.pdf')
```

Expected: Browser baixa `teste.pdf` com texto selecionável.

- [ ] **Step 4: Commit**

```bash
git add src/lib/download.ts src/declarations.d.ts
git commit -m "feat(download): add lazy-loaded downloadPdf via pdfmake"
```

---

## Task 5: Builder `buildExecutivoHtml` (com teste)

**Files:**
- Create: `src/lib/buildHtml.ts`
- Create: `src/lib/buildHtml.test.ts`

- [ ] **Step 1: Escrever teste falhando**

Write file `src/lib/buildHtml.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildExecutivoHtml } from './buildHtml'
import type { Projeto } from '../types'

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
```

- [ ] **Step 2: Rodar teste — falha esperada**

Run: `npm run test:run -- src/lib/buildHtml.test.ts`
Expected: FAIL — `Cannot find module './buildHtml'`.

- [ ] **Step 3: Implementar buildExecutivoHtml**

Write file `src/lib/buildHtml.ts`:

```ts
import type { Projeto } from '../types'

export function buildExecutivoHtml(projeto: Projeto): string {
  const conteudo = projeto.conteudo_executivo ?? ''
  return `<h1>${escapeHtml(projeto.nome_projeto)}</h1>
<p><em>por ${escapeHtml(projeto.autor_nome)}</em></p>
${conteudo}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
```

- [ ] **Step 4: Rodar teste — passa**

Run: `npm run test:run -- src/lib/buildHtml.test.ts`
Expected: PASS — 2 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/buildHtml.ts src/lib/buildHtml.test.ts
git commit -m "feat(buildHtml): add buildExecutivoHtml"
```

---

## Task 6: Builder `buildSumarioHtml` (com teste)

**Files:**
- Modify: `src/lib/buildHtml.ts`
- Modify: `src/lib/buildHtml.test.ts`

- [ ] **Step 1: Adicionar teste falhando**

Editar `src/lib/buildHtml.test.ts`, adicionar imports e descrever bloco:

```ts
import { buildExecutivoHtml, buildSumarioHtml } from './buildHtml'
import type { Projeto, Sumario } from '../types'

// ... (baseProjeto continua igual)

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
```

- [ ] **Step 2: Rodar testes — falham**

Run: `npm run test:run -- src/lib/buildHtml.test.ts`
Expected: FAIL — `buildSumarioHtml is not a function`.

- [ ] **Step 3: Implementar buildSumarioHtml**

Editar `src/lib/buildHtml.ts`, adicionar:

```ts
import type { Projeto, Sumario, SumarioAbordagem } from '../types'

const ABORDAGEM_LABEL: Record<SumarioAbordagem, string> = {
  cronologica: 'Cronológica',
  tematica: 'Temática',
  narrativa: 'Narrativa',
}

export function buildSumarioHtml(sumario: Sumario, projeto: Projeto): string {
  const abordagemLabel = ABORDAGEM_LABEL[sumario.abordagem] ?? sumario.abordagem
  const capitulosHtml = (sumario.capitulos ?? [])
    .map(cap => {
      const subassuntosHtml = cap.subassuntos && cap.subassuntos.length > 0
        ? `<ul>${cap.subassuntos.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
        : ''
      return `<h2>Capítulo ${cap.numero}: ${escapeHtml(cap.titulo)}</h2>
<p>${escapeHtml(cap.descricao)}</p>
${subassuntosHtml}`
    })
    .join('\n')

  return `<h1>${escapeHtml(projeto.nome_projeto)}</h1>
<h2>Sumário — Opção ${sumario.opcao} (${abordagemLabel})</h2>
${sumario.titulo_sumario ? `<h3>${escapeHtml(sumario.titulo_sumario)}</h3>` : ''}
${capitulosHtml}`
}
```

- [ ] **Step 4: Rodar testes — passam**

Run: `npm run test:run -- src/lib/buildHtml.test.ts`
Expected: PASS — 6 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/buildHtml.ts src/lib/buildHtml.test.ts
git commit -m "feat(buildHtml): add buildSumarioHtml"
```

---

## Task 7: Builder `buildLivroHtml` (com teste)

**Files:**
- Modify: `src/lib/buildHtml.ts`
- Modify: `src/lib/buildHtml.test.ts`

- [ ] **Step 1: Adicionar teste falhando**

Editar `src/lib/buildHtml.test.ts`, adicionar:

```ts
import { buildExecutivoHtml, buildSumarioHtml, buildLivroHtml } from './buildHtml'
import type { Projeto, Sumario, CapituloLivro } from '../types'

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
```

- [ ] **Step 2: Rodar — falha**

Run: `npm run test:run -- src/lib/buildHtml.test.ts`
Expected: FAIL — `buildLivroHtml is not a function`.

- [ ] **Step 3: Implementar buildLivroHtml e helper toHtml**

Editar `src/lib/buildHtml.ts`, adicionar:

```ts
import type { CapituloLivro } from '../types'

// Converte texto plano em HTML; passa HTML adiante sem mexer
function toHtml(text: string): string {
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  return text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('')
}

export function buildLivroHtml(projeto: Projeto, capitulos: CapituloLivro[]): string {
  const ordenados = [...capitulos].sort((a, b) => a.numero - b.numero)
  const capsHtml = ordenados
    .map(cap => `<h1 style="page-break-before:always">Capítulo ${cap.numero}<br/>${escapeHtml(cap.titulo)}</h1>
${toHtml(cap.conteudo)}`)
    .join('\n')

  return `<h1 style="text-align:center">${escapeHtml(projeto.nome_projeto)}</h1>
<p style="text-align:center"><em>por ${escapeHtml(projeto.autor_nome)}</em></p>
${capsHtml}`
}
```

- [ ] **Step 4: Rodar — passa**

Run: `npm run test:run -- src/lib/buildHtml.test.ts`
Expected: PASS — 12 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/buildHtml.ts src/lib/buildHtml.test.ts
git commit -m "feat(buildHtml): add buildLivroHtml with page-breaks"
```

---

## Task 8: Builder `buildTraducaoHtml` (com teste)

**Files:**
- Modify: `src/lib/buildHtml.ts`
- Modify: `src/lib/buildHtml.test.ts`

- [ ] **Step 1: Adicionar teste falhando**

Editar `src/lib/buildHtml.test.ts`, adicionar:

```ts
import { buildExecutivoHtml, buildSumarioHtml, buildLivroHtml, buildTraducaoHtml } from './buildHtml'
import type { Traducao, CapituloTraducao } from '../types'

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
    expect(html).toContain('Inglês (EUA)')  // labelIdioma('EN-US')
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
```

- [ ] **Step 2: Rodar — falha**

Run: `npm run test:run -- src/lib/buildHtml.test.ts`
Expected: FAIL — `buildTraducaoHtml is not a function`.

- [ ] **Step 3: Implementar buildTraducaoHtml**

Editar `src/lib/buildHtml.ts`, adicionar imports e função:

```ts
import type { Traducao, CapituloTraducao } from '../types'
import { labelIdioma } from './idiomas'

export function buildTraducaoHtml(
  projeto: Projeto,
  traducao: Traducao,
  capitulos: CapituloTraducao[],
): string {
  const ordenados = [...capitulos].sort((a, b) => a.numero - b.numero)
  const capsHtml = ordenados
    .map(cap => `<h1 style="page-break-before:always">Capítulo ${cap.numero}<br/>${escapeHtml(cap.titulo)}</h1>
${toHtml(cap.conteudo)}`)
    .join('\n')

  return `<h1 style="text-align:center">${escapeHtml(projeto.nome_projeto)}</h1>
<p style="text-align:center"><em>por ${escapeHtml(projeto.autor_nome)} — Tradução: ${escapeHtml(labelIdioma(traducao.idioma))}</em></p>
${capsHtml}`
}
```

- [ ] **Step 4: Rodar — passa**

Run: `npm run test:run -- src/lib/buildHtml.test.ts`
Expected: PASS — 15 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/buildHtml.ts src/lib/buildHtml.test.ts
git commit -m "feat(buildHtml): add buildTraducaoHtml"
```

---

## Task 9: Componente `DownloadButton`

**Files:**
- Create: `src/components/DownloadButton.tsx`

- [ ] **Step 1: Implementar DownloadButton**

Write file `src/components/DownloadButton.tsx`:

```tsx
import React, { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown, Loader2 } from 'lucide-react'
import { downloadDocx, downloadPdf, filename } from '../lib/download'

interface DownloadButtonProps {
  projetoNome: string
  kind: string
  getHtml: () => string | Promise<string>
  disabled?: boolean
  label?: string
  size?: 'sm' | 'md'
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  projetoNome, kind, getHtml, disabled, label = 'Baixar', size = 'md',
}) => {
  const [open, setOpen] = useState(false)
  const [busyFmt, setBusyFmt] = useState<'docx' | 'pdf' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handle = async (fmt: 'docx' | 'pdf') => {
    setBusyFmt(fmt)
    setError(null)
    try {
      const html = await getHtml()
      const file = filename(projetoNome, kind, fmt)
      if (fmt === 'docx') downloadDocx(html, file)
      else await downloadPdf(html, file)
      setOpen(false)
    } catch (err) {
      console.error('Erro ao baixar:', err)
      setError(fmt === 'pdf' ? 'Falha ao gerar PDF' : 'Falha ao gerar DOCX')
    } finally {
      setBusyFmt(null)
    }
  }

  const sizeCls = size === 'sm'
    ? 'text-xs px-2.5 py-1 gap-1'
    : 'text-sm px-3 py-1.5 gap-1.5'

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled || busyFmt !== null}
        onClick={() => setOpen(v => !v)}
        className={`flex items-center ${sizeCls} rounded-lg bg-brand-bg-card text-gray-700 hover:bg-brand-primary hover:text-brand-text-main font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {busyFmt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {label}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 z-20 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden min-w-[140px]">
          <button
            type="button"
            disabled={busyFmt !== null}
            onClick={() => handle('docx')}
            className="w-full text-left px-3 py-2 text-sm hover:bg-brand-bg-section disabled:opacity-50 flex items-center gap-2"
          >
            {busyFmt === 'docx' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            DOCX (Word)
          </button>
          <button
            type="button"
            disabled={busyFmt !== null}
            onClick={() => handle('pdf')}
            className="w-full text-left px-3 py-2 text-sm hover:bg-brand-bg-section disabled:opacity-50 flex items-center gap-2 border-t border-gray-100"
          >
            {busyFmt === 'pdf' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            PDF
          </button>
          {error && (
            <div className="px-3 py-2 text-xs text-red-600 border-t border-gray-100">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check passa**

Run: `npx tsc -b`
Expected: Sem erros.

- [ ] **Step 3: Smoke test visual no browser**

`npm run dev`, abrir um projeto qualquer no localhost:5173. Próximas tasks vão wireup o botão; por ora só garantir que importação funciona criando um instance temporário no DevTools (opcional).

- [ ] **Step 4: Commit**

```bash
git add src/components/DownloadButton.tsx
git commit -m "feat: add DownloadButton component with DOCX/PDF dropdown"
```

---

## Task 10: Wireup no `ExecutivoPanel`

**Files:**
- Modify: `src/components/ExecutivoPanel.tsx`

- [ ] **Step 1: Adicionar import do DownloadButton e buildExecutivoHtml**

Editar `src/components/ExecutivoPanel.tsx`. Substituir o `htmlToWordBlob` local pelo uso da util:

No topo do arquivo, depois dos imports existentes, adicionar:

```tsx
import { DownloadButton } from './DownloadButton'
import { buildExecutivoHtml } from '../lib/buildHtml'
import type { Projeto } from '../types'
```

Mudar a interface de props para receber `projeto: Projeto`:

```tsx
interface ExecutivoPanelProps {
  projeto: Projeto
  onSave: (html: string) => Promise<void>
  onConfirmarRevisado: (html: string) => Promise<void>
}
```

E no topo do componente, derivar as variáveis antigas para minimizar mudanças no restante do JSX:

```tsx
export const ExecutivoPanel: React.FC<ExecutivoPanelProps> = ({
  projeto, onSave, onConfirmarRevisado,
}) => {
  const conteudo = projeto.conteudo_executivo
  const driveUrl = projeto.drive_executivo_url
  const isReady = !!(projeto.drive_executivo_url || projeto.conteudo_executivo)
  const projetoStatus = projeto.status
  // ... resto do body permanece igual, usando essas variáveis
```

Assim todas as outras referências (`conteudo`, `driveUrl`, `isReady`, `projetoStatus`) continuam funcionando sem mais alterações.

- [ ] **Step 2: Remover `htmlToWordBlob` e `handleDownloadDocx`**

Remover as linhas 5-20 (declaração de `htmlToWordBlob`).
Remover `handleDownloadDocx` (linhas 53-64).

- [ ] **Step 3: Adicionar DownloadButton no header do painel**

No JSX do header (próximo ao `driveUrl` link), adicionar antes dos botões existentes:

```tsx
{conteudo && (
  <DownloadButton
    projetoNome={projeto.nome_projeto}
    kind="executivo"
    getHtml={() => buildExecutivoHtml(projeto)}
    size="sm"
  />
)}
```

- [ ] **Step 4: Substituir botão "Baixar DOCX" do banner de revisão pelo DownloadButton**

No bloco do banner de revisão (`projetoStatus === 'aguardando_revisao_autor'`), trocar o `<button onClick={handleDownloadDocx}>` por:

```tsx
<DownloadButton
  projetoNome={projeto.nome_projeto}
  kind="executivo"
  getHtml={() => buildExecutivoHtml(projeto)}
  size="sm"
  label="Baixar"
/>
```

- [ ] **Step 5: Atualizar `DetalheProjeto.tsx` para passar `projeto` ao invés de props separadas**

Editar `src/pages/DetalheProjeto.tsx`, substituir:

```tsx
<ExecutivoPanel
  conteudo={projeto.conteudo_executivo}
  driveUrl={projeto.drive_executivo_url}
  isReady={!!(projeto.drive_executivo_url || projeto.conteudo_executivo)}
  projetoStatus={projeto.status}
  onSave={salvarExecutivo}
  onConfirmarRevisado={confirmarRevisado}
/>
```

por:

```tsx
<ExecutivoPanel
  projeto={projeto}
  onSave={salvarExecutivo}
  onConfirmarRevisado={confirmarRevisado}
/>
```

- [ ] **Step 6: Type-check + smoke test**

Run: `npx tsc -b`
Expected: Sem erros.

`npm run dev` (se já estiver, recarregar). Abrir um projeto que já passou pelo executivo (ex: Café com Teu Pai). Verificar:
- Aba Executivo mostra botão "Baixar" no header, sempre (não só em revisão).
- Clicar → dropdown abre → DOCX gera arquivo `cafe-com-teu-pai-executivo-{YYYYMMDD}.docx`.
- Clicar PDF gera arquivo PDF com mesmo nome.
- Se projeto estiver em `aguardando_revisao_autor`, o banner também mostra o botão (mesmo componente).

- [ ] **Step 7: Commit**

```bash
git add src/components/ExecutivoPanel.tsx src/pages/DetalheProjeto.tsx
git commit -m "feat(executivo): always-visible DOCX/PDF download via DownloadButton"
```

---

## Task 11: Wireup no `SumarioCard`

**Files:**
- Modify: `src/components/SumarioCard.tsx`

- [ ] **Step 1: Adicionar imports e props**

Editar `src/components/SumarioCard.tsx`. No topo:

```tsx
import { DownloadButton } from './DownloadButton'
import { buildSumarioHtml } from '../lib/buildHtml'
import type { Projeto } from '../types'
```

Atualizar `SumarioCardProps` para receber `projeto`:

```tsx
interface SumarioCardProps {
  sumario: Sumario
  projeto: Projeto
  onSelecionar: (id: string) => Promise<void>
  onAtualizar: (id: string, campos: { titulo_sumario?: string; capitulos?: Capitulo[] }) => Promise<void>
}
```

E no destructure:
```tsx
export const SumarioCard: React.FC<SumarioCardProps> = ({ sumario, projeto, onSelecionar, onAtualizar }) => {
```

- [ ] **Step 2: Adicionar DownloadButton ao lado de "Ver no Drive"**

No bloco `<div className="flex items-center gap-2 shrink-0">` (linha ~123 do original), adicionar antes de "Ver no Drive":

```tsx
{!editMode && (
  <DownloadButton
    projetoNome={projeto.nome_projeto}
    kind={`sumario-${sumario.opcao}-${sumario.abordagem}`}
    getHtml={() => buildSumarioHtml(sumario, projeto)}
    size="sm"
  />
)}
```

- [ ] **Step 3: Passar `projeto` em `DetalheProjeto`**

Editar `src/pages/DetalheProjeto.tsx`. No `.map(sumario => ...)`:

```tsx
<SumarioCard
  key={sumario.id}
  sumario={sumario}
  projeto={projeto}
  onSelecionar={selecionarSumario}
  onAtualizar={atualizarSumario}
/>
```

- [ ] **Step 4: Type-check + smoke test**

Run: `npx tsc -b`
Expected: Sem erros.

No browser: abrir projeto com sumários. Cada um dos 3 cards deve ter botão "Baixar". Baixar DOCX e PDF de pelo menos um — verificar nome `cafe-com-teu-pai-sumario-1-cronologica-{YYYYMMDD}.docx`, conteúdo com título do projeto + lista de capítulos + subassuntos.

- [ ] **Step 5: Commit**

```bash
git add src/components/SumarioCard.tsx src/pages/DetalheProjeto.tsx
git commit -m "feat(sumarios): per-card DOCX/PDF download"
```

---

## Task 12: Wireup na aba Livro

**Files:**
- Modify: `src/pages/DetalheProjeto.tsx`

- [ ] **Step 1: Adicionar imports**

Editar `src/pages/DetalheProjeto.tsx`. No topo:

```tsx
import { DownloadButton } from '../components/DownloadButton'
import { buildLivroHtml } from '../lib/buildHtml'
```

- [ ] **Step 2: Adicionar botão no header da aba Livro**

Localizar o bloco `{activeTab === 'livro' && (...)}` (~ linha 541). Substituir o `<div className="flex items-center justify-between px-1">` por:

```tsx
<div className="flex items-center justify-between px-1">
  <p className="text-sm text-gray-500">
    <span className="font-semibold text-brand-text-main">{capitulos.length}</span> capítulos ·{' '}
    <span className="font-semibold text-brand-text-main">
      {capitulos.reduce((acc, c) => acc + c.palavras, 0).toLocaleString('pt-BR')}
    </span> palavras no total
  </p>
  <DownloadButton
    projetoNome={projeto.nome_projeto}
    kind="livro"
    getHtml={() => buildLivroHtml(projeto, capitulos)}
    size="sm"
    label="Baixar livro"
  />
</div>
```

- [ ] **Step 3: Type-check + smoke test**

Run: `npx tsc -b`
Expected: Sem erros.

No browser: abrir "Café com Teu Pai" (tem 13 capítulos). Aba Livro deve mostrar "Baixar livro" no header.
- DOCX: abrir no Word → conferir título centralizado, autor, e cada capítulo em página nova.
- PDF: conferir texto selecionável, capítulos em páginas separadas, ordem correta.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DetalheProjeto.tsx
git commit -m "feat(livro): add download for full book in DOCX and PDF"
```

---

## Task 13: Wireup na aba Tradução

**Files:**
- Modify: `src/pages/DetalheProjeto.tsx`

- [ ] **Step 1: Adicionar import**

Editar `src/pages/DetalheProjeto.tsx`. Adicionar:

```tsx
import { buildTraducaoHtml } from '../lib/buildHtml'
```

- [ ] **Step 2: Refatorar TraducaoCapitulos para expor capitulos**

O componente local `TraducaoCapitulos` (~linha 193) carrega capítulos via hook. Para reaproveitar, criar versão que também passa capítulos pra `TraducaoSetor`.

Refatorar `TraducaoSetor` para chamar o hook diretamente e passar capítulos para um botão de download:

Substituir o `TraducaoSetor` atual (~linha 214) por:

```tsx
const TraducaoSetor: React.FC<{ traducao: import('../types').Traducao; projeto: import('../types').Projeto }> = ({ traducao, projeto }) => {
  const { capitulos, loading } = useCapitulosTraduzidos(traducao.id)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <TraducaoCard traducao={traducao} />
        </div>
        {traducao.status === 'concluido' && capitulos.length > 0 && (
          <DownloadButton
            projetoNome={projeto.nome_projeto}
            kind={`traducao-${traducao.idioma.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            getHtml={() => buildTraducaoHtml(projeto, traducao, capitulos)}
            size="sm"
          />
        )}
      </div>
      {traducao.status !== 'erro' && (
        <div className="pl-2 border-l-2 border-brand-bg-card ml-2 space-y-3">
          {loading ? (
            <div className="bg-brand-bg rounded-2xl p-8 border border-gray-200 shadow-sm flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : capitulos.length === 0 ? (
            <div className="bg-brand-bg rounded-2xl p-6 border border-gray-200 shadow-sm text-center">
              <p className="text-sm text-gray-400">Nenhum capítulo traduzido ainda.</p>
            </div>
          ) : (
            capitulos.map(cap => <CapituloTraducaoPanel key={cap.id} capitulo={cap} />)
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Remover o componente `TraducaoCapitulos` antigo (não mais usado)**

Deletar a função `TraducaoCapitulos` (~linha 193-212).

- [ ] **Step 4: Passar `projeto` em `TraducaoTabContent` e `TraducaoSetor`**

Atualizar `TraducaoTabContentProps`:

```tsx
interface TraducaoTabContentProps {
  traducoes: import('../types').Traducao[]
  projeto: import('../types').Projeto
  projetoStatus: ProjetoStatus
  onAbrirTraduzir: () => void
}
```

No corpo do `TraducaoTabContent`, no `.map(t => ...)`:

```tsx
{traducoes.map(t => (
  <TraducaoSetor key={t.id} traducao={t} projeto={projeto} />
))}
```

E na invocação principal:

```tsx
{activeTab === 'traducao' && (
  <TraducaoTabContent
    traducoes={traducoes}
    projeto={projeto}
    projetoStatus={projeto.status}
    onAbrirTraduzir={() => setShowTraduzirModal(true)}
  />
)}
```

- [ ] **Step 5: Type-check + smoke test**

Run: `npx tsc -b`
Expected: Sem erros.

No browser: abrir projeto com tradução concluída. Botão "Baixar" aparece ao lado do header de cada idioma.
- DOCX: conferir capa com "por {autor} — Tradução: Inglês (EUA)".
- PDF: idem, texto selecionável, capítulos paginados.
- Se houver tradução em andamento (`traduzindo`), botão NÃO deve aparecer.

- [ ] **Step 6: Commit**

```bash
git add src/pages/DetalheProjeto.tsx
git commit -m "feat(traducao): add download for completed translations"
```

---

## Task 14: Build final + lint + verificação geral

**Files:**
- (nenhum alteração de código)

- [ ] **Step 1: Rodar build de produção**

Run: `npm run build`
Expected: Build sucede sem erros TypeScript. Bundle inicial não inclui `pdfmake` (verificar no output do Vite — deve aparecer como chunk separado).

- [ ] **Step 2: Rodar lint**

Run: `npm run lint`
Expected: Sem erros novos. Warnings pré-existentes OK.

- [ ] **Step 3: Rodar todos os testes**

Run: `npm run test:run`
Expected: Todos os testes passam (15 do buildHtml + 7 do download = 22).

- [ ] **Step 4: Checklist de verificação manual no browser**

Abrir `npm run dev`. Em "Café com Teu Pai" (status `escrevendo_livro` ou `concluido`):

- [ ] Aba Executivo: botão "Baixar" no header (sempre visível). DOCX abre no Word/Docs com título + autor + conteúdo executivo. PDF idem, texto selecionável.
- [ ] Aba Sumários (se acessível): 3 cards, cada um com botão próprio. Filename inclui opção e abordagem. Lista de capítulos + subassuntos preservados.
- [ ] Aba Livro: botão "Baixar livro" no header. DOCX/PDF inclui capa + todos os capítulos em páginas separadas, ordenados.
- [ ] Aba Tradução (se houver): botão por idioma. Só habilitado se `concluido`. PDF/DOCX inclui idioma legível na capa.
- [ ] Filenames seguem padrão `{slug-nome}-{kind}-{YYYYMMDD}.{ext}`.
- [ ] Bundle inicial < bundle anterior + 10kb (pdfmake é lazy).

- [ ] **Step 5: Commit (se houver mudanças no package-lock ou similar)**

```bash
git status
# se tudo limpo, nada a fazer
```

---

## Notas finais

- **Sem novos hooks ou alterações de schema** — feature 100% client-side.
- **PDF lazy:** o chunk de pdfmake só é baixado quando o usuário clica "PDF" pela primeira vez. Inspecionar Network ao testar.
- **Helper `htmlToWordBlob` antigo:** removido em Task 10. Não deve aparecer mais em nenhum lugar no projeto.
- **Tradução: idiomas legados (`'en'` minúsculo)**: `labelIdioma()` já tem fallback (`src/lib/idiomas.ts`), então capa funciona.
- **Riscos identificados no spec (imagens em capítulos, fontes do PDF):** fora do escopo. Não implementar agora.
