# Gerador de Metadados — MVP (Tela `/metadados`)

**Status:** draft
**Data:** 2026-05-26
**Autor:** Luiz Bessa + Claude
**Contexto:** pivot 2026-05-26 — Agente Verde (catalogação assistida) fica congelado. Validação interna da Alta Books mostrou que basta enviar PDFs (capa aberta + miolo) e a tabela PCP para o Gemini 2.5 Flash extrair quase todos os 123 campos do BookInfo. Foco passa a ser uma tela simples e incremental: **um livro por vez, três arquivos de entrada, JSON canônico editável, xlsx do BookInfo pronto pra download**.

---

## Problema

O time editorial da Alta Books mantém ~13 planilhas de metadados por livro (BookInfo, Mercado Livre, Audible, Bookwire+, Kindle+, Site, Minha Biblioteca, etc.). O preenchimento é manual, repetitivo e propenso a inconsistências entre planilhas. Cada nova obra é horas de copy-paste a partir de capa, ficha catalográfica e PCP.

A primeira tentativa de automatizar isso virou o **Agente Verde** — módulo amplo de catalogação com scaffold em React + mock data, congelado em 2026-05-26. Em paralelo, um funcionário rodou um teste manual no Gemini Flash colando PDF de capa aberta + PDF do miolo + PCP em formato chave-valor: o modelo extraiu quase tudo (CIP traz selo, CDD, ISBN, assuntos-matriz; miolo dá tom/extensão; capa traz sinopse/biografia). O sinal foi forte o bastante pra justificar **engessar o escopo no BookInfo (1 das 13 planilhas), encurtar o caminho e entregar valor testável o quanto antes**.

Não estamos resolvendo todos os metadados. Estamos resolvendo o BookInfo, com um pipe que naturalmente se estende para as outras planilhas depois.

## Solução em uma frase

Tela nova `/metadados` (independente do Agente Verde): usuário sobe 3 arquivos (PDF capa aberta + PDF miolo + xlsx PCP); n8n manda os 3 para o Gemini 2.5 Flash via OpenRouter com o Prompt v2.1; resposta vira `metadados_json` editável inline + xlsx do BookInfo regenerável sob demanda.

---

## Escopo

### Incluído
- Rota nova `/metadados` (Listagem + Detalhe), gated pelo slug `metadados` em `user_modules`
- Tabela `metadados_jobs` no Supabase + bucket `metadados` no Storage
- 2 webhooks n8n: `ghostwriter/metadados/gerar` e `ghostwriter/metadados/regerar-xlsx`
- Modal de "Nova Geração" com 3 slots tipados (capa / miolo / PCP) + upload sequencial com rollback se 1 dos 3 falhar
- Detalhe revela form linear (layout A) com 4 seções colapsáveis após status `pronto`
- Edição inline com state local React; save manual (botão sticky vermelho quando dirty)
- Geração do xlsx BookInfo via `exceljs` no n8n (template `bookinfo-template.xlsx` no Storage)
- Botão "Baixar BookInfo" que salva se dirty + chama regerar-xlsx + retorna signed URL 5min
- Alertas por campo (`metadados_jobs.alertas` jsonb) com 3 severidades (`info|aviso|erro`) renderizados no `CampoComAlerta`
- ISBN duplicado: alerta no frontend com 2 botões ("apagar versão anterior" / "manter ambos"), não bloqueia
- Realtime na row do job pra revelar o form quando status muda pra `pronto`
- RLS owner-or-admin em `metadados_jobs` usando `is_admin()` SECURITY DEFINER (segue padrão de [[permissions-system]] e [[feedback-rls-no-recursion]])
- Smoke test manual com **Tecendo Prata** (Naomi Novik, `~/Downloads/9786560991095_*`) como par de inputs canônico

### Fora de escopo (notas para follow-up)
- **Geração das outras 12 planilhas** (Mercado Livre, Audible, Bookwire+, Kindle+, Site, Minha Biblioteca, Tocalivros, Árvore, etc.) — schema já reserva espaço (`xlsx_*_path`), mas só BookInfo é implementado
- **Colaboração simultânea / locks** — last-write-wins entre abas
- **Auto-save** — sempre manual
- **Versionamento de gerações por ISBN** — duplicado mostra alerta com escolha, mas histórico de versões não fica registrado
- **Validação cruzada de campos** — só validação de schema básica via retry do Gemini (1 vez)
- **Chunking de PDF gigante** — se o payload base64 ultrapassar limite do OpenRouter/Gemini, item vira erro com mensagem clara. Follow-up: split por capítulos / OCR-only.
- **Picker do Drive** — usuário sobe arquivos locais via input file no modal
- **Picker para selecionar subset** quando vier .zip ou pasta — MVP é arquivo a arquivo
- **Validação fina dos códigos BISAC/THEMA/Categorias Alta** — confiamos no que o Gemini retornar; usuário corrige inline se errado
- **OAuth Google no frontend** — uploads vão direto pro Supabase Storage; nada de Drive nessa feature
- **Habilitar RLS nas outras tabelas legadas** — endereçado por [[project-security-debt]] separadamente

