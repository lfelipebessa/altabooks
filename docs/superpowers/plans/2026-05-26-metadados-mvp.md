# Gerador de Metadados MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** entregar a tela `/metadados` end-to-end: usuário sobe 3 arquivos (capa PDF + miolo PDF + PCP xlsx), n8n + Gemini 2.5 Flash extrai o JSON canônico do BookInfo, frontend permite edição inline e regeneração do xlsx pra download.

**Architecture:** Frontend React 19 com Supabase Storage + tabela `metadados_jobs` como fonte da verdade. Dois webhooks n8n (`gerar` + `regerar-xlsx`) cuidam de IA e geração de xlsx. Realtime do Supabase desbloqueia a UI quando o job termina.

**Tech Stack:** React 19 + TypeScript 5.9 + Vite 7 + Tailwind 4 + Supabase (PostgreSQL 17 + Storage + Realtime + RLS) + n8n + OpenRouter (Gemini 2.5 Flash) + `exceljs` no n8n. Testes: Vitest + Testing Library (já configurados).

**Spec:** `docs/superpowers/specs/2026-05-26-metadados-mvp-design.md`

**Permissionamento:** módulo `metadados` adicionado à constante `MODULES` em `src/lib/permissions.ts:10` (lista hardcoded). Liberar `bessalfs@gmail.com` via INSERT em `user_modules`.

**Convenções a preservar:**
- Testes em `src/lib/*.test.ts` com Vitest, descrição em pt-BR (ver `src/lib/driveUrl.test.ts` como referência)
- RLS owner-or-admin com `public.is_admin()` SECURITY DEFINER **sem argumentos** (ver [[feedback-rls-no-recursion]])
- Componentes em pt-BR, padrões visuais via Tailwind 4 + tokens em `index.css`
- Webhooks: `https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/...`
- Sem comentários redundantes; nada de "// TODO" ou planejamento dentro do código

---

## Fases do plano

- **Fase 1 — Banco e Storage** (Tasks 1–4): migration da tabela, RLS, bucket, permissão inicial
- **Fase 2 — n8n workflows** (Tasks 5–11): template xlsx, workflow `gerar`, workflow `regerar-xlsx`, smoke
- **Fase 3 — Frontend** (Tasks 12–28): types, lib pura (TDD), hooks (TDD), components, pages, rota
- **Fase 4 — Smoke E2E e docs** (Tasks 29–30)

---

## Mapeamento de arquivos

### Banco (Supabase MCP `apply_migration`)
- `metadados_jobs` table + indexes + trigger
- `metadados_jobs` RLS policies
- Bucket `metadados` + policies
- INSERT em `user_modules`

### Frontend novo
- `src/types/metadados.ts` — tipos canônicos (JSON, Job, Alerta, Status)
- `src/lib/metadadosFlatten.ts` + test — `getByPath` / `setByPath` para edição por path
- `src/lib/metadadosWebhook.ts` + test — POST gerar / regerar-xlsx
- `src/lib/metadadosCampos.ts` — definição declarativa de campos por seção (sem teste, dado)
- `src/hooks/useUploadMetadados.ts` + test — upload 3 arquivos com rollback
- `src/hooks/useMetadadosJob.ts` — fetch + Realtime status-only
- `src/hooks/useMetadadosJobs.ts` — lista + Realtime
- `src/components/Metadados/StatusBadgeMetadados.tsx`
- `src/components/Metadados/CampoComAlerta.tsx`
- `src/components/Metadados/BotaoSalvarSticky.tsx`
- `src/components/Metadados/NovaGeracaoModal.tsx`
- `src/components/Metadados/MetadadosCard.tsx`
- `src/components/Metadados/SecaoColapsavel.tsx` — wrapper genérico
- `src/components/Metadados/FormMetadados.tsx`
- `src/pages/Metadados/Listagem.tsx`
- `src/pages/Metadados/Detalhe.tsx`

### Frontend modificado
- `src/lib/permissions.ts:10-14` — adicionar `{ slug: 'metadados', label: 'Gerador de Metadados' }`
- `src/components/TopBar.tsx:47-75` — novo item de menu condicional `modules.has('metadados')`
- `src/App.tsx:29-41` — 2 rotas novas

### n8n
- 1 template xlsx no Storage (`metadados/templates/bookinfo-template.xlsx`)
- 2 workflows: `ghostwriter/metadados/gerar` + `ghostwriter/metadados/regerar-xlsx`
- 1 Code node compartilhado conceitualmente: `gerarXlsxBookInfo` com `COLUMN_MAP` + `PROMPT_V21`

---

## Fase 1 — Banco e Storage

### Task 1: Migration da tabela `metadados_jobs`

**Files:**
- Create (remoto via `mcp__plugin_supabase_supabase__apply_migration`): migration `create_metadados_jobs_table`

- [ ] **Step 1: Aplicar a migration**

```sql
create table public.metadados_jobs (
  id uuid primary key default gen_random_uuid(),

  isbn varchar,
  titulo varchar,
  autor varchar,
  selo varchar,

  status varchar not null default 'aguardando'
    check (status in ('aguardando', 'processando', 'pronto', 'erro')),
  erro_mensagem text,

  capa_path text not null,
  miolo_path text not null,
  pcp_path text not null,

  metadados_json jsonb,
  alertas jsonb not null default '[]'::jsonb,
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
  for each row execute function public.set_updated_at();
```

Invocação MCP:

```
mcp__plugin_supabase_supabase__apply_migration({
  project_id: 'tddolcrzmczvoqxkajic',
  name: 'create_metadados_jobs_table',
  query: '<SQL acima>'
})
```

- [ ] **Step 2: Verificar via execute_sql**

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'metadados_jobs'
order by ordinal_position;
```

Esperado: 13 colunas (id, isbn, titulo, autor, selo, status, erro_mensagem, capa_path, miolo_path, pcp_path, metadados_json, alertas, xlsx_bookinfo_path, created_by, created_at, updated_at = 15). `status` com check, `alertas` com default `'[]'::jsonb`.

```sql
select indexname from pg_indexes
where schemaname = 'public' and tablename = 'metadados_jobs';
```

Esperado: 4 entries (PK + 3 idx).

---

### Task 2: RLS policies em `metadados_jobs`

**Files:**
- Migration `enable_rls_metadados_jobs`

- [ ] **Step 1: Aplicar a migration**

```sql
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

- [ ] **Step 2: Verificar policies**

```sql
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'metadados_jobs'
order by policyname;
```

Esperado: 4 policies, todas referenciando `auth.uid()` e/ou `is_admin()` **sem argumentos**.

---

### Task 3: Bucket `metadados` + policy

**Files:**
- Migration `create_metadados_storage_bucket`

- [ ] **Step 1: Aplicar a migration**

```sql
insert into storage.buckets (id, name, public)
  values ('metadados', 'metadados', false)
  on conflict (id) do nothing;

create policy "metadados_objects_access"
  on storage.objects for all
  using (
    bucket_id = 'metadados' and (
      exists (
        select 1 from public.metadados_jobs j
        where j.id::text = (storage.foldername(name))[1]
          and (j.created_by = auth.uid() or public.is_admin())
      )
      or ((storage.foldername(name))[1] = 'templates' and public.is_admin())
    )
  )
  with check (
    bucket_id = 'metadados' and (
      exists (
        select 1 from public.metadados_jobs j
        where j.id::text = (storage.foldername(name))[1]
          and (j.created_by = auth.uid() or public.is_admin())
      )
      or ((storage.foldername(name))[1] = 'templates' and public.is_admin())
    )
  );
```

- [ ] **Step 2: Verificar bucket criado**

```sql
select id, public from storage.buckets where id = 'metadados';
```

Esperado: 1 row `{ id: 'metadados', public: false }`.

```sql
select policyname from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname = 'metadados_objects_access';
```

Esperado: 1 row.

---

### Task 4: Liberar slug `metadados` para `bessalfs@gmail.com`

**Files:**
- Migration `grant_metadados_module_to_bessa`

- [ ] **Step 1: Aplicar a migration**

```sql
insert into public.user_modules (user_id, module_slug, granted_at)
  select id, 'metadados', now()
  from auth.users
  where email = 'bessalfs@gmail.com'
  on conflict do nothing;
```

- [ ] **Step 2: Verificar**

```sql
select um.module_slug, u.email
from public.user_modules um
join auth.users u on u.id = um.user_id
where u.email = 'bessalfs@gmail.com'
order by um.module_slug;
```

Esperado: ao menos uma row com `module_slug = 'metadados'`.

---

## Fase 2 — n8n workflows

> Workflows do n8n vivem na UI visual do editor (não há export pra git neste projeto). Cada task descreve nodes + config necessária. Validação via aba "Executions" do n8n.

### Task 5: Subir template `bookinfo-template.xlsx` no Storage

**Files:**
- Storage: `metadados/templates/bookinfo-template.xlsx`

- [ ] **Step 1: Preparar o template**

Pegar o arquivo `~/Downloads/BookInfo origem dos dados.xlsx` (já existente). Extrair só a aba `BookInfo` em um arquivo novo `bookinfo-template.xlsx`. Manter cabeçalhos, formatações e validações; **apagar dados de exemplo** (manter linhas vazias prontas pra preenchimento).

- [ ] **Step 2: Construir o `COLUMN_MAP`**

Para cada coluna do `BookInfo`, anotar a referência da célula (ex: A2, B2, ...) e o path correspondente no JSON canônico (ex: `dados_basicos.titulo`). Salvar como rascunho em um arquivo local temporário `~/tmp/column-map.json`:

```json
{
  "A2": "dados_basicos.titulo",
  "B2": "dados_basicos.subtitulo",
  "C2": "dados_basicos.autor",
  "...": "..."
}
```

Esse mapa será inserido como constante dentro do Code node `gerarXlsxBookInfo` na Task 8.

- [ ] **Step 3: Subir o template no Storage**

Pelo Supabase Studio (Storage UI) ou via CLI:
- bucket: `metadados`
- path: `templates/bookinfo-template.xlsx`
- usuário precisa estar autenticado como admin (`is_admin()` retornar true) — ou usar service_role direto via dashboard.

- [ ] **Step 4: Verificar upload**

```sql
select name, metadata->>'size' as size
from storage.objects
where bucket_id = 'metadados' and name = 'templates/bookinfo-template.xlsx';
```

Esperado: 1 row com tamanho > 0.

- [ ] **Step 5: Commit do COLUMN_MAP (rascunho versionado em docs)**

