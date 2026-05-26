# n8n Workflows — Gerador de Metadados

JSONs prontos pra importar no editor n8n do Railway. Cobrem T6-T9 do plano `2026-05-26-metadados-mvp.md`.

## Arquitetura (atual: Edge Function ao invés de exceljs)

Como o n8n no Railway não tem `NODE_FUNCTION_ALLOW_EXTERNAL=exceljs` habilitado (e não temos acesso pra setar), o processamento de xlsx (parse PCP + geração do BookInfo) foi movido pra uma Supabase Edge Function chamada `metadados-xlsx`. O n8n só faz HTTP POST pra ela.

```
n8n Code "Parse PCP"     →  POST /functions/v1/metadados-xlsx {action: 'parse-pcp', pcp_b64}
n8n Code "Generate XLSX" →  POST /functions/v1/metadados-xlsx {action: 'generate-bookinfo', metadados_json}
```

A edge function vive em `supabase/functions/metadados-xlsx/index.ts` no repo, deployed via `mcp__plugin_supabase_supabase__deploy_edge_function`.

## Arquivos

- `gerar.json` — 19 nodes. Endpoint `POST /webhook/ghostwriter/metadados/gerar`. Body `{ job_id }`. Responde 200 imediato e processa em background.
- `regerar-xlsx.json` — 7 nodes. Endpoint `POST /webhook/ghostwriter/metadados/regerar-xlsx`. Body `{ job_id }`. Responde com `{ url }` em ~5s.

## Pré-requisitos no n8n (Railway)

### Credenciais necessárias (já existem na sua casa)

Antes de importar, garantir que essas 2 credenciais existem. **Anote o ID/nome** — você vai linkar nos nodes depois do import.

#### Credencial A — `Supabase service_role` (tipo `Supabase API`)
- **Host:** `https://tddolcrzmczvoqxkajic.supabase.co`
- **Service Role Secret:** `service_role` key

Usada por: HTTP Request nodes que falam com Supabase Storage (Download Capa/Miolo/PCP, Upload XLSX, Sign Download URL no regerar).

#### Credencial B — `Supabase Postgres (service_role)` (tipo `Postgres`)
Pooler do Supabase com role service_role (bypass RLS). Provavelmente já existe.

Usada por: todos os Postgres nodes.

#### Credencial C — `OpenRouter API` (tipo `Header Auth`)
- **Header Name:** `Authorization`
- **Header Value:** `Bearer sk-or-v1-...`

Usada por: Call OpenRouter (gerar.json apenas).

### Nada de env var

A arquitetura nova não precisa de `NODE_FUNCTION_ALLOW_EXTERNAL=exceljs` no Railway — o xlsx é processado na Edge Function do Supabase.

## Importar e configurar

1. **No editor n8n:** menu lateral → Workflows → "+ Add workflow" → "Import from File" → `gerar.json`. Repetir pra `regerar-xlsx.json`.

2. **Em cada workflow importado, abrir os nodes "credential not selected"** e selecionar:
   - Postgres nodes → `Supabase Postgres (service_role)`
   - HTTP Request com `supabaseApi` → `Supabase service_role`
   - Call OpenRouter → `OpenRouter API`

3. **Salvar** cada workflow.

4. **Ativar** (toggle "Active" no topo direito).

## Smoke (T10, opcional)

```bash
# Cria job manualmente (precisa subir 3 arquivos do Tecendo Prata em metadados/<UUID>/ antes)
curl -X POST 'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/metadados/gerar' \
  -H 'Content-Type: application/json' \
  -d '{"job_id":"<UUID>"}'
```

Esperado: 200 OK imediato. Status do job vai de `aguardando` → `processando` → `pronto` em ~60-90s.

## Topologia visual

### gerar.json (19 nodes)

```
Webhook → Get Job → Mark Processing → [3x Download em paralelo] → 2 Merges
  → Parse PCP (chama edge function)
  → Build Gemini Payload
  → Call OpenRouter
  → Validate + Extract
  → IF "Erro?" ┬→ TRUE  → Mark Error
              └→ FALSE → Check ISBN Duplicate
                          → Merge Alerts
                          → Generate XLSX (chama edge function)
                          → Upload XLSX
                          → Mark Done
```

### regerar-xlsx.json (7 nodes)

```
Webhook → Get Job JSON → Generate XLSX (edge function) → Upload XLSX → Sign URL → Touch updated_at → Respond
```

## Edge Function `metadados-xlsx`

URL: `https://tddolcrzmczvoqxkajic.supabase.co/functions/v1/metadados-xlsx`
Source: `supabase/functions/metadados-xlsx/index.ts`
Verify JWT: true (chamadas precisam de Authorization Bearer — anon ou service_role)

**Actions:**
- `parse-pcp` — body `{ action, pcp_b64 }` → retorna `{ pcp_texto, alertas_pcp }`
- `generate-bookinfo` — body `{ action, metadados_json }` → retorna `{ xlsx_b64 }`. Baixa o template `metadados/templates/bookinfo-template.xlsx` internamente via service_role.

**Redeploy:** edite `supabase/functions/metadados-xlsx/index.ts` no repo, depois `mcp__plugin_supabase_supabase__deploy_edge_function`. Versão antiga continua disponível por 2 minutos (rollout gradual).

## Quando atualizar

- **Mudou o COLUMN_MAP**: edite `supabase/functions/metadados-xlsx/index.ts` e redeploy. Não precisa mexer no n8n.
- **Mudou o Prompt v2.1**: edite `docs/superpowers/plans/metadados-prompt-v2.1.txt` e atualize a constante `PROMPT_V21` no Code node "Build Gemini Payload" do `gerar` n8n workflow.
- **Mudou o schema do `metadados_jobs`**: atualize as queries dos Postgres nodes.

## Limitações conhecidas

- **Sem retry de JSON inválido do Gemini** — vai direto pra `status='erro'`. Usuário re-dispara pela UI.
- **Anon key hardcoded** nos Code nodes que chamam a edge function. É público (já está no CLAUDE.md), aceitável.
- **PROMPT_V21 está inline** no Code node `Build Gemini Payload` (~14KB).
- **Estilos da planilha** são preservados parcialmente pelo SheetJS community (formatação básica sim; dropdowns/data validation podem perder).
- **Idempotência:** redisparar `gerar` com mesmo `job_id` é seguro.
