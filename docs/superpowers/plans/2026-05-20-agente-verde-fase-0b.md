# Agente Verde — Fase 0.B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar os mockups validados como scaffolds React reais na plataforma da Alta Books, com whitelist de acesso, rotas, componentes e dados mock — sem persistência, sem backend novo.

**Architecture:** Whitelist hardcoded de emails em `src/lib/agenteVerdeAccess.ts`. Wrapper `AgenteVerdeRoute` combina `ProtectedRoute` + checagem de whitelist. Duas páginas (`Listagem`, `Revisao`) e componentes decompostos por responsabilidade. Toda data vem de `src/data/agenteVerdeMock.ts` — state local nos componentes, sem persistência.

**Tech Stack:** React 19 + TypeScript + react-router-dom 7 + Tailwind 4 + lucide-react.

**Spec:** `docs/superpowers/specs/2026-05-20-agente-verde-fase-0b-design.md`
**Mockups:** `docs/superpowers/mockups/agente-verde/`

---

## Resumo de arquivos

**Criar:**
- `src/types/agenteVerde.ts` — interfaces `Lote`, `Item`, `BookInfo`, `Metagrafica`, status enums
- `src/lib/agenteVerdeAccess.ts` — whitelist + `hasAgenteVerdeAccess()` + `useAgenteVerdeAccess()`
- `src/lib/agenteVerdeAccess.test.ts` — testes da função pura
- `src/data/agenteVerdeMock.ts` — `MOCK_LOTES` e `MOCK_ITEMS_BY_LOTE`
- `src/components/AgenteVerdeRoute.tsx` — gating wrapper
- `src/components/AgenteVerde/DemoBanner.tsx` — banner "Versão de validação"
- `src/components/AgenteVerde/LoteCard.tsx` — card de 1 lote na listagem
- `src/components/AgenteVerde/UploadModal.tsx` — modal de upload
- `src/components/AgenteVerde/ItemRow.tsx` — 1 linha da sidebar
- `src/components/AgenteVerde/ItemSidebar.tsx` — sidebar com lista + filtros
- `src/components/AgenteVerde/BookInfoForm.tsx` — form da tab Book Info
- `src/components/AgenteVerde/MetagraficaForm.tsx` — form da tab Metagráfica
- `src/components/AgenteVerde/ItemDetailEditor.tsx` — orquestra tabs
- `src/pages/AgenteVerde/Listagem.tsx` — `/agente-verde`
- `src/pages/AgenteVerde/Revisao.tsx` — `/agente-verde/lote/:id`

**Modificar:**
- `src/App.tsx` — adicionar 2 rotas
- `src/components/TopBar.tsx` — link condicional "Agente Verde"

---

## Task 1: Tipos TypeScript

**Files:**
- Create: `src/types/agenteVerde.ts`

- [ ] **Step 1: Criar o arquivo de tipos**

Write file `src/types/agenteVerde.ts`:

```ts
export type LoteStatus = 'processando' | 'aguardando_revisao' | 'concluido'

export type ItemStatus =
  | 'pendente'
  | 'pending_files'
  | 'extraindo'
  | 'pronto_revisao'
  | 'aprovado'
  | 'falha'

export type FormatoDigital = 'epub' | 'pdf' | 'mobi'

export interface Lote {
  id: string
  nome_arquivo: string
  uploaded_by: string
  uploaded_at: string
  total_itens: number
  status: LoteStatus
  contadores: {
    prontos: number
    pendentes: number
    falhas: number
    aprovados: number
  }
  progress_pct?: number
  tempo_restante?: string
}

export interface BisacEntry {
  codigo: string
  descricao: string
}

export interface BookInfo {
  titulo: string
  subtitulo: string
  autor: string
  marca: string
  idioma: string
  paginas: number
  sinopse: string
  bisac_principal: BisacEntry
  bisac_secundarios: BisacEntry[]
  palavras_chave: string[]
  isbn_fisico: string
  isbn_digital: string
  preco_fisico: string
  preco_digital: string
  tiragem_inicial: string
  formato_digital: FormatoDigital
}

export interface Metagrafica {
  largura_mm: number
  altura_mm: number
  lombada_mm: number
  gramatura_miolo: number
  gramatura_capa: number
  peso_g: number
  codigo_barras: string
  cdd: string
  departamento: string
  cat1: string
  cat2: string
  cat3: string
}

export interface Item {
  id: string
  lote_id: string
  isbn: string
  titulo: string
  autor: string
  marca: string
  status: ItemStatus
  status_detalhe?: string
  book_info: BookInfo | null
  metagrafica: Metagrafica | null
}
```

- [ ] **Step 2: Verificar type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/types/agenteVerde.ts
git commit -m "feat(agente-verde): adicionar tipos TypeScript do dominio"
```

---

## Task 2: Access utility (TDD)

**Files:**
- Create: `src/lib/agenteVerdeAccess.ts`
- Create: `src/lib/agenteVerdeAccess.test.ts`

- [ ] **Step 1: Escrever testes falhando**

Write file `src/lib/agenteVerdeAccess.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar testes — esperando falha**

Run: `npm run test:run -- src/lib/agenteVerdeAccess.test.ts`
Expected: FAIL — `Cannot find module './agenteVerdeAccess'`.

- [ ] **Step 3: Implementar access utility + hook**

Write file `src/lib/agenteVerdeAccess.ts`:

```ts
import { useAuth } from '../contexts/AuthContext'

export const AGENTE_VERDE_ALLOWED_EMAILS: string[] = [
  'bessalfs@gmail.com',
  'cristiane@altabooks.com.br',
  'anderson@altabooks.com.br',
  'gorki@altabooks.com.br',
]

export function hasAgenteVerdeAccess(email: string | null | undefined): boolean {
  if (!email) return false
  return AGENTE_VERDE_ALLOWED_EMAILS.includes(email.toLowerCase())
}

export function useAgenteVerdeAccess(): boolean {
  const { user } = useAuth()
  return hasAgenteVerdeAccess(user?.email)
}
```

- [ ] **Step 4: Rodar testes — esperando passar**

Run: `npm run test:run -- src/lib/agenteVerdeAccess.test.ts`
Expected: PASS — 7 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/agenteVerdeAccess.ts src/lib/agenteVerdeAccess.test.ts
git commit -m "feat(agente-verde): adicionar whitelist de acesso e hook"
```

---

## Task 3: Mock data

**Files:**
- Create: `src/data/agenteVerdeMock.ts`

- [ ] **Step 1: Criar mock realista**

Write file `src/data/agenteVerdeMock.ts`:

```ts
import type { Lote, Item, BookInfo, Metagrafica } from '../types/agenteVerde'

const exampleBookInfo: BookInfo = {
  titulo: 'Pequenos Hábitos, Grandes Resultados',
  subtitulo: 'Um guia prático para transformar sua rotina em 30 dias',
  autor: 'Lucas Mendes',
  marca: 'Alta Cult',
  idioma: 'Português (BR)',
  paginas: 248,
  sinopse: 'Você é o que faz repetidamente. Em "Pequenos Hábitos, Grandes Resultados", Lucas Mendes desmonta o mito da força de vontade e mostra que mudanças duradouras nascem de sistemas, não de motivação. Com base em pesquisas de neurociência comportamental e estudos de caso de atletas, executivos e artistas brasileiros, o autor entrega um método de 30 dias para construir rotinas que se sustentam mesmo nos dias difíceis. Um livro sobre disciplina sem rigidez — e sobre como dar à própria vida a direção que ela merece.',
  bisac_principal: { codigo: 'SEL027000', descricao: 'SELF-HELP / Personal Growth / Success' },
  bisac_secundarios: [
    { codigo: 'SEL031000', descricao: 'SELF-HELP / Personal Growth / General' },
  ],
  palavras_chave: ['hábitos', 'desenvolvimento pessoal', 'disciplina', 'produtividade', 'rotina', 'neurociência', 'comportamento', 'autoajuda'],
  isbn_fisico: '978-85-508-2410-7',
  isbn_digital: '978-85-508-2410-8',
  preco_fisico: '69,90',
  preco_digital: '44,90',
  tiragem_inicial: '3.000',
  formato_digital: 'epub',
}