Mover `~/tmp/column-map.json` para `docs/superpowers/plans/metadados-column-map.json` no repo (referência viva pro n8n).

```bash
mkdir -p docs/superpowers/plans
mv ~/tmp/column-map.json docs/superpowers/plans/metadados-column-map.json
git add docs/superpowers/plans/metadados-column-map.json
git commit -m "docs(metadados): adicionar column-map BookInfo (referência para n8n)"
```

---

### Task 6: n8n — Workflow `ghostwriter/metadados/gerar` (parte 1: webhook → download)

> Criar workflow novo no n8n via UI. Salvar com nome `[Altabooks] Metadados — Gerar`.

**Files:**
- n8n workflow `[Altabooks] Metadados — Gerar`

- [ ] **Step 1: Node 1 — Webhook**

- Tipo: Webhook
- HTTP Method: POST
- Path: `ghostwriter/metadados/gerar`
- Response Mode: When Last Node Finishes
- Authentication: none (segue padrão dos outros webhooks da casa)

- [ ] **Step 2: Node 2 — Postgres "Get Job"**

- Tipo: Postgres > Execute Query
- Credencial: Supabase service_role (existente)
- Query:

```sql
select id, capa_path, miolo_path, pcp_path, status
from public.metadados_jobs
where id = '{{ $json.body.job_id }}'::uuid;
```

- [ ] **Step 3: Node 3 — Postgres "Mark Processing"**

- Tipo: Postgres > Execute Query
- Query:

```sql
update public.metadados_jobs
set status = 'processando', erro_mensagem = null
where id = '{{ $node["Get Job"].json.id }}'::uuid;
```

- [ ] **Step 4: Node 4 — Code "Gerar Signed URLs"**

- Tipo: Code (JavaScript)
- Mode: Run Once for All Items
- Código:

```js
const job = $('Get Job').first().json;
const supabaseUrl = 'https://tddolcrzmczvoqxkajic.supabase.co';
const serviceKey = $vars.SUPABASE_SERVICE_ROLE_KEY; // já configurado nas envs do n8n

async function signed(path) {
  const resp = await this.helpers.httpRequest({
    method: 'POST',
    url: `${supabaseUrl}/storage/v1/object/sign/metadados/${path}`,
    headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey, 'Content-Type': 'application/json' },
    body: { expiresIn: 300 },
    json: true,
  });
  return `${supabaseUrl}/storage/v1${resp.signedURL}`;
}

return [{
  json: {
    job_id: job.id,
    capa_url: await signed.call(this, job.capa_path),
    miolo_url: await signed.call(this, job.miolo_path),
    pcp_url: await signed.call(this, job.pcp_path),
  }
}];
```

- [ ] **Step 5: Nodes 5a/5b/5c — HTTP Request "Baixar Capa/Miolo/PCP"**

Três nodes em paralelo (todos saindo do node 4):
- Tipo: HTTP Request
- Method: GET
- URL: `{{ $json.capa_url }}` / `{{ $json.miolo_url }}` / `{{ $json.pcp_url }}`
- Response Format: File (binary). Coletar binary com nomes `capa`, `miolo`, `pcp` respectivamente em um Merge node.
- continueOnFail: true em todos

- [ ] **Step 6: Node 6 — Merge "Reunir Arquivos"**

- Tipo: Merge
- Mode: Combine
- Combine By: Position
- Saída: item único com os 3 binaries (`capa`, `miolo`, `pcp`)

- [ ] **Step 7: Salvar workflow + smoke parcial**

Salvar (sem ativar). Disparar manualmente via "Execute Workflow" passando um `job_id` válido criado à mão (INSERT manual no banco com paths que existam no Storage). Confirmar que os 3 binaries chegam no Merge.

---

### Task 7: n8n — Workflow `gerar` (parte 2: parsePCP + Gemini + valida JSON)

**Files:**
- n8n workflow `[Altabooks] Metadados — Gerar` (continuação)

- [ ] **Step 1: Node 7 — Code "Parse PCP"**

- Tipo: Code (JavaScript)
- Mode: Run Once for Each Item
- Código:

```js
const ExcelJS = require('exceljs');
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(item.binary.pcp.data);
const sheet = wb.worksheets[0];

// Lista completa derivada da estrutura da PCP padrão (ver
// docs/superpowers/plans/metadados-column-map.json e ~/Downloads/9786560991095_tecendo_prata.xlsx)
const CAMPOS_ESPERADOS = [
  'titulo', 'subtitulo', 'autor', 'coautores', 'tradutor', 'prefacio_por', 'ilustrador',
  'idioma_original', 'idioma_publicacao', 'edicao', 'ano_publicacao', 'isbn', 'ean',
  'selo', 'colecao', 'formato',
  'largura_cm', 'altura_cm', 'lombada_cm', 'peso_g', 'num_paginas',
  'preco_capa_brl', 'cdd', 'cdu',
  'bisac', 'thema', 'categorias_alta_books',
  'publico_alvo', 'faixa_etaria',
  'sinopse', 'biografia_autor', 'palavras_chave_seo',
  'obras_do_autor', 'livros_relacionados_catalogo_alta', 'comparaveis_mercado',
];

// Ajustar para casar com as chaves reais (coluna A) da PCP que o cliente preenche.
// Quando uma chave da PCP usar variação (ex: "Título"), normalizar no Code: key.toLowerCase().replace(/[áàâã]/g,'a')...

const found = {};
const alertas = [];
for (let i = 1; i <= sheet.rowCount; i++) {
  const row = sheet.getRow(i);
  const key = String(row.getCell(1).value || '').trim().toLowerCase();
  const val = row.getCell(2).value;
  if (key) found[key] = val;
}

for (const k of CAMPOS_ESPERADOS) {
  if (!(k in found) || found[k] === null || found[k] === '') {
    alertas.push({ campo: `pcp.${k}`, severidade: 'aviso', mensagem: `Campo "${k}" ausente na PCP — Gemini tentará extrair de capa/miolo` });
  }
}

const pcpComoTexto = Object.entries(found)
  .map(([k, v]) => `${k}: ${v}`)
  .join('\n');

return {
  json: {
    job_id: $('Code Gerar Signed URLs').first().json.job_id,
    pcp_campos: found,
    pcp_texto: pcpComoTexto,
    alertas_pcp: alertas,
  },
  binary: { capa: item.binary.capa, miolo: item.binary.miolo },
};
```

- [ ] **Step 2a: Capturar o `PROMPT_V21`**

Antes de criar o Node 8, abrir `~/Downloads/Prompt_Metadados_v2.1_Alta_Books.docx`, copiar o texto completo do prompt e salvá-lo em um arquivo versionado para referência:

```bash
# Converte o docx em texto plano e salva no repo
# (textutil é nativo do macOS; em Linux usar pandoc)
textutil -convert txt -output docs/superpowers/plans/metadados-prompt-v2.1.txt "$HOME/Downloads/Prompt_Metadados_v2.1_Alta_Books.docx"
git add docs/superpowers/plans/metadados-prompt-v2.1.txt
git commit -m "docs(metadados): adicionar texto do Prompt v2.1 para referência n8n"
```

O conteúdo desse arquivo será colado como string dentro do `PROMPT_V21` no Code node abaixo. Quando o prompt mudar: atualizar o `.txt` no repo + atualizar o Code node no n8n.

- [ ] **Step 2b: Node 8 — Code "Montar Payload Gemini"**

- Código:

```js
const PROMPT_V21 = `<COLAR aqui o conteúdo de docs/superpowers/plans/metadados-prompt-v2.1.txt>`;

const capaB64 = item.binary.capa.data; // já vem em base64 no n8n
const mioloB64 = item.binary.miolo.data;
const pcp = $json.pcp_texto;

return {
  json: {
    job_id: $json.job_id,
    alertas_pcp: $json.alertas_pcp,
    openrouter_payload: {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: PROMPT_V21 },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:application/pdf;base64,${capaB64}` } },
            { type: 'image_url', image_url: { url: `data:application/pdf;base64,${mioloB64}` } },
            { type: 'text', text: `PCP (chave: valor):\n${pcp}` },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    },
  }
};
```

- [ ] **Step 3: Node 9 — HTTP Request "OpenRouter"**

- Method: POST
- URL: `https://openrouter.ai/api/v1/chat/completions`
- Headers: `Authorization: Bearer {{ $vars.OPENROUTER_KEY }}`, `Content-Type: application/json`
- Body: `{{ JSON.stringify($json.openrouter_payload) }}`
- Timeout: 300000 (5min)
- Retry on Fail: 1x com 5s entre tentativas
- continueOnFail: true

- [ ] **Step 4: Node 10 — Code "Validar JSON"**

- Código:

```js
const resp = $json;
if (resp.error) {
  return { json: { erro: 'openrouter_falhou', mensagem: resp.error.message || 'Falha ao chamar Gemini', job_id: $('Code Montar Payload Gemini').first().json.job_id } };
}

let parsed;
try {
  parsed = JSON.parse(resp.choices[0].message.content);
} catch (e) {
  return { json: { erro: 'json_invalido', tentativa: 1, job_id: $('Code Montar Payload Gemini').first().json.job_id } };
}

const blocos = ['dados_basicos', 'dados_editoriais', 'textos', 'relacionadas'];
const ok = blocos.every(b => parsed[b] && typeof parsed[b] === 'object');
if (!ok) {
  return { json: { erro: 'json_invalido', tentativa: 1, job_id: $('Code Montar Payload Gemini').first().json.job_id } };
}

return {
  json: {
    job_id: $('Code Montar Payload Gemini').first().json.job_id,
    metadados_json: parsed,
    alertas_pcp: $('Code Montar Payload Gemini').first().json.alertas_pcp,
  }
};
```

- [ ] **Step 5: Node 11 — IF "JSON Inválido?"**

- Condição: `{{ $json.erro === 'json_invalido' && $json.tentativa === 1 }}`
- TRUE → volta pro node 8 com mensagem extra: prefixar `PROMPT_V21` com `[CORREÇÃO] Você retornou JSON inválido. Reformate respeitando exatamente o schema: { dados_basicos, dados_editoriais, textos, relacionadas } com tipos exatos.` e marcar `tentativa: 2` no estado. (No n8n, isso é feito copiando o node 8 como "Montar Payload Retry" com prompt diferente — não há loop natural, fazer caminho explícito.)
- FALSE → segue pro próximo node

