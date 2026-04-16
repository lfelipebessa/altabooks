# In-Platform Document Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir visualizar e editar o Projeto Executivo e os Sumários diretamente na plataforma, sem precisar abrir o Google Drive.

**Architecture:** Dois padrões de edição inline na página `DetalheProjeto`: (1) `ExecutivoPanel` — componente novo, painel expansível com editor Tiptap carregado via `React.lazy`; (2) `SumarioCard` — modo de edição estruturada nos campos existentes (`titulo_sumario`, `capitulos`). Conteúdo do executivo armazenado em nova coluna `projetos.conteudo_executivo` no Supabase.

**Tech Stack:** Tiptap (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`), React.lazy/Suspense, Supabase JS client, CSS `@media print` para download PDF.

> **Nota:** Este projeto não tem suite de testes automatizados. Os passos de verificação são manuais via browser (`npm run dev`).

---

## File Map

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Modify | `src/types.ts` | Adicionar `conteudo_executivo` em `Projeto` e `conteudo` em `Sumario` |
| Modify | `src/hooks/useProjeto.ts` | Adicionar `salvarExecutivo()` |
| Modify | `src/hooks/useSumarios.ts` | Adicionar `atualizarSumario()` |
| Create | `src/components/TiptapEditor.tsx` | Editor rico lazy-loadável |
| Create | `src/components/ExecutivoPanel.tsx` | Painel expansível do executivo com Tiptap |
| Modify | `src/components/SumarioCard.tsx` | Adicionar modo edição inline dos campos |
| Modify | `src/pages/DetalheProjeto.tsx` | Substituir card executivo por `ExecutivoPanel` |
| Modify | `src/index.css` | Estilos do ProseMirror + `@media print` |

---

## Task 1: Migração do banco de dados

**Files:**
- (nenhum arquivo local — executar via Supabase MCP)

- [ ] **Step 1: Executar migration via Supabase MCP**

Usar a tool `mcp__plugin_supabase_supabase__apply_migration` com o SQL abaixo:

```sql
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS conteudo_executivo text;
ALTER TABLE sumarios ADD COLUMN IF NOT EXISTS conteudo text;
```

- [ ] **Step 2: Verificar no Supabase**

Usar `mcp__plugin_supabase_supabase__execute_sql` para confirmar:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('projetos', 'sumarios')
  AND column_name IN ('conteudo_executivo', 'conteudo');
```

Esperado: 2 rows retornadas.

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "feat: add conteudo_executivo to projetos and conteudo to sumarios (via Supabase MCP)"
```

---

## Task 2: Atualizar tipos TypeScript

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Adicionar campos ao tipo `Projeto`**

Em `src/types.ts`, substituir:

```ts
export interface Projeto {
  id: string; nome_projeto: string; autor_nome: string
  drive_url: string | null; drive_executivo_url: string | null
  status: ProjetoStatus; created_at: string; updated_at: string | null
  qtd_capitulos: number
  qtd_subcapitulos_min: number
  qtd_subcapitulos_max: number
  paginas_min: number
  paginas_max: number
}
```

Por:

```ts
export interface Projeto {
  id: string; nome_projeto: string; autor_nome: string
  drive_url: string | null; drive_executivo_url: string | null
  conteudo_executivo: string | null
  status: ProjetoStatus; created_at: string; updated_at: string | null
  qtd_capitulos: number
  qtd_subcapitulos_min: number
  qtd_subcapitulos_max: number
  paginas_min: number
  paginas_max: number
}
```

- [ ] **Step 2: Adicionar campo ao tipo `Sumario`**

Em `src/types.ts`, substituir:

```ts
export interface Sumario {
  id: string; projeto_id: string; opcao: number
  abordagem: SumarioAbordagem; titulo_sumario: string | null
  capitulos: Capitulo[] | null; drive_doc_id: string | null
  drive_url: string | null; selecionado: boolean
  created_at: string; updated_at: string | null
}
```

Por:

```ts
export interface Sumario {
  id: string; projeto_id: string; opcao: number
  abordagem: SumarioAbordagem; titulo_sumario: string | null
  capitulos: Capitulo[] | null; drive_doc_id: string | null
  drive_url: string | null; selecionado: boolean
  conteudo: string | null
  created_at: string; updated_at: string | null
}
```

- [ ] **Step 3: Verificar que não há erros de tipo**

```bash
npm run build 2>&1 | head -30
```

Esperado: sem erros de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts
git commit -m "feat: add conteudo_executivo and conteudo fields to TS types"
```

---

## Task 3: Instalar Tiptap e adicionar estilos

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Instalar dependências**

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
```

- [ ] **Step 2: Adicionar estilos do ProseMirror e print em `src/index.css`**

Adicionar ao final do arquivo:

```css
/* Tiptap / ProseMirror content styles */
.ProseMirror:focus { outline: none; }
.ProseMirror h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.75rem; margin-top: 1.25rem; line-height: 1.3; }
.ProseMirror h2 { font-size: 1.375rem; font-weight: 700; margin-bottom: 0.5rem; margin-top: 1rem; line-height: 1.35; }
.ProseMirror h3 { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; margin-top: 0.75rem; }
.ProseMirror p { margin-bottom: 0.75rem; line-height: 1.75; color: #333333; }
.ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.ProseMirror li { margin-bottom: 0.25rem; line-height: 1.75; }
.ProseMirror strong { font-weight: 700; }
.ProseMirror em { font-style: italic; }
.ProseMirror blockquote { border-left: 3px solid #F5C518; padding-left: 1rem; color: #555; margin: 1rem 0; }

/* Shared: read-only HTML content rendered with dangerouslySetInnerHTML */
.prose-content h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.75rem; margin-top: 1.25rem; line-height: 1.3; }
.prose-content h2 { font-size: 1.375rem; font-weight: 700; margin-bottom: 0.5rem; margin-top: 1rem; }
.prose-content h3 { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; margin-top: 0.75rem; }
.prose-content p { margin-bottom: 0.75rem; line-height: 1.75; color: #333333; }
.prose-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.prose-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.prose-content li { margin-bottom: 0.25rem; line-height: 1.75; }
.prose-content strong { font-weight: 700; }
.prose-content em { font-style: italic; }

/* PDF via window.print() */
@media print {
  body * { visibility: hidden; }
  .print-target, .print-target * { visibility: visible; }
  .print-target {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 2rem;
  }
}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/index.css package.json package-lock.json
git commit -m "feat: install tiptap and add prose + print CSS"
```

---

## Task 4: Criar TiptapEditor component

**Files:**
- Create: `src/components/TiptapEditor.tsx`

- [ ] **Step 1: Criar o componente**

Criar `src/components/TiptapEditor.tsx`:

```tsx
import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const ToolbarBtn: React.FC<{
    onClick: () => void;
    active: boolean;
    children: React.ReactNode;
    title: string;
  }> = ({ onClick, active, children, title }) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-brand-primary text-brand-text-main'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-0.5 p-2 border-b border-gray-100 bg-brand-bg-section flex-wrap">
        <ToolbarBtn title="Negrito" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
          <Bold className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Itálico" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
          <Italic className="w-4 h-4" />
        </ToolbarBtn>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <ToolbarBtn title="Título 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}>
          <span className="text-xs font-bold px-0.5">H1</span>
        </ToolbarBtn>
        <ToolbarBtn title="Título 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
          <span className="text-xs font-bold px-0.5">H2</span>
        </ToolbarBtn>
        <ToolbarBtn title="Título 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>
          <span className="text-xs font-bold px-0.5">H3</span>
        </ToolbarBtn>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <ToolbarBtn title="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
          <List className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
          <ListOrdered className="w-4 h-4" />
        </ToolbarBtn>
      </div>
      <EditorContent
        editor={editor}
        className="p-5 min-h-[300px] text-brand-text-body"
      />
    </div>
  );
};
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/TiptapEditor.tsx
git commit -m "feat: add TiptapEditor component with toolbar"
```

---

## Task 5: Criar ExecutivoPanel component

**Files:**
- Create: `src/components/ExecutivoPanel.tsx`

- [ ] **Step 1: Criar o componente**

Criar `src/components/ExecutivoPanel.tsx`:

```tsx
import React, { useState, useCallback, useRef, Suspense } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Pencil, X, Loader2, Printer } from 'lucide-react';