---

## Arquitetura

```
Frontend → Supabase Storage (PDFs + xlsx)              [bucket 'metadados']
        → INSERT metadados_jobs (status='aguardando')
        → webhook ghostwriter/metadados/gerar { job_id }
                                                ↓
                          n8n: baixa arquivos via signed URLs →
                          parseia PCP (chave-valor, tolerante a ausências) →
                          monta payload Gemini (Prompt v2.1 +
                          PDFs em base64 inline + PCP em texto) →
                          OpenRouter → Gemini 2.5 Flash →
                          valida JSON contra schema (retry 1x se inválido) →
                          gera xlsx BookInfo via exceljs (template + COLUMN_MAP) →
                          upload Storage → UPDATE metadados_jobs
                          (status='pronto', metadados_json, alertas, xlsx_bookinfo_path,
                           denormalizados: isbn/titulo/autor/selo)
                                                ↓
        Frontend escuta Realtime na row → revela FormMetadados preenchido
        Usuário edita inline → save manual → UPDATE metadados_json
        Click "Baixar BookInfo" → salva se dirty → webhook regerar-xlsx →
        signed URL 5min → download
```

### Componentes novos
1. **Frontend**: rota `/metadados` (Listagem + Detalhe), componentes específicos da feature, hooks de upload/realtime, lib de webhook e flatten/unflatten do JSON
2. **Banco**: tabela `metadados_jobs` + módulo `metadados` em `modules` + bucket `metadados` no Storage com policies por dono do path
3. **n8n**: 2 workflows novos (`ghostwriter/metadados/gerar` e `ghostwriter/metadados/regerar-xlsx`)
4. **Template**: `bookinfo-template.xlsx` versionado em `metadados/templates/`

### Componentes não alterados
- Webhook base (`/webhook/ghostwriter/...`) — mesma rota base, só endpoints novos
- Tabela `projetos` e fluxos de tradução/livro existentes (zero overlap)
- Credenciais: reusa Supabase service_role e OpenRouter já configuradas no n8n
- Padrão de `ModuleRoute`, `StatusBadge`, `TopBar`, `SearchBar` (reuso direto)

---

## Banco — migration

### Tabela `metadados_jobs`

```sql
create table public.metadados_jobs (
  id uuid primary key default gen_random_uuid(),

  -- denormalizados para a listagem (preenchidos pelo n8n após gerar)
  isbn varchar,
  titulo varchar,
  autor varchar,
  selo varchar,

  status varchar not null default 'aguardando'
    check (status in ('aguardando', 'processando', 'pronto', 'erro')),
  erro_mensagem text,

  -- caminhos no bucket 'metadados' (relativo: '{job_id}/capa.pdf' etc)
  capa_path text not null,
  miolo_path text not null,
  pcp_path text not null,

  -- fonte da verdade dos metadados
  metadados_json jsonb,

  -- array de { campo: string, severidade: 'info'|'aviso'|'erro', mensagem: string }
  alertas jsonb not null default '[]'::jsonb,

  -- saída regenerável
  xlsx_bookinfo_path text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_metadados_jobs_status on public.metadados_jobs(status);
create index idx_metadados_jobs_isbn on public.metadados_jobs(isbn);
create index idx_metadados_jobs_created_by on public.metadados_jobs(created_by);

create trigger trg_metadados_jobs_updated_at
  before update on public.metadados_jobs
  for each row execute function set_updated_at();

-- RLS owner-or-admin (padrão da casa, ver [[feedback-rls-no-recursion]])
alter table public.metadados_jobs enable row level security;

create policy "metadados_jobs_select" on public.metadados_jobs
  for select using (created_by = auth.uid() or public.is_admin());

create policy "metadados_jobs_insert" on public.metadados_jobs
  for insert with check (created_by = auth.uid());

create policy "metadados_jobs_update" on public.metadados_jobs
  for update using (created_by = auth.uid() or public.is_admin());

create policy "metadados_jobs_delete" on public.metadados_jobs
  for delete using (created_by = auth.uid() or public.is_admin());
```

