# Design: Novas Features do Pipeline — AltaBooks

**Data:** 2026-04-27  
**Status:** Aprovado

---

## Visão Geral

Três novas features que ampliam os modos de operação da plataforma:

1. **Iniciar análise manual** — criar projeto sem disparar análise automaticamente
2. **Traduzir livro gerado** (2a) — traduzir capítulos de um livro já gerado pela plataforma
3. **Traduzir arquivo externo** (2b) — novo tipo de projeto para traduzir PDF/Word do cliente
4. **Livro do executivo** (3) — criar livro a partir de um projeto executivo já existente, pulando a fase de extração de materiais

---

## Mudanças no Banco de Dados

### `projetos` — colunas novas

| Coluna | Tipo | Default | Motivo |
|---|---|---|---|
| `auto_start` | `boolean NOT NULL` | `true` | Indica se análise inicia automaticamente ao criar o projeto |
| `tipo` | `varchar NOT NULL` | `'livro'` | Discriminador de tipo de projeto |

**CHECK para `tipo`:** `'livro'`, `'traducao_arquivo'`, `'do_executivo'`

**CHECK de `status` — adicionar valor:** `'traduzindo'` (usado por projetos `tipo = 'traducao_arquivo'`)

Registros existentes: `auto_start = true`, `tipo = 'livro'` por default — sem breaking changes.

### Nova tabela `traducoes`

Armazena traduções de livros gerados pela plataforma (feature 2a). Um projeto pode ter múltiplas traduções (um por idioma).

```sql
CREATE TABLE traducoes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id  uuid NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  idioma      varchar(10) NOT NULL DEFAULT 'en',
  status      varchar NOT NULL DEFAULT 'traduzindo'
              CHECK (status IN ('traduzindo', 'concluido', 'erro')),
  drive_url   text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_traducoes_projeto_idioma ON traducoes(projeto_id, idioma);
CREATE INDEX idx_traducoes_projeto_id ON traducoes(projeto_id);
```

---

## API — Contratos de Webhook

Todos os webhooks usam `POST` com `Content-Type: application/json`.

### Webhook existente — criação de projeto `tipo = 'livro'`
**URL:** `POST /webhook/ghostwriter/processar`  
**Payload (adição):** campo `autoStart: boolean`

```json
{
  "projectName": "...",
  "authorName": "...",
  "driveLink": "...",
  "autoStart": false,
  "qtdCapitulos": 12,
  "qtdSubcapitulosMin": 6,
  "qtdSubcapitulosMax": 8,
  "paginasMin": 180,
  "paginasMax": 205
}
```

Quando `autoStart: false`, o n8n cria o registro em `projetos` com `auto_start = false` e status `'aguardando'`, mas **não** inicia a análise de materiais.

### Feature 1 — Iniciar análise manualmente
**URL:** `POST /webhook/ghostwriter/iniciar-analise`  
**Payload:** `{ "projetoId": "<uuid>" }`

### Feature 2a — Traduzir livro gerado
**URL:** `POST /webhook/ghostwriter/traduzir-livro`  
**Payload:** `{ "projetoId": "<uuid>", "idioma": "en" }`

O n8n lê os capítulos da tabela `capitulos`, traduz, gera um Google Doc no Drive e insere um registro em `traducoes` com o `drive_url` resultante.

### Feature 2b — Criar projeto de tradução de arquivo
**URL:** `POST /webhook/ghostwriter/processar` (mesmo endpoint)  
**Payload:**

```json
{
  "projectName": "...",
  "authorName": "...",
  "driveLink": "https://drive.google.com/...",
  "tipo": "traducao_arquivo",
  "idioma": "en"
}
```

O `driveLink` aponta para o PDF ou Word a ser traduzido. O n8n processa e armazena resultado no Drive, atualizando `drive_url` do projeto com o documento traduzido.

### Feature 3 — Criar projeto do executivo
**URL:** `POST /webhook/ghostwriter/processar` (mesmo endpoint)  
**Payload:**

```json
{
  "projectName": "...",
  "authorName": "...",
  "driveExecutivoLink": "https://drive.google.com/...",
  "tipo": "do_executivo",
  "qtdCapitulos": 12,
  "qtdSubcapitulosMin": 6,
  "qtdSubcapitulosMax": 8,
  "paginasMin": 180,
  "paginasMax": 205
}
```

O campo é `driveExecutivoLink` (não `driveLink`) para evitar ambiguidade — o n8n armazena em `drive_executivo_url` e já inicia a geração de sumários diretamente, sem análise de materiais, sem RAG e sem geração de executivo. O documento executivo é o único input do pipeline. O campo `drive_url` (pasta de materiais) fica `null` neste tipo de projeto.