const exampleMetagrafica: Metagrafica = {
  largura_mm: 155,
  altura_mm: 230,
  lombada_mm: 18,
  gramatura_miolo: 75,
  gramatura_capa: 250,
  peso_g: 380,
  codigo_barras: '9788550824107',
  cdd: '158.1',
  departamento: 'Não-ficção',
  cat1: 'Desenvolvimento Pessoal',
  cat2: 'Hábitos e Comportamento',
  cat3: 'Métodos e Práticas',
}

export const MOCK_LOTES: Lote[] = [
  {
    id: 'lote-set-2026',
    nome_arquivo: 'prelo-set-2026.xlsx',
    uploaded_by: 'Cristiane Mutus',
    uploaded_at: 'hoje, 14:32',
    total_itens: 50,
    status: 'processando',
    contadores: { prontos: 23, pendentes: 0, falhas: 0, aprovados: 0 },
    progress_pct: 46,
    tempo_restante: '~25 min restantes',
  },
  {
    id: 'lote-ago-2026',
    nome_arquivo: 'prelo-ago-2026.xlsx',
    uploaded_by: 'Cristiane Mutus',
    uploaded_at: 'ontem, 09:15',
    total_itens: 50,
    status: 'aguardando_revisao',
    contadores: { prontos: 42, pendentes: 6, falhas: 2, aprovados: 14 },
  },
  {
    id: 'lote-bf-2026',
    nome_arquivo: 'prelo-bf-2026.xlsx',
    uploaded_by: 'Anderson Vieira',
    uploaded_at: 'há 3 dias',
    total_itens: 12,
    status: 'aguardando_revisao',
    contadores: { prontos: 11, pendentes: 1, falhas: 0, aprovados: 0 },
  },
  {
    id: 'lote-jul-2026',
    nome_arquivo: 'prelo-jul-2026.xlsx',
    uploaded_by: 'Cristiane Mutus',
    uploaded_at: 'há 18 dias',
    total_itens: 38,
    status: 'concluido',
    contadores: { prontos: 0, pendentes: 0, falhas: 0, aprovados: 38 },
  },
]

const baseItemsAgosto: Omit<Item, 'lote_id'>[] = [
  {
    id: 'item-1',
    isbn: '978-85-508-2410-7',
    titulo: 'Pequenos Hábitos, Grandes Resultados',
    autor: 'Lucas Mendes',
    marca: 'Alta Cult',
    status: 'pronto_revisao',
    book_info: exampleBookInfo,
    metagrafica: exampleMetagrafica,
  },
  {
    id: 'item-2',
    isbn: '978-85-508-2411-4',
    titulo: 'A Lógica do Mercado de Ações',
    autor: 'Pedro Almeida',
    marca: 'Alta Books',
    status: 'pronto_revisao',
    book_info: { ...exampleBookInfo, titulo: 'A Lógica do Mercado de Ações', subtitulo: 'Estratégias para investidores iniciantes', autor: 'Pedro Almeida', marca: 'Alta Books', isbn_fisico: '978-85-508-2411-4', isbn_digital: '978-85-508-2411-5', sinopse: 'Um manual direto para quem quer entender como o mercado financeiro brasileiro funciona, livre do jargão de Faria Lima.' },
    metagrafica: { ...exampleMetagrafica, codigo_barras: '9788550824114', cdd: '332.6' },
  },
  {
    id: 'item-3',
    isbn: '978-85-508-2412-1',
    titulo: 'Inteligência Emocional na Prática',
    autor: 'Mariana Ribeiro',
    marca: 'Alta Vida',
    status: 'pronto_revisao',
    book_info: { ...exampleBookInfo, titulo: 'Inteligência Emocional na Prática', subtitulo: 'Como gerenciar emoções no trabalho e em casa', autor: 'Mariana Ribeiro', marca: 'Alta Vida', isbn_fisico: '978-85-508-2412-1', isbn_digital: '978-85-508-2412-2' },
    metagrafica: { ...exampleMetagrafica, codigo_barras: '9788550824121' },
  },
  {
    id: 'item-4',
    isbn: '978-85-508-2413-8',
    titulo: 'Liderança Quântica',
    autor: 'Roberto Tanaka',
    marca: 'Alta Lead',
    status: 'pronto_revisao',
    book_info: { ...exampleBookInfo, titulo: 'Liderança Quântica', subtitulo: 'Modelos mentais para líderes do século XXI', autor: 'Roberto Tanaka', marca: 'Alta Lead', isbn_fisico: '978-85-508-2413-8', isbn_digital: '978-85-508-2413-9' },
    metagrafica: { ...exampleMetagrafica, codigo_barras: '9788550824138' },
  },
  {
    id: 'item-5',
    isbn: '978-85-508-2414-5',
    titulo: 'O Manual do Empreendedor Brasileiro',
    autor: 'Fernanda Castro',
    marca: 'Alta Business',
    status: 'pronto_revisao',
    book_info: { ...exampleBookInfo, titulo: 'O Manual do Empreendedor Brasileiro', subtitulo: 'Da ideia ao primeiro milhão', autor: 'Fernanda Castro', marca: 'Alta Business', isbn_fisico: '978-85-508-2414-5', isbn_digital: '978-85-508-2414-6' },
    metagrafica: { ...exampleMetagrafica, codigo_barras: '9788550824145' },
  },
  {
    id: 'item-6',
    isbn: '978-85-508-2415-2',
    titulo: 'Arquitetura de Dados',
    autor: '',
    marca: '',
    status: 'pending_files',
    status_detalhe: 'Falta planilha técnica',
    book_info: null,
    metagrafica: null,
  },
  {
    id: 'item-7',
    isbn: '978-85-508-2416-9',
    titulo: 'A Era da Computação Quântica',
    autor: '',
    marca: '',
    status: 'falha',
    status_detalhe: 'PDF do miolo corrompido',
    book_info: null,
    metagrafica: null,
  },
  {
    id: 'item-8',
    isbn: '978-85-508-2417-6',
    titulo: 'Mestres da Negociação',
    autor: 'Carlos Silveira',
    marca: 'Alta Books',
    status: 'aprovado',
    book_info: { ...exampleBookInfo, titulo: 'Mestres da Negociação', subtitulo: 'Lições de quem fecha grandes acordos', autor: 'Carlos Silveira', marca: 'Alta Books', isbn_fisico: '978-85-508-2417-6', isbn_digital: '978-85-508-2417-7' },
    metagrafica: { ...exampleMetagrafica, codigo_barras: '9788550824176' },
  },
  {
    id: 'item-9',
    isbn: '978-85-508-2418-3',
    titulo: 'Design Thinking Aplicado a Negócios',
    autor: 'Júlia Hoffmann',
    marca: 'Alta Design',
    status: 'pronto_revisao',
    book_info: { ...exampleBookInfo, titulo: 'Design Thinking Aplicado a Negócios', subtitulo: 'Da empatia ao protótipo', autor: 'Júlia Hoffmann', marca: 'Alta Design', isbn_fisico: '978-85-508-2418-3', isbn_digital: '978-85-508-2418-4' },
    metagrafica: { ...exampleMetagrafica, codigo_barras: '9788550824183' },
  },
  {
    id: 'item-10',
    isbn: '978-85-508-2419-0',
    titulo: 'Cozinha Funcional: Receitas Anti-inflamatórias',
    autor: 'Dra. Renata Souza',
    marca: 'Alta Vida',
    status: 'pronto_revisao',
    book_info: { ...exampleBookInfo, titulo: 'Cozinha Funcional: Receitas Anti-inflamatórias', subtitulo: 'O prato como medicina cotidiana', autor: 'Dra. Renata Souza', marca: 'Alta Vida', isbn_fisico: '978-85-508-2419-0', isbn_digital: '978-85-508-2419-1' },
    metagrafica: { ...exampleMetagrafica, codigo_barras: '9788550824190' },
  },
  {
    id: 'item-11',
    isbn: '978-85-508-2420-6',
    titulo: 'A História do Brasil em 12 Pratos',
    autor: 'Geraldo Aragão',
    marca: 'Alta Cult',
    status: 'pronto_revisao',
    book_info: { ...exampleBookInfo, titulo: 'A História do Brasil em 12 Pratos', subtitulo: 'Como a comida construiu a nação', autor: 'Geraldo Aragão', marca: 'Alta Cult', isbn_fisico: '978-85-508-2420-6', isbn_digital: '978-85-508-2420-7' },
    metagrafica: { ...exampleMetagrafica, codigo_barras: '9788550824206' },
  },
  {
    id: 'item-12',
    isbn: '978-85-508-2421-3',
    titulo: 'Cibersegurança para Não-técnicos',
    autor: 'Eduardo Wong',
    marca: 'Alta Tech',
    status: 'pending_files',
    status_detalhe: 'Falta capa',
    book_info: null,
    metagrafica: null,
  },
]