### Permissão inicial

Não existe tabela catálogo `modules` no schema atual — `user_modules.module_slug` é text livre. `ModuleRoute` apenas verifica se o usuário logado tem uma row em `user_modules` com o slug requerido. Para liberar a feature basta inserir as permissões iniciais:

```sql
-- libera bessalfs@gmail.com (id resolvido na hora da migration)
insert into public.user_modules (user_id, module_slug, granted_at)
  select id, 'metadados', now() from auth.users where email = 'bessalfs@gmail.com'
  on conflict do nothing;
```

A UI de admin (`/admin/permissoes`) precisa ser atualizada para listar `metadados` como módulo conhecido — verificar onde fica essa lista (provavelmente hardcoded em `src/pages/AdminPermissoes.tsx` ou similar). Se for hardcoded, adicionar `'metadados'` à constante. Se for derivado dinamicamente, nada a fazer.

### Storage bucket `metadados`

```sql
insert into storage.buckets (id, name, public)
  values ('metadados', 'metadados', false)
  on conflict (id) do nothing;

-- Layout: {job_id}/{capa.pdf|miolo.pdf|pcp.xlsx|bookinfo.xlsx}
-- + templates/bookinfo-template.xlsx (subido manualmente uma vez)

create policy "metadados_objects_access"
  on storage.objects for all
  using (
    bucket_id = 'metadados' and (
      -- arquivos de um job pertencem ao dono do job
      exists (
        select 1 from public.metadados_jobs j
        where j.id::text = (storage.foldername(name))[1]
          and (j.created_by = auth.uid() or public.is_admin())
      )
      -- templates: admin escreve, owners de jobs leem (mas n8n usa service_role; só admins humanos acessam)
      or ((storage.foldername(name))[1] = 'templates' and public.is_admin())
    )
  );
```

### JSON canônico (estrutura de `metadados_json`)

Reflete o Prompt v2.1 da Alta Books, organizado em 4 blocos:

```jsonc
{
  "dados_basicos": {
    "titulo": "string",
    "subtitulo": "string|null",
    "autor": "string",
    "coautores": ["string"],
    "tradutor": "string|null",
    "prefacio_por": "string|null",
    "ilustrador": "string|null",
    "idioma_original": "string",
    "idioma_publicacao": "pt-BR",
    "edicao": "1ª edição",
    "ano_publicacao": 2026,
    "isbn": "978-65-6099-109-5",
    "ean": "9786560991095"
  },
  "dados_editoriais": {
    "selo": "string",                  // Alta Books, Gorki, etc
    "colecao": "string|null",
    "formato": "brochura|capa_dura|ebook|audiolivro",
    "dimensoes_cm": { "largura": 0, "altura": 0, "lombada": 0 },
    "peso_g": 0,
    "num_paginas": 0,
    "preco_capa_brl": 0.0,
    "cdd": "string",                   // ex: 813.6
    "cdu": "string|null",
    "bisac": ["string"],               // códigos
    "thema": ["string"],
    "categorias_alta_books": ["string"], // ~308 categorias internas
    "publico_alvo": "string",
    "faixa_etaria": "string"
  },
  "textos": {
    "sinopse": "string",                // contracapa
    "biografia_autor": "string",        // orelha
    "texto_contracapa_completo": "string",
    "frases_marketing": ["string"],
    "palavras_chave_seo": ["string"],
    "assuntos_matriz_cip": ["string"]   // da CIP
  },
  "relacionadas": {
    "obras_do_autor": ["string"],
    "livros_relacionados_catalogo_alta": ["string"],
    "comparaveis_mercado": ["string"]
  }
}
```

Campos que o Gemini não conseguir extrair viram `null` ou `[]` e ganham entrada em `alertas` com severidade `aviso` (não bloqueia status `pronto`).

---

## Frontend

### Árvore nova

```
src/
  pages/Metadados/
    Listagem.tsx
    Detalhe.tsx
  components/Metadados/
    MetadadosCard.tsx
    NovaGeracaoModal.tsx
    FormMetadados.tsx
    SecaoDadosBasicos.tsx
    SecaoDadosEditoriais.tsx
    SecaoTextos.tsx
    SecaoRelacionadas.tsx
    CampoComAlerta.tsx
    StatusBadgeMetadados.tsx
    BotaoSalvarSticky.tsx
  hooks/
    useMetadadosJobs.ts        // lista paginada + realtime
    useMetadadosJob.ts          // job único + realtime
    useUploadMetadados.ts       // upload 3 arquivos com rollback
  lib/
    metadadosWebhook.ts         // POST gerar / regerar-xlsx
    metadadosFlatten.ts         // getByPath / setByPath p/ edição
    idiomasMetadados.ts         // se precisar select de idioma
  types/
    metadados.ts                // MetadadosJob, MetadadosJSON, Alerta
```