---

## Frontend — Mudanças por Feature

### Feature 1 — Iniciar análise manual

**`CreateProjectModal.tsx`**
- Adicionar toggle/checkbox "Iniciar análise automaticamente" (default: marcado)
- Passar `autoStart` no payload do webhook
- `drive_url` permanece obrigatório

**`DetalheProjeto.tsx` / aba Materiais**
- Quando `projeto.auto_start === false && projeto.status === 'aguardando'`: exibir banner + botão "Iniciar análise dos materiais"
- Botão chama `POST /webhook/ghostwriter/iniciar-analise` com `projetoId`
- Após sucesso, realtime Supabase atualiza o status automaticamente

**`types.ts`**
- Adicionar `auto_start: boolean` na interface `Projeto`

### Feature 2a — Traduzir livro gerado

**`DetalheProjeto.tsx` / aba Livro**
- Quando `projeto.tipo === 'livro' && projeto.status === 'concluido'`: exibir botão "Traduzir para o inglês"
- Clique abre mini-modal de confirmação
- Se já existe uma tradução para o idioma selecionado (status `concluido` ou `traduzindo`), o botão é substituído por um link para o documento traduzido ou por um indicador de progresso — não é possível iniciar duas traduções do mesmo idioma para o mesmo projeto
- Chama `POST /webhook/ghostwriter/traduzir-livro`
- Após sucesso, exibir card com status da tradução (lê tabela `traducoes`)

**Novo hook `useTraducoes.ts`**
- Busca e subscreve `traducoes` por `projeto_id`

**`types.ts`**
- Nova interface `Traducao`

### Feature 2b — Novo projeto "Traduzir Arquivo"

**`CreateProjectModal.tsx`**
- Seletor de tipo no topo do modal: "Novo Livro" | "Traduzir Arquivo" | "Do Executivo"
- Quando "Traduzir Arquivo" selecionado:
  - Campos: Nome do projeto, Nome do autor, Link do Drive (PDF/Word), Idioma destino (por ora fixo: Inglês)
  - Remover campos de configuração do livro (capítulos, páginas)
  - Enviar `tipo: 'traducao_arquivo'` no payload

**`DetalheProjeto.tsx`**
- Pipeline simplificado para `tipo = 'traducao_arquivo'`: `Aguardando → Traduzindo → Concluído`
- Resultado: link para o documento traduzido no Drive

**`types.ts`**
- Adicionar `'do_executivo' | 'traducao_arquivo'` ao tipo `ProjetoTipo`
- Adicionar `tipo: ProjetoTipo` na interface `Projeto`

### Feature 3 — Livro do executivo

**`CreateProjectModal.tsx`**
- Terceira opção no seletor de tipo: "Do Executivo"
- Quando selecionado:
  - Campo "Link do Google Doc (Executivo)" no lugar do campo Drive de materiais
  - Mantém campos de configuração do livro (capítulos, páginas, etc.)
  - Envia `tipo: 'do_executivo'`

**`DetalheProjeto.tsx` / Pipeline**
- Para `tipo = 'do_executivo'`: estágios Fila, Análise e Executivo aparecem visualmente como "pulados" (marcados com ícone de skip, não como concluídos)
- Pipeline começa efetivamente em "Sumários"

---

## Fluxo de Status por Tipo

| Tipo | Fluxo de status |
|---|---|
| `livro` | aguardando → analisando_materiais → gerando_executivo → aguardando_revisao_autor → gerando_sumarios → aguardando_aprovacao → escrevendo_livro → concluido |
| `traducao_arquivo` | aguardando → traduzindo → concluido |
| `do_executivo` | aguardando → gerando_sumarios → aguardando_aprovacao → escrevendo_livro → concluido |

---

## Decisões e Constraints

- **Idioma de tradução**: inicialmente fixo em inglês (`'en'`). A arquitetura suporta múltiplos idiomas no futuro (campo `idioma` nas tabelas).
- **Layout original em 2b**: preservar diagramação de PDF/Word é responsabilidade do pipeline n8n. O frontend apenas envia o link e exibe o resultado.
- **`drive_url` obrigatório**: mesmo no modo manual (feature 1), o link do Drive é exigido na criação — os arquivos precisam existir para a análise funcionar.
- **Webhook unificado**: features 2b e 3 reutilizam o endpoint `/processar` com o campo `tipo`, evitando proliferação de endpoints de criação.
- **RLS desabilitado**: sem mudanças de permissão necessárias (uso interno).
- **Realtime**: o frontend já usa Supabase Realtime para updates de status — funciona para todos os novos tipos sem mudanças adicionais.
