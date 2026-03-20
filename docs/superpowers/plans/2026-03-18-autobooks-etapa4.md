# Autobooks Etapa 4 — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar o frontend ao Supabase com dados reais, adicionar roteamento, e construir a tela de detalhe do projeto com arquivos, transcrições e sumários.

**Architecture:** Hooks customizados por domínio (useProjetos, useProjeto, useArquivos, useSumarios) encapsulam toda a lógica de dados. Páginas montam componentes menores. Realtime via Supabase channel no hook de detalhe do projeto.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, Supabase JS v2, React Router v6, Lucide React, Vitest + @testing-library/react.

**Nota:** O projeto não tem git inicializado. Não há comandos git neste plano.

---

## File Map

### Criar
| Arquivo | Responsabilidade |
|---|---|
| `.env` | Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY |
| `src/lib/supabase.ts` | Singleton do Supabase client |
| `src/hooks/useProjetos.ts` | Busca lista de projetos + realtime |
| `src/hooks/useProjeto.ts` | Busca projeto único + realtime de status |
| `src/hooks/useArquivos.ts` | Busca arquivos de um projeto |
| `src/hooks/useSumarios.ts` | Busca sumários + mutação selecionado |
| `src/pages/ListagemProjetos.tsx` | Página de listagem (extraída do App.tsx) |
| `src/pages/DetalheProjeto.tsx` | Página de detalhe (nova) |
| `src/components/ArquivoCard.tsx` | Card de arquivo expansível com transcrição |
| `src/components/SumarioCard.tsx` | Card de sumário expansível com botão de seleção |
| `vitest.config.ts` | Configuração do Vitest |
| `src/test/setup.ts` | Setup global dos testes |
| `src/hooks/__tests__/useProjetos.test.ts` | Testes do hook useProjetos |

### Modificar
| Arquivo | O que muda |
|---|---|
| `package.json` | Adicionar dependências via npm install |
| `vite.config.ts` | Adicionar @vitejs/plugin-react (estava faltando) |
| `src/types.ts` | Alinhar com schema real do banco (8 status, tipos DB) |
| `src/App.tsx` | Trocar conteúdo por router com rotas / e /projetos/:id |
| `src/components/StatusBadge.tsx` | Suportar os 8 status reais |
| `src/components/ProjectCard.tsx` | Usar tipos reais + navegar ao clicar + usar ProgressBar |
| `src/components/CreateProjectModal.tsx` | Corrigir URL webhook + callback onSuccess para refetch |
| `src/components/ProgressBar.tsx` | Tornar label configurável |

---

## Task 1: Verificar schema do banco + instalar dependências + configurar ambiente

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `vite.config.ts`
- Create: `.env`

- [ ] **Step 1: Verificar que a tabela sumarios existe no Supabase**

Abrir o Supabase dashboard em https://supabase.com/dashboard/project/tddolcrzmczvoqxkajic/editor e executar:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sumarios'
ORDER BY ordinal_position;
```

Esperado: colunas `id`, `projeto_id`, `opcao`, `abordagem`, `titulo_sumario`, `capitulos`, `drive_doc_id`, `drive_url`, `selecionado`, `created_at` presentes.

Se a tabela não existir, criá-la com:
```sql
CREATE TABLE sumarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID REFERENCES projetos(id) ON DELETE CASCADE,
  opcao INTEGER NOT NULL,
  abordagem VARCHAR(50) NOT NULL CHECK (abordagem IN ('cronologica', 'tematica', 'narrativa')),
  titulo_sumario VARCHAR(500),
  capitulos JSONB,
  drive_doc_id VARCHAR(255),
  drive_url TEXT,
  selecionado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX ON sumarios (projeto_id) WHERE selecionado = true;
```

- [ ] **Step 2: Instalar dependências de runtime**

```bash
cd /Users/luizfelipebessa/development/Addept/AltaBooks
npm install @supabase/supabase-js react-router-dom
```

Esperado: instalação sem erros, `package.json` atualizado.

- [ ] **Step 3: Instalar dependências de desenvolvimento (testes)**

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- [ ] **Step 4: Corrigir vite.config.ts — adicionar plugin React**

Substituir o conteúdo de `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```

- [ ] **Step 5: Criar arquivo .env**

Criar `.env` na raiz do projeto:

```
VITE_SUPABASE_URL=https://tddolcrzmczvoqxkajic.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkZG9sY3J6bWN6dm9xeGthamljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzgxNzgsImV4cCI6MjA3OTYxNDE3OH0.uTm3MXzGvoR1DbjChyOJbrzGmB9_TBC38V5rb3qVdsY
```

- [ ] **Step 6: Verificar que o dev server inicia sem erros**

```bash
npm run dev
```

Esperado: servidor em localhost:5173 sem erros no terminal.

---

## Task 2: Atualizar types.ts com schema real do banco

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Substituir o conteúdo de src/types.ts**

```typescript
// Status do projeto conforme constraint CHECK no banco
export type ProjetoStatus =
  | 'aguardando'
  | 'analisando_materiais'
  | 'gerando_executivo'
  | 'gerando_sumarios'
  | 'aguardando_aprovacao'
  | 'escrevendo_livro'
  | 'concluido'
  | 'erro';