### `types/metadados.ts`

```ts
export type StatusMetadados = 'aguardando' | 'processando' | 'pronto' | 'erro';
export type SeveridadeAlerta = 'info' | 'aviso' | 'erro';

export interface AlertaMetadados {
  campo: string;          // path no JSON, ex: 'dados_basicos.isbn'
  severidade: SeveridadeAlerta;
  mensagem: string;
}

export interface MetadadosJSON {
  dados_basicos: { /* ... ver schema canônico ... */ };
  dados_editoriais: { /* ... */ };
  textos: { /* ... */ };
  relacionadas: { /* ... */ };
}

export interface MetadadosJob {
  id: string;
  isbn: string | null;
  titulo: string | null;
  autor: string | null;
  selo: string | null;
  status: StatusMetadados;
  erro_mensagem: string | null;
  capa_path: string;
  miolo_path: string;
  pcp_path: string;
  metadados_json: MetadadosJSON | null;
  alertas: AlertaMetadados[];
  xlsx_bookinfo_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
```

### `hooks/useUploadMetadados.ts` — fluxo

1. Gera `jobId = crypto.randomUUID()` client-side
2. `await supabase.storage.from('metadados').upload(\`\${jobId}/capa.pdf\`, capa)`
3. `await supabase.storage.from('metadados').upload(\`\${jobId}/miolo.pdf\`, miolo)`
4. `await supabase.storage.from('metadados').upload(\`\${jobId}/pcp.xlsx\`, pcp)`
5. Se qualquer um falhar: `await supabase.storage.from('metadados').remove([já enviados...])` (rollback) + throw
6. `await supabase.from('metadados_jobs').insert({ id: jobId, capa_path, miolo_path, pcp_path, status: 'aguardando' })`
7. `await postWebhook('ghostwriter/metadados/gerar', { job_id: jobId })`
8. Retorna `jobId` (caller navega pra `/metadados/${jobId}`)

Limites de tamanho validados antes do upload: capa 30MB, miolo 80MB, PCP 5MB. Tipos: capa+miolo `application/pdf`; PCP `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

### `components/Metadados/NovaGeracaoModal.tsx`

3 slots tipados (não dropzone genérico):

```
┌──────────────────────────────────────────────┐
│  Nova Geração de Metadados                   │
├──────────────────────────────────────────────┤
│  [PDF] Capa aberta (PDF, máx 30MB)  *        │
│  [📎 Selecionar arquivo]  capa.pdf  ✓        │
│                                              │
│  [PDF] Miolo (PDF, máx 80MB)  *              │
│  [📎 Selecionar arquivo]  miolo.pdf  ✓       │
│                                              │
│  [XLSX] Tabela PCP (.xlsx, máx 5MB)  *       │
│  [📎 Selecionar arquivo]  pcp.xlsx  ✓        │
│                                              │
│  [Cancelar]            [Gerar metadados →]   │
└──────────────────────────────────────────────┘
```

Botão "Gerar" só habilita com os 3 arquivos presentes e dentro dos limites. Durante upload, mostra progresso por slot.

Antes de fechar o modal: se o ISBN da CIP do miolo for descoberto, o n8n mostra; mas como a checagem de duplicado roda no backend (depois do parse), a UX é diferente — ver fluxo abaixo em "Caso ISBN duplicado".

### `components/Metadados/FormMetadados.tsx` — layout A (linear)

4 seções colapsáveis em ordem fixa:

1. **Dados básicos** — título, autor, ISBN, idioma, edição, ano... (~13 campos)
2. **Dados editoriais** — selo, formato, dimensões, CDD, BISAC, THEMA, categorias Alta... (~14 campos)
3. **Textos** — sinopse, biografia, palavras-chave, contracapa... (~6 campos longos)
4. **Relacionadas** — obras do autor, livros do catálogo, comparáveis (~3 listas)

Cada campo é um `<CampoComAlerta>` que olha `alertas[]` filtrando por `campo === path`. Se houver alerta, renderiza badge da severidade ao lado e mensagem abaixo. Edição vira state local; mudanças marcam `isDirty = true` no `BotaoSalvarSticky`.

### `components/Metadados/BotaoSalvarSticky.tsx`

Sticky no rodapé do detalhe. Cinza quando `!isDirty`, vermelho quando `isDirty`. Click salva:

```ts
await supabase.from('metadados_jobs')
  .update({ metadados_json: jsonAtualizado })
  .eq('id', jobId);