- [ ] **Step 6: Smoke parcial**

Disparar workflow com job de teste. Confirmar que `metadados_json` sai com os 4 blocos.

---

### Task 8: n8n — Workflow `gerar` (parte 3: gerar xlsx + UPDATE final)

**Files:**
- n8n workflow `[Altabooks] Metadados — Gerar` (continuação)

- [ ] **Step 1: Node 12 — Code "Extrair Alertas e Denormalizar"**

- Código:

```js
const m = $json.metadados_json;
const alertas = [...$json.alertas_pcp];

function checkVazio(path, severidade = 'aviso') {
  const val = path.split('.').reduce((o, k) => o?.[k], m);
  if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
    alertas.push({ campo: path, severidade, mensagem: `Campo "${path}" não preenchido pelo Gemini` });
  }
}

['dados_basicos.titulo', 'dados_basicos.autor', 'dados_basicos.isbn',
 'dados_editoriais.selo', 'dados_editoriais.cdd', 'textos.sinopse',
 'textos.biografia_autor'].forEach(p => checkVazio(p));

// duplicidade de ISBN (alerta, não bloqueio)
const isbn = m.dados_basicos?.isbn;
let alerta_duplicado = null;
if (isbn) {
  const dup = await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://tddolcrzmczvoqxkajic.supabase.co/rest/v1/rpc/check_isbn_existente',
    headers: { 'apikey': $vars.SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${$vars.SUPABASE_SERVICE_ROLE_KEY}` },
    body: { p_isbn: isbn, p_job_id: $json.job_id },
    json: true,
  });
  if (dup && dup.length > 0) {
    alertas.push({
      campo: 'dados_basicos.isbn',
      severidade: 'aviso',
      mensagem: `Já existe outra geração com este ISBN (job ${dup[0].id}). Verifique se quer manter ambas ou apagar a anterior.`
    });
  }
}

return {
  json: {
    job_id: $json.job_id,
    metadados_json: m,
    alertas,
    isbn: m.dados_basicos?.isbn || null,
    titulo: m.dados_basicos?.titulo || null,
    autor: m.dados_basicos?.autor || null,
    selo: m.dados_editoriais?.selo || null,
  }
};
```

> A função `check_isbn_existente` é criada na Task 11. Se a Task 11 ainda não foi feita, esse bloco do node falha silenciosamente (try/catch ao redor da httpRequest) e o alerta de duplicidade não é gerado. Aceitável até a função existir.

Wrap a chamada httpRequest em try/catch:

```js
let dup = null;
try {
  if (isbn) {
    dup = await this.helpers.httpRequest({ ... });
  }
} catch (e) { dup = null; }
```

- [ ] **Step 2: Node 13 — Code "Gerar XLSX BookInfo"**

- Código:

```js
const ExcelJS = require('exceljs');
const supabaseUrl = 'https://tddolcrzmczvoqxkajic.supabase.co';
const serviceKey = $vars.SUPABASE_SERVICE_ROLE_KEY;

const COLUMN_MAP = {
  // COLAR aqui o conteúdo de docs/superpowers/plans/metadados-column-map.json (Task 5)
  "A2": "dados_basicos.titulo",
  "B2": "dados_basicos.subtitulo",
  // ...
};

const tmplResp = await this.helpers.httpRequest({
  method: 'GET',
  url: `${supabaseUrl}/storage/v1/object/metadados/templates/bookinfo-template.xlsx`,
  headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey },
  encoding: null,
  returnFullResponse: false,
});

const wb = new ExcelJS.Workbook();
await wb.xlsx.load(tmplResp);
const sheet = wb.worksheets[0];

function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

for (const [cell, path] of Object.entries(COLUMN_MAP)) {
  const v = getByPath($json.metadados_json, path);
  if (v !== undefined && v !== null) {
    sheet.getCell(cell).value = Array.isArray(v) ? v.join('; ') : v;
  }
}

const buffer = await wb.xlsx.writeBuffer();
const b64 = Buffer.from(buffer).toString('base64');

return {
  json: { ...$json, xlsx_b64: b64 }
};
```

- [ ] **Step 3: Node 14 — HTTP Request "Upload XLSX"**

- Method: POST
- URL: `https://tddolcrzmczvoqxkajic.supabase.co/storage/v1/object/metadados/{{ $json.job_id }}/bookinfo.xlsx?x-upsert=true`
- Headers:
  - `Authorization: Bearer {{ $vars.SUPABASE_SERVICE_ROLE_KEY }}`
  - `apikey: {{ $vars.SUPABASE_SERVICE_ROLE_KEY }}`
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `x-upsert: true`
- Body: Binary, expression `Buffer.from($json.xlsx_b64, 'base64')`
- continueOnFail: true

- [ ] **Step 4: Node 15 — Postgres "UPDATE Job (pronto)"**

- Query:

```sql
update public.metadados_jobs
set
  status = 'pronto',
  metadados_json = '{{ JSON.stringify($json.metadados_json).replace(/'/g, "''") }}'::jsonb,
  alertas = '{{ JSON.stringify($json.alertas).replace(/'/g, "''") }}'::jsonb,
  isbn = {{ $json.isbn ? `'${$json.isbn}'` : 'null' }},
  titulo = {{ $json.titulo ? `'${$json.titulo.replace(/'/g, "''")}'` : 'null' }},
  autor = {{ $json.autor ? `'${$json.autor.replace(/'/g, "''")}'` : 'null' }},
  selo = {{ $json.selo ? `'${$json.selo}'` : 'null' }},
  xlsx_bookinfo_path = '{{ $json.job_id }}/bookinfo.xlsx'
where id = '{{ $json.job_id }}'::uuid;
```

> Recomendado migrar pra Postgres node parametrizado (sem string interpolation) numa iteração posterior. No MVP, escapamento manual de aspas simples basta.

- [ ] **Step 5: Branch de erro "UPDATE Job (erro)"**

Para cada node com `continueOnFail`, conectar um caminho de erro que entra num Postgres node "UPDATE Job (erro)":

```sql
update public.metadados_jobs
set status = 'erro',
    erro_mensagem = '{{ $json.erro_mensagem || $json.erro || "Falha inesperada" }}'
where id = '{{ $json.job_id }}'::uuid;
```

Cobrir: Node 5 (downloads), Node 9 (OpenRouter), Node 10 (JSON inválido após retry), Node 14 (upload xlsx).

- [ ] **Step 6: Ativar workflow**

Marcar como Active. Salvar URL final do webhook (produção): `https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/metadados/gerar`.

---

### Task 9: n8n — Workflow `ghostwriter/metadados/regerar-xlsx`

**Files:**
- n8n workflow `[Altabooks] Metadados — Regerar XLSX`

- [ ] **Step 1: Node 1 — Webhook**

- Method: POST
- Path: `ghostwriter/metadados/regerar-xlsx`
- Response Mode: When Last Node Finishes

- [ ] **Step 2: Node 2 — Postgres "SELECT Job"**

```sql
select id, metadados_json
from public.metadados_jobs
where id = '{{ $json.body.job_id }}'::uuid;
```

- [ ] **Step 3: Node 3 — Code "Gerar XLSX BookInfo"**

Copiar o código da Task 8 Step 2 (`Code Gerar XLSX BookInfo`). Mesmo `COLUMN_MAP`. Saída: `xlsx_b64`.

> Quando o `COLUMN_MAP` mudar, atualizar nos dois workflows. Marcar isso como dívida técnica no comentário do node.

- [ ] **Step 4: Node 4 — HTTP Request "Upload XLSX (overwrite)"**

Idêntico ao node 14 da Task 8 (overwrite via `x-upsert: true`).

- [ ] **Step 5: Node 5 — Code "Signed URL"**

```js
const supabaseUrl = 'https://tddolcrzmczvoqxkajic.supabase.co';
const serviceKey = $vars.SUPABASE_SERVICE_ROLE_KEY;
const path = `${$json.job_id}/bookinfo.xlsx`;

const resp = await this.helpers.httpRequest({
  method: 'POST',
  url: `${supabaseUrl}/storage/v1/object/sign/metadados/${path}`,
  headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey, 'Content-Type': 'application/json' },
  body: { expiresIn: 300 },
  json: true,
});

return { json: { url: `${supabaseUrl}/storage/v1${resp.signedURL}` } };
```

- [ ] **Step 6: Node 6 — Respond to Webhook**

- Tipo: Respond to Webhook
- Response Body: `{{ JSON.stringify({ url: $json.url }) }}`
- Status Code: 200

- [ ] **Step 7: Ativar workflow**

Marcar como Active. URL: `https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/metadados/regerar-xlsx`.

---

### Task 10: Smoke do workflow `gerar` com Tecendo Prata

**Files:**
- nenhum (validação manual)

- [ ] **Step 1: Criar job manualmente**

Pelo Supabase Studio, primeiro subir os 3 arquivos:
- `metadados/<NOVO_UUID>/capa.pdf` ← `~/Downloads/9786560991095_capa.pdf`
- `metadados/<NOVO_UUID>/miolo.pdf` ← `~/Downloads/9786560991095_miolo.pdf`
- `metadados/<NOVO_UUID>/pcp.xlsx` ← `~/Downloads/9786560991095_tecendo_prata.xlsx`

Depois INSERT:

```sql
insert into public.metadados_jobs (id, capa_path, miolo_path, pcp_path, status, created_by)
values (
  '<NOVO_UUID>'::uuid,
  '<NOVO_UUID>/capa.pdf',
  '<NOVO_UUID>/miolo.pdf',
  '<NOVO_UUID>/pcp.xlsx',
  'aguardando',
  '<seu user_id>'::uuid
);
```

- [ ] **Step 2: Disparar webhook manualmente**

```bash
curl -X POST 'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/metadados/gerar' \
  -H 'Content-Type: application/json' \
  -d '{"job_id":"<NOVO_UUID>"}'
```

- [ ] **Step 3: Acompanhar no n8n Executions**

Esperado: workflow chega ao final em < 90s. Status do job vai pra `pronto`. `metadados_json` populado, `xlsx_bookinfo_path = '<UUID>/bookinfo.xlsx'`.

- [ ] **Step 4: Validar via SQL**

```sql
select status, isbn, titulo, autor, selo,
       jsonb_typeof(metadados_json) as json_tipo,
       jsonb_array_length(alertas) as qtd_alertas,
       xlsx_bookinfo_path
