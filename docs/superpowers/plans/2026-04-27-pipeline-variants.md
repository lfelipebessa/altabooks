# Pipeline Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar 4 novas features ao AltaBooks: início manual de análise, tradução de livro gerado, novo tipo de projeto para traduzir arquivo externo, e geração de livro a partir de projeto executivo pronto.

**Architecture:** Três camadas de mudança: (1) banco ganha 2 colunas + 1 tabela nova + novo valor de status; (2) `CreateProjectModal` ganha seletor de tipo e formulários condicionais; (3) `DetalheProjeto` ganha novos botões e renderização de pipeline por tipo de projeto.

**Tech Stack:** React 19, TypeScript, Supabase (PostgreSQL + Realtime), Tailwind CSS 4, Lucide React, Vite

---

## Mapa de arquivos

**Modificados:**
- `src/types.ts` — adicionar `ProjetoTipo`, `Traducao`, atualizar `Projeto` e `ProjetoStatus`
- `src/components/CreateProjectModal.tsx` — seletor de tipo, checkbox autoStart, formulários condicionais
- `src/hooks/useProjeto.ts` — adicionar `iniciarAnalise`
- `src/pages/DetalheProjeto.tsx` — botão iniciarAnalise, seção tradução, pipeline por tipo, tabs por tipo

**Criados:**
- `src/hooks/useTraducoes.ts` — fetch + realtime para tabela `traducoes`
- `src/components/TraducaoCard.tsx` — exibe status de tradução e link do Drive

---

## Task 1: Migrations do banco

**Files:**
- Aplicar via Supabase MCP (`apply_migration`)

- [ ] **Step 1: Migration 1 — adicionar `auto_start` e `tipo` em `projetos`**

```sql
ALTER TABLE projetos
  ADD COLUMN auto_start boolean NOT NULL DEFAULT true,
  ADD COLUMN tipo varchar NOT NULL DEFAULT 'livro'
    CHECK (tipo IN ('livro', 'traducao_arquivo', 'do_executivo'));
```

- [ ] **Step 2: Migration 2 — adicionar `'traduzindo'` ao CHECK de status**

```sql
ALTER TABLE projetos DROP CONSTRAINT projetos_status_check;
ALTER TABLE projetos ADD CONSTRAINT projetos_status_check
  CHECK (status IN (
    'aguardando', 'analisando_materiais', 'gerando_executivo',
    'aguardando_revisao_autor', 'gerando_sumarios', 'aguardando_aprovacao',
    'escrevendo_livro', 'concluido', 'erro', 'traduzindo'
  ));
```

- [ ] **Step 3: Migration 3 — criar tabela `traducoes`**

```sql
CREATE TABLE traducoes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  idioma     varchar(10) NOT NULL DEFAULT 'en',
  status     varchar NOT NULL DEFAULT 'traduzindo'
             CHECK (status IN ('traduzindo', 'concluido', 'erro')),
  drive_url  text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_traducoes_projeto_idioma ON traducoes(projeto_id, idioma);
CREATE INDEX idx_traducoes_projeto_id ON traducoes(projeto_id);

CREATE OR REPLACE FUNCTION set_traducoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_traducoes_updated_at
  BEFORE UPDATE ON traducoes
  FOR EACH ROW EXECUTE FUNCTION set_traducoes_updated_at();
```

- [ ] **Step 4: Verificar migrations**

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'projetos' AND column_name IN ('auto_start', 'tipo');

SELECT table_name FROM information_schema.tables WHERE table_name = 'traducoes';
```

Expected: 2 linhas para `projetos`, 1 linha para `traducoes`.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add auto_start, tipo to projetos; create traducoes table"
```

---

## Task 2: Atualizar tipos TypeScript

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Adicionar `'traduzindo'` ao `ProjetoStatus`, novo tipo `ProjetoTipo`, atualizar `Projeto`, nova interface `Traducao`**

Substituir o conteúdo completo de `src/types.ts`:

```typescript
export type ProjetoStatus =
  | 'aguardando' | 'analisando_materiais' | 'gerando_executivo'
  | 'aguardando_revisao_autor'
  | 'gerando_sumarios' | 'aguardando_aprovacao' | 'escrevendo_livro'
  | 'concluido' | 'erro' | 'traduzindo'

export type ProjetoTipo = 'livro' | 'traducao_arquivo' | 'do_executivo'

export type ArquivoTipo = 'video' | 'audio' | 'pdf' | 'texto' | 'imagem'
export type ArquivoStatus = 'pendente' | 'processado' | 'erro'
export type SumarioAbordagem = 'cronologica' | 'tematica' | 'narrativa'

export interface Capitulo { numero: number; titulo: string; descricao: string; subassuntos?: string[] }

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
  auto_start: boolean
  tipo: ProjetoTipo
}

export interface Arquivo {
  id: string; projeto_id: string; nome_arquivo: string
  tipo_arquivo: ArquivoTipo; drive_file_id: string | null
  drive_url: string | null; status: ArquivoStatus; created_at: string
}

export interface TranscricaoResumo {
  id: string; arquivo_id: string; transcricao_completa: string | null
  resumo: string | null; topicos: string[] | null; tom: string | null
  publico_alvo: string | null; argumentos_principais: string[] | null
  idioma: string | null; modelo_llm_resumo: string | null; created_at: string
}

export interface Sumario {
  id: string; projeto_id: string; opcao: number
  abordagem: SumarioAbordagem; titulo_sumario: string | null
  capitulos: Capitulo[] | null; drive_doc_id: string | null
  drive_url: string | null; selecionado: boolean
  conteudo: string | null
  created_at: string; updated_at: string | null
}

export interface CapituloLivro {
  id: string; projeto_id: string; sumario_id: string
  numero: number; titulo: string; descricao: string
  conteudo: string; resumo: string; palavras: number
  status: string; created_at: string
}

export interface Traducao {
  id: string
  projeto_id: string
  idioma: string
  status: 'traduzindo' | 'concluido' | 'erro'
  drive_url: string | null
  created_at: string
  updated_at: string | null
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npm run build
```

Expected: sem erros de tipo. Se aparecerem erros relacionados ao campo `tipo` ou `auto_start` em componentes que usam `Projeto`, corrija adicionando os campos ausentes ao tipo existente nos componentes afetados.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add ProjetoTipo, Traducao types; update Projeto and ProjetoStatus"
```

---

## Task 3: CreateProjectModal — seletor de tipo e formulários condicionais

**Files:**
- Modify: `src/components/CreateProjectModal.tsx`

- [ ] **Step 1: Substituir o conteúdo completo do arquivo**

```tsx
import React, { useState } from 'react';
import { X, Loader2, ChevronDown } from 'lucide-react';
import type { ProjetoTipo } from '../types';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const WEBHOOK_URL = 'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/processar';