```

Botão "Baixar BookInfo" no header do detalhe:

```ts
if (isDirty) await salvar();
const { url } = await postWebhook('ghostwriter/metadados/regerar-xlsx', { job_id: jobId });
window.open(url, '_blank');
```

### `pages/Metadados/Listagem.tsx`

Reusa `TopBar` + `SearchBar` + grid de `MetadadosCard` com filtro local por título/autor/ISBN. Botão CTA "Nova geração" abre `NovaGeracaoModal`.

`MetadadosCard` mostra: título (ou "Sem título ainda" se `pronto` mas vazio), autor, selo, ISBN, `StatusBadgeMetadados`, data, alertas (contador se >0).

### `pages/Metadados/Detalhe.tsx`

Estados visuais por `status`:
- `aguardando` / `processando` → spinner + texto "Extraindo metadados..." + cancelar (não funciona no MVP, só visual)
- `pronto` → revela `FormMetadados`
- `erro` → mostra `erro_mensagem` + botão "Tentar de novo" (re-dispara webhook idempotente)
- Se `status === 'processando'` há mais de 5min (computado client-side via `updated_at`), mostra botão "Reiniciar processamento" que re-dispara webhook

Realtime via `supabase.channel('metadados_job:' + jobId).on('postgres_changes', ...)` segue padrão de `DetalheProjeto.tsx`.

### Rota e gating

`App.tsx`:

```tsx
<Route path="/metadados" element={<ModuleRoute slug="metadados"><MetadadosListagem /></ModuleRoute>} />
<Route path="/metadados/:id" element={<ModuleRoute slug="metadados"><MetadadosDetalhe /></ModuleRoute>} />
```

Item novo no menu da `TopBar` (ou onde quer que esteja) com label "Metadados", visível somente se o usuário tem o módulo liberado.

---

## n8n — workflows

### `ghostwriter/metadados/gerar`

Webhook POST `{ job_id }`. Idempotente: se a row já estiver em `processando`, re-roda do zero.

```
1. Webhook { job_id }
       ↓
2. Postgres SELECT job by id → { capa_path, miolo_path, pcp_path, ... }
       ↓
3. UPDATE status='processando' (visível no Realtime)
       ↓
4. Code: gera signed URLs para os 3 arquivos (5min de validade)
       ↓
5. HTTP GET paralelo: baixa os 3 arquivos como Buffer
       ↓
6. Code parsePCP: lê o xlsx (exceljs), encontra coluna A (chave) + coluna B (valor),
   monta { campo: valor }; ausências viram null + alerta 'aviso'
       ↓
7. Code montarPayloadGemini: monta o objeto OpenRouter com:
   - model: 'google/gemini-2.5-flash'
   - messages: [ system: PROMPT_V21,
                 user: [
                   { type: 'image_url', image_url: { url: 'data:application/pdf;base64,' + capaB64 } },
                   { type: 'image_url', image_url: { url: 'data:application/pdf;base64,' + mioloB64 } },
                   { type: 'text', text: 'PCP:\n' + pcpComoTexto }
                 ]
               ]
   - response_format: { type: 'json_object' }
       ↓
8. HTTP POST OpenRouter (timeout 5min, retry 1x se 5xx/timeout)
       ↓
9. Code validaJSON: parse + checa estrutura canônica (4 blocos);
   se falhar → retry 1x com mensagem "JSON inválido, reformate respeitando o schema"
   se falhar de novo → UPDATE status='erro', erro_mensagem='Gemini retornou JSON inválido após 2 tentativas'
       ↓
10. Code extraiAlertas + denormalizados: vasculha o JSON, monta alertas[] para campos
    null/[], extrai isbn/titulo/autor/selo dos dados_basicos+editoriais
       ↓
11. Code gerarXlsxBookInfo:
    - baixa metadados/templates/bookinfo-template.xlsx do Storage
    - aplica COLUMN_MAP: { 'A2': 'dados_basicos.titulo', 'B2': 'dados_basicos.subtitulo', ... }
    - getByPath(metadados_json, COLUMN_MAP[cell]) preenche cada célula
    - serializa com exceljs → Buffer
       ↓