from public.metadados_jobs
where id = '<NOVO_UUID>'::uuid;
```

Esperado: `status='pronto'`, `titulo='Tecendo Prata'`, `autor='Naomi Novik'`, `isbn` válido, `json_tipo='object'`.

- [ ] **Step 5: Baixar xlsx gerado**

Pelo Supabase Studio (Storage): baixar `metadados/<NOVO_UUID>/bookinfo.xlsx`. Abrir no Excel/LibreOffice. Conferir que pelo menos título, autor e ISBN aparecem nas células certas.

---

### Task 11: Função SQL `check_isbn_existente` (suporte ao node 12 da Task 8)

**Files:**
- Migration `create_check_isbn_existente_function`

- [ ] **Step 1: Aplicar a migration**

```sql
create or replace function public.check_isbn_existente(p_isbn text, p_job_id uuid)
returns table (id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select id from public.metadados_jobs
  where isbn = p_isbn
    and id <> p_job_id
    and status = 'pronto'
  limit 1;
$$;

grant execute on function public.check_isbn_existente(text, uuid) to anon, authenticated, service_role;
```

- [ ] **Step 2: Verificar**

```sql
select proname, prosecdef from pg_proc where proname = 'check_isbn_existente';
```

Esperado: 1 row, `prosecdef=true`.

---

## Fase 3 — Frontend

### Task 12: Types `src/types/metadados.ts`

**Files:**
- Create: `src/types/metadados.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
export type StatusMetadados = 'aguardando' | 'processando' | 'pronto' | 'erro';
export type SeveridadeAlerta = 'info' | 'aviso' | 'erro';

export interface AlertaMetadados {
  campo: string;
  severidade: SeveridadeAlerta;
  mensagem: string;
}

export interface DadosBasicos {
  titulo: string | null;
  subtitulo: string | null;
  autor: string | null;
  coautores: string[];
  tradutor: string | null;
  prefacio_por: string | null;
  ilustrador: string | null;
  idioma_original: string | null;
  idioma_publicacao: string | null;
  edicao: string | null;
  ano_publicacao: number | null;
  isbn: string | null;
  ean: string | null;
}

export interface DadosEditoriais {
  selo: string | null;
  colecao: string | null;
  formato: 'brochura' | 'capa_dura' | 'ebook' | 'audiolivro' | null;
  dimensoes_cm: { largura: number | null; altura: number | null; lombada: number | null } | null;
  peso_g: number | null;
  num_paginas: number | null;
  preco_capa_brl: number | null;
  cdd: string | null;
  cdu: string | null;
  bisac: string[];
  thema: string[];
  categorias_alta_books: string[];
  publico_alvo: string | null;
  faixa_etaria: string | null;
}

export interface Textos {
  sinopse: string | null;
  biografia_autor: string | null;
  texto_contracapa_completo: string | null;
  frases_marketing: string[];
  palavras_chave_seo: string[];
  assuntos_matriz_cip: string[];
}

export interface Relacionadas {
  obras_do_autor: string[];
  livros_relacionados_catalogo_alta: string[];
  comparaveis_mercado: string[];
}

export interface MetadadosJSON {
  dados_basicos: DadosBasicos;
  dados_editoriais: DadosEditoriais;
  textos: Textos;
  relacionadas: Relacionadas;
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

- [ ] **Step 2: Verificar build**

```bash
npx tsc --noEmit
```

Esperado: 0 erros.

- [ ] **Step 3: Commit**

```bash
git add src/types/metadados.ts
git commit -m "feat(metadados): adicionar tipos canônicos do JSON e do job"
```

---

### Task 13: lib pura `metadadosFlatten.ts` (TDD)

**Files:**
- Create: `src/lib/metadadosFlatten.ts`
- Create: `src/lib/metadadosFlatten.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Em `src/lib/metadadosFlatten.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getByPath, setByPath } from './metadadosFlatten';

describe('getByPath', () => {
  const obj = {
    dados_basicos: { titulo: 'X', coautores: ['A', 'B'] },
    dados_editoriais: { dimensoes_cm: { largura: 14 } },
  };

  it('lê path simples', () => {
    expect(getByPath(obj, 'dados_basicos.titulo')).toBe('X');
  });

  it('lê path aninhado', () => {
    expect(getByPath(obj, 'dados_editoriais.dimensoes_cm.largura')).toBe(14);
  });

  it('retorna undefined para path inexistente', () => {
    expect(getByPath(obj, 'dados_basicos.nao_existe')).toBeUndefined();
  });

  it('retorna undefined para objeto null no meio do path', () => {
    expect(getByPath({ a: null }, 'a.b')).toBeUndefined();
  });

  it('lê array inteiro', () => {
    expect(getByPath(obj, 'dados_basicos.coautores')).toEqual(['A', 'B']);
  });
});

describe('setByPath', () => {
  it('seta valor primitivo em path simples retornando nova ref', () => {
    const obj = { dados_basicos: { titulo: 'X' } };
    const r = setByPath(obj, 'dados_basicos.titulo', 'Y');
    expect(r).not.toBe(obj);
    expect(r.dados_basicos).not.toBe(obj.dados_basicos);
    expect(r.dados_basicos.titulo).toBe('Y');
    expect(obj.dados_basicos.titulo).toBe('X');
  });

  it('seta valor em path aninhado', () => {
    const obj = { a: { b: { c: 1 } } };
    const r = setByPath(obj, 'a.b.c', 99);
    expect(r.a.b.c).toBe(99);
    expect(obj.a.b.c).toBe(1);
  });

  it('cria estrutura intermediária se faltar', () => {
    const obj = { a: {} };
    const r = setByPath(obj, 'a.b.c', 5);
    expect(r.a.b.c).toBe(5);
  });

  it('seta array', () => {
    const obj = { a: { b: [1, 2] } };
    const r = setByPath(obj, 'a.b', [3, 4, 5]);
    expect(r.a.b).toEqual([3, 4, 5]);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

```bash
npx vitest run src/lib/metadadosFlatten.test.ts
```

Esperado: FAIL com "Cannot find module './metadadosFlatten'".

- [ ] **Step 3: Implementar**

Em `src/lib/metadadosFlatten.ts`:

```ts
export function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

export function setByPath<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const last = keys.pop();
  if (!last) return obj;

  const clone = { ...obj } as Record<string, unknown>;
  let cursor: Record<string, unknown> = clone;
  for (const k of keys) {
    const next = cursor[k];
    const nextClone: Record<string, unknown> =
      next && typeof next === 'object' && !Array.isArray(next) ? { ...(next as Record<string, unknown>) } : {};
    cursor[k] = nextClone;
    cursor = nextClone;
  }
  cursor[last] = value;
  return clone as T;
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

```bash
npx vitest run src/lib/metadadosFlatten.test.ts
```

Esperado: PASS, 9 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/metadadosFlatten.ts src/lib/metadadosFlatten.test.ts
git commit -m "feat(metadados): adicionar getByPath/setByPath imutável com testes"
```

---

### Task 14: lib `metadadosWebhook.ts` (TDD)

**Files:**
- Create: `src/lib/metadadosWebhook.ts`
- Create: `src/lib/metadadosWebhook.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispararGeracao, regerarXlsx } from './metadadosWebhook';

describe('metadadosWebhook', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('dispararGeracao posta job_id no endpoint /gerar', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await dispararGeracao('job-1');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/metadados/gerar',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: 'job-1' }),
      })
    );
  });

  it('dispararGeracao lança se resposta não-ok', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response('boom', { status: 500 }));
    await expect(dispararGeracao('job-1')).rejects.toThrow(/500/);
  });

  it('regerarXlsx retorna a url da resposta', async () => {
    const url = 'https://example.com/file.xlsx?token=abc';
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ url }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    await expect(regerarXlsx('job-2')).resolves.toBe(url);
  });

  it('regerarXlsx lança se url não vier no body', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    );
    await expect(regerarXlsx('job-2')).rejects.toThrow(/url/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run src/lib/metadadosWebhook.test.ts
```

Esperado: FAIL.

- [ ] **Step 3: Implementar**

```ts
const BASE = 'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/metadados';

async function postJson(path: string, body: unknown): Promise<unknown> {
  const resp = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`Webhook ${path} respondeu ${resp.status}`);
  }
  const text = await resp.text();
  return text ? JSON.parse(text) : {};
}

export async function dispararGeracao(jobId: string): Promise<void> {
  await postJson('gerar', { job_id: jobId });
}

export async function regerarXlsx(jobId: string): Promise<string> {
  const r = await postJson('regerar-xlsx', { job_id: jobId }) as { url?: string };
  if (!r.url) throw new Error('Webhook regerar-xlsx não retornou url');
  return r.url;
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npx vitest run src/lib/metadadosWebhook.test.ts
```

Esperado: PASS, 4 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/metadadosWebhook.ts src/lib/metadadosWebhook.test.ts
git commit -m "feat(metadados): adicionar wrappers de webhook gerar/regerar-xlsx"
```

---

### Task 15: lib `metadadosCampos.ts` (declaração de campos por seção)

**Files:**
- Create: `src/lib/metadadosCampos.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
export type TipoCampo = 'texto' | 'texto_longo' | 'numero' | 'lista_texto' | 'select';

export interface DefinicaoCampo {
  path: string;
  label: string;
  tipo: TipoCampo;
  opcoes?: string[];
  placeholder?: string;
}

export const CAMPOS_DADOS_BASICOS: DefinicaoCampo[] = [
  { path: 'dados_basicos.titulo', label: 'Título', tipo: 'texto' },
  { path: 'dados_basicos.subtitulo', label: 'Subtítulo', tipo: 'texto' },
  { path: 'dados_basicos.autor', label: 'Autor', tipo: 'texto' },
  { path: 'dados_basicos.coautores', label: 'Coautores', tipo: 'lista_texto' },
  { path: 'dados_basicos.tradutor', label: 'Tradutor', tipo: 'texto' },
  { path: 'dados_basicos.prefacio_por', label: 'Prefácio por', tipo: 'texto' },
  { path: 'dados_basicos.ilustrador', label: 'Ilustrador', tipo: 'texto' },
  { path: 'dados_basicos.idioma_original', label: 'Idioma original', tipo: 'texto' },
  { path: 'dados_basicos.idioma_publicacao', label: 'Idioma de publicação', tipo: 'texto' },
  { path: 'dados_basicos.edicao', label: 'Edição', tipo: 'texto', placeholder: '1ª edição' },
  { path: 'dados_basicos.ano_publicacao', label: 'Ano de publicação', tipo: 'numero' },
  { path: 'dados_basicos.isbn', label: 'ISBN', tipo: 'texto' },
  { path: 'dados_basicos.ean', label: 'EAN', tipo: 'texto' },
];

export const CAMPOS_DADOS_EDITORIAIS: DefinicaoCampo[] = [
  { path: 'dados_editoriais.selo', label: 'Selo', tipo: 'texto' },
  { path: 'dados_editoriais.colecao', label: 'Coleção', tipo: 'texto' },
  { path: 'dados_editoriais.formato', label: 'Formato', tipo: 'select', opcoes: ['brochura', 'capa_dura', 'ebook', 'audiolivro'] },
  { path: 'dados_editoriais.dimensoes_cm.largura', label: 'Largura (cm)', tipo: 'numero' },
  { path: 'dados_editoriais.dimensoes_cm.altura', label: 'Altura (cm)', tipo: 'numero' },
  { path: 'dados_editoriais.dimensoes_cm.lombada', label: 'Lombada (cm)', tipo: 'numero' },
  { path: 'dados_editoriais.peso_g', label: 'Peso (g)', tipo: 'numero' },
  { path: 'dados_editoriais.num_paginas', label: 'Número de páginas', tipo: 'numero' },
  { path: 'dados_editoriais.preco_capa_brl', label: 'Preço de capa (BRL)', tipo: 'numero' },
  { path: 'dados_editoriais.cdd', label: 'CDD', tipo: 'texto' },
  { path: 'dados_editoriais.cdu', label: 'CDU', tipo: 'texto' },
  { path: 'dados_editoriais.bisac', label: 'Códigos BISAC', tipo: 'lista_texto' },
  { path: 'dados_editoriais.thema', label: 'Códigos THEMA', tipo: 'lista_texto' },
  { path: 'dados_editoriais.categorias_alta_books', label: 'Categorias Alta Books', tipo: 'lista_texto' },
  { path: 'dados_editoriais.publico_alvo', label: 'Público-alvo', tipo: 'texto' },
  { path: 'dados_editoriais.faixa_etaria', label: 'Faixa etária', tipo: 'texto' },
];

export const CAMPOS_TEXTOS: DefinicaoCampo[] = [
  { path: 'textos.sinopse', label: 'Sinopse (contracapa)', tipo: 'texto_longo' },
  { path: 'textos.biografia_autor', label: 'Biografia do autor (orelha)', tipo: 'texto_longo' },
  { path: 'textos.texto_contracapa_completo', label: 'Texto completo da contracapa', tipo: 'texto_longo' },
  { path: 'textos.frases_marketing', label: 'Frases de marketing', tipo: 'lista_texto' },
  { path: 'textos.palavras_chave_seo', label: 'Palavras-chave SEO', tipo: 'lista_texto' },
  { path: 'textos.assuntos_matriz_cip', label: 'Assuntos (matriz CIP)', tipo: 'lista_texto' },
];

export const CAMPOS_RELACIONADAS: DefinicaoCampo[] = [
  { path: 'relacionadas.obras_do_autor', label: 'Obras do autor', tipo: 'lista_texto' },
  { path: 'relacionadas.livros_relacionados_catalogo_alta', label: 'Livros relacionados (catálogo Alta)', tipo: 'lista_texto' },
  { path: 'relacionadas.comparaveis_mercado', label: 'Comparáveis de mercado', tipo: 'lista_texto' },
];
```

- [ ] **Step 2: Verificar build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/metadadosCampos.ts
git commit -m "feat(metadados): adicionar definição declarativa de campos por seção"
```

---

### Task 16: hook `useUploadMetadados` (TDD)

**Files:**
- Create: `src/hooks/useUploadMetadados.ts`
- Create: `src/hooks/useUploadMetadados.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUploadMetadados } from './useUploadMetadados';

const uploadMock = vi.fn();
const removeMock = vi.fn();
const insertMock = vi.fn();
const dispararMock = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    storage: { from: () => ({ upload: uploadMock, remove: removeMock }) },
    from: () => ({ insert: insertMock }),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }) },
  },
}));

vi.mock('../lib/metadadosWebhook', () => ({
  dispararGeracao: dispararMock,
}));

function file(name: string, size: number, type: string): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe('useUploadMetadados', () => {
  beforeEach(() => {
    uploadMock.mockReset();
    removeMock.mockReset();
    insertMock.mockReset();
    dispararMock.mockReset();
    insertMock.mockReturnValue(Promise.resolve({ error: null }));
    dispararMock.mockResolvedValue(undefined);
  });

  it('sucesso: sobe 3 arquivos, INSERT job, dispara webhook, retorna jobId', async () => {
    uploadMock.mockResolvedValue({ data: {}, error: null });

    const { result } = renderHook(() => useUploadMetadados());
    let jobId = '';

    await act(async () => {
      jobId = await result.current.upload({
        capa: file('capa.pdf', 100, 'application/pdf'),
        miolo: file('miolo.pdf', 200, 'application/pdf'),
        pcp: file('pcp.xlsx', 50, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      });
    });

    expect(jobId).toMatch(/^[0-9a-f-]{36}$/);
    expect(uploadMock).toHaveBeenCalledTimes(3);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: jobId,
        capa_path: `${jobId}/capa.pdf`,
        miolo_path: `${jobId}/miolo.pdf`,
        pcp_path: `${jobId}/pcp.xlsx`,
        status: 'aguardando',
        created_by: 'user-1',
      })
    );
    expect(dispararMock).toHaveBeenCalledWith(jobId);
  });

  it('falha no 3º upload: remove os 2 anteriores e lança', async () => {
    uploadMock
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } });

    const { result } = renderHook(() => useUploadMetadados());

    await act(async () => {
      await expect(result.current.upload({
        capa: file('capa.pdf', 100, 'application/pdf'),
        miolo: file('miolo.pdf', 200, 'application/pdf'),
        pcp: file('pcp.xlsx', 50, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      })).rejects.toThrow(/boom/);
    });

    expect(removeMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.stringMatching(/\/capa\.pdf$/),
      expect.stringMatching(/\/miolo\.pdf$/),
    ]));
    expect(insertMock).not.toHaveBeenCalled();
    expect(dispararMock).not.toHaveBeenCalled();
  });

  it('valida tamanho: rejeita capa > 30MB sem chamar upload', async () => {
    const { result } = renderHook(() => useUploadMetadados());

    await act(async () => {
      await expect(result.current.upload({
        capa: file('capa.pdf', 31 * 1024 * 1024, 'application/pdf'),
        miolo: file('miolo.pdf', 200, 'application/pdf'),
        pcp: file('pcp.xlsx', 50, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      })).rejects.toThrow(/Capa.*30/);
    });

    expect(uploadMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run src/hooks/useUploadMetadados.test.ts
```

- [ ] **Step 3: Implementar**

```ts
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { dispararGeracao } from '../lib/metadadosWebhook';

const LIMITES = {
  capa: 30 * 1024 * 1024,
  miolo: 80 * 1024 * 1024,
  pcp: 5 * 1024 * 1024,
};

export interface UploadInput {
  capa: File;
  miolo: File;
  pcp: File;
}

export function useUploadMetadados() {
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState({ capa: false, miolo: false, pcp: false });

  const upload = useCallback(async (input: UploadInput): Promise<string> => {
    if (input.capa.size > LIMITES.capa) throw new Error(`Capa excede ${LIMITES.capa / (1024 * 1024)} MB`);
    if (input.miolo.size > LIMITES.miolo) throw new Error(`Miolo excede ${LIMITES.miolo / (1024 * 1024)} MB`);
    if (input.pcp.size > LIMITES.pcp) throw new Error(`PCP excede ${LIMITES.pcp / (1024 * 1024)} MB`);

    setLoading(true);
    setProgresso({ capa: false, miolo: false, pcp: false });

    const jobId = crypto.randomUUID();
    const uploaded: string[] = [];

    try {
      const passos: Array<['capa' | 'miolo' | 'pcp', File]> = [
        ['capa', input.capa],
        ['miolo', input.miolo],
        ['pcp', input.pcp],
      ];

      for (const [slot, f] of passos) {
        const ext = slot === 'pcp' ? 'xlsx' : 'pdf';
        const path = `${jobId}/${slot}.${ext}`;
        const { error } = await supabase.storage.from('metadados').upload(path, f, { upsert: false });
        if (error) throw new Error(error.message);
        uploaded.push(path);
        setProgresso(p => ({ ...p, [slot]: true }));
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { error: insertError } = await supabase.from('metadados_jobs').insert({
        id: jobId,
        capa_path: `${jobId}/capa.pdf`,
        miolo_path: `${jobId}/miolo.pdf`,
        pcp_path: `${jobId}/pcp.xlsx`,
        status: 'aguardando',
        created_by: userId,
      });
      if (insertError) throw new Error(insertError.message);

      await dispararGeracao(jobId);
      return jobId;
    } catch (err) {
      if (uploaded.length > 0) {
        await supabase.storage.from('metadados').remove(uploaded);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { upload, loading, progresso };
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
npx vitest run src/hooks/useUploadMetadados.test.ts
```

Esperado: PASS, 3 testes.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useUploadMetadados.ts src/hooks/useUploadMetadados.test.ts
git commit -m "feat(metadados): adicionar hook de upload dos 3 arquivos com rollback"
```

---

### Task 17: hook `useMetadadosJob` (single job + Realtime status-only)

**Files:**
- Create: `src/hooks/useMetadadosJob.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { MetadadosJob } from '../types/metadados';

interface State {
  job: MetadadosJob | null;
  loading: boolean;
  error: string | null;
}

export function useMetadadosJob(jobId: string | undefined): State & { refetch: () => Promise<void> } {
  const [state, setState] = useState<State>({ job: null, loading: true, error: null });

  const fetchJob = async () => {
    if (!jobId) return;
    const { data, error } = await supabase
      .from('metadados_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    if (error) {
      setState({ job: null, loading: false, error: error.message });
    } else {
      setState({ job: data as MetadadosJob, loading: false, error: null });
    }
  };

  useEffect(() => {
    if (!jobId) {
      setState({ job: null, loading: false, error: null });
      return;
    }
    setState(s => ({ ...s, loading: true }));
    fetchJob();

    const channel = supabase
      .channel(`metadados_job:${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'metadados_jobs', filter: `id=eq.${jobId}` },
        () => { fetchJob(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  return { ...state, refetch: fetchJob };
}
```

- [ ] **Step 2: Verificar build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMetadadosJob.ts
git commit -m "feat(metadados): adicionar hook de fetch + realtime de um job"
```

---

### Task 18: hook `useMetadadosJobs` (lista + Realtime)

**Files:**
- Create: `src/hooks/useMetadadosJobs.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { MetadadosJob } from '../types/metadados';

export function useMetadadosJobs() {
  const [jobs, setJobs] = useState<MetadadosJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    const { data, error } = await supabase
      .from('metadados_jobs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setJobs((data || []) as MetadadosJob[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('metadados_jobs:list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metadados_jobs' }, () => { fetchAll(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { jobs, loading, error, refetch: fetchAll };
}
```

- [ ] **Step 2: Build + commit**

```bash
npx tsc --noEmit
git add src/hooks/useMetadadosJobs.ts
git commit -m "feat(metadados): adicionar hook de listagem com realtime"
```

---

### Task 19: component `StatusBadgeMetadados`

**Files:**
- Create: `src/components/Metadados/StatusBadgeMetadados.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { Clock, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { StatusMetadados } from '../../types/metadados';

interface Props {
  status: StatusMetadados;
}

const MAP: Record<StatusMetadados, { label: string; cor: string; Icon: typeof Clock }> = {
  aguardando: { label: 'Aguardando', cor: 'bg-yellow-100 text-yellow-800', Icon: Clock },
  processando: { label: 'Processando', cor: 'bg-blue-100 text-blue-800', Icon: Loader2 },
  pronto: { label: 'Pronto', cor: 'bg-green-100 text-green-800', Icon: CheckCircle2 },
  erro: { label: 'Erro', cor: 'bg-red-100 text-red-800', Icon: AlertTriangle },
};

export function StatusBadgeMetadados({ status }: Props) {
  const { label, cor, Icon } = MAP[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${cor}`}>
      <Icon className={`w-3 h-3 ${status === 'processando' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npx tsc --noEmit
mkdir -p src/components/Metadados
git add src/components/Metadados/StatusBadgeMetadados.tsx
git commit -m "feat(metadados): adicionar StatusBadge da feature"
```

---

### Task 20: component `CampoComAlerta`

**Files:**
- Create: `src/components/Metadados/CampoComAlerta.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { Info, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { AlertaMetadados, SeveridadeAlerta } from '../../types/metadados';
import type { DefinicaoCampo } from '../../lib/metadadosCampos';
import { getByPath } from '../../lib/metadadosFlatten';

interface Props {
  campo: DefinicaoCampo;
  json: unknown;
  alertas: AlertaMetadados[];
  onChange: (path: string, valor: unknown) => void;
  disabled?: boolean;
}

const SEV_STYLES: Record<SeveridadeAlerta, { Icon: typeof Info; cor: string }> = {
  info: { Icon: Info, cor: 'text-blue-700 bg-blue-50 border-blue-200' },
  aviso: { Icon: AlertTriangle, cor: 'text-yellow-800 bg-yellow-50 border-yellow-200' },
  erro: { Icon: AlertOctagon, cor: 'text-red-800 bg-red-50 border-red-200' },
};

export function CampoComAlerta({ campo, json, alertas, onChange, disabled }: Props) {
  const valorAtual = getByPath(json, campo.path);
  const alertasDoCampo = alertas.filter(a => a.campo === campo.path);

  const handleChange = (raw: unknown) => {
    let v: unknown = raw;
    if (campo.tipo === 'numero') {
      v = raw === '' || raw === null ? null : Number(raw);
    } else if (campo.tipo === 'lista_texto') {
      v = typeof raw === 'string' ? raw.split('\n').map(s => s.trim()).filter(Boolean) : raw;
    }
    onChange(campo.path, v);
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-brand-text-main">{campo.label}</label>

      {campo.tipo === 'texto' && (
        <input
          type="text"
          className="w-full px-3 py-2 border rounded text-sm"
          value={(valorAtual as string) ?? ''}
          placeholder={campo.placeholder}
          disabled={disabled}
          onChange={e => handleChange(e.target.value)}
        />
      )}

      {campo.tipo === 'numero' && (
        <input
          type="number"
          className="w-full px-3 py-2 border rounded text-sm"
          value={(valorAtual as number | null) ?? ''}
          disabled={disabled}
          onChange={e => handleChange(e.target.value)}
        />
      )}

      {campo.tipo === 'texto_longo' && (
        <textarea
          rows={4}
          className="w-full px-3 py-2 border rounded text-sm"
          value={(valorAtual as string) ?? ''}
          disabled={disabled}
          onChange={e => handleChange(e.target.value)}
        />
      )}

      {campo.tipo === 'lista_texto' && (
        <textarea
          rows={3}
          className="w-full px-3 py-2 border rounded text-sm font-mono"
          value={Array.isArray(valorAtual) ? (valorAtual as string[]).join('\n') : ''}
          disabled={disabled}
          placeholder="Um item por linha"
          onChange={e => handleChange(e.target.value)}
        />
      )}

      {campo.tipo === 'select' && (
        <select
          className="w-full px-3 py-2 border rounded text-sm"
          value={(valorAtual as string) ?? ''}
          disabled={disabled}
          onChange={e => handleChange(e.target.value)}
        >
          <option value="">—</option>
          {campo.opcoes?.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )}

      {alertasDoCampo.map((a, i) => {
        const { Icon, cor } = SEV_STYLES[a.severidade];
        return (
          <div key={i} className={`flex items-start gap-2 text-xs px-2 py-1 rounded border ${cor}`}>
            <Icon className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{a.mensagem}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npx tsc --noEmit
git add src/components/Metadados/CampoComAlerta.tsx
git commit -m "feat(metadados): adicionar CampoComAlerta polimórfico"
```

---

### Task 21: component `SecaoColapsavel` + `FormMetadados`

**Files:**
- Create: `src/components/Metadados/SecaoColapsavel.tsx`
- Create: `src/components/Metadados/FormMetadados.tsx`

- [ ] **Step 1: Criar `SecaoColapsavel`**

```tsx
import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  titulo: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function SecaoColapsavel({ titulo, children, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border rounded-lg bg-white">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <h3 className="font-semibold text-brand-text-main">{titulo}</h3>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </section>
  );
}
```

- [ ] **Step 2: Criar `FormMetadados`**

```tsx
import { useState, useEffect } from 'react';
import type { MetadadosJSON, AlertaMetadados } from '../../types/metadados';
import { setByPath } from '../../lib/metadadosFlatten';
import {
  CAMPOS_DADOS_BASICOS,
  CAMPOS_DADOS_EDITORIAIS,
  CAMPOS_TEXTOS,
  CAMPOS_RELACIONADAS,
  type DefinicaoCampo,
} from '../../lib/metadadosCampos';
import { CampoComAlerta } from './CampoComAlerta';
import { SecaoColapsavel } from './SecaoColapsavel';

interface Props {
  jsonInicial: MetadadosJSON;
  alertas: AlertaMetadados[];
  onChange: (json: MetadadosJSON, dirty: boolean) => void;
}

export function FormMetadados({ jsonInicial, alertas, onChange }: Props) {
  const [local, setLocal] = useState<MetadadosJSON>(jsonInicial);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLocal(jsonInicial);
    setDirty(false);
  }, [jsonInicial]);

  const handleField = (path: string, valor: unknown) => {
    const novo = setByPath(local as unknown as Record<string, unknown>, path, valor) as unknown as MetadadosJSON;
    setLocal(novo);
    setDirty(true);
    onChange(novo, true);
  };

  const renderCampos = (lista: DefinicaoCampo[]) =>
    lista.map(campo => (
      <CampoComAlerta
        key={campo.path}
        campo={campo}
        json={local}
        alertas={alertas}
        onChange={handleField}
      />
    ));

  return (
    <div className="space-y-4">
      <SecaoColapsavel titulo="Dados básicos">{renderCampos(CAMPOS_DADOS_BASICOS)}</SecaoColapsavel>
      <SecaoColapsavel titulo="Dados editoriais">{renderCampos(CAMPOS_DADOS_EDITORIAIS)}</SecaoColapsavel>
      <SecaoColapsavel titulo="Textos">{renderCampos(CAMPOS_TEXTOS)}</SecaoColapsavel>
      <SecaoColapsavel titulo="Relacionadas">{renderCampos(CAMPOS_RELACIONADAS)}</SecaoColapsavel>
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
npx tsc --noEmit
git add src/components/Metadados/SecaoColapsavel.tsx src/components/Metadados/FormMetadados.tsx
git commit -m "feat(metadados): adicionar FormMetadados com 4 seções colapsáveis"
```

---

### Task 22: component `BotaoSalvarSticky`

**Files:**
- Create: `src/components/Metadados/BotaoSalvarSticky.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { Save, Download } from 'lucide-react';

interface Props {
  dirty: boolean;
  salvando: boolean;
  baixando: boolean;
  onSalvar: () => void;
  onBaixar: () => void;
}

export function BotaoSalvarSticky({ dirty, salvando, baixando, onSalvar, onBaixar }: Props) {
  return (
    <div className="sticky bottom-0 bg-white border-t shadow-md px-4 py-3 flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onSalvar}
        disabled={!dirty || salvando}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors ${
          dirty
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Save className="w-4 h-4" />
        {salvando ? 'Salvando…' : dirty ? 'Salvar alterações' : 'Tudo salvo'}
      </button>
      <button
        type="button"
        onClick={onBaixar}
        disabled={baixando}
        className="inline-flex items-center gap-2 px-4 py-2 rounded font-medium bg-brand-primary text-black hover:bg-brand-hover disabled:opacity-60"
      >
        <Download className="w-4 h-4" />
        {baixando ? 'Gerando xlsx…' : 'Baixar BookInfo'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npx tsc --noEmit
git add src/components/Metadados/BotaoSalvarSticky.tsx
git commit -m "feat(metadados): adicionar botão sticky de salvar + baixar"
```

---

### Task 23: component `NovaGeracaoModal`

**Files:**
- Create: `src/components/Metadados/NovaGeracaoModal.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { useState } from 'react';
import { X, FileText, FileSpreadsheet } from 'lucide-react';
import { useUploadMetadados } from '../../hooks/useUploadMetadados';

interface Props {
  open: boolean;
  onClose: () => void;
  onSucesso: (jobId: string) => void;
}

export function NovaGeracaoModal({ open, onClose, onSucesso }: Props) {
  const [capa, setCapa] = useState<File | null>(null);
  const [miolo, setMiolo] = useState<File | null>(null);
  const [pcp, setPcp] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { upload, loading, progresso } = useUploadMetadados();

  if (!open) return null;

  const podeEnviar = capa && miolo && pcp && !loading;

  const submit = async () => {
    if (!capa || !miolo || !pcp) return;
    setErro(null);
    try {
      const id = await upload({ capa, miolo, pcp });
      onSucesso(id);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Falha no upload');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold">Nova geração de metadados</h2>
          <button onClick={onClose} disabled={loading}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-4">
          <FileSlot
            label="Capa aberta (PDF, máx 30MB)"
            icon={<FileText className="w-4 h-4" />}
            accept="application/pdf"
            value={capa}
            onChange={setCapa}
            done={progresso.capa}
            disabled={loading}
          />
          <FileSlot
            label="Miolo (PDF, máx 80MB)"
            icon={<FileText className="w-4 h-4" />}
            accept="application/pdf"
            value={miolo}
            onChange={setMiolo}
            done={progresso.miolo}
            disabled={loading}
          />
          <FileSlot
            label="Tabela PCP (.xlsx, máx 5MB)"
            icon={<FileSpreadsheet className="w-4 h-4" />}
            accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            value={pcp}
            onChange={setPcp}
            done={progresso.pcp}
            disabled={loading}
          />

          {erro && <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">{erro}</div>}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <button onClick={onClose} disabled={loading} className="px-3 py-1.5 rounded border">Cancelar</button>
          <button
            onClick={submit}
            disabled={!podeEnviar}
            className="px-3 py-1.5 rounded bg-brand-primary text-black font-medium disabled:opacity-50"
          >
            {loading ? 'Enviando…' : 'Gerar metadados →'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SlotProps {
  label: string;
  icon: React.ReactNode;
  accept: string;
  value: File | null;
  onChange: (f: File | null) => void;
  done: boolean;
  disabled: boolean;
}

function FileSlot({ label, icon, accept, value, onChange, done, disabled }: SlotProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-2 px-3 py-2 border rounded cursor-pointer hover:bg-gray-50">
          {icon}
          <span className="text-sm">Selecionar arquivo</span>
          <input
            type="file"
            className="hidden"
            accept={accept}
            disabled={disabled}
            onChange={e => onChange(e.target.files?.[0] || null)}
          />
        </label>
        {value && <span className="text-sm text-gray-600 truncate">{value.name}</span>}
        {done && <span className="text-xs text-green-700">✓ enviado</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npx tsc --noEmit
git add src/components/Metadados/NovaGeracaoModal.tsx
git commit -m "feat(metadados): adicionar modal de nova geração com 3 slots tipados"
```

---

### Task 24: component `MetadadosCard`

**Files:**
- Create: `src/components/Metadados/MetadadosCard.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { Link } from 'react-router-dom';
import type { MetadadosJob } from '../../types/metadados';
import { StatusBadgeMetadados } from './StatusBadgeMetadados';

interface Props {
  job: MetadadosJob;
}

export function MetadadosCard({ job }: Props) {
  const titulo = job.titulo || (job.status === 'pronto' ? 'Sem título' : 'Em processamento');
  const qtdAlertas = job.alertas?.length ?? 0;

  return (
    <Link
      to={`/metadados/${job.id}`}
      className="block bg-white border rounded-lg p-4 hover:shadow transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-brand-text-main truncate">{titulo}</h3>
          {job.autor && <p className="text-sm text-brand-text-body truncate">por {job.autor}</p>}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-600">
            {job.selo && <span>{job.selo}</span>}
            {job.isbn && <span>ISBN {job.isbn}</span>}
            <span>{new Date(job.created_at).toLocaleDateString('pt-BR')}</span>
            {qtdAlertas > 0 && <span className="text-yellow-700">⚠ {qtdAlertas} alerta(s)</span>}
          </div>
        </div>
        <StatusBadgeMetadados status={job.status} />
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npx tsc --noEmit
git add src/components/Metadados/MetadadosCard.tsx
git commit -m "feat(metadados): adicionar card da listagem"
```

---

### Task 25: page `Metadados/Listagem`

**Files:**
- Create: `src/pages/Metadados/Listagem.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { TopBar } from '../../components/TopBar';
import { SearchBar } from '../../components/SearchBar';
import { useMetadadosJobs } from '../../hooks/useMetadadosJobs';
import { MetadadosCard } from '../../components/Metadados/MetadadosCard';
import { NovaGeracaoModal } from '../../components/Metadados/NovaGeracaoModal';
import { useNavigate } from 'react-router-dom';

export function MetadadosListagem() {
  const { jobs, loading } = useMetadadosJobs();
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const nav = useNavigate();

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(j =>
      [j.titulo, j.autor, j.isbn, j.selo].filter(Boolean).some(s => s!.toLowerCase().includes(q))
    );
  }, [jobs, busca]);

  return (
    <div className="min-h-screen bg-brand-bg-section">
      <TopBar />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-serif text-brand-text-main">Metadados</h1>
          <button
            onClick={() => setModalAberto(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-brand-primary text-black font-medium hover:bg-brand-hover"
          >
            <Plus className="w-4 h-4" /> Nova geração
          </button>
        </div>

        <SearchBar value={busca} onChange={setBusca} placeholder="Buscar por título, autor, ISBN ou selo…" />

        {loading && <p className="text-sm text-gray-500">Carregando…</p>}
        {!loading && filtrados.length === 0 && (
          <p className="text-sm text-gray-500">Nenhum projeto de metadados ainda. Clique em "Nova geração".</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtrados.map(j => <MetadadosCard key={j.id} job={j} />)}
        </div>
      </main>

      <NovaGeracaoModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onSucesso={id => { setModalAberto(false); nav(`/metadados/${id}`); }}
      />
    </div>
  );
}
```

> **Atenção:** `<SearchBar>` precisa aceitar `value` controlado + `onChange(value: string)`. Verificar a assinatura existente em `src/components/SearchBar.tsx`; se for diferente, adaptar o uso aqui (ou refatorar SearchBar). Não criar SearchBar nova.

- [ ] **Step 2: Verificar assinatura de `SearchBar`**

```bash
grep -n "interface\|function\|export\|Props" src/components/SearchBar.tsx | head -10
```

Se a API for diferente (ex: `searchQuery/setSearchQuery`), ajustar o uso em Listagem para casar com a existente. Não modificar SearchBar.

- [ ] **Step 3: Build + commit**

```bash
mkdir -p src/pages/Metadados
npx tsc --noEmit
git add src/pages/Metadados/Listagem.tsx
git commit -m "feat(metadados): adicionar página de listagem com busca e modal"
```

---

### Task 26: page `Metadados/Detalhe`

**Files:**
- Create: `src/pages/Metadados/Detalhe.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { TopBar } from '../../components/TopBar';
import { supabase } from '../../lib/supabase';
import { useMetadadosJob } from '../../hooks/useMetadadosJob';
import { dispararGeracao, regerarXlsx } from '../../lib/metadadosWebhook';
import { FormMetadados } from '../../components/Metadados/FormMetadados';
import { BotaoSalvarSticky } from '../../components/Metadados/BotaoSalvarSticky';
import { StatusBadgeMetadados } from '../../components/Metadados/StatusBadgeMetadados';
import type { MetadadosJSON } from '../../types/metadados';

export function MetadadosDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { job, loading, refetch } = useMetadadosJob(id);
  const [localJson, setLocalJson] = useState<MetadadosJSON | null>(null);
  const [dirty, setDirty] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    if (job?.metadados_json) {
      setLocalJson(job.metadados_json);
      setDirty(false);
    }
  }, [job?.metadados_json]);

  const minutosProcessando =
    job?.status === 'processando' ? (Date.now() - new Date(job.updated_at).getTime()) / 60000 : 0;
  const travado = minutosProcessando > 5;

  const salvar = useCallback(async () => {
    if (!id || !localJson) return;
    setSalvando(true);
    try {
      await supabase.from('metadados_jobs').update({ metadados_json: localJson }).eq('id', id);
      setDirty(false);
    } finally {
      setSalvando(false);
    }
  }, [id, localJson]);

  const baixar = useCallback(async () => {
    if (!id) return;
    setBaixando(true);
    try {
      if (dirty) await salvar();
      const url = await regerarXlsx(id);
      window.open(url, '_blank');
    } finally {
      setBaixando(false);
    }
  }, [id, dirty, salvar]);

  const tentarDeNovo = useCallback(async () => {
    if (!id) return;
    await supabase.from('metadados_jobs').update({ status: 'aguardando', erro_mensagem: null }).eq('id', id);
    await dispararGeracao(id);
    await refetch();
  }, [id, refetch]);

  if (loading) return <div className="min-h-screen"><TopBar /><div className="p-6">Carregando…</div></div>;
  if (!job) return <div className="min-h-screen"><TopBar /><div className="p-6">Job não encontrado.</div></div>;

  return (
    <div className="min-h-screen bg-brand-bg-section flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-serif text-brand-text-main">{job.titulo || 'Metadados em processamento'}</h1>
            {job.autor && <p className="text-sm text-brand-text-body">por {job.autor}</p>}
          </div>
          <StatusBadgeMetadados status={job.status} />
        </header>

        {(job.status === 'aguardando' || job.status === 'processando') && (
          <div className="bg-white border rounded p-6 text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-sm text-gray-600">
              {job.status === 'aguardando' ? 'Aguardando início do processamento…' : 'Extraindo metadados com o Gemini…'}
            </p>
            {travado && (
              <button onClick={tentarDeNovo} className="inline-flex items-center gap-2 text-sm text-blue-700 underline">
                <RefreshCw className="w-3 h-3" /> Job parece travado há mais de 5min. Reiniciar processamento.
              </button>
            )}
          </div>
        )}

        {job.status === 'erro' && (
          <div className="bg-red-50 border border-red-200 rounded p-4 space-y-2">
            <p className="text-sm text-red-800 font-medium">Falha ao gerar metadados</p>
            {job.erro_mensagem && <p className="text-sm text-red-700">{job.erro_mensagem}</p>}
            <button onClick={tentarDeNovo} className="px-3 py-1.5 rounded bg-red-600 text-white text-sm">
              Tentar de novo
            </button>
          </div>
        )}

        {job.status === 'pronto' && localJson && (
          <FormMetadados
            jsonInicial={localJson}
            alertas={job.alertas || []}
            onChange={(novo, isDirty) => { setLocalJson(novo); setDirty(isDirty); }}
          />
        )}
      </main>

      {job.status === 'pronto' && (
        <BotaoSalvarSticky dirty={dirty} salvando={salvando} baixando={baixando} onSalvar={salvar} onBaixar={baixar} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npx tsc --noEmit
git add src/pages/Metadados/Detalhe.tsx
git commit -m "feat(metadados): adicionar página de detalhe com form + sticky bar"
```

---

### Task 26.5: Banner de ISBN duplicado no Detalhe

**Files:**
- Modify: `src/pages/Metadados/Detalhe.tsx`

O n8n grava um alerta `severidade='aviso', campo='dados_basicos.isbn', mensagem='Já existe outra geração com este ISBN (job <id>)…'` quando detecta duplicidade. O Detalhe precisa renderizar um banner com 2 ações: apagar o outro job + arquivos do Storage, ou dispensar o alerta.

- [ ] **Step 1: Extrair o `outro_id` da mensagem do alerta**

A `mensagem` do alerta tem o formato literal `Já existe outra geração com este ISBN (job <uuid>).`. Extrair via regex:

```ts
function extrairOutroJobId(msg: string | undefined): string | null {
  if (!msg) return null;
  const m = msg.match(/job ([0-9a-f-]{36})/i);
  return m?.[1] ?? null;
}
```

- [ ] **Step 2: Adicionar handlers ao `Detalhe.tsx`**

Logo após `tentarDeNovo`:

```ts
const apagarDuplicado = useCallback(async (outroId: string) => {
  // Remove arquivos do Storage (best-effort)
  const paths = [`${outroId}/capa.pdf`, `${outroId}/miolo.pdf`, `${outroId}/pcp.xlsx`, `${outroId}/bookinfo.xlsx`];
  await supabase.storage.from('metadados').remove(paths);
  // DELETE no banco (RLS bloqueia se o usuário não for dono nem admin)
  await supabase.from('metadados_jobs').delete().eq('id', outroId);
  // Limpar o alerta deste job
  if (job) {
    const novosAlertas = (job.alertas || []).filter(a => !(a.campo === 'dados_basicos.isbn' && a.mensagem.includes('outra geração')));
    await supabase.from('metadados_jobs').update({ alertas: novosAlertas }).eq('id', job.id);
  }
  await refetch();
}, [job, refetch]);

const manterAmbos = useCallback(async () => {
  if (!job) return;
  const novosAlertas = (job.alertas || []).filter(a => !(a.campo === 'dados_basicos.isbn' && a.mensagem.includes('outra geração')));
  await supabase.from('metadados_jobs').update({ alertas: novosAlertas }).eq('id', job.id);
  await refetch();
}, [job, refetch]);

const alertaDup = job?.alertas?.find(a => a.campo === 'dados_basicos.isbn' && a.mensagem.includes('outra geração'));
const outroJobId = extrairOutroJobId(alertaDup?.mensagem);
```

- [ ] **Step 3: Renderizar o banner**

Dentro do `<main>`, antes do bloco condicional `status === 'pronto' && localJson` (de modo que aparece mesmo quando o form está sendo mostrado):

```tsx
{alertaDup && outroJobId && (
  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 space-y-2">
    <p className="text-sm text-yellow-900">{alertaDup.mensagem}</p>
    <div className="flex gap-2">
      <button
        onClick={() => apagarDuplicado(outroJobId)}
        className="px-3 py-1.5 text-sm rounded bg-red-600 text-white"
      >
        Apagar versão anterior
      </button>
      <button
        onClick={manterAmbos}
        className="px-3 py-1.5 text-sm rounded border bg-white"
      >
        Manter ambos
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verificar build e smoke**

```bash
npx tsc --noEmit
```

Smoke manual: criar dois jobs com o mesmo ISBN (via SQL ou rodando 2x o gerar). Detalhe do 2º job deve mostrar o banner.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Metadados/Detalhe.tsx
git commit -m "feat(metadados): adicionar banner de ISBN duplicado com 2 ações"
```

---

### Task 27: Adicionar módulo `metadados` em `permissions.ts` + item no menu

**Files:**
- Modify: `src/lib/permissions.ts:10-14`
- Modify: `src/components/TopBar.tsx`

- [ ] **Step 1: Editar `permissions.ts`**

```ts
export const MODULES: readonly Module[] = [
  { slug: 'ghostwriter',  label: 'Projetos (Livros)' },
  { slug: 'agente_verde', label: 'Agente Verde' },
  { slug: 'metadados',    label: 'Gerador de Metadados' },
  { slug: 'admin',        label: 'Administrador' },
] as const
```

- [ ] **Step 2: Editar `TopBar.tsx`**

Ler primeiro as linhas 40-80 do arquivo. Logo após o item de `agente_verde` (~linha 55), adicionar um item análogo:

```tsx
{modules.has('metadados') && (
  <NavLink to="/metadados" className={...mesmo className dos outros...}>
    Metadados
  </NavLink>
)}
```

(Adaptar para a estrutura exata do `TopBar.tsx`; reusar o padrão já presente.)

- [ ] **Step 3: Build + commit**

```bash
npx tsc --noEmit
git add src/lib/permissions.ts src/components/TopBar.tsx
git commit -m "feat(metadados): adicionar slug 'metadados' ao catálogo e menu"
```

---

### Task 28: Rotas em `App.tsx`

**Files:**
- Modify: `src/App.tsx:29-41`

- [ ] **Step 1: Ler `App.tsx` para conferir importações e padrão**

```bash
sed -n '1,50p' src/App.tsx
```

- [ ] **Step 2: Adicionar imports e rotas**

No topo, após os imports existentes:

```tsx
import { MetadadosListagem } from './pages/Metadados/Listagem';
import { MetadadosDetalhe } from './pages/Metadados/Detalhe';
```

Após a rota `agente_verde/:projetoId`:

```tsx
<Route path="/metadados" element={<ModuleRoute slug="metadados"><MetadadosListagem /></ModuleRoute>} />
<Route path="/metadados/:id" element={<ModuleRoute slug="metadados"><MetadadosDetalhe /></ModuleRoute>} />
```

- [ ] **Step 3: Verificar build e dev server**

```bash
npx tsc --noEmit
npm run dev
```

Abrir browser em `http://localhost:5173/metadados`. Esperado: tela de listagem vazia ("Nenhum projeto de metadados ainda"). Botão "Nova geração" abre modal.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(metadados): adicionar rotas /metadados e /metadados/:id"
```

---

## Fase 4 — Smoke E2E e docs

### Task 29: Smoke E2E com Tecendo Prata

**Files:**
- nenhum (teste manual no browser)

- [ ] **Step 1: Garantir Fase 1 + Fase 2 aplicadas**

```sql
select status from public.metadados_jobs where id = '<UUID da Task 10>';
```

Esperado: `pronto` (caso já tenha rodado na Task 10). Se quiser repetir do zero: criar UUID novo.

- [ ] **Step 2: Login no app como `bessalfs@gmail.com`**

`npm run dev` → http://localhost:5173/auth/login.

- [ ] **Step 3: Navegar para `/metadados`**

Esperado: item "Metadados" no menu (porque `bessalfs` tem o slug); página carrega listando o job criado na Task 10 (se já existir).

- [ ] **Step 4: Criar novo job pela UI**

Clicar em "Nova geração" → selecionar os 3 arquivos do `~/Downloads/9786560991095_*` → clicar em "Gerar metadados". Esperado: modal fecha, navegação para `/metadados/<novo_id>`, status = `aguardando` → `processando` → `pronto` (Realtime) em < 90s.

- [ ] **Step 5: Editar um campo e salvar**

Trocar título por "Tecendo Prata (edição teste)". Botão sticky fica vermelho. Click "Salvar alterações". Botão volta a cinza.

- [ ] **Step 6: Baixar BookInfo**

Click "Baixar BookInfo". Esperado: download de `bookinfo.xlsx` em < 10s. Abrir no Excel/LibreOffice. Confirmar que o título salvo aparece na célula correspondente.

- [ ] **Step 7: Registrar resultado**

Se passou tudo: notificar o usuário no chat. Se algum passo falhou: anotar exatamente onde + screenshot + erro do console.

---

### Task 30: Atualizar docs e memória

**Files:**
- Modify: `CLAUDE.md`
- Modify (memória): `project_metadados_pivot.md` ou criar `project_metadados_estado.md`

- [ ] **Step 1: Editar `CLAUDE.md`**

Adicionar na seção "Estrutura do Projeto":
- `pages/Metadados/{Listagem,Detalhe}.tsx`
- `components/Metadados/*`
- `hooks/{useMetadadosJob,useMetadadosJobs,useUploadMetadados}.ts`
- `lib/{metadadosWebhook,metadadosFlatten,metadadosCampos}.ts`
- `types/metadados.ts`

Adicionar na seção do Supabase: tabela `metadados_jobs` + função `check_isbn_existente` + bucket `metadados`.

Adicionar na seção Webhook n8n:
- `https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/metadados/gerar`
- `https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/metadados/regerar-xlsx`

- [ ] **Step 2: Atualizar memória**

Atualizar `project_metadados_pivot.md` (ou criar `project_metadados_estado.md` substituindo o pivot):
- Remover bloco "Status do brainstorming" (todas seções aprovadas e implementadas)
- Mover decisões-chave para um arquivo `project_metadados_estado.md` (estado pós-MVP)
- Atualizar `MEMORY.md` index pra apontar pro novo arquivo

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(metadados): documentar tabelas, hooks, components, webhooks da nova feature"
```

---

## Notas finais

- **Ordem de execução obrigatória:** Fase 1 → Fase 2 → Fase 3 → Fase 4. Cada fase é testável em isolamento. Frontend rodando antes do n8n produz jobs eternamente em `aguardando` (sem quebra; só sem progresso).
- **`COLUMN_MAP` é dívida técnica:** vive duplicado entre o workflow `gerar` e `regerar-xlsx`. Mudanças no template do BookInfo exigem atualização nos dois lugares. Aceito no MVP, follow-up: extrair pra Code node compartilhado ou arquivo do Storage.
- **Sem feature flag.** Liberação por `user_modules`.
- **Critério de "pronto":** smoke E2E (Task 29) passa + um usuário interno (Cristiane/Anderson) consegue rodar 1 livro real sem ajuda.