const TYPE_OPTIONS: { value: ProjetoTipo; label: string; description: string }[] = [
    { value: 'livro', label: 'Novo Livro', description: 'Gera livro a partir de materiais do autor' },
    { value: 'do_executivo', label: 'Do Executivo', description: 'Gera livro a partir de um projeto executivo pronto' },
    { value: 'traducao_arquivo', label: 'Traduzir Arquivo', description: 'Traduz PDF ou Word mantendo o formato' },
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [tipo, setTipo] = useState<ProjetoTipo>('livro');
    const [name, setName] = useState('');
    const [author, setAuthor] = useState('');
    const [driveLink, setDriveLink] = useState('');
    const [driveExecutivoLink, setDriveExecutivoLink] = useState('');
    const [autoStart, setAutoStart] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const [qtdCapitulos, setQtdCapitulos] = useState('12');
    const [subcapitulosMin, setSubcapitulosMin] = useState('6');
    const [subcapitulosMax, setSubcapitulosMax] = useState('8');
    const [paginasMin, setPaginasMin] = useState('180');
    const [paginasMax, setPaginasMax] = useState('205');

    if (!isOpen) return null;

    const isFormValid = (() => {
        const base = name.trim() !== '' && author.trim() !== '';
        if (tipo === 'do_executivo') return base && driveExecutivoLink.trim() !== '';
        return base && driveLink.trim() !== '';
    })();

    const resetForm = () => {
        setName(''); setAuthor(''); setDriveLink(''); setDriveExecutivoLink('');
        setAutoStart(true); setShowConfig(false);
        setQtdCapitulos('12'); setSubcapitulosMin('6'); setSubcapitulosMax('8');
        setPaginasMin('180'); setPaginasMax('205');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const cap = parseInt(qtdCapitulos, 10);
        const subMin = parseInt(subcapitulosMin, 10);
        const subMax = parseInt(subcapitulosMax, 10);
        const pagMin = parseInt(paginasMin, 10);
        const pagMax = parseInt(paginasMax, 10);

        const hasBookConfig = tipo === 'livro' || tipo === 'do_executivo';
        if (hasBookConfig) {
            if (!cap || !subMin || !subMax || !pagMin || !pagMax) {
                setError('Preencha todos os campos de configuração com valores válidos.');
                return;
            }
            if (subMax < subMin) { setError('Subcapítulos máximo deve ser maior ou igual ao mínimo.'); return; }
            if (pagMax < pagMin) { setError('Páginas máximo deve ser maior ou igual ao mínimo.'); return; }
        }

        if (!isFormValid) return;
        setLoading(true);

        try {
            const base = { projectName: name, authorName: author };
            const payload =
                tipo === 'livro'
                    ? { ...base, driveLink, autoStart, qtdCapitulos: cap, qtdSubcapitulosMin: subMin, qtdSubcapitulosMax: subMax, paginasMin: pagMin, paginasMax: pagMax }
                    : tipo === 'do_executivo'
                    ? { ...base, driveExecutivoLink, tipo: 'do_executivo', qtdCapitulos: cap, qtdSubcapitulosMin: subMin, qtdSubcapitulosMax: subMax, paginasMin: pagMin, paginasMax: pagMax }
                    : { ...base, driveLink, tipo: 'traducao_arquivo', idioma: 'en' };

            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Falha ao processar o webhook.');
            resetForm();
            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error('Webhook error:', err);
            setError(err instanceof Error ? err.message : 'Erro ao criar o projeto. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const showBookConfig = tipo === 'livro' || tipo === 'do_executivo';

    return (
        <div className="fixed inset-0 bg-brand-text-main/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-brand-bg rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="font-serif text-2xl font-bold text-brand-text-main">Novo Projeto</h2>
                    <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-brand-text-main transition-colors p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Seletor de tipo */}
                <div className="px-6 pt-5 pb-1">
                    <div className="flex gap-1 bg-brand-bg-section rounded-xl p-1">
                        {TYPE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { setTipo(opt.value); setError(null); }}
                                disabled={loading}
                                className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all leading-tight text-center
                                    ${tipo === opt.value ? 'bg-brand-bg text-brand-text-main shadow-sm' : 'text-gray-500 hover:text-brand-text-main'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                        {TYPE_OPTIONS.find(o => o.value === tipo)?.description}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 pt-4">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-brand-text-main mb-1">Nome do Projeto *</label>
                            <input
                                type="text" required disabled={loading}
                                className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                placeholder="Ex: Café com Teu Pai"
                                value={name} onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-brand-text-main mb-1">Nome do Autor *</label>
                            <input
                                type="text" required disabled={loading}
                                className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                placeholder="Ex: Breno Leonardi"
                                value={author} onChange={(e) => setAuthor(e.target.value)}
                            />
                        </div>

                        {tipo === 'do_executivo' ? (
                            <div>
                                <label className="block text-sm font-medium text-brand-text-main mb-1">Link do Google Doc (Executivo) *</label>
                                <input
                                    type="url" required disabled={loading}
                                    className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                    placeholder="https://docs.google.com/..."
                                    value={driveExecutivoLink} onChange={(e) => setDriveExecutivoLink(e.target.value)}
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-brand-text-main mb-1">
                                    {tipo === 'traducao_arquivo' ? 'Link do arquivo no Drive (PDF ou Word) *' : 'Link do Google Drive *'}
                                </label>
                                <input
                                    type="url" required disabled={loading}
                                    className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                    placeholder="https://drive.google.com/..."
                                    value={driveLink} onChange={(e) => setDriveLink(e.target.value)}
                                />
                            </div>
                        )}

                        {tipo === 'livro' && (
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={autoStart}
                                    onChange={(e) => setAutoStart(e.target.checked)}
                                    disabled={loading}
                                    className="w-4 h-4 accent-brand-primary"
                                />
                                <span className="text-sm text-brand-text-body">Iniciar análise dos materiais automaticamente</span>
                            </label>
                        )}
                    </div>

                    {showBookConfig && (
                        <div className="border-t border-gray-100 pt-4 mt-4">
                            <button
                                type="button"
                                onClick={() => setShowConfig(v => !v)}
                                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-text-main transition-colors w-full text-left"
                            >
                                <ChevronDown className={`w-4 h-4 transition-transform ${showConfig ? 'rotate-180' : ''}`} />
                                Configurações do Livro
                                <span className="ml-auto text-xs text-gray-400 font-normal">
                                    {qtdCapitulos} cap · {subcapitulosMin}–{subcapitulosMax} subcap · {paginasMin}–{paginasMax} pág
                                </span>
                            </button>

                            {showConfig && (
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-brand-text-main mb-1">Número de Capítulos</label>
                                        <input type="text" inputMode="numeric" disabled={loading}
                                            className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                            value={qtdCapitulos} onChange={(e) => setQtdCapitulos(e.target.value.replace(/\D/g, ''))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-brand-text-main mb-1">Subcapítulos por Capítulo</label>
                                        <div className="flex gap-3 items-center">
                                            <div className="flex-1">
                                                <span className="text-xs text-gray-500 mb-1 block">Mínimo</span>
                                                <input type="text" inputMode="numeric" disabled={loading}
                                                    className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                                    value={subcapitulosMin} onChange={(e) => setSubcapitulosMin(e.target.value.replace(/\D/g, ''))} />
                                            </div>
                                            <span className="text-gray-400 pt-5">–</span>
                                            <div className="flex-1">
                                                <span className="text-xs text-gray-500 mb-1 block">Máximo</span>
                                                <input type="text" inputMode="numeric" disabled={loading}
                                                    className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                                    value={subcapitulosMax} onChange={(e) => setSubcapitulosMax(e.target.value.replace(/\D/g, ''))} />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-brand-text-main mb-1">Número de Páginas</label>
                                        <div className="flex gap-3 items-center">
                                            <div className="flex-1">
                                                <span className="text-xs text-gray-500 mb-1 block">Mínimo</span>
                                                <input type="text" inputMode="numeric" disabled={loading}
                                                    className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                                    value={paginasMin} onChange={(e) => setPaginasMin(e.target.value.replace(/\D/g, ''))} />
                                            </div>
                                            <span className="text-gray-400 pt-5">–</span>
                                            <div className="flex-1">
                                                <span className="text-xs text-gray-500 mb-1 block">Máximo</span>
                                                <input type="text" inputMode="numeric" disabled={loading}
                                                    className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                                    value={paginasMax} onChange={(e) => setPaginasMax(e.target.value.replace(/\D/g, ''))} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-8 flex gap-3 justify-end">
                        <button type="button" onClick={onClose} disabled={loading}
                            className="px-5 py-2.5 rounded-lg bg-brand-bg-card text-brand-text-body font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={!isFormValid || loading}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition-all ${
                                isFormValid && !loading
                                    ? 'bg-brand-primary text-brand-text-main hover:bg-brand-hover'
                                    : 'bg-brand-primary/50 text-brand-text-main/50 cursor-not-allowed'
                            }`}>
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? 'Criando...' : 'Criar Projeto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npm run build
```

Expected: sem erros.

- [ ] **Step 3: Testar manualmente**

```bash
npm run dev
```

Abrir http://localhost:5173, clicar "Novo Projeto" e verificar:
- 3 abas visíveis: "Novo Livro", "Do Executivo", "Traduzir Arquivo"
- **Novo Livro**: campo Drive, checkbox de auto-start, seção Configurações do Livro colapsável
- **Do Executivo**: campo "Link do Google Doc (Executivo)", SEM checkbox de auto-start, COM Configurações do Livro
- **Traduzir Arquivo**: campo Drive (PDF/Word), SEM checkbox, SEM Configurações do Livro
- Botão "Criar Projeto" desabilitado até preencher campos obrigatórios

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add type selector and conditional forms to CreateProjectModal"
```

---

## Task 4: useProjeto — adicionar `iniciarAnalise`

**Files:**
- Modify: `src/hooks/useProjeto.ts`

- [ ] **Step 1: Adicionar callback `iniciarAnalise` antes do `return`**

Inserir após o callback `confirmarRevisado` (linha ~77), antes do `return`:

```typescript
  const iniciarAnalise = useCallback(async () => {
    if (!id) return
    const { error } = await supabase
      .from('projetos')
      .update({ status: 'analisando_materiais' })
      .eq('id', id)
    if (error) throw error
    setProjeto(prev => prev ? { ...prev, status: 'analisando_materiais' } : prev)
    fetch('https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/iniciar-analise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projetoId: id }),
    }).catch(console.error)
  }, [id])
```

- [ ] **Step 2: Adicionar `iniciarAnalise` ao return**

```typescript
  return { projeto, loading, error, salvarExecutivo, confirmarRevisado, iniciarAnalise }
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add iniciarAnalise to useProjeto"
```

---

## Task 5: DetalheProjeto — botão "Iniciar análise" (Feature 1)

**Files:**
- Modify: `src/pages/DetalheProjeto.tsx`

- [ ] **Step 1: Adicionar `iniciarAnalise` na desestruturação de `useProjeto` (linha 138)**

```typescript
  const { projeto, loading: loadingProjeto, error: errorProjeto, salvarExecutivo, confirmarRevisado, iniciarAnalise } = useProjeto(id)
```

- [ ] **Step 2: Adicionar estado para loading do botão de iniciar análise**

Logo após as outras declarações de `useState` (antes do `if (loadingProjeto)`), adicionar:

```typescript
  const [iniciandoAnalise, setIniciandoAnalise] = useState(false)
```

- [ ] **Step 3: Substituir o bloco `{activeTab === 'materiais' && (` para incluir o banner**

Localizar o bloco que começa em `{activeTab === 'materiais' && (` e substituir pela versão abaixo (mantendo o card de arquivos interno idêntico ao original):

```tsx
{activeTab === 'materiais' && (
  <section className="space-y-4">
    {projeto.auto_start === false && projeto.status === 'aguardando' && (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-semibold text-amber-900 text-sm">Análise pendente de início manual</p>
          <p className="text-amber-700 text-sm mt-0.5">
            Este projeto foi criado sem início automático. Quando os materiais estiverem prontos no Drive, inicie a análise.
          </p>
        </div>
        <button
          disabled={iniciandoAnalise}
          onClick={async () => {
            setIniciandoAnalise(true)
            try { await iniciarAnalise() }
            catch (err) { console.error('Erro ao iniciar análise:', err) }
            finally { setIniciandoAnalise(false) }
          }}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-hover text-brand-text-main font-bold rounded-lg transition-colors text-sm disabled:opacity-50"
        >
          {iniciandoAnalise && <Loader2 className="w-4 h-4 animate-spin" />}
          Iniciar análise
        </button>
      </div>
    )}

    <div className="bg-brand-bg rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setArquivosExpanded(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-brand-bg-section/60 transition-colors group"
      >
        <ProgressBar
          current={arquivosProcessadosCount}
          total={arquivosTotalCount}
          label={`${arquivosProcessadosCount} de ${arquivosTotalCount} arquivos processados`}
        />
        <span className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-brand-bg-card text-gray-600 group-hover:bg-brand-primary group-hover:text-brand-text-main transition-all shrink-0 ml-4">
          {arquivosExpanded ? (
            <><ChevronUp className="w-4 h-4" /> Ocultar</>
          ) : (
            <><ChevronDown className="w-4 h-4" /> Mostrar</>
          )}
        </span>
      </button>

      {arquivosExpanded && (
        <div className="p-4 border-t border-gray-100">
          {loadingArquivos ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : arquivos.length > 0 ? (
            <div className="space-y-2">
              {arquivos.map(arq => (
                <ArquivoCard key={arq.id} arquivo={arq} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              Nenhum arquivo encontrado para este projeto.
            </div>
          )}
        </div>
      )}
    </div>
  </section>
)}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npm run build
```

- [ ] **Step 5: Testar manualmente**

Criar um projeto com o checkbox de auto-start desmarcado. Abrir a tela de detalhe do projeto criado e verificar que o banner âmbar aparece na aba Materiais. Clicar em "Iniciar análise" — o banner deve desaparecer após o status mudar (via Realtime) para `analisando_materiais`.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: show manual-start banner with iniciarAnalise button in DetalheProjeto"
```

---

## Task 6: Criar hook `useTraducoes`

**Files:**
- Create: `src/hooks/useTraducoes.ts`

- [ ] **Step 1: Criar o arquivo**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Traducao } from '../types'

export function useTraducoes(projetoId: string | undefined) {
  const [traducoes, setTraducoes] = useState<Traducao[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projetoId) return

    async function fetchTraducoes() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('traducoes')
          .select('*')
          .eq('projeto_id', projetoId)
          .order('created_at', { ascending: true })
        setTraducoes((data as Traducao[]) || [])
      } finally {
        setLoading(false)
      }
    }

    fetchTraducoes()

    const channel = supabase
      .channel(`traducoes-${projetoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'traducoes', filter: `projeto_id=eq.${projetoId}` },
        () => { fetchTraducoes() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projetoId])

  const iniciarTraducao = useCallback(async (idioma: string) => {
    if (!projetoId) return
    const response = await fetch(
      'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/traduzir-livro',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projetoId, idioma }),
      }
    )
    if (!response.ok) throw new Error('Falha ao iniciar tradução.')
  }, [projetoId])

  return { traducoes, loading, iniciarTraducao }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add useTraducoes hook"
```

---

## Task 7: Criar componente `TraducaoCard`

**Files:**
- Create: `src/components/TraducaoCard.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
import React from 'react'
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react'
import type { Traducao } from '../types'

const IDIOMA_LABELS: Record<string, string> = { en: 'Inglês' }

interface TraducaoCardProps {
  traducao: Traducao
}

export const TraducaoCard: React.FC<TraducaoCardProps> = ({ traducao }) => {
  const label = IDIOMA_LABELS[traducao.idioma] ?? traducao.idioma

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-brand-bg-section rounded-xl border border-gray-200">
      {traducao.status === 'traduzindo' && (
        <Loader2 className="w-4 h-4 animate-spin text-brand-primary shrink-0" />
      )}
      {traducao.status === 'erro' && (
        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-brand-text-main">Tradução — {label}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {traducao.status === 'traduzindo' && 'Em andamento…'}
          {traducao.status === 'concluido' && 'Concluída'}
          {traducao.status === 'erro' && 'Falhou — verifique o n8n'}
        </p>
      </div>
      {traducao.status === 'concluido' && traducao.drive_url && (
        <a
          href={traducao.drive_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-semibold text-brand-primary hover:text-brand-hover shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Abrir
        </a>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add TraducaoCard component"
```

---

## Task 8: DetalheProjeto — seção de tradução do livro (Feature 2a)

**Files:**
- Modify: `src/pages/DetalheProjeto.tsx`

- [ ] **Step 1: Adicionar imports**

No topo do arquivo, após os imports de hooks existentes, adicionar:

```typescript
import { useTraducoes } from '../hooks/useTraducoes'
import { TraducaoCard } from '../components/TraducaoCard'
```

- [ ] **Step 2: Adicionar chamada ao hook e estado de loading**

Após a linha `const { capitulos, loading: loadingCapitulos, atualizarCapitulo } = useCapitulos(id)`, adicionar:

```typescript
  const { traducoes, iniciarTraducao } = useTraducoes(id)
  const [iniciandoTraducao, setIniciandoTraducao] = useState(false)
```

- [ ] **Step 3: Substituir o bloco `{activeTab === 'livro' && (` completo**

```tsx
{activeTab === 'livro' && (
  <section className="space-y-4">
    {loadingCapitulos ? (
      <div className="bg-brand-bg rounded-2xl p-8 border border-gray-200 shadow-sm flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    ) : capitulos.length > 0 ? (
      <>
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-brand-text-main">{capitulos.length}</span> capítulos ·{' '}
            <span className="font-semibold text-brand-text-main">
              {capitulos.reduce((acc, c) => acc + c.palavras, 0).toLocaleString('pt-BR')}
            </span> palavras no total
          </p>
        </div>
        {capitulos.map(cap => (
          <CapituloPanel key={cap.id} capitulo={cap} onSave={atualizarCapitulo} />
        ))}
      </>
    ) : (
      <div className="bg-brand-bg rounded-2xl p-10 border border-gray-200 shadow-sm text-center flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
        <span className="text-sm text-gray-400">Capítulos sendo escritos…</span>
      </div>
    )}

    {/* Feature 2a: tradução do livro gerado */}
    {projeto.tipo === 'livro' && projeto.status === 'concluido' && (
      <div className="bg-brand-bg rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-brand-text-main text-sm">Tradução</h3>
          {!traducoes.some(t => t.idioma === 'en') && (
            <button
              disabled={iniciandoTraducao}
              onClick={async () => {
                setIniciandoTraducao(true)
                try { await iniciarTraducao('en') }
                catch (err) { console.error('Erro ao iniciar tradução:', err) }
                finally { setIniciandoTraducao(false) }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary hover:bg-brand-hover text-brand-text-main text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {iniciandoTraducao && <Loader2 className="w-3 h-3 animate-spin" />}
              Traduzir para o inglês
            </button>
          )}
        </div>
        {traducoes.length > 0 ? (
          <div className="space-y-2">
            {traducoes.map(t => <TraducaoCard key={t.id} traducao={t} />)}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nenhuma tradução iniciada.</p>
        )}
      </div>
    )}
  </section>
)}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npm run build
```

- [ ] **Step 5: Testar manualmente**

Abrir um projeto com `tipo='livro'` e `status='concluido'`. Verificar que a seção "Tradução" aparece na aba Livro com o botão "Traduzir para o inglês". Após clicar, o botão desaparece (já existe `traducao` para `idioma='en'`) e o TraducaoCard aparece via Realtime quando n8n inserir o registro na tabela `traducoes`.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add traduzir-livro section to DetalheProjeto aba Livro"
```

---

## Task 9: DetalheProjeto — pipeline e tabs por tipo de projeto

**Files:**
- Modify: `src/pages/DetalheProjeto.tsx`

- [ ] **Step 1: Atualizar imports de lucide-react e types**

Substituir as linhas de import existentes no topo:

```typescript
import { ArrowLeft, ExternalLink, Loader2, Settings, Check, AlertCircle, ChevronDown, ChevronUp, BookOpen, FileText, LayoutList, FolderOpen, ChevronsRight } from 'lucide-react'
import type { ProjetoStatus, ProjetoTipo } from '../types'
```

- [ ] **Step 2: Adicionar constantes para os novos pipelines**

Após `PROCESSING_STATUSES`, adicionar:

```typescript
const TRADUCAO_PIPELINE_STAGES: { key: ProjetoStatus; label: string }[] = [
  { key: 'aguardando', label: 'Aguardando' },
  { key: 'traduzindo', label: 'Traduzindo' },
  { key: 'concluido', label: 'Concluído' },
]

const DO_EXECUTIVO_SKIPPED_INDEXES = new Set([0, 1, 2])
```

- [ ] **Step 3: Substituir o componente `ProjectPipeline` completo**

```tsx
const ProjectPipeline: React.FC<{ status: ProjetoStatus; tipo: ProjetoTipo }> = ({ status, tipo }) => {
  if (tipo === 'traducao_arquivo') {
    const currentIdx = TRADUCAO_PIPELINE_STAGES.findIndex(s => s.key === status)
    const isError = status === 'erro'
    return (
      <div className="w-full overflow-x-auto">
        <div className="flex items-start pb-1" style={{ minWidth: 'max-content' }}>
          {TRADUCAO_PIPELINE_STAGES.map((stage, i) => {
            const isCompleted = !isError && i < currentIdx
            const isActive = !isError && i === currentIdx
            return (
              <React.Fragment key={stage.key}>
                {i > 0 && (
                  <div className="flex items-center self-start mt-[13px] mx-1.5">
                    <div className={`h-px w-8 ${isCompleted || isActive ? 'bg-brand-primary' : 'bg-gray-200'}`} />
                  </div>
                )}
                <div className="flex flex-col items-center gap-1.5" style={{ width: '3.5rem' }}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    ${isCompleted ? 'bg-[#111] text-[#F5C518]' : ''}
                    ${isActive ? 'bg-brand-primary text-[#111] ring-2 ring-brand-primary/25 ring-offset-2 animate-pulse' : ''}
                    ${!isCompleted && !isActive ? 'bg-gray-100 text-gray-400 border border-gray-200' : ''}
                  `}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <span>{i + 1}</span>}
                  </div>
                  <span className={`text-[10px] text-center leading-tight
                    ${isCompleted ? 'text-gray-500 font-medium' : ''}
                    ${isActive ? 'text-brand-text-main font-bold' : ''}
                    ${!isCompleted && !isActive ? 'text-gray-400' : ''}
                  `}>{stage.label}</span>
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>
    )
  }

  const isError = status === 'erro'
  const currentIdx = isError ? -1 : PIPELINE_STAGES.findIndex(s => s.key === status)
  const isProcessing = PROCESSING_STATUSES.has(status)

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start pb-1" style={{ minWidth: 'max-content' }}>
        {PIPELINE_STAGES.map((stage, i) => {
          const isSkipped = tipo === 'do_executivo' && DO_EXECUTIVO_SKIPPED_INDEXES.has(i)
          const isCompleted = !isError && !isSkipped && i < currentIdx
          const isActive = !isError && !isSkipped && i === currentIdx
          const isPending = !isCompleted && !isActive && !isSkipped

          return (
            <React.Fragment key={stage.key}>
              {i > 0 && (
                <div className="flex items-center self-start mt-[13px] mx-1.5">
                  <div className={`h-px w-8 ${isSkipped ? 'bg-gray-100' : isCompleted || (isActive && i > 0) ? 'bg-brand-primary' : 'bg-gray-200'}`} />
                </div>
              )}
              <div className="flex flex-col items-center gap-1.5" style={{ width: '3.5rem' }}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                  ${isSkipped ? 'bg-gray-50 text-gray-300 border border-dashed border-gray-200' : ''}
                  ${isCompleted ? 'bg-[#111] text-[#F5C518]' : ''}
                  ${isActive ? `bg-brand-primary text-[#111] ring-2 ring-brand-primary/25 ring-offset-2 ${isProcessing ? 'animate-pulse' : ''}` : ''}
                  ${isPending ? 'bg-gray-100 text-gray-400 border border-gray-200' : ''}
                `}>
                  {isSkipped ? <ChevronsRight className="w-3 h-3" /> : isCompleted ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <span>{i + 1}</span>}
                </div>
                <span className={`text-[10px] text-center leading-tight transition-colors
                  ${isSkipped ? 'text-gray-300' : ''}
                  ${isCompleted ? 'text-gray-500 font-medium' : ''}
                  ${isActive ? 'text-brand-text-main font-bold' : ''}
                  ${isPending ? 'text-gray-400' : ''}
                `}>{stage.label}</span>
              </div>
            </React.Fragment>
          )
        })}
        {isError && (
          <>
            <div className="flex items-center self-start mt-[13px] mx-1.5">
              <div className="h-px w-8 bg-red-200" />
            </div>
            <div className="flex flex-col items-center gap-1.5" style={{ width: '3.5rem' }}>
              <div className="w-7 h-7 rounded-full bg-red-100 text-red-500 flex items-center justify-center border border-red-200">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] text-center font-medium text-red-500">Erro</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Atualizar `TABS` para suprimir abas irrelevantes em `traducao_arquivo`**

Localizar o array `TABS` e substituir as funções `available`:

```typescript
const TABS: { id: TabId; label: string; icon: React.ReactNode; available: (s: ProjetoStatus, tipo: ProjetoTipo) => boolean }[] = [
  {
    id: 'materiais',
    label: 'Materiais',
    icon: <FolderOpen className="w-4 h-4" />,
    available: () => true,
  },
  {
    id: 'executivo',
    label: 'Executivo',
    icon: <FileText className="w-4 h-4" />,
    available: (s, tipo) => tipo !== 'traducao_arquivo' && ['gerando_executivo', 'aguardando_revisao_autor', 'gerando_sumarios', 'aguardando_aprovacao', 'escrevendo_livro', 'concluido'].includes(s),
  },
  {
    id: 'sumarios',
    label: 'Sumários',
    icon: <LayoutList className="w-4 h-4" />,
    available: (s, tipo) => tipo !== 'traducao_arquivo' && ['gerando_sumarios', 'aguardando_aprovacao', 'escrevendo_livro', 'concluido'].includes(s),
  },
  {
    id: 'livro',
    label: 'Livro',
    icon: <BookOpen className="w-4 h-4" />,
    available: (s, tipo) => tipo !== 'traducao_arquivo' && ['escrevendo_livro', 'concluido'].includes(s),
  },
]
```

- [ ] **Step 5: Atualizar `getInitialTab` para respeitar `tipo`**

```typescript
const getInitialTab = (status: ProjetoStatus, tipo: ProjetoTipo): TabId => {
  if (tipo === 'traducao_arquivo') return 'materiais'
  if (['escrevendo_livro', 'concluido'].includes(status)) return 'livro'
  if (['gerando_sumarios', 'aguardando_aprovacao'].includes(status)) return 'sumarios'
  if (['gerando_executivo', 'aguardando_revisao_autor'].includes(status)) return 'executivo'
  return 'materiais'
}
```

- [ ] **Step 6: Atualizar os usos de `TABS` e `getInitialTab` para passar `tipo`**

No `useEffect` que chama `getInitialTab` (linha ~148):

```typescript
  useEffect(() => {
    if (projeto) setActiveTab(getInitialTab(projeto.status, projeto.tipo))
  }, [projeto?.status, projeto?.tipo])
```

No map de `TABS` para renderizar as abas (linha ~256), atualizar a chamada `tab.available`:

```tsx
const available = tab.available(projeto.status, projeto.tipo)
```

No `<ProjectPipeline>` (linha ~250), adicionar `tipo`:

```tsx
<ProjectPipeline status={projeto.status} tipo={projeto.tipo} />
```

- [ ] **Step 7: Verificar TypeScript**

```bash
npm run build
```

Expected: sem erros.

- [ ] **Step 8: Testar manualmente**

```bash
npm run dev
```

Verificar:
- Projeto `tipo='livro'` padrão: pipeline igual ao anterior, todas as abas funcionando
- Projeto `tipo='do_executivo'`: estágios Fila, Análise e Executivo com ícone `>>` e borda tracejada; aba Sumários disponível quando status adequado
- Projeto `tipo='traducao_arquivo'`: pipeline simplificado com 3 estágios; abas Executivo, Sumários e Livro **não aparecem**

- [ ] **Step 9: Commit**

```bash
git commit -m "feat: add pipeline variants and tab filtering for traducao_arquivo and do_executivo"
```

---

## Self-review checklist

| Spec section | Task que implementa |
|---|---|
| Feature 1: checkbox autoStart no modal | Task 3 |
| Feature 1: `auto_start` no banco | Task 1 |
| Feature 1: botão "Iniciar análise" no detalhe | Task 4 + Task 5 |
| Feature 2a: botão traduzir livro gerado | Task 8 |
| Feature 2a: tabela `traducoes` | Task 1 |
| Feature 2a: hook + card de tradução | Task 6 + Task 7 |
| Feature 2b: tipo `traducao_arquivo` no modal | Task 3 |
| Feature 2b: pipeline simplificado | Task 9 |
| Feature 2b: tabs suprimidas | Task 9 |
| Feature 3: tipo `do_executivo` no modal | Task 3 |
| Feature 3: pipeline com estágios pulados | Task 9 |
| DB: coluna `tipo` | Task 1 |
| DB: coluna `auto_start` | Task 1 |
| DB: status `traduzindo` | Task 1 |
| TS types atualizados | Task 2 |
