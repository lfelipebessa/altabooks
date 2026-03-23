# Parâmetros de Configuração do Livro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar campos configuráveis por projeto (qtd. capítulos, subcapítulos min/máx, páginas min/máx) persistidos no Supabase, capturáveis na criação e editáveis após criação.

**Architecture:** Migration Supabase adiciona 5 colunas à tabela `projetos` com defaults sensatos. O `CreateProjectModal` ganha seção colapsável com os campos (validados e enviados no webhook). Um novo `ConfiguracoesProjetoModal` permite edição pós-criação via UPDATE direto no Supabase — o `useProjeto` hook já usa `postgres_changes` Realtime, então a UI atualiza automaticamente após o save sem necessidade de refetch manual. `types.ts` e `DetalheProjeto.tsx` são atualizados para refletir os novos campos.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Supabase (postgres_changes realtime já funcional via `useProjeto`), Lucide React.

---

## File Map

| Ação | Arquivo |
|---|---|
| Migration | via Supabase MCP (sem arquivo local) |
| Modify | `src/types.ts` |
| Modify | `src/components/CreateProjectModal.tsx` |
| Create | `src/components/ConfiguracoesProjetoModal.tsx` |
| Modify | `src/pages/DetalheProjeto.tsx` |

---

### Task 1: Migration — adicionar colunas à tabela `projetos`

**Files:**
- Migration via Supabase MCP `apply_migration` (nenhum arquivo local alterado nesta task)

- [ ] **Step 1: Aplicar a migration via MCP**

```sql
ALTER TABLE projetos
  ADD COLUMN qtd_capitulos        integer NOT NULL DEFAULT 12  CHECK (qtd_capitulos > 0),
  ADD COLUMN qtd_subcapitulos_min integer NOT NULL DEFAULT 6   CHECK (qtd_subcapitulos_min > 0),
  ADD COLUMN qtd_subcapitulos_max integer NOT NULL DEFAULT 8   CHECK (qtd_subcapitulos_max >= qtd_subcapitulos_min),
  ADD COLUMN paginas_min          integer NOT NULL DEFAULT 180 CHECK (paginas_min > 0),
  ADD COLUMN paginas_max          integer NOT NULL DEFAULT 205 CHECK (paginas_max >= paginas_min);
```

Rollback (caso necessário):
```sql
ALTER TABLE projetos
  DROP COLUMN IF EXISTS qtd_capitulos,
  DROP COLUMN IF EXISTS qtd_subcapitulos_min,
  DROP COLUMN IF EXISTS qtd_subcapitulos_max,
  DROP COLUMN IF EXISTS paginas_min,
  DROP COLUMN IF EXISTS paginas_max;
```

- [ ] **Step 2: Verificar que os projetos existentes receberam os defaults**

```sql
SELECT id, nome_projeto, qtd_capitulos, qtd_subcapitulos_min, qtd_subcapitulos_max, paginas_min, paginas_max
FROM projetos;
```

Expected: todos os projetos existentes com valores `12, 6, 8, 180, 205`.

---

### Task 2: Atualizar tipos TypeScript

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Adicionar os 5 campos ao interface `Projeto`**

Em `src/types.ts`, na interface `Projeto`, adicionar após `updated_at: string | null`:

```ts
qtd_capitulos: number
qtd_subcapitulos_min: number
qtd_subcapitulos_max: number
paginas_min: number
paginas_max: number
```

Todos os campos são `number` (não `number | null`) pois as colunas são `NOT NULL DEFAULT`.

- [ ] **Step 2: Verificar build sem erros de tipo**

```bash
npm run build
```

