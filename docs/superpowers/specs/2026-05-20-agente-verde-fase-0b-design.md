# Agente Verde — Fase 0.B (React Scaffold)

**Status:** Aprovado pendente review
**Data:** 2026-05-20
**Mockups validados:** `docs/superpowers/mockups/agente-verde/` (commit c3dae97)

## Objetivo

Implementar os mockups validados em React/TypeScript dentro da plataforma da Alta Books, criando rotas reais, componentes e gating de acesso. **Sem persistência** — toda data é mock em-memória. Sem chamadas a Supabase novas, sem n8n, sem nenhum backend.

A entrega é uma sandbox navegável que Cristiane, Anderson e Gorki podem abrir no browser e clicar pra validar fluxo e UX antes de qualquer trabalho de backend.

## Motivação

A Fase 0.A entregou mockups HTML estáticos. Eles foram validados. Promovê-los para React real dentro da plataforma:

- Coloca o módulo "Agente Verde" no menu da plataforma real — stakeholders veem como vai se integrar.
- Estabelece a infraestrutura de roteamento + gating sem decisões irreversíveis (sem schemas de banco, sem hooks de dados).
- Permite testar interações reais (clicar entre itens, abrir modal, alternar tabs) que mockup estático não cobre bem.
- Cria a base sobre a qual a Fase 1 (integração com Drive, PDF, Claude) pluga.

## Escopo

**Inclui:**
- Rotas `/agente-verde` (listagem) e `/agente-verde/lote/:id` (revisão).
- Whitelist de emails hardcoded em `src/lib/agenteVerdeAccess.ts` — usuário não autorizado não vê o item no menu nem consegue acessar a URL.
- Componente `AgenteVerdeRoute` wrappeando `ProtectedRoute` + checagem de whitelist.
- Item "Agente Verde" no TopBar (visível apenas se autorizado).
- Página `Listagem` reproduzindo o mockup `listagem.html` (cards de lotes em diferentes estados).
- Página `Revisao` reproduzindo o mockup `revisao.html` (master-detail com sidebar de itens + editor com tabs).
- Modal `UploadModal` reproduzindo `upload.html` (drag-and-drop visual + preview de ISBNs detectados).
- Mock data em TypeScript: 4 lotes, ~12 itens visíveis por lote, com variedade de status (pronto, pendente, falha, aprovado).
- Tipos TypeScript para `Lote`, `Item`, `BookInfo`, `Metagrafica` — formato que será preservado quando dados reais chegarem.

**Não inclui:**
- Nenhuma tabela nova no Supabase.
- Nenhuma chamada a Drive, n8n, Claude API.
- Upload real de arquivo (o modal mostra preview hardcoded).
- Aprovação real (clicar em "Aprovar" não persiste nada, só mostra um toast/alerta visual).
- Sistema de roles na DB (whitelist hardcoded substitui temporariamente).
- Histórico de versões funcional.
- Busca/filtros funcionais (são visuais, sem lógica).
- Download das planilhas finais.

## Decisões técnicas

### Gating

Whitelist hardcoded em arquivo dedicado:

```ts
// src/lib/agenteVerdeAccess.ts
export const AGENTE_VERDE_ALLOWED_EMAILS = [
  'bessalfs@gmail.com',           // dev
  'cristiane@altabooks.com.br',   // placeholder — substituir pelo real
  'anderson@altabooks.com.br',    // placeholder
  'gorki@altabooks.com.br',       // placeholder
]

export function hasAgenteVerdeAccess(email: string | null | undefined): boolean {
  if (!email) return false
  return AGENTE_VERDE_ALLOWED_EMAILS.includes(email.toLowerCase())
}
```

Hook `useAgenteVerdeAccess()` que combina com `useAuth()`:

```ts
// src/lib/agenteVerdeAccess.ts
import { useAuth } from '../contexts/AuthContext'

export function useAgenteVerdeAccess(): boolean {
  const { user } = useAuth()
  return hasAgenteVerdeAccess(user?.email)
}
```

