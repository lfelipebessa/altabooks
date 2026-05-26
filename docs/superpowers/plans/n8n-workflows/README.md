# n8n Workflows — Gerador de Metadados

JSONs prontos pra importar no editor n8n do Railway. Cobrem T6-T9 do plano `2026-05-26-metadados-mvp.md`.

## Arquivos

- `gerar.json` — 20 nodes. Endpoint `POST /webhook/ghostwriter/metadados/gerar`. Body `{ job_id }`. Responde 200 imediato e processa em background (~60-90s).
- `regerar-xlsx.json` — 8 nodes. Endpoint `POST /webhook/ghostwriter/metadados/regerar-xlsx`. Body `{ job_id }`. Responde com `{ url: signed_5min }` em ~5s.

## Pré-requisitos no n8n (Railway)

### 1. Variável de ambiente pro `exceljs`

O Code node `Generate XLSX` (e o `Parse PCP` no `gerar`) usa `require('exceljs')`. n8n bloqueia `require()` por default. Adicionar no env do container:

```
NODE_FUNCTION_ALLOW_EXTERNAL=exceljs
```

Reiniciar o n8n depois de setar. Sem isso, os Code nodes falham com "Cannot find module 'exceljs'".

### 2. Credenciais necessárias

Antes de importar, ter no n8n essas 3 credenciais. **Anote o ID/nome de cada uma** — você vai linkar nos nodes depois do import.

#### Credencial A — `Supabase service_role` (tipo `Supabase API`)
- **Host:** `https://tddolcrzmczvoqxkajic.supabase.co`
- **Service Role Secret:** o `service_role` key do projeto (Supabase Studio → Project Settings → API)

Usada por: todos os HTTP Request nodes que falam com Supabase Storage (Download Capa/Miolo/PCP/Template, Upload XLSX, Sign Download URL no regerar).

#### Credencial B — `Supabase Postgres (service_role)` (tipo `Postgres`)
- **Host:** `aws-0-sa-east-1.pooler.supabase.com` (ou o pooler que seu Supabase usa)
- **Database:** `postgres`
- **User:** `postgres.tddolcrzmczvoqxkajic`
- **Password:** o database password
- **Port:** `6543` (pooler) ou `5432` (direct)
- **SSL:** `require`

Usada por: todos os Postgres nodes (Get Job, Mark Processing, Check ISBN Duplicate, Mark Error, Mark Done, Get Job JSON, Touch updated_at).

> Se já existe uma credencial Postgres do Supabase no n8n (provavelmente sim — outros workflows usam), pode reusar essa. Confira que ela tem permissões de `service_role` (RLS bypass) — necessário porque o n8n insere/atualiza qualquer row.

#### Credencial C — `OpenRouter API` (tipo `Header Auth`)
- **Header Name:** `Authorization`
- **Header Value:** `Bearer sk-or-v1-...` (chave do OpenRouter)

Usada por: Call OpenRouter (gerar.json).

> Se já existe credencial OpenRouter pra outros flows, reusa.

## Importar e configurar

1. **No editor n8n** (`primary-production-bd3cf.up.railway.app`): menu lateral → Workflows → "+ Add workflow" → "Import from File" → escolher `gerar.json`. Repetir pra `regerar-xlsx.json`.

2. **Em cada workflow importado, abrir os nodes que têm "credential not selected"** (ficam com um aviso vermelho) e selecionar a credencial correta:
   - Postgres nodes → `Supabase Postgres (service_role)`
   - HTTP Request com `supabaseApi` → `Supabase service_role`
   - Call OpenRouter → `OpenRouter API`

3. **Salvar** cada workflow.

4. **Ativar** (toggle "Active" no topo direito). Confirma que a URL exposta é:
   - Gerar: `https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/metadados/gerar`
   - Regerar: `https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/metadados/regerar-xlsx`

## Smoke test (T10)

Após ativar, sem usar o frontend ainda:

```bash
# Criar job manualmente via SQL primeiro (subir os 3 arquivos do Tecendo Prata no Storage antes).
# Veja Task 10 do plano principal.

curl -X POST 'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/metadados/gerar' \
  -H 'Content-Type: application/json' \
  -d '{"job_id":"<UUID-DO-JOB-CRIADO>"}'
```