12. HTTP PUT Supabase Storage: sobe metadados/{job_id}/bookinfo.xlsx
       ↓
13. Postgres UPDATE:
      metadados_json, alertas, isbn, titulo, autor, selo,
      xlsx_bookinfo_path = '{job_id}/bookinfo.xlsx',
      status = 'pronto'
       ↓
14. Webhook 200 OK
```

**continueOnFail** em: 5 (download arquivos), 8 (OpenRouter), 12 (upload xlsx). Cada erro vira UPDATE status='erro' com mensagem específica.

### `ghostwriter/metadados/regerar-xlsx`

Webhook POST `{ job_id }`. Retorna `{ url: 'https://...signed...' }`. Tempo alvo: < 5s.

```
1. Webhook { job_id }
       ↓
2. Postgres SELECT metadados_json, xlsx_bookinfo_path FROM metadados_jobs WHERE id=$1
       ↓
3. Code gerarXlsxBookInfo (mesma função do flow gerar, reutiliza COLUMN_MAP)
       ↓
4. HTTP PUT Supabase Storage (sobrescreve metadados/{job_id}/bookinfo.xlsx)
       ↓
5. Code geraSignedURL: createSignedUrl com 5min de TTL
       ↓
6. Postgres UPDATE updated_at = now() (trigger atualiza, mas explícito por clareza)
       ↓