**Justificativa:** simples, sem deployment changes, sem nova migration. Quando a Fase 1+ introduzir roles na DB, o hook muda implementação mas a interface permanece — chamadores não mudam.

### Roteamento

```tsx
// src/App.tsx (adições)
<Route path="/agente-verde" element={
  <AgenteVerdeRoute><AgenteVerdeListagem /></AgenteVerdeRoute>
} />
<Route path="/agente-verde/lote/:id" element={
  <AgenteVerdeRoute><AgenteVerdeRevisao /></AgenteVerdeRoute>
} />
```

`AgenteVerdeRoute` é um wrapper:
```tsx
// src/components/AgenteVerdeRoute.tsx
export const AgenteVerdeRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hasAccess = useAgenteVerdeAccess()
  return (
    <ProtectedRoute>
      {hasAccess ? children : <Navigate to="/" replace />}
    </ProtectedRoute>
  )
}
```

Upload fica como modal acionado pela página de listagem (não tem rota própria).

### Estrutura de componentes

```
src/
  lib/
    agenteVerdeAccess.ts        — whitelist + hook
  types/
    agenteVerde.ts              — Lote, Item, BookInfo, Metagrafica, status enums
  data/
    agenteVerdeMock.ts          — 4 lotes + ~50 itens mock
  components/
    AgenteVerdeRoute.tsx        — gating
    AgenteVerde/
      LoteCard.tsx              — card do lote na listagem
      UploadModal.tsx           — modal de upload
      ItemSidebar.tsx           — sidebar com lista de itens (esquerda da revisão)
      ItemRow.tsx               — 1 linha na sidebar
      ItemDetailEditor.tsx      — editor à direita (orquestra tabs)
      BookInfoForm.tsx          — formulário da tab Book Info
      MetagraficaForm.tsx       — formulário da tab Metagráfica
  pages/
    AgenteVerde/
      Listagem.tsx              — /agente-verde
      Revisao.tsx               — /agente-verde/lote/:id
```

**Por que essa decomposição:** cada arquivo tem uma responsabilidade clara. O editor (`ItemDetailEditor`) é o componente mais pesado e seu único trabalho é orquestrar as tabs + selecionar qual form renderizar. Os forms (`BookInfoForm`, `MetagraficaForm`) ficam isolados — quando a Fase 2 mudar os campos, só esses arquivos mudam. A sidebar (`ItemSidebar`) também é isolada do editor — não há vazamento de estado de seleção pelo DOM.

### Tipos TypeScript

```ts
// src/types/agenteVerde.ts

export type LoteStatus = 'processando' | 'aguardando_revisao' | 'concluido'

export type ItemStatus =
  | 'pendente'
  | 'pending_files'
  | 'extraindo'
  | 'pronto_revisao'
  | 'aprovado'
  | 'falha'

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
}

export interface BookInfo {
  titulo: string
  subtitulo: string
  autor: string
  marca: string
  idioma: string
  paginas: number
  sinopse: string
  bisac_principal: { codigo: string; descricao: string }
  bisac_secundarios: Array<{ codigo: string; descricao: string }>
  palavras_chave: string[]
  isbn_fisico: string
  isbn_digital: string
  preco_fisico: string
  preco_digital: string
  tiragem_inicial: string
  formato_digital: 'epub' | 'pdf' | 'mobi'
}

export interface Metagrafica {
  // Campos a definir conforme Anderson mandar o template
  // Por enquanto, mock representativo:
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
  status_detalhe?: string  // ex: "Falta planilha técnica" pra pending_files
  book_info: BookInfo | null
  metagrafica: Metagrafica | null
}
```

### Mock data

`src/data/agenteVerdeMock.ts` exporta:
- `MOCK_LOTES: Lote[]` — 4 lotes cobrindo os 3 status
- `MOCK_ITEMS_BY_LOTE: Record<string, Item[]>` — para cada lote, ~12 itens com variedade de status

