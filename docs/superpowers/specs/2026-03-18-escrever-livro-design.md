# Feature: Escrever Livro — Design Spec

**Data:** 2026-03-18
**Projeto:** AltaBooks / Autobooks Frontend
**Status:** Aprovado

---

## Contexto

O fluxo de automação editorial gera um Projeto Executivo no Google Docs. O autor edita esse documento diretamente pelo link. Quando os ajustes estiverem prontos, um funcionário da editora acessa a plataforma e dispara a escrita do livro via botão — o n8n puxa o conteúdo atualizado do doc e inicia a geração dos capítulos.

---

## Escopo

- Exibir banner de ação pendente na tela `DetalheProjeto` quando `status === 'aguardando_aprovacao'`
- Banner contém link para o Google Doc e botão "Escrever Livro"
- Botão abre modal de confirmação com checklist visual
- Ao confirmar, dispara webhook do n8n com `projeto_id`
- Após sucesso, o Realtime atualiza o status automaticamente para `escrevendo_livro`

---

## Banner

**Aparece apenas quando:** `projeto.status === 'aguardando_aprovacao'`
**Posição:** Logo abaixo do header da página, antes do conteúdo do projeto
**Componente:** `EscreverLivroBanner`

### Visual
- Fundo: gradiente âmbar cremoso `linear-gradient(135deg, #fffdf0 0%, #fefce8 100%)`
- Borda: `1.5px solid #F5C518` com `border-radius: 14px`
- Sombra: `box-shadow: 0 2px 16px rgba(245,197,24,0.14)`
- Dot âmbar à esquerda com halo: `background: #b45309`, `box-shadow: 0 0 0 3px #fef9c3`

### Conteúdo
- **Título:** "Projeto Executivo pronto para revisão"
- **Subtítulo:** "Revise o documento com o autor e inicie a escrita quando estiver pronto."
- **Botão secundário:** "↗ Google Docs" — abre `projeto.drive_executivo_url` em nova aba (`target="_blank"`). Desabilitado e visivelmente muted se `drive_executivo_url` for `null` (sem tooltip — na prática esse campo sempre existe quando o status chega em `aguardando_aprovacao`).
- **Botão primário:** "Escrever Livro" — abre o modal de confirmação

---

## Modal de Confirmação

**Componente:** `EscreverLivroModal`
**Props:** `projetoId: string`, `isOpen: boolean`, `onClose: () => void`

### Visual
- Header com fundo âmbar (`#fffdf0 → #fefce8`), borda inferior `#fde68a`
- Ícone ✍️ + título "Escrever Livro" + subtítulo "Confirme antes de continuar"
- Largura máxima: `440px`
- Inclui botão X no header e clique no backdrop para fechar — ambos desabilitados durante loading (guard `if (loading) return` no `handleClose`, mesmo padrão de `DeleteProjectModal.tsx`)

### Checklist (visual, não interativo)
Três itens com ícone ✓ verde:
1. O autor revisou e aprovou o Projeto Executivo
2. As edições no Google Docs foram salvas
3. Entendo que esta ação não pode ser desfeita

### Botões
- **Cancelar** — fecha o modal, nenhuma ação
- **Confirmar e Escrever** — dispara o webhook (ver abaixo)

### Estados do botão "Confirmar e Escrever"
- **Default:** texto "Confirmar e Escrever"
- **Loading:** spinner + "Iniciando..." — botão desabilitado; modal não pode ser fechado (X e clique no backdrop desabilitados via guard `if (loading) return` dentro do componente, seguindo o padrão de `DeleteProjectModal.tsx`)
- **Erro:** mensagem de erro exibida no modal, botão volta ao estado default

---

## Integração com n8n

**Endpoint (temporário — usar `/webhook-test/` enquanto o fluxo n8n não está 100%; trocar para `/webhook/` antes de ir a produção):** `https://primary-production-bd3cf.up.railway.app/webhook-test/ghostwriter/escrever-livro`
**Método:** POST
**Headers:** `Content-Type: application/json`
**Body:**
```json
{ "projeto_id": "<uuid do projeto>" }
```

**Tratamento de resposta:**
- `response.ok` → fecha modal, banner some via Realtime quando status mudar
- `!response.ok` → exibe mensagem de erro no modal sem fechar

---

## Fluxo de Estado

```
aguardando_aprovacao
  → [usuário clica "Escrever Livro"]
  → modal de confirmação abre
  → [usuário clica "Confirmar e Escrever"]
  → POST webhook
  → [sucesso] modal fecha imediatamente após `response.ok` (sem aguardar o Realtime) → Realtime atualiza status → banner desaparece
  → [erro] mensagem no modal
```

Após o status mudar para `escrevendo_livro`, o banner não é mais renderizado (condição `status === 'aguardando_aprovacao'` não é mais verdadeira).

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/EscreverLivroBanner.tsx` | Criar |
| `src/components/EscreverLivroModal.tsx` | Criar |
| `src/pages/DetalheProjeto.tsx` | Modificar — integrar banner |

---

## Fora de Escopo

- Realtime para `index_arquivos` e `sumarios` (já existe para `projetos`)
- Alteração do status no frontend — o n8n atualiza o banco, o Realtime propaga
- URL de produção do webhook — será trocada quando o fluxo n8n estiver 100%