Expected: build completo sem erros TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add book config fields to Projeto type"
```

---

### Task 3: Atualizar `CreateProjectModal` com seção colapsável

**Files:**
- Modify: `src/components/CreateProjectModal.tsx`

- [ ] **Step 1: Adicionar estado para os novos campos**

Adicionar junto aos outros `useState` no início do componente:

```tsx
const [showConfig, setShowConfig] = useState(false);
const [qtdCapitulos, setQtdCapitulos] = useState(12);
const [subcapitulosMin, setSubcapitulosMin] = useState(6);
const [subcapitulosMax, setSubcapitulosMax] = useState(8);
const [paginasMin, setPaginasMin] = useState(180);
const [paginasMax, setPaginasMax] = useState(205);
```

- [ ] **Step 2: Adicionar validação min <= max e incluir campos no body do webhook**

No `handleSubmit`, antes de `setLoading(true)`, adicionar validação:

```tsx
if (subcapitulosMax < subcapitulosMin) {
  setError('Subcapítulos máximo deve ser maior ou igual ao mínimo.');
  return;
}
if (paginasMax < paginasMin) {
  setError('Páginas máximo deve ser maior ou igual ao mínimo.');
  return;
}
```

Alterar o body do fetch para:

```ts
body: JSON.stringify({
  projectName: name,
  authorName: author,
  driveLink,
  qtdCapitulos,
  qtdSubcapitulosMin: subcapitulosMin,
  qtdSubcapitulosMax: subcapitulosMax,
  paginasMin,
  paginasMax,
}),
```

- [ ] **Step 3: Resetar todos os campos no bloco de sucesso**

No trecho onde `name`, `author` e `driveLink` são resetados (após `onSuccess()`), adicionar:

```tsx
setQtdCapitulos(12);
setSubcapitulosMin(6);
setSubcapitulosMax(8);
setPaginasMin(180);
setPaginasMax(205);
setShowConfig(false);
```

- [ ] **Step 4: Adicionar seção colapsável no JSX**

Adicionar `ChevronDown` ao import do lucide-react.

Após o campo `driveLink` e antes dos botões de ação, inserir:

```tsx
{/* Configurações do Livro — colapsável */}
<div className="border-t border-gray-100 pt-4">
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
        <label className="block text-sm font-medium text-brand-text-main mb-1">
          Número de Capítulos
        </label>
        <input
          type="number" min={1} max={30} disabled={loading}
          className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
          value={qtdCapitulos}
          onChange={(e) => setQtdCapitulos(Number(e.target.value))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text-main mb-1">
          Subcapítulos por Capítulo
        </label>
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <span className="text-xs text-gray-500 mb-1 block">Mínimo</span>
            <input
              type="number" min={1} max={20} disabled={loading}
              className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
              value={subcapitulosMin}
              onChange={(e) => setSubcapitulosMin(Number(e.target.value))}
            />
          </div>
          <span className="text-gray-400 pt-5">–</span>
          <div className="flex-1">
            <span className="text-xs text-gray-500 mb-1 block">Máximo</span>
            <input
              type="number" min={1} max={20} disabled={loading}
              className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
              value={subcapitulosMax}
              onChange={(e) => setSubcapitulosMax(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text-main mb-1">
          Número de Páginas
        </label>
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <span className="text-xs text-gray-500 mb-1 block">Mínimo</span>
            <input
              type="number" min={1} disabled={loading}
              className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
              value={paginasMin}
              onChange={(e) => setPaginasMin(Number(e.target.value))}
            />
          </div>
          <span className="text-gray-400 pt-5">–</span>
          <div className="flex-1">
            <span className="text-xs text-gray-500 mb-1 block">Máximo</span>
            <input
              type="number" min={1} disabled={loading}
              className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
              value={paginasMax}
              onChange={(e) => setPaginasMax(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 5: Verificar no dev server**

```bash
npm run dev
```

- Abrir o modal: seção "Configurações do Livro" aparece colapsada com resumo dos defaults.
- Expandir, alterar subcap max para valor menor que min → ao submeter, exibe erro de validação.
- Corrigir e submeter → modal fecha e campos resetam aos defaults.

- [ ] **Step 6: Commit**

```bash
git add src/components/CreateProjectModal.tsx
git commit -m "feat: add collapsible book config section to CreateProjectModal"
```

---

### Task 4: Criar `ConfiguracoesProjetoModal`

**Files:**
- Create: `src/components/ConfiguracoesProjetoModal.tsx`

**Nota sobre refresh de dados:** O `useProjeto` hook já possui uma subscription `postgres_changes` que escuta eventos `UPDATE` na tabela `projetos`. Quando o modal salva via `supabase.update()`, o Realtime dispara automaticamente e atualiza o estado do projeto na tela — não é necessário nenhum refetch manual. O `onSaved` callback serve apenas para fechar o modal.

- [ ] **Step 1: Criar o componente**

```tsx
import React, { useState } from 'react';
import { X, Loader2, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Projeto } from '../types';

interface ConfiguracoesProjetoModalProps {
  projeto: Projeto;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void; // fecha o modal; dados atualizam via Realtime automaticamente
}

export const ConfiguracoesProjetoModal: React.FC<ConfiguracoesProjetoModalProps> = ({
  projeto,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [qtdCapitulos, setQtdCapitulos] = useState(projeto.qtd_capitulos);
  const [subcapitulosMin, setSubcapitulosMin] = useState(projeto.qtd_subcapitulos_min);
  const [subcapitulosMax, setSubcapitulosMax] = useState(projeto.qtd_subcapitulos_max);
  const [paginasMin, setPaginasMin] = useState(projeto.paginas_min);
  const [paginasMax, setPaginasMax] = useState(projeto.paginas_max);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (subcapitulosMax < subcapitulosMin) {
      setError('Subcapítulos máximo deve ser maior ou igual ao mínimo.');
      return;
    }
    if (paginasMax < paginasMin) {
      setError('Páginas máximo deve ser maior ou igual ao mínimo.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('projetos')
        .update({
          qtd_capitulos: qtdCapitulos,
          qtd_subcapitulos_min: subcapitulosMin,
          qtd_subcapitulos_max: subcapitulosMax,
          paginas_min: paginasMin,
          paginas_max: paginasMax,
        })
        .eq('id', projeto.id);

      if (updateError) throw updateError;
      onSaved(); // fecha modal; Realtime atualiza os dados na tela
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main disabled:opacity-50';

  return (
    <div
      className="fixed inset-0 bg-brand-text-main/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={() => !loading && onClose()}
    >
      <div
        className="bg-brand-bg rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-brand-primary" />
            <h2 className="font-serif text-xl font-bold text-brand-text-main">
              Configurações do Livro
            </h2>
          </div>
          <button
            onClick={() => !loading && onClose()}
            disabled={loading}
            className="text-gray-400 hover:text-brand-text-main transition-colors p-1 disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Capítulos */}
          <div>
            <label className="block text-sm font-medium text-brand-text-main mb-1">
              Número de Capítulos
            </label>
            <input
              type="number" min={1} max={30} disabled={loading}
              className={inputClass}
              value={qtdCapitulos}
              onChange={(e) => setQtdCapitulos(Number(e.target.value))}
            />
          </div>

          {/* Subcapítulos */}
          <div>
            <label className="block text-sm font-medium text-brand-text-main mb-1">
              Subcapítulos por Capítulo
            </label>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <span className="text-xs text-gray-500 mb-1 block">Mínimo</span>
                <input
                  type="number" min={1} max={20} disabled={loading}
                  className={inputClass}
                  value={subcapitulosMin}
                  onChange={(e) => setSubcapitulosMin(Number(e.target.value))}
                />
              </div>
              <span className="text-gray-400 pt-5">–</span>
              <div className="flex-1">
                <span className="text-xs text-gray-500 mb-1 block">Máximo</span>
                <input
                  type="number" min={1} max={20} disabled={loading}
                  className={inputClass}
                  value={subcapitulosMax}
                  onChange={(e) => setSubcapitulosMax(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Páginas */}
          <div>
            <label className="block text-sm font-medium text-brand-text-main mb-1">
              Número de Páginas
            </label>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <span className="text-xs text-gray-500 mb-1 block">Mínimo</span>
                <input
                  type="number" min={1} disabled={loading}
                  className={inputClass}
                  value={paginasMin}
                  onChange={(e) => setPaginasMin(Number(e.target.value))}
                />
              </div>
              <span className="text-gray-400 pt-5">–</span>
              <div className="flex-1">
                <span className="text-xs text-gray-500 mb-1 block">Máximo</span>
                <input
                  type="number" min={1} disabled={loading}
                  className={inputClass}
                  value={paginasMax}
                  onChange={(e) => setPaginasMax(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 pb-6">
          <button
            type="button"
            onClick={() => !loading && onClose()}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-brand-bg-card text-brand-text-body font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-brand-text-main font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verificar build sem erros**

```bash
npm run build
```

Expected: build sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfiguracoesProjetoModal.tsx
git commit -m "feat: add ConfiguracoesProjetoModal component"
```

---

### Task 5: Integrar modal de configurações na tela de detalhe

**Files:**
- Modify: `src/pages/DetalheProjeto.tsx`

**Nota:** O `useProjeto` hook já escuta `postgres_changes` (UPDATE) em tempo real. Quando `ConfiguracoesProjetoModal` salva no Supabase, o hook recebe o evento e atualiza `projeto` automaticamente — sem necessidade de `refetch` manual.

- [ ] **Step 1: Importar o componente, Settings e adicionar estado**

```tsx
import { ArrowLeft, ExternalLink, Loader2, Settings } from 'lucide-react';
import { ConfiguracoesProjetoModal } from '../components/ConfiguracoesProjetoModal';
// dentro do componente:
const [showConfiguracoes, setShowConfiguracoes] = useState(false);
```

- [ ] **Step 2: Substituir o wrapper do StatusBadge no card do projeto**

No arquivo `DetalheProjeto.tsx`, linha 96–98, o trecho atual é:

```tsx
<div className="shrink-0">
  <StatusBadge status={projeto.status} />
</div>
```

**Substituir inteiramente** por (adiciona o botão Configurações ao lado do badge):

```tsx
<div className="flex items-center gap-3 shrink-0">
  <button
    onClick={() => setShowConfiguracoes(true)}
    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-brand-text-main bg-brand-bg-card hover:bg-gray-200 rounded-lg transition-colors"
  >
    <Settings className="w-4 h-4" />
    Configurações
  </button>
  <StatusBadge status={projeto.status} />
</div>
```

- [ ] **Step 3: Renderizar o modal no final do return**

Antes do `</div>` final do componente (dentro de `<div className="min-h-screen...">`), adicionar:

```tsx
{showConfiguracoes && (
  <ConfiguracoesProjetoModal
    projeto={projeto}
    isOpen={showConfiguracoes}
    onClose={() => setShowConfiguracoes(false)}
    onSaved={() => setShowConfiguracoes(false)}
  />
)}
```

- [ ] **Step 4: Verificar no dev server**

```bash
npm run dev
```

1. Navegar para um projeto existente.
2. Clicar em "Configurações" → modal abre com os valores atuais do projeto.
3. Alterar um valor (ex: capítulos de 12 para 10) → clicar Salvar.
4. Modal fecha. Verificar no Supabase (ou reabrir o modal) que o valor foi persistido.
5. Testar validação: setar subcap max < min → Salvar → deve exibir mensagem de erro sem fechar.

- [ ] **Step 5: Commit**

```bash
git add src/pages/DetalheProjeto.tsx
git commit -m "feat: integrate ConfiguracoesProjetoModal into DetalheProjeto"
```

---

### Task 6: Verificação final

- [ ] **Step 1: Build e lint limpos**

```bash
npm run build && npm run lint
```

Expected: sem erros TypeScript nem ESLint warnings.

- [ ] **Step 2: Smoke test manual completo**

1. Criar novo projeto com config customizada (ex: 10 capítulos, 5–7 subcap, 160–190 páginas).
2. Verificar no Supabase que os valores foram salvos corretamente na row `projetos`.
3. Abrir detalhe → clicar Configurações → alterar capítulos para 15 → Salvar.
4. Verificar no Supabase que `qtd_capitulos = 15`.
5. Testar validação no modal de edição: subcap max < min → deve bloquear e exibir erro.
6. Testar validação no modal de criação: idem.

---

## Notas para o n8n

Os seguintes campos chegam no body do webhook `ghostwriter/processar` e precisam ser:
1. Salvos na row `projetos` (INSERT) junto com `nome_projeto`, `autor_nome`, `drive_url`.
2. Lidos de volta da row `projetos` nos steps de geração de sumário e capítulos (via `SELECT ... FROM projetos WHERE id = $projeto_id`).

Campos adicionados ao body do webhook:
```json
{
  "projectName": "...",
  "authorName": "...",
  "driveLink": "...",
  "qtdCapitulos": 12,
  "qtdSubcapitulosMin": 6,
  "qtdSubcapitulosMax": 8,
  "paginasMin": 180,
  "paginasMax": 205
}
```

No prompt de geração de sumário, injetar:
> "Gere exatamente {{qtdCapitulos}} capítulos. Cada capítulo deve ter entre {{qtdSubcapitulosMin}} e {{qtdSubcapitulosMax}} subassuntos."

No prompt de geração de capítulos:
> "O livro deve ter entre {{paginasMin}} e {{paginasMax}} páginas no total."