export const MOCK_ITEMS_BY_LOTE: Record<string, Item[]> = {
  'lote-ago-2026': baseItemsAgosto.map(item => ({ ...item, lote_id: 'lote-ago-2026' })),
  'lote-bf-2026': baseItemsAgosto.slice(0, 4).map(item => ({ ...item, lote_id: 'lote-bf-2026' })),
  'lote-set-2026': [],
  'lote-jul-2026': baseItemsAgosto.slice(0, 3).map(item => ({ ...item, lote_id: 'lote-jul-2026', status: 'aprovado' as const })),
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/data/agenteVerdeMock.ts
git commit -m "feat(agente-verde): adicionar dados mock para 4 lotes"
```

---

## Task 4: AgenteVerdeRoute (gating wrapper)

**Files:**
- Create: `src/components/AgenteVerdeRoute.tsx`

- [ ] **Step 1: Criar wrapper**

Write file `src/components/AgenteVerdeRoute.tsx`:

```tsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { useAgenteVerdeAccess } from '../lib/agenteVerdeAccess'

export const AgenteVerdeRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hasAccess = useAgenteVerdeAccess()
  return (
    <ProtectedRoute>
      {hasAccess ? <>{children}</> : <Navigate to="/" replace />}
    </ProtectedRoute>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgenteVerdeRoute.tsx
git commit -m "feat(agente-verde): adicionar wrapper de rota com gating"
```

---

## Task 5: TopBar — link condicional

**Files:**
- Modify: `src/components/TopBar.tsx`

- [ ] **Step 1: Adicionar import e link condicional**

Editar `src/components/TopBar.tsx`. No topo, adicionar import:

```tsx
import { useAgenteVerdeAccess } from '../lib/agenteVerdeAccess'
import { Link } from 'react-router-dom'
```

(Se `Link` já estiver importado, não duplicar.)

Dentro do componente `TopBar`, após `const navigate = useNavigate();`, adicionar:

```tsx
const hasAgenteVerdeAccess = useAgenteVerdeAccess()
```

No JSX, dentro do `<div className="flex items-center gap-3">` que envolve os botões de ação à direita, ANTES do botão "Novo Projeto", adicionar:

```tsx
{hasAgenteVerdeAccess && (
  <Link
    to="/agente-verde"
    className="flex items-center gap-2 text-white/70 hover:text-[#F5C518] transition-colors text-sm font-medium px-3 py-1.5 rounded"
  >
    Agente Verde
  </Link>
)}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Smoke test visual**

`npm run dev` (se já estiver rodando, recarregar). Logado como `bessalfs@gmail.com`, conferir que o link "Agente Verde" aparece no TopBar entre o user dropdown e o botão Novo Projeto (à esquerda do Novo Projeto).

Clicar leva a `/agente-verde` (vai dar 404 do React Router por enquanto — esperado, a rota é criada em tasks futuras).

- [ ] **Step 4: Commit**

```bash
git add src/components/TopBar.tsx
git commit -m "feat(agente-verde): adicionar link condicional no TopBar"
```

---

## Task 6: DemoBanner

**Files:**
- Create: `src/components/AgenteVerde/DemoBanner.tsx`

- [ ] **Step 1: Criar banner reusável**

Write file `src/components/AgenteVerde/DemoBanner.tsx`:

```tsx
import React from 'react'
import { Info } from 'lucide-react'

export const DemoBanner: React.FC = () => (
  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-start gap-3 text-sm text-amber-900">
    <Info className="w-4 h-4 mt-0.5 shrink-0" />
    <span>
      <strong>Versão de validação.</strong> Dados de demonstração. Botões de ação (aprovar, baixar,
      reprocessar, disparar processamento) ainda não persistem.
    </span>
  </div>
)
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgenteVerde/DemoBanner.tsx
git commit -m "feat(agente-verde): adicionar banner de versao de validacao"
```

---

## Task 7: LoteCard

**Files:**
- Create: `src/components/AgenteVerde/LoteCard.tsx`

- [ ] **Step 1: Criar componente**

Write file `src/components/AgenteVerde/LoteCard.tsx`:

```tsx
import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Download } from 'lucide-react'
import type { Lote } from '../../types/agenteVerde'

interface LoteCardProps {
  lote: Lote
  emphasized?: boolean
  onAcaoNaoImplementada?: (label: string) => void
}

export const LoteCard: React.FC<LoteCardProps> = ({ lote, emphasized = false, onAcaoNaoImplementada }) => {
  const cardCls = emphasized
    ? 'bg-white rounded-2xl border-2 border-brand-primary shadow-md overflow-hidden'
    : 'bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden'

  const stripeCls = lote.status === 'concluido' ? 'h-1 bg-gray-200' : 'h-1 bg-brand-primary'

  return (
    <article className={cardCls}>
      <div className={stripeCls} />
      <div className="p-6 flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-serif text-xl text-brand-text-main truncate">{lote.nome_arquivo.replace(/\.[^.]+$/, '').replace(/-/g, ' ')}</h3>
            <StatusBadge status={lote.status} />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            <span className="font-medium text-gray-700">{lote.nome_arquivo}</span> ·{' '}
            {lote.status === 'concluido' ? 'Aprovado por ' : 'Enviado por '}
            <span className="font-medium text-gray-700">{lote.uploaded_by}</span> ·{' '}
            {lote.uploaded_at}
          </p>
          {lote.status === 'processando' && lote.progress_pct !== undefined && (
            <div className="flex items-center gap-6 text-sm">
              <div>
                <div className="text-2xl font-bold text-brand-text-main">
                  {lote.contadores.prontos}<span className="text-gray-300">/{lote.total_itens}</span>
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">processados</div>
              </div>
              <div className="flex-1 max-w-md">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-primary rounded-full" style={{ width: `${lote.progress_pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                  <span>{lote.progress_pct}%</span>
                  <span>{lote.tempo_restante}</span>
                </div>
              </div>
            </div>
          )}
          {lote.status !== 'processando' && (
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <Contador cor="bg-emerald-500" valor={lote.contadores.prontos} label="prontos" />
              {lote.contadores.pendentes > 0 && (
                <Contador cor="bg-amber-400" valor={lote.contadores.pendentes} label="arquivos faltando" />
              )}
              {lote.contadores.falhas > 0 && (
                <Contador cor="bg-red-500" valor={lote.contadores.falhas} label="com falha" />
              )}
              {lote.contadores.aprovados > 0 && (
                <Contador cor="bg-gray-400" valor={lote.contadores.aprovados} label={lote.status === 'concluido' ? 'aprovados' : 'aprovados'} />
              )}
              <div className="ml-auto text-xs text-gray-400">Total: {lote.total_itens} ISBNs</div>
            </div>
          )}
        </div>

        {lote.status === 'processando' && (
          <button disabled className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-brand-bg-card text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed">
            Aguardando…
          </button>
        )}
        {lote.status === 'aguardando_revisao' && (
          <Link
            to={`/agente-verde/lote/${lote.id}`}
            className={emphasized
              ? 'shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[#111] hover:bg-[#222] text-brand-primary font-bold rounded-lg transition-colors'
              : 'shrink-0 flex items-center gap-2 px-5 py-2.5 bg-brand-bg-card hover:bg-[#111] hover:text-brand-primary text-gray-700 font-bold rounded-lg transition-colors'}
          >
            Revisar lote
            {emphasized && <ArrowRight className="w-4 h-4" />}
          </Link>
        )}
        {lote.status === 'concluido' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onAcaoNaoImplementada?.('Download Book Info.xlsx')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-brand-bg-card hover:bg-brand-primary hover:text-brand-text-main text-gray-600 font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Book Info.xlsx
            </button>
            <button
              type="button"
              onClick={() => onAcaoNaoImplementada?.('Download Metagráfica.xlsx')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-brand-bg-card hover:bg-brand-primary hover:text-brand-text-main text-gray-600 font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Metagráfica.xlsx
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

const StatusBadge: React.FC<{ status: Lote['status'] }> = ({ status }) => {
  if (status === 'processando') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-bg-badge text-amber-800 border border-brand-primary/30">
        <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
        Processando
      </span>
    )
  }
  if (status === 'aguardando_revisao') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Aguardando revisão
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
      <Check className="w-3 h-3" strokeWidth={3} />
      Concluído
    </span>
  )
}