const TiptapEditor = React.lazy(() =>
  import('./TiptapEditor').then(m => ({ default: m.TiptapEditor }))
);

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ExecutivoPanelProps {
  conteudo: string | null;
  driveUrl: string | null;
  isReady: boolean;
  onSave: (html: string) => Promise<void>;
}

export const ExecutivoPanel: React.FC<ExecutivoPanelProps> = ({
  conteudo,
  driveUrl,
  isReady,
  onSave,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((html: string) => {
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await onSave(html);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 2000);
  }, [onSave]);

  const handleExitEdit = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setEditMode(false);
    setSaveStatus('idle');
  };

  if (!isReady) {
    return (
      <div className="bg-brand-bg rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-brand-text-main mb-1">Documento Executivo</h3>
          <p className="text-sm text-gray-500">Sendo gerado... aguarde.</p>
        </div>
        <div className="px-5 py-2.5 bg-brand-bg-badge border border-brand-primary/30 text-amber-800 font-medium rounded-lg flex items-center gap-2 shrink-0">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processando
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-bg rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-brand-text-main">Documento Executivo</h3>
          {driveUrl && (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-brand-primary transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Drive
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-emerald-600">✓ Salvo</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-500">Erro ao salvar</span>
          )}

          {expanded && conteudo && (
            <>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-brand-bg-card text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <Printer className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={() => editMode ? handleExitEdit() : setEditMode(true)}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-all ${
                  editMode
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-brand-bg-card text-gray-600 hover:bg-brand-primary hover:text-brand-text-main'
                }`}
              >
                {editMode
                  ? <><X className="w-4 h-4" /> Sair da edição</>
                  : <><Pencil className="w-4 h-4" /> Editar</>
                }
              </button>
            </>
          )}

          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-brand-bg-card text-gray-600 hover:bg-brand-primary hover:text-brand-text-main transition-all"
          >
            {expanded
              ? <><ChevronUp className="w-4 h-4" /> Ocultar</>
              : <><ChevronDown className="w-4 h-4" /> Mostrar</>
            }
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="border-t border-gray-100 p-6 print-target">
          {conteudo ? (
            editMode ? (
              <Suspense
                fallback={
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                }
              >
                <TiptapEditor content={conteudo} onChange={handleChange} />
              </Suspense>
            ) : (
              <div
                className="prose-content"
                dangerouslySetInnerHTML={{ __html: conteudo }}
              />
            )
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p className="mb-3">Conteúdo ainda não disponível na plataforma.</p>
              {driveUrl && (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-brand-primary font-medium hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir no Drive
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | head -20
```

Esperado: sem erros de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/components/ExecutivoPanel.tsx
git commit -m "feat: add ExecutivoPanel with lazy Tiptap editor and auto-save"
```

---

## Task 6: Adicionar `salvarExecutivo` ao hook e integrar ExecutivoPanel no DetalheProjeto

**Files:**
- Modify: `src/hooks/useProjeto.ts`
- Modify: `src/pages/DetalheProjeto.tsx`

- [ ] **Step 1: Adicionar `salvarExecutivo` ao `useProjeto`**

Em `src/hooks/useProjeto.ts`, adicionar a função antes do `return` e incluí-la no retorno:

```ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Projeto } from '../types'

export function useProjeto(id: string | undefined) {
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    async function fetchProjeto() {
      try {
        setLoading(true)
        setError(null)
        const { data, error: fetchError } = await supabase
          .from('projetos')
          .select('*')
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError
        setProjeto(data as Projeto)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar projeto')
      } finally {
        setLoading(false)
      }
    }

    fetchProjeto()

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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  const salvarExecutivo = useCallback(async (html: string) => {
    if (!id) return
    const { error } = await supabase
      .from('projetos')
      .update({ conteudo_executivo: html })
      .eq('id', id)
    if (error) throw error
  }, [id])

  return { projeto, loading, error, salvarExecutivo }
}
```

- [ ] **Step 2: Atualizar `DetalheProjeto.tsx` — importações**

Substituir a linha de imports de ícones e componentes no topo de `src/pages/DetalheProjeto.tsx`:

Adicionar `ExecutivoPanel` aos imports de componentes:
```tsx
import { ExecutivoPanel } from '../components/ExecutivoPanel';
```

Atualizar a desestruturação do `useProjeto`:
```tsx
const { projeto, loading: loadingProjeto, error: errorProjeto, salvarExecutivo } = useProjeto(id);
```

- [ ] **Step 3: Substituir o card do Projeto Executivo pelo `ExecutivoPanel`**

Em `src/pages/DetalheProjeto.tsx`, substituir o bloco `{/* Projeto Executivo */}`:

```tsx
{/* Projeto Executivo */}
{showExecutivo && (
  <section>
    <h2 className="font-serif text-xl font-bold text-brand-text-main mb-4 flex items-center gap-2.5">
      <span className="w-0.5 h-5 rounded-full bg-brand-primary inline-block shrink-0" />
      Projeto Executivo
    </h2>
    <ExecutivoPanel
      conteudo={projeto.conteudo_executivo}
      driveUrl={projeto.drive_executivo_url}
      isReady={!!(projeto.drive_executivo_url || projeto.conteudo_executivo)}
      onSave={salvarExecutivo}
    />
  </section>
)}
```

Remover os imports de `ExternalLink` e `Loader2` apenas se não forem usados em mais nenhum lugar do arquivo (verificar antes de remover).

- [ ] **Step 4: Verificar no browser**

```bash
npm run dev
```

Abrir `http://localhost:5173`, navegar para um projeto com status `gerando_executivo` ou superior. Verificar:
- Seção "Projeto Executivo" aparece com botão "Mostrar"
- Clicar "Mostrar" expande o painel
- Se `conteudo_executivo` é null: mensagem de fallback + link Drive aparece
- Botões "Editar" e "PDF" aparecem quando expandido

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useProjeto.ts src/pages/DetalheProjeto.tsx
git commit -m "feat: integrate ExecutivoPanel into DetalheProjeto"
```

---

## Task 7: Edição inline no SumarioCard

**Files:**
- Modify: `src/hooks/useSumarios.ts`
- Modify: `src/components/SumarioCard.tsx`
- Modify: `src/pages/DetalheProjeto.tsx`

- [ ] **Step 1: Adicionar `atualizarSumario` ao `useSumarios`**

Em `src/hooks/useSumarios.ts`, adicionar a função e incluí-la no retorno:

```ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Sumario, Capitulo } from '../types'

export function useSumarios(projetoId: string | undefined) {
  const [sumarios, setSumarios] = useState<Sumario[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSumarios = useCallback(async () => {
    if (!projetoId) return

    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('sumarios')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('opcao', { ascending: true })

      if (fetchError) throw fetchError
      setSumarios(data as Sumario[] || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar sumários')
    } finally {
      setLoading(false)
    }
  }, [projetoId])

  useEffect(() => {
    if (projetoId) loadSumarios()
  }, [loadSumarios, projetoId])

  const selecionarSumario = useCallback(async (id: string) => {
    if (!projetoId) return

    try {
      const { error: err1 } = await supabase
        .from('sumarios')
        .update({ selecionado: false })
        .eq('projeto_id', projetoId)

      if (err1) throw err1

      const { error: err2 } = await supabase
        .from('sumarios')
        .update({ selecionado: true })
        .eq('id', id)

      if (err2) throw err2

      setSumarios(prev => prev.map(s => ({
        ...s,
        selecionado: s.id === id
      })))

    } catch (err) {
      console.error('Erro ao selecionar sumário:', err instanceof Error ? err.message : err)
      loadSumarios()
    }
  }, [projetoId, loadSumarios])

  const atualizarSumario = useCallback(async (
    id: string,
    campos: { titulo_sumario?: string; capitulos?: Capitulo[] }
  ) => {
    const { error } = await supabase
      .from('sumarios')
      .update(campos)
      .eq('id', id)
    if (error) throw error
    setSumarios(prev => prev.map(s => s.id === id ? { ...s, ...campos } : s))
  }, [])

  return { sumarios, loading, error, selecionarSumario, atualizarSumario, refetch: loadSumarios }
}
```

- [ ] **Step 2: Atualizar props do `SumarioCard`**

Em `src/components/SumarioCard.tsx`, atualizar a interface de props:

```tsx
import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Check, Loader2, Pencil, X } from 'lucide-react';
import type { Sumario, Capitulo } from '../types';

interface SumarioCardProps {
  sumario: Sumario;
  onSelecionar: (id: string) => Promise<void>;
  onAtualizar: (id: string, campos: { titulo_sumario?: string; capitulos?: Capitulo[] }) => Promise<void>;
}
```

- [ ] **Step 3: Adicionar estado de edição ao `SumarioCard`**

Dentro do componente, logo após as declarações de estado existentes, adicionar:

```tsx
const [editMode, setEditMode] = useState(false);
const [editTitulo, setEditTitulo] = useState(sumario.titulo_sumario ?? '');
const [editCapitulos, setEditCapitulos] = useState<Capitulo[]>(sumario.capitulos ?? []);
const [saving, setSaving] = useState(false);
const [saveError, setSaveError] = useState<string | null>(null);

const handleCancelEdit = () => {
  setEditTitulo(sumario.titulo_sumario ?? '');
  setEditCapitulos(sumario.capitulos ?? []);
  setSaveError(null);
  setEditMode(false);
};

const handleSaveEdit = async () => {
  setSaving(true);
  setSaveError(null);
  try {
    await onAtualizar(sumario.id, {
      titulo_sumario: editTitulo,
      capitulos: editCapitulos,
    });
    setEditMode(false);
  } catch (err) {
    setSaveError(err instanceof Error ? err.message : 'Erro ao salvar');
  } finally {
    setSaving(false);
  }
};

const updateCapitulo = (index: number, campo: Partial<Capitulo>) => {
  setEditCapitulos(prev => prev.map((cap, i) => i === index ? { ...cap, ...campo } : cap));
};
```

- [ ] **Step 4: Adicionar botão "Editar" no header do card**

Dentro do bloco `<div className="flex items-center gap-2 shrink-0">` (que contém o botão "Selecionar"), adicionar o botão de edição antes dos botões existentes:

```tsx
<button
  onClick={() => editMode ? handleCancelEdit() : setEditMode(true)}
  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
    editMode
      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      : 'bg-brand-bg-card text-gray-600 hover:bg-brand-primary hover:text-brand-text-main'
  }`}
>
  {editMode
    ? <><X className="w-3.5 h-3.5" /> Cancelar</>
    : <><Pencil className="w-3.5 h-3.5" /> Editar</>
  }
</button>
```

- [ ] **Step 5: Renderizar campos editáveis no modo edição**

No bloco que mostra `titulo_sumario` e os capítulos, envolver com condicional. Substituir o bloco que mostra o título do sumário:

```tsx
{/* Título do sumário */}
{editMode ? (
  <input
    value={editTitulo}
    onChange={e => setEditTitulo(e.target.value)}
    className="w-full font-medium text-brand-text-body text-base border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
    placeholder="Título do sumário"
  />
) : (
  <p className="font-medium text-brand-text-body text-base leading-snug">
    {sumario.titulo_sumario || 'Sem título'}
  </p>
)}
```

- [ ] **Step 6: Renderizar capítulos editáveis**

No bloco de capítulos (dentro do `expanded || editMode` check), substituir a renderização de cada capítulo:

Primeiro, forçar expansão quando em editMode — alterar a condição que exibe os capítulos para:

```tsx
{(sumario.capitulos && sumario.capitulos.length > 0) && (
  <div className="mt-3 pt-3 border-t border-gray-200/60">
    {!editMode && (
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand-text-main transition-colors focus:outline-none"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {expanded ? 'Ocultar capítulos' : `Ver ${sumario.capitulos.length} capítulos`}
      </button>
    )}

    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        expanded || editMode ? 'max-h-[5000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
      }`}
    >
      {editMode ? (
        <div className="space-y-4">
          {editCapitulos.map((cap, index) => (
            <div key={cap.numero} className="pl-4 border-l-2 border-brand-primary/35 space-y-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                Capítulo {cap.numero}
              </div>
              <input
                value={cap.titulo}
                onChange={e => updateCapitulo(index, { titulo: e.target.value })}
                className="w-full text-sm font-bold border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                placeholder="Título do capítulo"
              />
              <textarea
                value={cap.descricao}
                onChange={e => updateCapitulo(index, { descricao: e.target.value })}
                rows={3}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 resize-y"
                placeholder="Descrição do capítulo"
              />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                  Subassuntos (um por linha)
                </div>
                <textarea
                  value={(cap.subassuntos ?? []).join('\n')}
                  onChange={e => updateCapitulo(index, {
                    subassuntos: e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                  })}
                  rows={3}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 resize-y"
                  placeholder="Subassunto 1&#10;Subassunto 2"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sumario.capitulos.map((cap) => (
            <div key={cap.numero} className="pl-4 border-l-2 border-brand-primary/35 text-sm">
              <h4 className="font-bold text-brand-text-main">
                Capítulo {cap.numero}: {cap.titulo}
              </h4>
              <p className="text-gray-600 mt-1 leading-relaxed">{cap.descricao}</p>
              {cap.subassuntos && cap.subassuntos.length > 0 && (
                <div className="mt-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Subassuntos
                  </span>
                  <ul className="mt-1 space-y-1">
                    {cap.subassuntos.map((sub, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-500">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-brand-primary/60 shrink-0" />
                        {sub}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Save / Cancel footer — only in edit mode */}
      {editMode && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {saveError && (
            <span className="text-sm text-red-500">{saveError}</span>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="px-4 py-1.5 text-sm font-bold bg-[#111] text-[#F5C518] hover:bg-[#222] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
              ) : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 7: Passar `onAtualizar` ao `SumarioCard` no `DetalheProjeto`**

Em `src/pages/DetalheProjeto.tsx`, atualizar a desestruturação do `useSumarios`:

```tsx
const { sumarios, loading: loadingSumarios, selecionarSumario, atualizarSumario } = useSumarios(id);
```

E na renderização dos sumários, passar a nova prop:

```tsx
{sumarios.map(sumario => (
  <SumarioCard
    key={sumario.id}
    sumario={sumario}
    onSelecionar={selecionarSumario}
    onAtualizar={atualizarSumario}
  />
))}
```

- [ ] **Step 8: Verificar no browser**

```bash
npm run dev
```

Navegar para um projeto com sumários gerados. Verificar:
- Botão "Editar" aparece em cada SumarioCard
- Clicar "Editar" expande os capítulos em modo edição com campos preenchidos
- Editar título do sumário, título/descrição de um capítulo, subassuntos
- Clicar "Salvar" — campos voltam para modo leitura com valores atualizados
- Clicar "Cancelar" — valores voltam ao estado original sem chamar o banco
- Verificar no Supabase que os dados foram persistidos corretamente

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useSumarios.ts src/components/SumarioCard.tsx src/pages/DetalheProjeto.tsx
git commit -m "feat: add inline edit mode to SumarioCard"
```

---

## Checklist final

- [ ] `npm run build` passa sem erros
- [ ] `npm run lint` passa sem warnings
- [ ] ExecutivoPanel: painel expande/fecha corretamente
- [ ] ExecutivoPanel: modo edição carrega Tiptap (lazy — verificar na aba Network que o chunk só carrega ao clicar "Editar")
- [ ] ExecutivoPanel: auto-save dispara 2s após parar de digitar, indicador "Salvando..." / "✓ Salvo" aparece
- [ ] ExecutivoPanel: botão PDF abre diálogo de impressão com só o conteúdo do documento
- [ ] ExecutivoPanel: fallback correto para projetos sem `conteudo_executivo`
- [ ] SumarioCard: modo edição funciona para título, capítulos e subassuntos
- [ ] SumarioCard: cancelar não persiste alterações
- [ ] SumarioCard: salvar atualiza a UI sem recarregar a página