// Tipo de arquivo conforme constraint CHECK no banco
export type ArquivoTipo = 'video' | 'audio' | 'pdf' | 'texto' | 'imagem';

// Status de processamento do arquivo
export type ArquivoStatus = 'pendente' | 'processado' | 'erro';

// Abordagem do sumário conforme constraint CHECK no banco
export type SumarioAbordagem = 'cronologica' | 'tematica' | 'narrativa';

// Capítulo dentro do JSONB de sumários
export interface Capitulo {
  numero: number;
  titulo: string;
  descricao: string;
}

// Tabela projetos
export interface Projeto {
  id: string;
  nome_projeto: string;
  autor_nome: string;
  drive_url: string | null;
  status: ProjetoStatus;
  created_at: string;
  updated_at: string | null;
}

// Tabela index_arquivos
export interface Arquivo {
  id: string;
  projeto_id: string;
  nome_arquivo: string;
  tipo_arquivo: ArquivoTipo;
  drive_file_id: string | null;
  drive_url: string | null;
  status: ArquivoStatus;
  created_at: string;
}

// Tabela transcricoes_resumos
export interface TranscricaoResumo {
  id: string;
  arquivo_id: string;
  transcricao_completa: string | null;
  resumo: string | null;
  topicos: string[] | null;
  tom: string | null;
  publico_alvo: string | null;
  argumentos_principais: string[] | null;
  idioma: string | null;
  modelo_llm_resumo: string | null;
  created_at: string;
}

// Tabela sumarios
export interface Sumario {
  id: string;
  projeto_id: string;
  opcao: number;
  abordagem: SumarioAbordagem;
  titulo_sumario: string | null;
  capitulos: Capitulo[] | null;
  drive_doc_id: string | null;
  drive_url: string | null;
  selecionado: boolean;
  created_at: string;
}
```

- [ ] **Step 2: Verificar que o TypeScript compila**

```bash
npm run build 2>&1 | head -50
```

Esperado: erros de compilação relacionados a tipos incompatíveis nos componentes existentes (esperado neste ponto — serão corrigidos nas próximas tasks).

---

## Task 3: Criar Supabase client

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Criar src/lib/supabase.ts**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: Verificar que o import funciona no browser**

Com o dev server rodando, abrir localhost:5173. Não deve haver erro de console "Missing Supabase environment variables".

---

## Task 4: Configurar Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json` (adicionar script "test")

- [ ] **Step 1: Criar vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 2: Criar src/test/setup.ts**

Nota: `@testing-library/jest-dom` já foi instalado na Task 1 Step 3.

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Adicionar scripts de teste ao package.json**

No bloco `"scripts"` do `package.json`, adicionar:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verificar que o setup funciona**

```bash
npm test
```

Esperado: "No test files found" ou saída sem erros de configuração.

---

## Task 5: Hook useProjetos

**Files:**
- Create: `src/hooks/useProjetos.ts`
- Create: `src/hooks/__tests__/useProjetos.test.ts`

- [ ] **Step 1: Escrever o teste (falha esperada)**

Criar `src/hooks/__tests__/useProjetos.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProjetos } from '../useProjetos'

const mockData = [
  {
    id: 'abc-123',
    nome_projeto: 'Projeto Teste',
    autor_nome: 'Autor Teste',
    drive_url: null,
    status: 'aguardando' as const,
    created_at: '2026-03-18T00:00:00Z',
    updated_at: null,
  },
]

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      })),
    })),
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}))

describe('useProjetos', () => {
  it('retorna lista de projetos após fetch', async () => {
    const { result } = renderHook(() => useProjetos())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.projetos).toHaveLength(1)
    expect(result.current.projetos[0].nome_projeto).toBe('Projeto Teste')
    expect(result.current.error).toBeNull()
  })

  it('expõe função refetch', () => {
    const { result } = renderHook(() => useProjetos())
    expect(typeof result.current.refetch).toBe('function')
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npm test
```

Esperado: FAIL — "Cannot find module '../useProjetos'"

- [ ] **Step 3: Implementar src/hooks/useProjetos.ts**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Projeto } from '../types'

