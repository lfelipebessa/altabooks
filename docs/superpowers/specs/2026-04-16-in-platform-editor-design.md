# In-Platform Document Editor

**Date:** 2026-04-16  
**Status:** Approved  
**Goal:** Eliminar a dependência do Google Drive/Docs para visualizar e editar o Projeto Executivo e os Sumários. Tudo acontece dentro da plataforma AltaBooks.

---

## Problema

Atualmente o usuário precisa sair da plataforma para:
- Ler o Projeto Executivo (link abre Google Doc)
- Ler/visualizar o sumário completo no Drive
- Fazer qualquer edição nos documentos gerados

---

## Solução

Dois padrões de edição inline, consistentes entre si, sem novas rotas:

1. **Sumários** — edição estruturada inline no `SumarioCard` (campos existentes viram inputs em modo edição)
2. **Projeto Executivo** — painel expansível com editor de texto rico (Tiptap), carregado de forma lazy

---

## Camada de Dados

### Novas colunas

```sql
ALTER TABLE projetos ADD COLUMN conteudo_executivo text;
ALTER TABLE sumarios ADD COLUMN conteudo text; -- reservado, não usado no MVP
```

### Campos existentes preservados

`drive_executivo_url` e `sumarios.drive_url` continuam no schema como fallback/legado. O frontend prioriza `conteudo_executivo` / edição estruturada do `capitulos` jsonb.

### n8n

No workflow de geração do Projeto Executivo, adicionar passo `UPDATE projetos SET conteudo_executivo = <html_gerado>` via node Supabase, logo após criar o Google Doc. O conteúdo deve ser salvo como HTML compatível com Tiptap.

---

## Frontend

### Sumários — Modo Edição Inline

**Arquivo:** `src/components/SumarioCard.tsx`

- Novo estado local `editMode: boolean` (default `false`)
- Botão "Editar" no header do card (ao lado de "Selecionar"), visível apenas quando `!sumario.selecionado || editMode`
- Em `editMode = true`:
  - `titulo_sumario` → `<input>`
  - Cada capítulo: `titulo` → `<input>`, `descricao` → `<textarea>`, `subassuntos` → `<textarea>` (uma linha por subassunto)
  - Capítulos sempre expandidos em modo edição
  - Botões "Salvar" e "Cancelar" no footer do card
- Ao salvar: `UPDATE sumarios SET titulo_sumario, capitulos WHERE id = sumario.id`
- Estado de loading "Salvando..." durante o request; erro exibido inline se falhar
- Cancelar restaura o estado anterior sem tocar no banco

### Projeto Executivo — Painel Expansível

**Arquivo novo:** `src/components/ExecutivoPanel.tsx`  
**Arquivo alterado:** `src/pages/DetalheProjeto.tsx`

#### `ExecutivoPanel.tsx`

Props:
```ts
interface ExecutivoPanelProps {
  projetoId: string
  conteudo: string | null
  driveUrl: string | null
  onSave: (html: string) => Promise<void>
}
```

Comportamento:
- Estado `expanded: boolean` (default `false`) — botão "▼ Ver conteúdo" / "▲ Ocultar"
- Estado `editMode: boolean` (default `false`)
- Se `conteudo` é null: exibe mensagem "Conteúdo ainda não disponível" + botão "↗ Abrir no Drive" (fallback)
- Se `conteudo` existe em modo leitura: renderiza HTML com prose styling (Tailwind `prose`)
- Botão "Editar" ativa `editMode` — carrega o `TiptapEditor` via `React.lazy`
- Auto-save com debounce 2s: chama `onSave(html)` a cada mudança após 2s de inatividade
- Indicador discreto "Salvando..." / "✓ Salvo" no canto superior direito do painel
- Botão "Download PDF": `window.print()` com CSS `@media print` que mostra só o conteúdo do painel

#### `TiptapEditor.tsx` (lazy)

- Carregado com `React.lazy(() => import('./TiptapEditor'))`
- Extensões Tiptap: `StarterKit` (bold, italic, headings h1–h3, listas, parágrafo)
- Recebe `content: string` (HTML) e `onChange: (html: string) => void`
- Toolbar simples: Negrito, Itálico, H1, H2, H3, Lista não-ordenada, Lista ordenada

#### `DetalheProjeto.tsx`

- Substituir o card atual do Projeto Executivo pelo `<ExecutivoPanel>`
- Hook `useProjeto` já retorna `conteudo_executivo` (adicionar ao select)
- Callback `onSave`: `UPDATE projetos SET conteudo_executivo WHERE id`

---

## Download PDF

Estratégia: `window.print()` com CSS de impressão.

```css
@media print {
  body > * { display: none; }
  .print-target { display: block !important; }
}
```

O painel do documento recebe a classe `print-target`. Resultado: PDF limpo sem header/nav.

---

## Fallback para projetos legados

Projetos criados antes da mudança no n8n terão `conteudo_executivo = null`. Nesses casos:
- O painel mostra: "Este projeto foi gerado antes da integração in-platform."
- Botão "↗ Abrir no Drive" como única opção (comportamento atual preservado)

---

## Dependências a instalar

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
```

Sem outras dependências. Download PDF usa API nativa do browser.

---

## Fora do escopo (MVP)

- Histórico de versões / undo além do Tiptap nativo
- Edição colaborativa em tempo real
- Export DOCX
- `sumarios.conteudo` (coluna reservada, não usada no MVP — sumários usam `capitulos` jsonb)
- Editor de texto livre para sumários (edição estruturada por campos é suficiente)