7. Response { url: signedUrl }
```

### Constantes/templates dentro do n8n

- **`PROMPT_V21`** — string longa, vive num Code node próprio chamado `prompt-v21` (cópia exata do `Prompt_Metadados_v2.1_Alta_Books.docx`) ou em env var do n8n. Versionar a string no Code node é mais simples no MVP.
- **`COLUMN_MAP`** — objeto `{ [cellRef: string]: jsonPath }` dentro do Code node `gerarXlsxBookInfo`. Construído a partir de `BookInfo origem dos dados.xlsx`.
- **`bookinfo-template.xlsx`** — vive em `metadados/templates/bookinfo-template.xlsx`. Subido manualmente uma vez. Mudanças de layout do BookInfo = subir nova versão + atualizar `COLUMN_MAP` no n8n.

### Pacotes npm necessários

- `exceljs` — verificar se está disponível na imagem do n8n no Railway. Se não, adicionar via env var `NODE_FUNCTION_ALLOW_EXTERNAL=exceljs`.
- Tudo mais (fetch, base64) é built-in do Node.

### Credenciais reusadas
- **Supabase service_role** (existente, usada em outros flows)
- **OpenRouter** (existente, usada na geração de livros)

Sem Drive nesse fluxo.

---

## Fluxo de dados — casos representativos

### Caso 1: smoke test feliz (Tecendo Prata, Naomi Novik)
1. Usuário sobe `9786560991095_capa.pdf` + `9786560991095_miolo.pdf` + `9786560991095_tecendo_prata.xlsx` no modal
2. Frontend gera UUID, sobe 3 arquivos, INSERT job (`aguardando`), POST webhook gerar
3. n8n: UPDATE `processando` → baixa arquivos → parsePCP retorna ~30 campos preenchidos + ~6 ausentes (alertas 'aviso') → monta Gemini → recebe JSON canônico → valida ✓ → extrai isbn=`978-65-6099-109-5`, titulo=`Tecendo Prata`, autor=`Naomi Novik`, selo=`Alta Books` → gera xlsx → upload → UPDATE `pronto`
4. Frontend (Realtime) revela `FormMetadados` preenchido. Usuário ajusta 1 campo (ex: corrige BISAC). `BotaoSalvarSticky` fica vermelho → click salva.
5. Click "Baixar BookInfo" → regerar-xlsx → download. xlsx abre com BISAC corrigido.

### Caso 2: ISBN duplicado
1. n8n termina a geração, descobre que `isbn='978-65-6099-109-5'` já existe em outra row com `status='pronto'`.
2. n8n grava normalmente o novo job (não bloqueia). Adiciona em `alertas` uma entrada com `severidade='aviso'`, `campo='dados_basicos.isbn'`, `mensagem='Já existe outra geração com este ISBN (job {outro_id}). Verifique se quer manter ambas ou apagar a anterior.'`.
3. Frontend mostra esse alerta no `CampoComAlerta` do ISBN. Adiciona 2 botões no banner do detalhe:
   - "Apagar versão anterior" → DELETE outro job + remove arquivos do Storage
   - "Manter ambos" → dispensa o alerta (UPDATE alertas removendo a entrada)
4. Nada bloqueia. Listagem mostra ambos enquanto não decidir.

### Caso 3: CIP sem ISBN
1. Gemini retorna `dados_basicos.isbn = null` + alerta 'aviso' "ISBN não encontrado na CIP do miolo".
2. Job vai pra `pronto` normalmente. Usuário preenche manualmente o ISBN e salva.

### Caso 4: PCP fora do template (cliente preencheu de outro jeito)
1. parsePCP encontra coluna A com chaves diferentes do esperado.
2. Para cada campo esperado e ausente, adiciona alerta 'aviso' "Campo X não encontrado na PCP — preencher manualmente".
3. Job continua, Gemini tenta extrair do que tem (capa + miolo).

### Caso 5: PDF corrompido (miolo não abre)
1. n8n no passo 5 falha ao baixar/converter o miolo. continueOnFail.
2. UPDATE `status='erro', erro_mensagem='Não foi possível ler o PDF do miolo. Verifique se o arquivo está íntegro.'`
3. Frontend mostra erro + botão "Tentar de novo" → re-dispara webhook gerar (idempotente).

### Caso 6: Gemini timeout / 5xx
1. HTTP POST OpenRouter falha. Retry automático 1x.
2. Se falhar de novo: UPDATE `status='erro', erro_mensagem='Gemini indisponível, tente novamente em alguns minutos.'`

### Caso 7: JSON inválido do Gemini
1. validaJSON detecta estrutura quebrada. Re-envia pra Gemini com mensagem "Você retornou JSON inválido. Reformate respeitando exatamente o schema: { dados_basicos, dados_editoriais, textos, relacionadas }".
2. Se a 2ª resposta também for inválida: UPDATE `status='erro', erro_mensagem='Gemini retornou JSON inválido após 2 tentativas.'`

### Caso 8: Browser fechado durante processamento
1. n8n continua independente. UPDATE final na row dispara Realtime.
2. Quando usuário volta pra `/metadados/{job_id}`, vê o estado atual (provavelmente `pronto`).

### Caso 9: Upload falha no meio (PCP falha após capa+miolo OK)
1. `useUploadMetadados` faz remove dos 2 arquivos já enviados.
2. INSERT do job nunca acontece. Modal mostra erro inline, usuário tenta de novo (com mesmo UUID gerado naquele submit? Não — gera UUID novo).

### Caso 10: 2 abas editando o mesmo job
1. Aba A salva campo X = "ABC". Aba B (com versão antiga) salva campo Y = "DEF" — também faz UPDATE inteiro do `metadados_json` com seu state local.
2. Last write wins. Aba A perde X="ABC" se não recarregar antes. Aceito no MVP.

### Caso 11: Job travado em `processando` > 5min
1. Frontend computa `Date.now() - new Date(updated_at).getTime() > 5*60*1000 && status==='processando'`.
2. Mostra botão "Reiniciar processamento" → POST gerar de novo (idempotente: re-roda do zero).

---

## Testes

### Frontend (Vitest)

- `lib/metadadosFlatten`: `getByPath({a:{b:1}}, 'a.b')` → 1; `setByPath` mutação imutável retorna nova ref
- `lib/metadadosWebhook`: mock de `fetch`, testa POST body + tratamento de erro
- `hooks/useUploadMetadados`: mock do `supabase.storage`, simula falha no 3º upload e confirma que os 2 anteriores são removidos
- `components/CampoComAlerta`: render com alerta 'erro' (badge vermelho + msg), com 'aviso' (amarelo), sem alerta (nada)
- `components/NovaGeracaoModal`: botão desabilitado sem 3 arquivos; com tipos/tamanhos inválidos mostra inline
- `components/BotaoSalvarSticky`: vira vermelho quando `isDirty`

### n8n (manual via Executions)

- Smoke completo com Tecendo Prata: job de `aguardando` → `pronto` em <90s, JSON com isbn/titulo/autor corretos
- Edge: capa intencionalmente corrompida → job vira `erro` com mensagem clara
- Edge: PCP com colunas trocadas → alertas 'aviso' aparecem, job vai pra `pronto`
- Edge: PROMPT_V21 propositalmente quebrado pra forçar JSON inválido → 2 retries → status `erro`
- Edge: re-disparar webhook gerar com job já em `pronto` → re-processa (overwrite do `metadados_json` e xlsx)

### Banco

- Migration aplica sem erro em produção
- RLS: usuário A não vê jobs do usuário B
- RLS: admin (`is_admin()` true) vê todos
- Trigger `set_updated_at` dispara em UPDATE
- Unique constraint não criamos pra ISBN (pra permitir duplicados intencionais via "manter ambos"); duplicate detection é só leitura via query

### Storage

- Policy permite owner ler/escrever em `{job_id}/*` quando `metadados_jobs.created_by = auth.uid()`
- Policy bloqueia outro usuário de ler arquivos de job alheio
- `templates/*` só admin escreve; todos owners de jobs leem (necessário pro n8n? n8n usa service_role, não passa por RLS — então só admins humanos precisam ler templates)

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Payload de PDFs grandes (miolo de 200 páginas) excede limite do OpenRouter/Gemini | Hard limit 80MB no miolo; se passar, marca job como `erro` com mensagem clara. Follow-up: split por capítulos |
| Gemini 2.5 Flash retorna alucinações nos códigos BISAC/THEMA | Aceito no MVP — usuário corrige inline. Follow-up: validar contra base BISAC 2024 + THEMA carregadas |
| `exceljs` não está na imagem n8n do Railway | Verificar antes de implementar; se faltar, adicionar via `NODE_FUNCTION_ALLOW_EXTERNAL=exceljs` no env do container |
| Template `bookinfo-template.xlsx` desatualiza vs realidade da Alta Books | Documentar processo: editor sobe nova versão em `metadados/templates/` + dev atualiza `COLUMN_MAP` no n8n. Sem versionamento no MVP |
| ISBN duplicado é falso positivo (reedição legítima) | Botão "manter ambos" resolve. Listagem mostra ambos com mesma ISBN; usuário diferencia por `created_at`/`edicao` |
| Custo OpenRouter cresce rápido se virar uso pesado | Gemini 2.5 Flash é barato (~$0.30/Mtok input, ~$2.50/Mtok output). Monitorar consumo via OpenRouter dashboard |
| RLS recursiva quebra acesso (já aconteceu antes) | Policy usa `is_admin()` SECURITY DEFINER conforme [[feedback-rls-no-recursion]] |
| Realtime "race" entre n8n UPDATE e cliente editando | Cliente só revela form quando `status === 'pronto'`. Edição depois disso é independente do n8n |
| Payload de Realtime do `metadados_json` pode passar 256KB (limite default do Supabase Realtime) e a mensagem ser truncada/descartada | Cliente assina apenas mudanças de **status** (publication filtrada por colunas) ou faz refetch da row quando recebe evento sem payload. Não depender do payload Realtime conter o JSON completo |

---

## Migração e rollout

1. **DB migration** primeiro (Supabase MCP `apply_migration`): cria `metadados_jobs`, módulo, bucket, policies
2. **Storage**: subir manualmente `metadados/templates/bookinfo-template.xlsx` (1 vez)
3. **n8n flow** segundo: criar `ghostwriter/metadados/gerar` + `ghostwriter/metadados/regerar-xlsx` no editor n8n, ativar
4. **Frontend** por último: deploy normal via Vite build, com `ModuleRoute` já gated por `metadados`

Ordem importa: se frontend for primeiro, o módulo `metadados` ainda não existe → `ModuleRoute` bloqueia acesso (404 friendly). Se n8n vier antes do frontend, ninguém chama o webhook — também sem quebra.

Não precisa feature flag. Liberação por usuário via `user_modules`.

**Critério de "pronto pra entregar":** smoke test com Tecendo Prata passa end-to-end + 1 usuário interno (Cristiane ou Anderson) consegue rodar 1 livro real sem ajuda do dev.

---

## Acompanhamento depois do merge

- Atualizar [[metadados-pivot-2026-05-26]] removendo a sessão "Status do brainstorming" e movendo decisões pra `project_metadados_estado.md` (estado pós-MVP)
- Atualizar `CLAUDE.md` listando a nova rota `/metadados`, tabela `metadados_jobs`, bucket `metadados`, 2 webhooks n8n
- Atualizar [[permissions-system]] adicionando o slug `metadados` à lista de módulos conhecidos
- Adicionar ao [[project-pendentes]]:
  - Implementar as outras 12 planilhas (Mercado Livre, Audible, Bookwire+, Kindle+, etc.)
  - Validar BISAC/THEMA contra base de códigos oficiais
  - Chunking de PDFs gigantes (>80MB)
  - Versionamento de gerações por ISBN
  - Validação cruzada de campos (CDD ↔ BISAC ↔ categoria interna)
- Cobrar feedback dos stakeholders (Cristiane, Anderson, Gabriel) após 1 semana de uso