const Contador: React.FC<{ cor: string; valor: number; label: string }> = ({ cor, valor, label }) => (
  <div className="flex items-center gap-1.5">
    <span className={`w-2 h-2 rounded-full ${cor}`} />
    <span className="font-bold text-brand-text-main">{valor}</span>
    <span className="text-gray-500">{label}</span>
  </div>
)
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgenteVerde/LoteCard.tsx
git commit -m "feat(agente-verde): adicionar componente LoteCard"
```

---

## Task 8: UploadModal

**Files:**
- Create: `src/components/AgenteVerde/UploadModal.tsx`

- [ ] **Step 1: Criar modal**

Write file `src/components/AgenteVerde/UploadModal.tsx`:

```tsx
import React, { useState } from 'react'
import { X, FileText, Play } from 'lucide-react'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmar: () => void
}

const mockISBNs = [
  { isbn: '978-85-508-2410-7', titulo: 'Pequenos Hábitos, Grandes Resultados', valido: true },
  { isbn: '978-85-508-2411-4', titulo: 'A Lógica do Mercado de Ações', valido: true },
  { isbn: '978-85-508-2412-1', titulo: 'Inteligência Emocional na Prática', valido: true },
  { isbn: '978-85-508-XXX-X', titulo: 'Liderança Quântica', valido: false, motivo: 'ISBN inválido' },
  { isbn: '978-85-508-2414-5', titulo: 'O Manual do Empreendedor Brasileiro', valido: true },
  { isbn: '', titulo: '(linha 24 sem ISBN)', valido: false, motivo: 'vazio' },
]

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onConfirmar }) => {
  const [arquivoSelecionado, setArquivoSelecionado] = useState(true)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="h-1 bg-brand-primary" />
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl text-brand-text-main">Novo lote</h2>
            <p className="text-sm text-gray-500 mt-0.5">Faça upload da planilha do prelo com os ISBNs a catalogar</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-brand-text-main w-8 h-8 flex items-center justify-center rounded-lg hover:bg-brand-bg-card">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {arquivoSelecionado ? (
            <div className="bg-brand-bg-section border border-gray-200 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brand-text-main truncate">prelo-set-2026.xlsx</p>
                <p className="text-xs text-gray-500 mt-0.5">42 KB · arquivo de demonstração</p>
              </div>
              <button onClick={() => setArquivoSelecionado(false)} className="text-xs text-gray-400 hover:text-red-500">trocar</button>
            </div>
          ) : (
            <div onClick={() => setArquivoSelecionado(true)} className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-brand-primary hover:bg-brand-bg-badge transition-colors cursor-pointer">
              <p className="font-semibold text-brand-text-main">Arraste a planilha aqui</p>
              <p className="text-sm text-gray-500 mt-1">ou clique pra escolher um arquivo de demonstração</p>
            </div>
          )}

          {arquivoSelecionado && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-brand-text-main">ISBNs detectados</h3>
                  <span className="text-sm text-gray-500">
                    <span className="font-bold text-brand-text-main">{mockISBNs.filter(i => i.valido).length}</span> linhas válidas ·{' '}
                    <span className="text-amber-700">{mockISBNs.filter(i => !i.valido).length} inválidas</span>
                  </span>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-brand-bg-card px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 grid grid-cols-[1fr_2fr_1fr] gap-3">
                    <span>ISBN físico</span>
                    <span>Título (planilha)</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto text-sm">
                    {mockISBNs.map((linha, idx) => (
                      <div key={idx} className={`px-4 py-2 grid grid-cols-[1fr_2fr_1fr] gap-3 items-center ${!linha.valido ? 'bg-red-50' : ''}`}>
                        <span className={`font-mono text-xs ${!linha.valido ? 'text-red-700' : ''}`}>{linha.isbn || '—'}</span>
                        <span className={`truncate ${linha.valido ? 'text-gray-700' : 'text-gray-500 italic'}`}>{linha.titulo}</span>
                        <span className={`text-xs font-medium ${linha.valido ? 'text-emerald-700' : 'text-red-700'}`}>
                          {linha.valido ? '✓ válido' : `✗ ${linha.motivo}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-brand-bg-section">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-brand-bg-card rounded-lg">
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={!arquivoSelecionado}
            className="flex items-center gap-2 px-5 py-2 bg-brand-primary hover:bg-brand-hover text-brand-text-main font-bold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            Disparar processamento
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgenteVerde/UploadModal.tsx
git commit -m "feat(agente-verde): adicionar modal de upload"
```

---

## Task 9: Listagem page + rota

**Files:**
- Create: `src/pages/AgenteVerde/Listagem.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Criar página de listagem**

Write file `src/pages/AgenteVerde/Listagem.tsx`:

```tsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { TopBar } from '../../components/TopBar'
import { DemoBanner } from '../../components/AgenteVerde/DemoBanner'
import { LoteCard } from '../../components/AgenteVerde/LoteCard'
import { UploadModal } from '../../components/AgenteVerde/UploadModal'
import { MOCK_LOTES } from '../../data/agenteVerdeMock'

export const Listagem: React.FC = () => {
  const navigate = useNavigate()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [busca, setBusca] = useState('')

  const lotesFiltrados = MOCK_LOTES.filter(l =>
    l.nome_arquivo.toLowerCase().includes(busca.toLowerCase())
  )

  const aviso = (label: string) => alert(`Ação ainda não implementada: ${label}`)

  return (
    <div className="bg-brand-bg-section min-h-screen pb-20">
      <TopBar onNewProject={() => navigate('/')} />

      <main className="max-w-6xl mx-auto px-8 pt-[100px] space-y-6">
        <DemoBanner />

        <section className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Agente Verde</div>
            <h1 className="font-serif text-4xl text-brand-text-main">Lotes de catalogação</h1>
            <p className="text-sm text-gray-500 mt-2">
              Cada lote corresponde a um upload de planilha do prelo. Acompanhe o status agregado e abra para revisar.
            </p>
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-hover text-brand-text-main font-bold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo lote
          </button>
        </section>

        <section className="flex items-center gap-2 text-sm">
          <div className="ml-auto relative">
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome do lote..."
              className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 w-72 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
            <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
          </div>
        </section>

        <section className="space-y-3">
          {lotesFiltrados.map((lote, idx) => (
            <LoteCard
              key={lote.id}
              lote={lote}
              emphasized={idx === 1 && lote.status === 'aguardando_revisao'}
              onAcaoNaoImplementada={aviso}
            />
          ))}
          {lotesFiltrados.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
              Nenhum lote encontrado.
            </div>
          )}
        </section>
      </main>

      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onConfirmar={() => {
          aviso('Disparar processamento')
          setUploadOpen(false)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Wire rota em App.tsx**

Editar `src/App.tsx`. Adicionar imports no topo:

```tsx
import { AgenteVerdeRoute } from './components/AgenteVerdeRoute'
import { Listagem as AgenteVerdeListagem } from './pages/AgenteVerde/Listagem'
```

Dentro do `<Routes>`, adicionar:

```tsx
<Route
  path="/agente-verde"
  element={
    <AgenteVerdeRoute>
      <AgenteVerdeListagem />
    </AgenteVerdeRoute>
  }
/>
```

- [ ] **Step 3: Type-check + smoke test**

Run: `npx tsc -b`
Expected: sem erros.

`npm run dev`, abrir como `bessalfs@gmail.com`, clicar "Agente Verde" no TopBar. Deve mostrar:
- Banner amarelo "Versão de validação"
- Título "Lotes de catalogação"
- Botão "Novo lote" (clicar abre modal)
- 4 cards de lote nos 3 status diferentes
- O 2º card (Prelo Agosto 2026) com borda amarela destacada

Logando como outro email, tentar acessar `/agente-verde` direto → deve redirecionar para `/`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/AgenteVerde/Listagem.tsx src/App.tsx
git commit -m "feat(agente-verde): adicionar pagina de listagem e rota"
```

---

## Task 10: ItemRow

**Files:**
- Create: `src/components/AgenteVerde/ItemRow.tsx`

- [ ] **Step 1: Criar componente**

Write file `src/components/AgenteVerde/ItemRow.tsx`:

```tsx
import React from 'react'
import { Check } from 'lucide-react'
import type { Item } from '../../types/agenteVerde'

interface ItemRowProps {
  item: Item
  selecionado: boolean
  marcadoEmLote: boolean
  onSelecionar: (id: string) => void
  onToggleMarcado: (id: string) => void
}

export const ItemRow: React.FC<ItemRowProps> = ({ item, selecionado, marcadoEmLote, onSelecionar, onToggleMarcado }) => {
  const baseCls = 'px-4 py-3 cursor-pointer transition-colors'
  const selecionadoCls = selecionado
    ? 'bg-brand-bg-badge border-l-4 border-brand-primary'
    : item.status === 'aprovado'
      ? 'hover:bg-brand-bg-section opacity-60'
      : 'hover:bg-brand-bg-section'

  const desabilitarCheckbox = item.status === 'pending_files' || item.status === 'falha' || item.status === 'aprovado'

  return (
    <div className={`${baseCls} ${selecionadoCls}`} onClick={() => onSelecionar(item.id)}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.status === 'aprovado' ? true : marcadoEmLote}
          disabled={desabilitarCheckbox}
          onClick={e => e.stopPropagation()}
          onChange={() => onToggleMarcado(item.id)}
          className={desabilitarCheckbox && item.status !== 'aprovado' ? 'mt-1 opacity-30' : 'mt-1 accent-brand-primary'}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-gray-400 mb-0.5">{item.isbn}</p>
          <p className={`text-sm leading-tight truncate ${selecionado ? 'font-semibold text-brand-text-main' : 'font-medium text-brand-text-main'}`}>
            {item.titulo}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {item.status === 'pending_files' || item.status === 'falha'
              ? <span className="text-gray-400">— {item.status_detalhe || 'sem dados'} —</span>
              : `${item.autor} · ${item.marca}`}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <ItemStatusBadge status={item.status} />
          </div>
        </div>
      </div>
    </div>
  )
}

const ItemStatusBadge: React.FC<{ status: Item['status'] }> = ({ status }) => {
  if (status === 'pronto_revisao') {
    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Pronto</span>
  }
  if (status === 'pending_files') {
    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pendente</span>
  }
  if (status === 'falha') {
    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">Falha</span>
  }
  if (status === 'aprovado') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
        <Check className="w-2.5 h-2.5" strokeWidth={3} />
        Aprovado
      </span>
    )
  }
  return null
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgenteVerde/ItemRow.tsx
git commit -m "feat(agente-verde): adicionar componente ItemRow"
```

---

## Task 11: ItemSidebar

**Files:**
- Create: `src/components/AgenteVerde/ItemSidebar.tsx`

- [ ] **Step 1: Criar componente**

Write file `src/components/AgenteVerde/ItemSidebar.tsx`:

```tsx
import React, { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { Item } from '../../types/agenteVerde'
import { ItemRow } from './ItemRow'

type FiltroStatus = 'todos' | 'prontos' | 'pendentes' | 'falhas' | 'aprovados'

interface ItemSidebarProps {
  itens: Item[]
  selecionadoId: string | null
  marcadosEmLote: Set<string>
  onSelecionar: (id: string) => void
  onToggleMarcado: (id: string) => void
}

export const ItemSidebar: React.FC<ItemSidebarProps> = ({ itens, selecionadoId, marcadosEmLote, onSelecionar, onToggleMarcado }) => {
  const [filtro, setFiltro] = useState<FiltroStatus>('prontos')
  const [busca, setBusca] = useState('')

  const contagens = useMemo(() => ({
    prontos: itens.filter(i => i.status === 'pronto_revisao').length,
    pendentes: itens.filter(i => i.status === 'pending_files').length,
    falhas: itens.filter(i => i.status === 'falha').length,
    aprovados: itens.filter(i => i.status === 'aprovado').length,
  }), [itens])

  const itensFiltrados = useMemo(() => {
    const buscaLower = busca.toLowerCase()
    return itens
      .filter(i => {
        if (filtro === 'prontos') return i.status === 'pronto_revisao'
        if (filtro === 'pendentes') return i.status === 'pending_files'
        if (filtro === 'falhas') return i.status === 'falha'
        if (filtro === 'aprovados') return i.status === 'aprovado'
        return true
      })
      .filter(i =>
        !busca ||
        i.isbn.toLowerCase().includes(buscaLower) ||
        i.titulo.toLowerCase().includes(buscaLower)
      )
  }, [itens, filtro, busca])

  return (
    <aside
      className="w-[360px] shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
      style={{ height: 'calc(100vh - 168px)', position: 'sticky', top: '88px' }}
    >
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="relative">
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por ISBN ou título..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <ChipFiltro ativo={filtro === 'prontos'} onClick={() => setFiltro('prontos')} label={`Prontos (${contagens.prontos})`} />
          <ChipFiltro ativo={filtro === 'pendentes'} onClick={() => setFiltro('pendentes')} label={`Pendentes (${contagens.pendentes})`} />
          <ChipFiltro ativo={filtro === 'falhas'} onClick={() => setFiltro('falhas')} label={`Falhas (${contagens.falhas})`} />
          <ChipFiltro ativo={filtro === 'aprovados'} onClick={() => setFiltro('aprovados')} label={`Aprovados (${contagens.aprovados})`} />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
        {itensFiltrados.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Nenhum item neste filtro.</p>
        ) : (
          itensFiltrados.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              selecionado={item.id === selecionadoId}
              marcadoEmLote={marcadosEmLote.has(item.id)}
              onSelecionar={onSelecionar}
              onToggleMarcado={onToggleMarcado}
            />
          ))
        )}
      </div>
    </aside>
  )
}

const ChipFiltro: React.FC<{ ativo: boolean; onClick: () => void; label: string }> = ({ ativo, onClick, label }) => (
  <button
    onClick={onClick}
    className={ativo
      ? 'px-2.5 py-1 text-xs rounded-full bg-[#111] text-brand-primary font-semibold'
      : 'px-2.5 py-1 text-xs rounded-full bg-brand-bg-card text-gray-600 hover:bg-gray-200 font-medium'}
  >
    {label}
  </button>
)
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgenteVerde/ItemSidebar.tsx
git commit -m "feat(agente-verde): adicionar ItemSidebar com filtros"
```

---

## Task 12: BookInfoForm

**Files:**
- Create: `src/components/AgenteVerde/BookInfoForm.tsx`

- [ ] **Step 1: Criar form**

Write file `src/components/AgenteVerde/BookInfoForm.tsx`:

```tsx
import React from 'react'
import { Sparkles, Plus, X as XIcon } from 'lucide-react'
import type { BookInfo } from '../../types/agenteVerde'

interface BookInfoFormProps {
  value: BookInfo
  onChange: (next: BookInfo) => void
}

export const BookInfoForm: React.FC<BookInfoFormProps> = ({ value, onChange }) => {
  const set = <K extends keyof BookInfo>(key: K, v: BookInfo[K]) => onChange({ ...value, [key]: v })

  const removerPalavra = (palavra: string) => {
    set('palavras_chave', value.palavras_chave.filter(p => p !== palavra))
  }

  return (
    <div className="p-6 space-y-6">
      <Secao titulo="Identificação" subtitulo="Campos extraídos da capa, miolo e planilha técnica">
        <Grid2>
          <Campo label="Título"><Input value={value.titulo} onChange={v => set('titulo', v)} /></Campo>
          <Campo label="Subtítulo"><Input value={value.subtitulo} onChange={v => set('subtitulo', v)} /></Campo>
          <Campo label="Autor principal"><Input value={value.autor} onChange={v => set('autor', v)} /></Campo>
          <Campo label="Marca"><Input value={value.marca} onChange={v => set('marca', v)} /></Campo>
          <Campo label="Idioma"><Input value={value.idioma} onChange={v => set('idioma', v)} /></Campo>
          <Campo label="Páginas"><Input value={String(value.paginas)} onChange={v => set('paginas', Number(v) || 0)} /></Campo>
        </Grid2>
      </Secao>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-serif text-lg text-brand-text-main">Sinopse</h3>
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <Sparkles className="w-3.5 h-3.5" />
            Gerado pela IA
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">Editável. Mudanças sobrescrevem a sugestão.</p>
        <textarea
          rows={5}
          value={value.sinopse}
          onChange={e => set('sinopse', e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
        />
      </div>

      <Secao titulo="Classificação BISAC" subtitulo="Sugestões baseadas em conteúdo do miolo">
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 bg-brand-bg-badge rounded-lg border border-brand-primary/30">
            <span className="font-mono text-xs font-bold bg-white px-2 py-1 rounded border border-gray-200">{value.bisac_principal.codigo}</span>
            <span className="text-sm flex-1">{value.bisac_principal.descricao}</span>
            <span className="text-xs text-emerald-700 font-semibold">Principal</span>
          </div>
          {value.bisac_secundarios.map((bisac, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
              <span className="font-mono text-xs font-bold bg-brand-bg-card px-2 py-1 rounded border border-gray-200">{bisac.codigo}</span>
              <span className="text-sm flex-1">{bisac.descricao}</span>
              <button
                type="button"
                onClick={() => set('bisac_secundarios', value.bisac_secundarios.filter((_, i) => i !== idx))}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                remover
              </button>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Palavras-chave" subtitulo="Pra busca em marketplaces. Ajuste livremente.">
        <div className="flex flex-wrap items-center gap-1.5">
          {value.palavras_chave.map(p => (
            <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-bg-card text-gray-700 border border-gray-200">
              {p}
              <button type="button" onClick={() => removerPalavra(p)} className="text-gray-400 hover:text-red-500 ml-0.5">
                <XIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-gray-400 border border-dashed border-gray-300">
            <Plus className="w-3 h-3" />
            adicionar
          </span>
        </div>
      </Secao>

      <Secao titulo="Dados comerciais" subtitulo="Cada ISBN gera dois cadastros — físico e digital">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-brand-bg-section rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-[#111] text-brand-primary text-xs font-bold flex items-center justify-center">📕</span>
              <span className="font-semibold text-sm">Físico</span>
            </div>
            <div className="space-y-3">
              <Campo label="ISBN físico"><InputMono value={value.isbn_fisico} onChange={v => set('isbn_fisico', v)} /></Campo>
              <Campo label="Preço (R$)"><Input value={value.preco_fisico} onChange={v => set('preco_fisico', v)} /></Campo>
              <Campo label="Tiragem inicial"><Input value={value.tiragem_inicial} onChange={v => set('tiragem_inicial', v)} /></Campo>
            </div>
          </div>
          <div className="bg-brand-bg-section rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-[#111] text-brand-primary text-xs font-bold flex items-center justify-center">📱</span>
              <span className="font-semibold text-sm">Digital</span>
            </div>
            <div className="space-y-3">
              <Campo label="ISBN digital"><InputMono value={value.isbn_digital} onChange={v => set('isbn_digital', v)} /></Campo>
              <Campo label="Preço (R$)"><Input value={value.preco_digital} onChange={v => set('preco_digital', v)} /></Campo>
              <Campo label="Formato">
                <select
                  value={value.formato_digital}
                  onChange={e => set('formato_digital', e.target.value as BookInfo['formato_digital'])}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                >
                  <option value="epub">ePub</option>
                  <option value="pdf">PDF</option>
                  <option value="mobi">MOBI</option>
                </select>
              </Campo>
            </div>
          </div>
        </div>
      </Secao>
    </div>
  )
}

const Secao: React.FC<{ titulo: string; subtitulo: string; children: React.ReactNode }> = ({ titulo, subtitulo, children }) => (
  <div>
    <h3 className="font-serif text-lg text-brand-text-main mb-1">{titulo}</h3>
    <p className="text-xs text-gray-500 mb-3">{subtitulo}</p>
    {children}
  </div>
)

const Grid2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-2 gap-4">{children}</div>
)

const Campo: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</div>
    {children}
  </div>
)

const Input: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input
    type="text"
    value={value}
    onChange={e => onChange(e.target.value)}
    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
  />
)

const InputMono: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input
    type="text"
    value={value}
    onChange={e => onChange(e.target.value)}
    className="w-full text-sm font-mono border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
  />
)
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgenteVerde/BookInfoForm.tsx
git commit -m "feat(agente-verde): adicionar BookInfoForm"
```

---

## Task 13: MetagraficaForm

**Files:**
- Create: `src/components/AgenteVerde/MetagraficaForm.tsx`

- [ ] **Step 1: Criar form**

Write file `src/components/AgenteVerde/MetagraficaForm.tsx`:

```tsx
import React from 'react'
import type { Metagrafica } from '../../types/agenteVerde'

interface MetagraficaFormProps {
  value: Metagrafica
  onChange: (next: Metagrafica) => void
}

export const MetagraficaForm: React.FC<MetagraficaFormProps> = ({ value, onChange }) => {
  const set = <K extends keyof Metagrafica>(key: K, v: Metagrafica[K]) => onChange({ ...value, [key]: v })
  const setNum = (key: keyof Metagrafica) => (v: string) => set(key, (Number(v) || 0) as never)

  return (
    <div className="p-6 space-y-6">
      <Secao titulo="Dimensões físicas" subtitulo="Calculadas a partir do miolo e tipo de capa">
        <div className="grid grid-cols-3 gap-4">
          <Campo label="Largura (mm)"><InputNum value={value.largura_mm} onChange={setNum('largura_mm')} /></Campo>
          <Campo label="Altura (mm)"><InputNum value={value.altura_mm} onChange={setNum('altura_mm')} /></Campo>
          <Campo label="Lombada (mm)"><InputNum value={value.lombada_mm} onChange={setNum('lombada_mm')} /></Campo>
        </div>
      </Secao>

      <Secao titulo="Papel" subtitulo="Gramaturas do miolo e capa">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Gramatura miolo (g/m²)"><InputNum value={value.gramatura_miolo} onChange={setNum('gramatura_miolo')} /></Campo>
          <Campo label="Gramatura capa (g/m²)"><InputNum value={value.gramatura_capa} onChange={setNum('gramatura_capa')} /></Campo>
        </div>
      </Secao>

      <Secao titulo="Identificação e peso" subtitulo="Para logística e cadastro CDD">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Peso (g)"><InputNum value={value.peso_g} onChange={setNum('peso_g')} /></Campo>
          <Campo label="CDD">
            <input
              type="text"
              value={value.cdd}
              onChange={e => set('cdd', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </Campo>
          <Campo label="Código de barras">
            <input
              type="text"
              value={value.codigo_barras}
              onChange={e => set('codigo_barras', e.target.value)}
              className="w-full text-sm font-mono border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </Campo>
        </div>
      </Secao>

      <Secao titulo="Categorias internas" subtitulo="Taxonomia Metagráfica (departamento → cat1 → cat2 → cat3)">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Departamento">
            <input
              type="text"
              value={value.departamento}
              onChange={e => set('departamento', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </Campo>
          <Campo label="Categoria 1">
            <input
              type="text"
              value={value.cat1}
              onChange={e => set('cat1', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </Campo>
          <Campo label="Categoria 2">
            <input
              type="text"
              value={value.cat2}
              onChange={e => set('cat2', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </Campo>
          <Campo label="Categoria 3">
            <input
              type="text"
              value={value.cat3}
              onChange={e => set('cat3', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </Campo>
        </div>
      </Secao>
    </div>
  )
}

const Secao: React.FC<{ titulo: string; subtitulo: string; children: React.ReactNode }> = ({ titulo, subtitulo, children }) => (
  <div>
    <h3 className="font-serif text-lg text-brand-text-main mb-1">{titulo}</h3>
    <p className="text-xs text-gray-500 mb-3">{subtitulo}</p>
    {children}
  </div>
)

const Campo: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</div>
    {children}
  </div>
)

const InputNum: React.FC<{ value: number; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input
    type="number"
    value={value}
    onChange={e => onChange(e.target.value)}
    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
  />
)
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgenteVerde/MetagraficaForm.tsx
git commit -m "feat(agente-verde): adicionar MetagraficaForm"
```

---

## Task 14: ItemDetailEditor

**Files:**
- Create: `src/components/AgenteVerde/ItemDetailEditor.tsx`

- [ ] **Step 1: Criar editor com tabs**

Write file `src/components/AgenteVerde/ItemDetailEditor.tsx`:

```tsx
import React, { useState } from 'react'
import { ExternalLink, RotateCcw, Check, FileText, LayoutGrid, AlertCircle } from 'lucide-react'
import type { Item, BookInfo, Metagrafica } from '../../types/agenteVerde'
import { BookInfoForm } from './BookInfoForm'
import { MetagraficaForm } from './MetagraficaForm'

type TabId = 'book_info' | 'metagrafica'

interface ItemDetailEditorProps {
  item: Item
  onChangeBookInfo: (next: BookInfo) => void
  onChangeMetagrafica: (next: Metagrafica) => void
  onAcaoNaoImplementada: (label: string) => void
}

export const ItemDetailEditor: React.FC<ItemDetailEditorProps> = ({
  item, onChangeBookInfo, onChangeMetagrafica, onAcaoNaoImplementada,
}) => {
  const [tab, setTab] = useState<TabId>('book_info')

  if (!item.book_info || !item.metagrafica) {
    return (
      <section className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-amber-300" />
        <div className="p-10 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="font-serif text-2xl text-brand-text-main">{item.titulo}</h2>
          <p className="text-xs font-mono text-gray-400">{item.isbn}</p>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Este item está em <strong>{item.status === 'falha' ? 'falha' : 'pendência'}</strong>.
            Motivo: <em>{item.status_detalhe || 'sem detalhes'}</em>.
            Resolva o problema no Drive e reprocesse pra continuar.
          </p>
          <button
            type="button"
            onClick={() => onAcaoNaoImplementada('Reprocessar item')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-bg-card hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reprocessar
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-brand-primary" />

      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start gap-5">
          <div className="w-20 h-28 rounded-lg bg-gradient-to-br from-amber-100 to-amber-300 shrink-0 flex items-center justify-center shadow-md">
            <span className="text-amber-900 text-[10px] font-bold tracking-wider text-center px-1.5">{item.titulo.split(' ').slice(0, 2).join('\n').toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {item.status === 'aprovado' ? 'Aprovado' : 'Pronto para revisão'}
              </span>
            </div>
            <h2 className="font-serif text-2xl text-brand-text-main leading-tight">{item.titulo}</h2>
            <p className="text-sm text-gray-500 mt-1">por <span className="font-medium text-gray-700">{item.autor}</span> · <span className="font-medium text-gray-700">{item.marca}</span></p>
            <p className="text-xs font-mono text-gray-400 mt-2">ISBN físico: {item.book_info.isbn_fisico} · ISBN digital: {item.book_info.isbn_digital}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => onAcaoNaoImplementada('Pasta no Drive')} className="flex items-center gap-1.5 text-xs text-brand-primary hover:underline">
              <ExternalLink className="w-3.5 h-3.5" />
              Pasta no Drive
            </button>
            <button type="button" onClick={() => onAcaoNaoImplementada('Reprocessar')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-brand-bg-card hover:bg-gray-200 rounded-lg transition-colors">
              <RotateCcw className="w-4 h-4" />
              Reprocessar
            </button>
            <button type="button" onClick={() => onAcaoNaoImplementada('Aprovar item')} className="flex items-center gap-1.5 px-4 py-2 bg-[#111] hover:bg-[#222] text-brand-primary font-bold rounded-lg text-sm transition-colors">
              <Check className="w-4 h-4" strokeWidth={2.5} />
              Aprovar
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 px-6 py-3 border-b border-gray-100 bg-brand-bg-section/50">
        <TabButton ativo={tab === 'book_info'} onClick={() => setTab('book_info')} icon={<FileText className="w-4 h-4" />} label="Book Info" sub="comercial" />
        <TabButton ativo={tab === 'metagrafica'} onClick={() => setTab('metagrafica')} icon={<LayoutGrid className="w-4 h-4" />} label="Metagráfica" sub="produção" />
      </div>

      {tab === 'book_info'
        ? <BookInfoForm value={item.book_info} onChange={onChangeBookInfo} />
        : <MetagraficaForm value={item.metagrafica} onChange={onChangeMetagrafica} />}
    </section>
  )
}

const TabButton: React.FC<{ ativo: boolean; onClick: () => void; icon: React.ReactNode; label: string; sub: string }> = ({ ativo, onClick, icon, label, sub }) => (
  <button
    type="button"
    onClick={onClick}
    className={ativo
      ? 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#111] text-brand-primary'
      : 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-brand-text-main hover:bg-white'}
  >
    {icon}
    {label}
    <span className={ativo
      ? 'ml-1 px-1.5 py-0.5 text-[10px] bg-white/10 rounded-full'
      : 'ml-1 px-1.5 py-0.5 text-[10px] bg-gray-100 rounded-full text-gray-500'}>
      {sub}
    </span>
  </button>
)
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/AgenteVerde/ItemDetailEditor.tsx
git commit -m "feat(agente-verde): adicionar ItemDetailEditor com tabs"
```

---

## Task 15: Revisao page + rota

**Files:**
- Create: `src/pages/AgenteVerde/Revisao.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Criar página de revisão**

Write file `src/pages/AgenteVerde/Revisao.tsx`:

```tsx
import React, { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { TopBar } from '../../components/TopBar'
import { DemoBanner } from '../../components/AgenteVerde/DemoBanner'
import { ItemSidebar } from '../../components/AgenteVerde/ItemSidebar'
import { ItemDetailEditor } from '../../components/AgenteVerde/ItemDetailEditor'
import { MOCK_LOTES, MOCK_ITEMS_BY_LOTE } from '../../data/agenteVerdeMock'
import type { Item, BookInfo, Metagrafica } from '../../types/agenteVerde'

export const Revisao: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const lote = useMemo(() => MOCK_LOTES.find(l => l.id === id), [id])
  const itensIniciais = useMemo(() => (id && MOCK_ITEMS_BY_LOTE[id]) || [], [id])

  const [itens, setItens] = useState<Item[]>(itensIniciais)
  const [selecionadoId, setSelecionadoId] = useState<string | null>(itensIniciais[0]?.id ?? null)
  const [marcadosEmLote, setMarcadosEmLote] = useState<Set<string>>(new Set())

  useEffect(() => {
    setItens(itensIniciais)
    setSelecionadoId(itensIniciais[0]?.id ?? null)
    setMarcadosEmLote(new Set())
  }, [itensIniciais])

  const itemSelecionado = itens.find(i => i.id === selecionadoId)

  const aviso = (label: string) => alert(`Ação ainda não implementada: ${label}`)

  const updateItemBookInfo = (novoBookInfo: BookInfo) => {
    if (!itemSelecionado) return
    setItens(prev => prev.map(it => it.id === itemSelecionado.id ? { ...it, book_info: novoBookInfo } : it))
  }

  const updateItemMetagrafica = (novoMeta: Metagrafica) => {
    if (!itemSelecionado) return
    setItens(prev => prev.map(it => it.id === itemSelecionado.id ? { ...it, metagrafica: novoMeta } : it))
  }

  const toggleMarcado = (itemId: string) => {
    setMarcadosEmLote(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  if (!lote) {
    return (
      <div className="bg-brand-bg-section min-h-screen">
        <TopBar onNewProject={() => navigate('/')} />
        <main className="max-w-6xl mx-auto px-8 pt-[120px]">
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center space-y-4">
            <p className="text-lg text-gray-600">Lote não encontrado.</p>
            <Link to="/agente-verde" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-brand-text-main font-bold rounded-lg">
              <ArrowLeft className="w-4 h-4" />
              Voltar à listagem
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-brand-bg-section min-h-screen pb-20">
      <TopBar onNewProject={() => navigate('/')} />

      <main className="max-w-[1500px] mx-auto px-6 pt-[88px] space-y-4">
        <DemoBanner />

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-brand-primary" />
          <div className="px-6 py-4 flex items-center gap-5 flex-wrap">
            <Link to="/agente-verde" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-text-main">
              <ArrowLeft className="w-4 h-4" />
              Lotes
            </Link>
            <span className="text-gray-300">/</span>
            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-2xl text-brand-text-main truncate">
                {lote.nome_arquivo.replace(/\.[^.]+$/, '').replace(/-/g, ' ')}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {lote.nome_arquivo} · {lote.total_itens} ISBNs · enviado {lote.uploaded_at}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Contador cor="bg-emerald-500" valor={lote.contadores.prontos} label="prontos" />
              {lote.contadores.pendentes > 0 && <Contador cor="bg-amber-400" valor={lote.contadores.pendentes} label="pendentes" />}
              {lote.contadores.falhas > 0 && <Contador cor="bg-red-500" valor={lote.contadores.falhas} label="falhas" />}
              {lote.contadores.aprovados > 0 && <Contador cor="bg-gray-400" valor={lote.contadores.aprovados} label="aprovados" />}
            </div>
            <button
              type="button"
              disabled={marcadosEmLote.size === 0}
              onClick={() => aviso(`Aprovar ${marcadosEmLote.size} selecionado(s)`)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-hover text-brand-text-main font-bold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
              Aprovar selecionados ({marcadosEmLote.size})
            </button>
          </div>
        </section>

        <div className="flex gap-4">
          <ItemSidebar
            itens={itens}
            selecionadoId={selecionadoId}
            marcadosEmLote={marcadosEmLote}
            onSelecionar={setSelecionadoId}
            onToggleMarcado={toggleMarcado}
          />

          {itemSelecionado ? (
            <ItemDetailEditor
              item={itemSelecionado}
              onChangeBookInfo={updateItemBookInfo}
              onChangeMetagrafica={updateItemMetagrafica}
              onAcaoNaoImplementada={aviso}
            />
          ) : (
            <section className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
              Selecione um item na lista para começar a revisão.
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

const Contador: React.FC<{ cor: string; valor: number; label: string }> = ({ cor, valor, label }) => (
  <div className="flex items-center gap-1.5">
    <span className={`w-2 h-2 rounded-full ${cor}`} />
    <span className="font-bold text-brand-text-main">{valor}</span>
    <span className="text-gray-500">{label}</span>
  </div>
)
```

- [ ] **Step 2: Wire rota em App.tsx**

Editar `src/App.tsx`. Adicionar import no topo:

```tsx
import { Revisao as AgenteVerdeRevisao } from './pages/AgenteVerde/Revisao'
```

Dentro do `<Routes>`, após a rota `/agente-verde`, adicionar:

```tsx
<Route
  path="/agente-verde/lote/:id"
  element={
    <AgenteVerdeRoute>
      <AgenteVerdeRevisao />
    </AgenteVerdeRoute>
  }
/>
```

- [ ] **Step 3: Type-check + smoke test**

Run: `npx tsc -b`
Expected: sem erros.

`npm run dev`, abrir como `bessalfs@gmail.com`. Navegação:
- `/agente-verde` → ver listagem
- Clicar "Revisar lote" no Prelo Agosto 2026 → vai pra `/agente-verde/lote/lote-ago-2026`
- Sidebar à esquerda mostra 7 itens prontos por padrão. Filtros chips funcionam.
- Clicar num item da sidebar → editor à direita atualiza.
- Alternar tab Book Info / Metagráfica → conteúdo do form muda.
- Editar um campo (ex: título) → persiste enquanto navega entre itens.
- Clicar "Aprovar" / "Reprocessar" / etc. → alerta "ação não implementada".
- Acessar `/agente-verde/lote/inexistente` → mostra "Lote não encontrado".

- [ ] **Step 4: Commit**

```bash
git add src/pages/AgenteVerde/Revisao.tsx src/App.tsx
git commit -m "feat(agente-verde): adicionar pagina de revisao e rota"
```

---

## Task 16: Build final + lint + verificação manual completa

**Files:** (nenhum)

- [ ] **Step 1: Build de produção**

Run: `npm run build`
Expected: sem erros TypeScript. Sem deterioração relevante de tamanho de bundle (Agente Verde é só telas mock, código leve).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: nenhum erro novo introduzido pelos arquivos do Agente Verde. Warnings pré-existentes em outros arquivos podem permanecer.

- [ ] **Step 3: Rodar testes**

Run: `npm run test:run`
Expected: TODOS passam (testes existentes do download + os 7 novos de `agenteVerdeAccess.test.ts` = 29 testes).

- [ ] **Step 4: Checklist manual completo no browser**

Logando como `bessalfs@gmail.com`:

- [ ] "Agente Verde" aparece no TopBar.
- [ ] `/agente-verde` mostra listagem com 4 lotes, banner de validação no topo, busca filtra por nome.
- [ ] Botão "Novo lote" abre modal de upload com preview de ISBNs (válidos + 2 inválidos destacados).
- [ ] "Disparar processamento" no modal mostra alerta.
- [ ] Card "Prelo Agosto 2026" tem destaque visual (borda amarela mais grossa).
- [ ] Clicar "Revisar lote" navega para `/agente-verde/lote/lote-ago-2026`.
- [ ] Sidebar lista 7 itens prontos. Filtros (Prontos/Pendentes/Falhas/Aprovados) trocam a lista.
- [ ] Selecionar diferentes itens troca o editor à direita.
- [ ] Tab Book Info mostra título, sinopse com badge IA, BISAC, palavras-chave editáveis, dados físicos+digitais lado a lado.
- [ ] Tab Metagráfica mostra dimensões, papel, peso, categorias.
- [ ] Editar título de um item → trocar pra outro item → voltar pro original → mudança preservada.
- [ ] Refresh F5 → mudanças perdidas (esperado).
- [ ] Item em status `pending_files` ou `falha` no painel direito mostra mensagem com motivo + botão Reprocessar.
- [ ] Botões Aprovar / Reprocessar / Pasta no Drive / Aprovar selecionados / Downloads → mostram alerta "não implementado".
- [ ] `/agente-verde/lote/inexistente` → mensagem "Lote não encontrado" + link voltar.

Logando com OUTRO email (criar conta de teste se necessário ou alterar temporariamente):

- [ ] "Agente Verde" NÃO aparece no TopBar.
- [ ] Tentar acessar `/agente-verde` direto → redireciona pra `/`.
- [ ] Tentar acessar `/agente-verde/lote/lote-ago-2026` direto → redireciona pra `/`.

- [ ] **Step 5: Commit (se houver ajustes pós-verificação)**

Se a verificação manual revelou ajustes, fazer commits específicos. Caso contrário, nada a commitar.

---

## Notas finais

- **Sem persistência:** edits ficam em `useState` local da página Revisao. Refresh perde tudo. Comportamento intencional pro 0.B.
- **Whitelist atualizar:** quando os emails reais de Cristiane / Anderson / Gorki forem confirmados, substituir em `src/lib/agenteVerdeAccess.ts`. Marcado com placeholder no código.
- **Próxima fase (1):** começar a integrar Drive + extração de PDF quando Anderson mandar template técnico e convenção de nomenclatura.
- **Risco a observar:** stakeholders olharem a demo e acharem que tá funcional. O banner `DemoBanner` + os alerts em cada ação devem mitigar.