interface UseProjetosResult {
  projetos: Projeto[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useProjetos(): UseProjetosResult {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjetos = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('projetos')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setProjetos((data as Projeto[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchProjetos()

    const channel = supabase
      .channel('projetos-lista')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projetos' },
        () => { void fetchProjetos() }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [fetchProjetos])

  return { projetos, loading, error, refetch: fetchProjetos }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
npm test
```

Esperado: PASS — 2 testes passando.

---

## Task 6: Hook useArquivos

**Files:**
- Create: `src/hooks/useArquivos.ts`

- [ ] **Step 1: Criar src/hooks/useArquivos.ts**

Atenção: a função interna é nomeada `loadArquivos` (não `fetch`) para evitar shadowing do global `fetch`.

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Arquivo, TranscricaoResumo } from '../types'

export interface ArquivoComTranscricao extends Arquivo {
  transcricao?: TranscricaoResumo | null
}

interface UseArquivosResult {
  arquivos: ArquivoComTranscricao[]
  loading: boolean
  error: string | null
}

export function useArquivos(projetoId: string): UseArquivosResult {
  const [arquivos, setArquivos] = useState<ArquivoComTranscricao[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projetoId) return

    async function loadArquivos() {
      setLoading(true)
      setError(null)

      const { data: arquivosData, error: arquivosError } = await supabase
        .from('index_arquivos')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('created_at', { ascending: true })

      if (arquivosError) {
        setError(arquivosError.message)
        setLoading(false)
        return
      }

      const arquivosList = (arquivosData as Arquivo[]) ?? []

      // Busca transcrições para todos os arquivos de uma vez
      const ids = arquivosList.map((a) => a.id)
      const { data: transcricoesData } = ids.length > 0
        ? await supabase.from('transcricoes_resumos').select('*').in('arquivo_id', ids)
        : { data: [] }

      const transcricoesMap = new Map<string, TranscricaoResumo>()
      for (const t of (transcricoesData as TranscricaoResumo[]) ?? []) {
        transcricoesMap.set(t.arquivo_id, t)
      }

      setArquivos(
        arquivosList.map((a) => ({
          ...a,
          transcricao: transcricoesMap.get(a.id) ?? null,
        }))
      )
      setLoading(false)
    }

    void loadArquivos()
  }, [projetoId])

  return { arquivos, loading, error }
}
```

---

## Task 7: Hook useSumarios

**Files:**
- Create: `src/hooks/useSumarios.ts`

- [ ] **Step 1: Criar src/hooks/useSumarios.ts**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Sumario } from '../types'

interface UseSumariosResult {
  sumarios: Sumario[]
  loading: boolean
  error: string | null
  selecionarSumario: (sumarioId: string) => Promise<void>
}

export function useSumarios(projetoId: string): UseSumariosResult {
  const [sumarios, setSumarios] = useState<Sumario[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSumarios = useCallback(async () => {
    if (!projetoId) return
    setLoading(true)

    const { data, error: fetchError } = await supabase
      .from('sumarios')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('opcao', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setSumarios((data as Sumario[]) ?? [])
    }
    setLoading(false)
  }, [projetoId])

  useEffect(() => {
    void fetchSumarios()
  }, [fetchSumarios])

  const selecionarSumario = useCallback(async (sumarioId: string) => {
    // Desmarca todos do projeto
    const { error: desmarcaError } = await supabase
      .from('sumarios')
      .update({ selecionado: false })
      .eq('projeto_id', projetoId)

    if (desmarcaError) {
      setError(desmarcaError.message)
      return
    }

    // Marca o escolhido
    const { error: marcaError } = await supabase
      .from('sumarios')
      .update({ selecionado: true })
      .eq('id', sumarioId)

    if (marcaError) {
      setError(marcaError.message)
      return
    }

    // Atualiza estado local otimisticamente
    setSumarios((prev) =>
      prev.map((s) => ({ ...s, selecionado: s.id === sumarioId }))
    )
  }, [projetoId])

  return { sumarios, loading, error, selecionarSumario }
}
```

---

## Task 8: Hook useProjeto (single + realtime)

**Files:**
- Create: `src/hooks/useProjeto.ts`

- [ ] **Step 1: Criar src/hooks/useProjeto.ts**

Atenção: `loading` inicializa como `false` quando `id` está vazio para evitar spinner infinito.

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Projeto } from '../types'

interface UseProjetoResult {
  projeto: Projeto | null
  loading: boolean
  error: string | null
}

export function useProjeto(id: string): UseProjetoResult {
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    async function loadProjeto() {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('projetos')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setProjeto(data as Projeto)
      }
      setLoading(false)
    }

    void loadProjeto()

    // Realtime: atualiza o projeto quando o n8n mudar o status
    const channel = supabase
      .channel(`projeto-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projetos', filter: `id=eq.${id}` },
        (payload) => {
          setProjeto(payload.new as Projeto)
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [id])

  return { projeto, loading, error }
}
```

---

## Task 9: Atualizar StatusBadge para 8 status reais

**Files:**
- Modify: `src/components/StatusBadge.tsx`

- [ ] **Step 1: Substituir o conteúdo de StatusBadge.tsx**

```tsx
import React from 'react'
import type { ProjetoStatus } from '../types'
import { Clock, Loader2, CheckCircle2, AlertCircle, FileSearch, FileText, BookOpen, PenLine } from 'lucide-react'

interface StatusBadgeProps {
  status: ProjetoStatus
}

const STATUS_CONFIG: Record<ProjetoStatus, {
  label: string
  icon: React.ReactNode
  className: string
  inProgress: boolean
}> = {
  aguardando: {
    label: 'Aguardando',
    icon: <Clock className="w-3.5 h-3.5" />,
    className: 'bg-gray-200 text-gray-700',
    inProgress: false,
  },
  analisando_materiais: {
    label: 'Analisando materiais...',
    icon: <FileSearch className="w-3.5 h-3.5" />,
    className: 'bg-brand-bg-badge border border-brand-primary text-brand-text-main',
    inProgress: true,
  },
  gerando_executivo: {
    label: 'Gerando projeto executivo...',
    icon: <FileText className="w-3.5 h-3.5" />,
    className: 'bg-brand-bg-badge border border-brand-primary text-brand-text-main',
    inProgress: true,
  },
  gerando_sumarios: {
    label: 'Gerando sumários...',
    icon: <BookOpen className="w-3.5 h-3.5" />,
    className: 'bg-brand-bg-badge border border-brand-primary text-brand-text-main',
    inProgress: true,
  },
  aguardando_aprovacao: {
    label: 'Aguardando aprovação',
    icon: <Clock className="w-3.5 h-3.5" />,
    className: 'bg-blue-100 text-blue-800',
    inProgress: false,
  },
  escrevendo_livro: {
    label: 'Escrevendo livro...',
    icon: <PenLine className="w-3.5 h-3.5" />,
    className: 'bg-brand-bg-badge border border-brand-primary text-brand-text-main',
    inProgress: true,
  },
  concluido: {
    label: 'Concluído',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className: 'bg-green-100 text-green-800',
    inProgress: false,
  },
  erro: {
    label: 'Erro',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    className: 'bg-red-100 text-red-800',
    inProgress: false,
  },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status]

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.className}`}>
      {config.inProgress
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : config.icon}
      {config.label}
    </span>
  )
}
```

---

## Task 10: Atualizar ProgressBar (label configurável)

**Files:**
- Modify: `src/components/ProgressBar.tsx`

- [ ] **Step 1: Tornar a label configurável**

```tsx
import React from 'react'

interface ProgressBarProps {
  current: number
  total: number
  label?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label = 'Processando arquivos...',
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="w-full mt-3">
      <div className="flex justify-between text-xs mb-1 text-brand-text-body">
        <span>{label}</span>
        <span className="font-semibold">{current} de {total} ({percentage}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-brand-primary h-1.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
```

---

## Task 11: Atualizar ProjectCard para tipos reais + navegação

**Files:**
- Modify: `src/components/ProjectCard.tsx`

- [ ] **Step 1: Substituir o conteúdo de ProjectCard.tsx**

Nota: usa o componente `ProgressBar` atualizado da Task 10 em vez de markup inline.

```tsx
import React from 'react'
import { ExternalLink } from 'lucide-react'
import type { Projeto, ProjetoStatus } from '../types'
import { StatusBadge } from './StatusBadge'
import { ProgressBar } from './ProgressBar'

interface ProjectCardProps {
  project: Projeto
  filesProcessed?: number
  filesTotal?: number
  onClick: () => void
}

const IN_PROGRESS_STATUSES: ProjetoStatus[] = [
  'analisando_materiais',
  'gerando_executivo',
  'gerando_sumarios',
  'escrevendo_livro',
]

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  filesProcessed,
  filesTotal,
  onClick,
}) => {
  const showProgress =
    IN_PROGRESS_STATUSES.includes(project.status) &&
    filesTotal !== undefined &&
    filesTotal > 0

  const formattedDate = new Date(project.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="bg-brand-bg-card rounded-xl p-5 border border-transparent hover:border-brand-primary hover:shadow-md transition-all duration-300 flex flex-col h-full relative group cursor-pointer"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-brand-text-main text-lg leading-tight mb-1 pr-8">
            {project.nome_projeto}
          </h3>
          <p className="text-brand-text-body text-sm opacity-70">
            {project.autor_nome}
          </p>
        </div>
        {project.drive_url && (
          <a
            href={project.drive_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-5 right-5 text-brand-text-body opacity-0 group-hover:opacity-100 hover:text-brand-primary transition-colors p-1"
            title="Abrir no Google Drive"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Status */}
      <div className="mb-6">
        <StatusBadge status={project.status} />
        {showProgress && (
          <ProgressBar
            current={filesProcessed ?? 0}
            total={filesTotal ?? 1}
          />
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4">
        <div className="text-xs text-brand-text-body opacity-50 text-center">
          Criado em {formattedDate}
        </div>
      </div>
    </div>
  )
}
```

---

## Task 12: Atualizar CreateProjectModal (URL + callback)

**Files:**
- Modify: `src/components/CreateProjectModal.tsx`

- [ ] **Step 1: Corrigir URL do webhook e interface de callbacks**

A prop `onSubmit` é substituída por `onSuccess` (sem dados — o projeto já foi criado pelo n8n no banco).

```tsx
import React, { useState } from 'react'
import { X } from 'lucide-react'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void  // chamado após POST com sucesso — dispara refetch na listagem
}

const WEBHOOK_URL = 'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/processar'

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('')
  const [author, setAuthor] = useState('')
  const [driveLink, setDriveLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const isFormValid = name.trim() !== '' && author.trim() !== '' && driveLink.trim() !== ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: name, authorName: author, driveLink }),
      })

      if (!response.ok) {
        throw new Error(`Webhook retornou status ${response.status}`)
      }

      setName('')
      setAuthor('')
      setDriveLink('')
      onClose()
      onSuccess()  // dispara refetch na listagem
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar projeto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-brand-text-main/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        className="bg-brand-bg rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="font-serif text-2xl font-bold text-brand-text-main">
            Novo Projeto
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-brand-text-main transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-brand-text-main mb-1">
                Nome do Projeto *
              </label>
              <input
                type="text" id="name" required
                className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                placeholder="Ex: Café com Teu Pai"
                value={name} onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="author" className="block text-sm font-medium text-brand-text-main mb-1">
                Nome do Autor *
              </label>
              <input
                type="text" id="author" required
                className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                placeholder="Ex: Breno Leonardi"
                value={author} onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="driveLink" className="block text-sm font-medium text-brand-text-main mb-1">
                Link do Google Drive *
              </label>
              <input
                type="url" id="driveLink" required
                className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                placeholder="https://drive.google.com/..."
                value={driveLink} onChange={(e) => setDriveLink(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="mt-8 flex gap-3 justify-end">
            <button
              type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-lg bg-brand-bg-card text-brand-text-body font-medium hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={`px-5 py-2.5 rounded-lg font-bold transition-all ${
                isFormValid && !loading
                  ? 'bg-brand-primary text-brand-text-main hover:bg-brand-hover'
                  : 'bg-brand-primary/50 text-brand-text-main/50 cursor-not-allowed'
              }`}
            >
              {loading ? 'Criando...' : 'Criar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

---

## Task 13: Criar página ListagemProjetos

**Files:**
- Create: `src/pages/ListagemProjetos.tsx`

- [ ] **Step 1: Criar src/pages/ListagemProjetos.tsx**

```tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/TopBar'
import { SearchBar } from '../components/SearchBar'
import { ProjectCard } from '../components/ProjectCard'
import { CreateProjectModal } from '../components/CreateProjectModal'
import { useProjetos } from '../hooks/useProjetos'

export function ListagemProjetos() {
  const navigate = useNavigate()
  const { projetos, loading, error, refetch } = useProjetos()
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const filteredProjetos = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return projetos.filter(
      (p) =>
        p.nome_projeto.toLowerCase().includes(q) ||
        p.autor_nome.toLowerCase().includes(q)
    )
  }, [projetos, searchQuery])

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg">
      <TopBar onNewProject={() => setIsModalOpen(true)} />

      <main className="flex-1 flex flex-col items-center pt-[80px]">
        <div className="w-full max-w-7xl px-[32px] py-10">

          <header className="flex justify-between items-center mb-10 w-full">
            <h2 className="font-serif text-3xl font-bold text-brand-text-main">
              Projetos
            </h2>
          </header>

          <div className="mb-8 w-full">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              Erro ao carregar projetos: {error}
            </div>
          )}

          {!loading && !error && (
            <div className="w-full">
              {filteredProjetos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
                  {filteredProjetos.map((projeto) => (
                    <div key={projeto.id} className="h-full">
                      <ProjectCard
                        project={projeto}
                        onClick={() => navigate(`/projetos/${projeto.id}`)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-16 bg-brand-bg-card rounded-xl border border-dashed border-gray-300">
                  <p className="text-brand-text-body font-medium text-lg text-center">
                    {searchQuery
                      ? `Nenhum projeto encontrado para "${searchQuery}"`
                      : 'Nenhum projeto criado ainda.'}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-4 text-brand-primary font-bold hover:underline"
                    >
                      Limpar busca
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refetch}
      />
    </div>
  )
}
```

---

## Task 14: Componentes ArquivoCard e SumarioCard

**Files:**
- Create: `src/components/ArquivoCard.tsx`
- Create: `src/components/SumarioCard.tsx`

- [ ] **Step 1: Criar src/components/ArquivoCard.tsx**

```tsx
import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Video, FileText, Image, File, Music } from 'lucide-react'
import type { ArquivoComTranscricao } from '../hooks/useArquivos'
import type { ArquivoTipo, ArquivoStatus } from '../types'

const TIPO_ICONS: Record<ArquivoTipo, React.ReactNode> = {
  video: <Video className="w-4 h-4" />,
  audio: <Music className="w-4 h-4" />,
  pdf: <FileText className="w-4 h-4" />,
  texto: <File className="w-4 h-4" />,
  imagem: <Image className="w-4 h-4" />,
}

const STATUS_STYLES: Record<ArquivoStatus, string> = {
  pendente: 'bg-gray-100 text-gray-600',
  processado: 'bg-green-100 text-green-700',
  erro: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<ArquivoStatus, string> = {
  pendente: 'Pendente',
  processado: 'Processado',
  erro: 'Erro',
}

interface ArquivoCardProps {
  arquivo: ArquivoComTranscricao
}

export const ArquivoCard: React.FC<ArquivoCardProps> = ({ arquivo }) => {
  const [expanded, setExpanded] = useState(false)
  const hasTranscricao = arquivo.transcricao != null

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => hasTranscricao && setExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-4 text-left bg-white hover:bg-brand-bg-section transition-colors ${hasTranscricao ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-brand-text-body">{TIPO_ICONS[arquivo.tipo_arquivo]}</span>
          <span className="text-sm font-medium text-brand-text-main truncate max-w-[280px]">
            {arquivo.nome_arquivo}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[arquivo.status]}`}>
            {STATUS_LABELS[arquivo.status]}
          </span>
          {hasTranscricao && (
            expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && arquivo.transcricao && (
        <div className="px-4 pb-4 pt-2 bg-brand-bg-section border-t border-gray-100 space-y-4">
          {arquivo.transcricao.resumo && (
            <div>
              <p className="text-xs font-semibold text-brand-text-body uppercase tracking-wide mb-1">Resumo</p>
              <p className="text-sm text-brand-text-body">{arquivo.transcricao.resumo}</p>
            </div>
          )}
          {arquivo.transcricao.topicos && arquivo.transcricao.topicos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-brand-text-body uppercase tracking-wide mb-2">Tópicos</p>
              <div className="flex flex-wrap gap-2">
                {arquivo.transcricao.topicos.map((t, i) => (
                  <span key={i} className="text-xs bg-brand-bg-badge border border-brand-primary px-2 py-0.5 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {arquivo.transcricao.tom && (
            <div>
              <p className="text-xs font-semibold text-brand-text-body uppercase tracking-wide mb-1">Tom de voz</p>
              <p className="text-sm text-brand-text-body">{arquivo.transcricao.tom}</p>
            </div>
          )}
          {arquivo.transcricao.publico_alvo && (
            <div>
              <p className="text-xs font-semibold text-brand-text-body uppercase tracking-wide mb-1">Público-alvo</p>
              <p className="text-sm text-brand-text-body">{arquivo.transcricao.publico_alvo}</p>
            </div>
          )}
          {arquivo.transcricao.argumentos_principais && arquivo.transcricao.argumentos_principais.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-brand-text-body uppercase tracking-wide mb-2">Argumentos principais</p>
              <ul className="space-y-1">
                {arquivo.transcricao.argumentos_principais.map((a, i) => (
                  <li key={i} className="text-sm text-brand-text-body flex gap-2">
                    <span className="text-brand-primary font-bold mt-0.5">•</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Criar src/components/SumarioCard.tsx**

```tsx
import React, { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle2 } from 'lucide-react'
import type { Sumario, SumarioAbordagem } from '../types'

const ABORDAGEM_LABELS: Record<SumarioAbordagem, string> = {
  cronologica: 'Cronológica',
  tematica: 'Temática',
  narrativa: 'Narrativa',
}

interface SumarioCardProps {
  sumario: Sumario
  onSelecionar: (id: string) => void
}

export const SumarioCard: React.FC<SumarioCardProps> = ({ sumario, onSelecionar }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`rounded-xl border-2 p-5 transition-all ${
      sumario.selecionado
        ? 'border-brand-primary bg-brand-bg-badge'
        : 'border-gray-200 bg-white hover:border-gray-300'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-brand-text-body uppercase tracking-wide">
              Opção {sumario.opcao}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {ABORDAGEM_LABELS[sumario.abordagem]}
            </span>
            {sumario.selecionado && (
              <span className="text-xs bg-brand-primary text-brand-text-main px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Selecionado
              </span>
            )}
          </div>
          <h4 className="font-bold text-brand-text-main text-base">
            {sumario.titulo_sumario ?? 'Sem título'}
          </h4>
          {sumario.capitulos && (
            <p className="text-xs text-brand-text-body mt-1">
              {sumario.capitulos.length} capítulos
            </p>
          )}
        </div>
      </div>

      {/* Capítulos expansíveis */}
      {sumario.capitulos && sumario.capitulos.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-semibold text-brand-text-body hover:text-brand-text-main transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Ocultar capítulos' : 'Ver capítulos'}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2">
              {sumario.capitulos.map((cap) => (
                <div key={cap.numero} className="pl-3 border-l-2 border-brand-primary/40">
                  <p className="text-xs font-semibold text-brand-text-main">
                    Cap. {cap.numero} — {cap.titulo}
                  </p>
                  {cap.descricao && (
                    <p className="text-xs text-brand-text-body mt-0.5">{cap.descricao}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        {sumario.drive_url && (
          <a
            href={sumario.drive_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-brand-text-body hover:border-gray-400 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver no Drive
          </a>
        )}
        {!sumario.selecionado && (
          <button
            onClick={() => onSelecionar(sumario.id)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-brand-text-main font-bold transition-colors"
          >
            Selecionar este sumário
          </button>
        )}
      </div>
    </div>
  )
}
```

---

## Task 15: Criar página DetalheProjeto

**Files:**
- Create: `src/pages/DetalheProjeto.tsx`

- [ ] **Step 1: Criar src/pages/DetalheProjeto.tsx**

```tsx
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useProjeto } from '../hooks/useProjeto'
import { useArquivos } from '../hooks/useArquivos'
import { useSumarios } from '../hooks/useSumarios'
import { StatusBadge } from '../components/StatusBadge'
import { ProgressBar } from '../components/ProgressBar'
import { ArquivoCard } from '../components/ArquivoCard'
import { SumarioCard } from '../components/SumarioCard'
import type { ProjetoStatus } from '../types'
import logo from '../assets/logo-alta-books.png'

const MOSTRA_EXECUTIVO: readonly ProjetoStatus[] = [
  'gerando_executivo',
  'gerando_sumarios',
  'aguardando_aprovacao',
  'escrevendo_livro',
  'concluido',
] as const

const MOSTRA_SUMARIOS: readonly ProjetoStatus[] = [
  'gerando_sumarios',
  'aguardando_aprovacao',
  'escrevendo_livro',
  'concluido',
] as const

export function DetalheProjeto() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { projeto, loading: loadingProjeto, error: errorProjeto } = useProjeto(id ?? '')
  const { arquivos, loading: loadingArquivos } = useArquivos(id ?? '')
  const { sumarios, loading: loadingSumarios, selecionarSumario } = useSumarios(id ?? '')

  const arquivosProcessados = arquivos.filter((a) => a.status === 'processado').length

  if (loadingProjeto) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (errorProjeto || !projeto) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">Projeto não encontrado.</p>
        <button onClick={() => navigate('/')} className="text-brand-primary hover:underline font-bold">
          Voltar à listagem
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg">
      {/* TopBar */}
      <header className="fixed top-0 left-0 right-0 h-[80px] bg-[#111111] z-40 flex items-center justify-between px-[32px] shadow-md">
        <img src={logo} alt="Alta Books" className="h-[48px] w-auto brightness-0 invert" />
      </header>

      <main className="flex-1 pt-[80px]">
        <div className="w-full max-w-4xl mx-auto px-8 py-10 space-y-10">

          {/* Breadcrumb */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-brand-text-body hover:text-brand-text-main transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar à listagem
          </button>

          {/* Seção: Informações gerais */}
          <section>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="font-serif text-3xl font-bold text-brand-text-main mb-1">
                  {projeto.nome_projeto}
                </h1>
                <p className="text-brand-text-body text-lg">{projeto.autor_nome}</p>
              </div>
              <StatusBadge status={projeto.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-brand-text-body mt-4">
              <div>
                <span className="font-semibold">Criado em:</span>{' '}
                {new Date(projeto.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </div>
              {projeto.updated_at && (
                <div>
                  <span className="font-semibold">Atualizado em:</span>{' '}
                  {new Date(projeto.updated_at).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </div>
              )}
              {projeto.drive_url && (
                <div>
                  <a
                    href={projeto.drive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-brand-primary font-semibold hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Pasta no Google Drive
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Seção: Arquivos processados */}
          <section>
            <h2 className="font-serif text-xl font-bold text-brand-text-main mb-4">
              Arquivos processados
            </h2>

            {arquivos.length > 0 && (
              <ProgressBar
                current={arquivosProcessados}
                total={arquivos.length}
                label="Arquivos processados"
              />
            )}

            {loadingArquivos ? (
              <p className="text-sm text-brand-text-body mt-4">Carregando arquivos...</p>
            ) : arquivos.length === 0 ? (
              <p className="text-sm text-brand-text-body opacity-60 mt-4">Nenhum arquivo indexado ainda.</p>
            ) : (
              <div className="space-y-2 mt-4">
                {arquivos.map((arquivo) => (
                  <ArquivoCard key={arquivo.id} arquivo={arquivo} />
                ))}
              </div>
            )}
          </section>

          {/* Seção: Projeto Executivo */}
          {MOSTRA_EXECUTIVO.includes(projeto.status) && (
            <section>
              <h2 className="font-serif text-xl font-bold text-brand-text-main mb-4">
                Projeto Executivo
              </h2>
              <div className="bg-brand-bg-card rounded-xl p-5">
                <p className="text-sm text-brand-text-body mb-3">
                  O projeto executivo foi gerado com base nos materiais do autor.
                </p>
                {/* TODO: Adicionar campo drive_executivo_url à tabela projetos para exibir link direto */}
                <p className="text-xs text-brand-text-body opacity-50 italic">
                  Link do documento disponível após adicionar campo drive_executivo_url à tabela projetos.
                </p>
              </div>
            </section>
          )}

          {/* Seção: Sumários */}
          {MOSTRA_SUMARIOS.includes(projeto.status) && (
            <section>
              <h2 className="font-serif text-xl font-bold text-brand-text-main mb-4">
                Opções de Sumário
              </h2>

              {loadingSumarios ? (
                <p className="text-sm text-brand-text-body">Carregando sumários...</p>
              ) : sumarios.length === 0 ? (
                <p className="text-sm text-brand-text-body opacity-60">Sumários sendo gerados...</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {sumarios.map((sumario) => (
                    <SumarioCard
                      key={sumario.id}
                      sumario={sumario}
                      onSelecionar={selecionarSumario}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

        </div>
      </main>
    </div>
  )
}
```

---

## Task 16: Configurar roteamento no App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Substituir App.tsx pelo router**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ListagemProjetos } from './pages/ListagemProjetos'
import { DetalheProjeto } from './pages/DetalheProjeto'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ListagemProjetos />} />
        <Route path="/projetos/:id" element={<DetalheProjeto />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

---

## Task 17: Verificação final

- [ ] **Step 1: Testes passando**

```bash
npm test
```

Esperado: PASS — todos os testes do hook useProjetos.

- [ ] **Step 2: Lint sem erros**

```bash
npm run lint
```

Esperado: sem erros de lint.

- [ ] **Step 3: Build sem erros de TypeScript**

```bash
npm run build
```

Esperado: build completo sem erros de tipo.

- [ ] **Step 4: Verificação no browser — Listagem**

Abrir localhost:5173. Verificar:
- [ ] Projetos carregam do Supabase (não mais dados mock)
- [ ] Busca filtra por nome e autor
- [ ] Loading spinner aparece durante fetch
- [ ] Criar novo projeto dispara o webhook e a lista atualiza após fechar o modal

- [ ] **Step 5: Verificação no browser — Detalhe**

Clicar em um projeto. Verificar:
- [ ] Navega para `/projetos/:id`
- [ ] Informações gerais com StatusBadge correto
- [ ] Lista de arquivos com ícones e status
- [ ] Clicar num arquivo processado expande transcrição
- [ ] Botão voltar retorna à listagem

- [ ] **Step 6: Verificação Realtime**

No Supabase dashboard, executar:
```sql
UPDATE projetos SET status = 'analisando_materiais', updated_at = NOW() WHERE id = '<id do projeto>';
```

Verificar que o StatusBadge na tela de listagem atualiza sem refresh da página.

---

## Notas para o implementador

- A tabela `projetos` não tem campo para link do projeto executivo. A seção na tela de detalhe exibe um placeholder. Uma migration futura precisará adicionar `drive_executivo_url TEXT` à tabela `projetos`.
- `.env` deve ser adicionado ao `.gitignore` quando o projeto inicializar git.
- `@supabase/supabase-js` v2 usa `supabase.removeChannel(channel)` — não `removeSubscription` da v1.
- A seleção de sumário tem `UNIQUE INDEX` parcial no banco (`WHERE selecionado = true`), garantindo integridade mesmo em caso de falha da aplicação.