Cada item de status `pronto_revisao` tem `book_info` e `metagrafica` populados (mock realista — mesmo padrão dos mockups HTML). Itens em `pending_files` ou `falha` têm `book_info: null` e `metagrafica: null`.

### Interações funcionais

**O que funciona:**
- Navegação entre listagem e revisão (`<Link>` ou `useNavigate`).
- Selecionar item na sidebar → atualizar `itemSelectedId` em state local → renderizar detalhe.
- Alternar tab Book Info / Metagráfica.
- Editar campos do form (state local, não persiste em reload).
- Toggle de checkbox de seleção em massa.
- Abrir/fechar modal de upload.
- Filtrar sidebar por status (chips Prontos / Pendentes / Falhas / Aprovados) — apenas visual, sem URL state.

**O que mostra alerta/toast "não implementado":**
- Botão "Aprovar" / "Aprovar selecionados".
- Botão "Reprocessar".
- Botão "Disparar processamento" do modal de upload.
- Links de download (Book Info.xlsx, Metagráfica.xlsx) em lotes concluídos.
- Botão "Pasta no Drive".
- "Ver histórico" de versões.

### Integração no TopBar

`src/components/TopBar.tsx` ganha um link "Agente Verde" condicional:

```tsx
const hasAgenteVerde = useAgenteVerdeAccess()
// ...
{hasAgenteVerde && (
  <Link to="/agente-verde" className="...">Agente Verde</Link>
)}
```

Posicionado entre o logo e o user menu. Apenas usuários da whitelist veem.

## Edge cases

1. **Usuário tenta acessar `/agente-verde` sem autorização:** `AgenteVerdeRoute` redireciona para `/`.
2. **Lote ID inexistente em `/agente-verde/lote/xyz123`:** página de revisão mostra mensagem "Lote não encontrado" + link de volta pra listagem.
3. **Lote em status `processando`:** botão "Revisar" desabilitado, igual ao mockup.
4. **Item sem `book_info` (pending/falha):** sidebar mostra; ao clicar, painel direito mostra mensagem explicando o problema em vez do formulário.
5. **Modal de upload sem arquivo:** botão "Disparar processamento" desabilitado.

## Riscos

| Risco | Mitigação |
|---|---|
| Stakeholders verem o módulo e acharem que está funcional | Mensagens claras de "demonstração" em ações não-implementadas. Talvez um banner "Versão de validação — dados de demonstração" no topo das duas páginas. |
| Whitelist hardcoded em produção fica esquecida | Aprovação da Fase 1 (que introduz roles na DB) deve incluir remoção do hardcoded. Marcar como `// TODO: substituir por roles quando Fase 1 entregar` no código. |
| Mock data divergente do real, gerando retrabalho | Tipos TypeScript bem desenhados são o contrato — quando dados reais chegarem, só a fonte muda, a estrutura dos componentes não. |

## Critérios de aceite

- [ ] Logando como `bessalfs@gmail.com`, vejo "Agente Verde" no TopBar e consigo navegar pra `/agente-verde`.
- [ ] Logando como qualquer outro email, NÃO vejo o item no TopBar e tentar acessar `/agente-verde` redireciona pra `/`.
- [ ] Listagem mostra 4 lotes nos 3 status (processando, aguardando revisão, concluído) — visualmente idêntico ao mockup.
- [ ] Clicar em "Revisar lote" navega para `/agente-verde/lote/:id`.
- [ ] Tela de revisão: sidebar à esquerda com lista de itens, painel direito com editor. Selecionar item troca o editor.
- [ ] Alternar tab Book Info / Metagráfica funciona.
- [ ] Editar um campo (ex: título) altera local state — persiste enquanto navegando entre itens, perde no refresh.
- [ ] Botão "Novo lote" abre modal de upload com preview de ISBNs (hardcoded).
- [ ] Tentar clicar em ações não-implementadas (Aprovar, Reprocessar, etc.) mostra alerta amigável.
- [ ] `npm run build` passa.
- [ ] `npm run lint` não introduz erros novos.
