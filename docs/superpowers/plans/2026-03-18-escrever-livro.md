# Escrever Livro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar banner de ação e modal de confirmação na tela de detalhe do projeto para disparar a escrita do livro via webhook n8n quando o status é `aguardando_aprovacao`.

**Architecture:** Dois novos componentes isolados (`EscreverLivroBanner` e `EscreverLivroModal`) integrados em `DetalheProjeto.tsx`. O banner renderiza condicionalmente quando `status === 'aguardando_aprovacao'`. O modal dispara um POST para o webhook n8n e fecha imediatamente em caso de sucesso; o Realtime já existente em `useProjeto.ts` propaga a mudança de status automaticamente.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Lucide React, fetch API

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `src/components/EscreverLivroBanner.tsx` | Criar | Banner âmbar com link Google Docs + botão que abre o modal |
| `src/components/EscreverLivroModal.tsx` | Criar | Modal de confirmação com checklist visual + chamada ao webhook |
| `src/pages/DetalheProjeto.tsx` | Modificar (linhas 1–12, 61–78) | Importar e renderizar o banner condicionalmente |

---

## Task 1: Criar `EscreverLivroModal`

**Files:**
- Create: `src/components/EscreverLivroModal.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/EscreverLivroModal.tsx
import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface EscreverLivroModalProps {
  projetoId: string;
  isOpen: boolean;
  onClose: () => void;
}

const WEBHOOK_URL = 'https://primary-production-bd3cf.up.railway.app/webhook-test/ghostwriter/escrever-livro';
// TODO: trocar para /webhook/ antes de ir a produção

const CHECKLIST = [
  'O autor revisou e aprovou o Projeto Executivo',
  'As edições no Google Docs foram salvas',
  'Entendo que esta ação não pode ser desfeita',
];

export const EscreverLivroModal: React.FC<EscreverLivroModalProps> = ({
  projetoId,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projeto_id: projetoId }),
      });
      if (!response.ok) throw new Error('Falha ao iniciar a escrita do livro.');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-[440px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header âmbar */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-[#fde68a]"
          style={{ background: 'linear-gradient(135deg, #fffdf0 0%, #fefce8 100%)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">✍️</span>
            <div>
              <h2 className="font-serif text-lg font-bold text-brand-text-main leading-tight">
                Escrever Livro
              </h2>
              <p className="text-xs text-amber-700 font-medium">Confirme antes de continuar</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Checklist visual */}
          <ul className="space-y-3">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-brand-text-body font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 px-5 py-2.5 bg-[#111] text-[#F5C518] font-bold rounded-lg hover:bg-[#222] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[160px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                'Confirmar e Escrever'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verificar que o arquivo foi salvo e não há erros de TypeScript**

```bash
cd /Users/luizfelipebessa/development/Addept/AltaBooks && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros relacionados a `EscreverLivroModal`.

---

## Task 2: Criar `EscreverLivroBanner`

**Files:**
- Create: `src/components/EscreverLivroBanner.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/EscreverLivroBanner.tsx
import React, { useState } from 'react';
import { EscreverLivroModal } from './EscreverLivroModal';

interface EscreverLivroBannerProps {
  projetoId: string;
  driveExecutivoUrl: string | null;
}

export const EscreverLivroBanner: React.FC<EscreverLivroBannerProps> = ({
  projetoId,
  driveExecutivoUrl,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div>
        <div
          className="rounded-[14px] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{
            background: 'linear-gradient(135deg, #fffdf0 0%, #fefce8 100%)',
            border: '1.5px solid #F5C518',
            boxShadow: '0 2px 16px rgba(245,197,24,0.14)',
          }}
        >
          {/* Dot + texto */}
          <div className="flex items-center gap-4">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: '#b45309', boxShadow: '0 0 0 3px #fef9c3' }}
            />
            <div>
              <p className="font-bold text-[#111] text-sm leading-snug">
                Projeto Executivo pronto para revisão
              </p>
              <p className="text-xs text-amber-800 mt-0.5 opacity-80">
                Revise o documento com o autor e inicie a escrita quando estiver pronto.
              </p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 flex-shrink-0 pl-6 sm:pl-0">
            <a
              href={driveExecutivoUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!driveExecutivoUrl}
              onClick={!driveExecutivoUrl ? (e) => e.preventDefault() : undefined}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                driveExecutivoUrl
                  ? 'border-amber-600 text-amber-800 hover:bg-amber-50 cursor-pointer'
                  : 'border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
              }`}
            >
              ↗ Google Docs
            </a>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-[#111] text-[#F5C518] text-sm font-bold rounded-lg hover:bg-[#222] transition-colors cursor-pointer"
            >
              Escrever Livro
            </button>
          </div>
        </div>
      </div>

      <EscreverLivroModal
        projetoId={projetoId}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /Users/luizfelipebessa/development/Addept/AltaBooks && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros.

---

## Task 3: Integrar banner em `DetalheProjeto.tsx`

**Files:**
- Modify: `src/pages/DetalheProjeto.tsx`

- [ ] **Step 1: Adicionar import do banner**

No topo do arquivo, após os imports existentes de componentes, adicionar:

```tsx
import { EscreverLivroBanner } from '../components/EscreverLivroBanner';
```

- [ ] **Step 2: Renderizar o banner condicionalmente**

O header é `fixed`, então o banner deve ficar **dentro do `<main>`** como primeiro filho — caso contrário ficaria coberto pelo header no carregamento inicial.

Localizar a abertura do `<main>` (linha 77):

```tsx
<main className="max-w-4xl mx-auto px-6 pt-32 space-y-12">
```

Inserir o banner como **primeiro filho** do `<main>`, antes da seção "Header do Projeto":

```tsx
      <main className="max-w-4xl mx-auto px-6 pt-32 space-y-8">
        {/* Banner: Escrever Livro */}
        {projeto.status === 'aguardando_aprovacao' && (
          <EscreverLivroBanner
            projetoId={projeto.id}
            driveExecutivoUrl={projeto.drive_executivo_url}
          />
        )}

        {/* Seção: Header do Projeto */}
        <section className="bg-brand-bg rounded-2xl p-8 ...">
```

Nota: alterar `space-y-12` para `space-y-8` para que o espaçamento entre banner e demais seções fique proporcional.

- [ ] **Step 3: Verificar TypeScript e iniciar o dev server**

```bash
cd /Users/luizfelipebessa/development/Addept/AltaBooks && npx tsc --noEmit 2>&1 | head -30
```

Esperado: zero erros.

```bash
cd /Users/luizfelipebessa/development/Addept/AltaBooks && npm run dev
```

- [ ] **Step 4: Testar manualmente**

1. Abrir `http://localhost:5173`
2. Clicar em um projeto com status `aguardando_aprovacao`
3. Verificar que o banner âmbar aparece abaixo do header fixo
4. Clicar "↗ Google Docs" — deve abrir o link em nova aba
5. Clicar "Escrever Livro" — modal deve abrir com checklist
6. Clicar "Cancelar" — modal fecha sem ação
7. Clicar "Escrever Livro" novamente, depois "Confirmar e Escrever" — botão deve mostrar spinner "Iniciando...", fechar ao receber resposta (ou mostrar erro se webhook falhar)
8. Verificar que em projetos com outros status o banner **não** aparece

---

## Notas de Produção

Quando o fluxo n8n estiver 100% validado, trocar a constante `WEBHOOK_URL` em `EscreverLivroModal.tsx`:

```
/webhook-test/ghostwriter/escrever-livro
→
/webhook/ghostwriter/escrever-livro
```