Esperado: 200 OK imediato. Status do job vai pra `processando`, depois `pronto` em <90s. `metadados_json` populado, `xlsx_bookinfo_path = '<UUID>/bookinfo.xlsx'`.

Pra testar o regerar:

```bash
curl -X POST 'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/metadados/regerar-xlsx' \
  -H 'Content-Type: application/json' \
  -d '{"job_id":"<UUID-DO-JOB-PRONTO>"}'
```

Esperado: resposta JSON `{ "url": "https://tddolcrzmczvoqxkajic.supabase.co/storage/v1/object/sign/..." }` em ~5s. Abrir essa URL no browser baixa o xlsx atualizado.

## Quando atualizar

- **Mudou o COLUMN_MAP** (`metadados-column-map.json`): atualize a constante `COLUMN_MAP` **nos dois workflows** (node "Generate XLSX" do gerar.json e do regerar-xlsx.json). É a única duplicação intencional.
- **Mudou o Prompt v2.1**: atualize `metadados-prompt-v2.1.txt` no repo + reimporte `gerar.json` (ou edite o jsCode do node "Build Gemini Payload" colando o novo texto entre `"const PROMPT_V21 = ` e `\n\nFORMATO DE SAÍDA OBRIGATÓRIO:`).
- **Mudou o schema do `metadados_jobs`**: atualize as queries dos Postgres nodes.

## Topologia visual

### gerar.json

```
Webhook → Get Job → Mark Processing
                  ↘ Download Capa  ─┐
                  → Download Miolo ─┤→ Merge Capa+Miolo ─┐
                  ↗ Download PCP   ────────────────────  ┤→ Merge + PCP
                                                                ↓
                                                        Parse PCP
                                                                ↓
                                                Build Gemini Payload
                                                                ↓
                                                    Call OpenRouter
                                                                ↓
                                                Validate + Extract
                                                                ↓
                                                            Erro? ─┬→ TRUE  → Mark Error
                                                                   └→ FALSE → Check ISBN Duplicate
                                                                                ↓
                                                                          Merge Alerts
                                                                                ↓
                                                                          Get Template
                                                                                ↓
                                                                          Generate XLSX
                                                                                ↓
                                                                          Upload XLSX
                                                                                ↓
                                                                          Mark Done
```

### regerar-xlsx.json

```
Webhook → Get Job JSON → Get Template → Generate XLSX → Upload XLSX → Sign Download URL → Touch updated_at → Respond
```

## Limitações e gotchas conhecidos

- **`exceljs` precisa estar allowlisted** (ver pré-requisito 1). Sem isso, falha silenciosa nos Code nodes.
- **Sem retry de JSON inválido do Gemini** no MVP — vai direto pra `status='erro'`. O usuário re-dispara pela UI (botão "Tentar de novo" já implementado em `MetadadosDetalhe`).
- **PROMPT_V21 está inline** no Code node `Build Gemini Payload` (~14KB). Se quiser atualizar, edite o jsCode no editor n8n. Repo tem o texto canônico em `docs/superpowers/plans/metadados-prompt-v2.1.txt`.
- **Coordenação dos 3 downloads**: 2 Merge nodes encadeados (Merge Capa+Miolo, Merge + PCP). Cada Merge só aceita 2 inputs em `combineByPosition`.
- **Idempotência:** redisparar `gerar` com mesmo `job_id` é seguro — o `Mark Processing` zera `erro_mensagem` e reprocessa.
- **Postgres `Mark Done`** usa operation `update` com fields tipados em vez de query raw — evita problemas de escape com vírgulas em JSON.
- **OpenRouter timeout** está 300s (5min). Se o miolo for muito grande e Gemini demorar mais, ajustar no node Call OpenRouter.

## Custo aproximado

- **Gemini 2.5 Flash via OpenRouter:** ~$0.30/Mtok input, ~$2.50/Mtok output. Um job de livro médio (capa+miolo+pcp): ~200KB input em base64, ~5KB JSON output. Custo: < $0.01 por job.
- **Supabase:** Storage egress nas 3 baixadas + 1 upload. Negligível.
