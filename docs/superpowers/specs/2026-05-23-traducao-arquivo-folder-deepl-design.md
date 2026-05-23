# Tradução de Arquivo — Suporte a Pasta + Migração para DeepL

**Status:** draft
**Data:** 2026-05-23
**Autor:** Luiz Bessa + Claude
**Contexto:** corrige bug onde criar projeto `traducao_arquivo` com URL de pasta retorna 404 silencioso e deixa projeto travado em `status='traduzindo'`. Aproveita para terminar a migração para DeepL (que ficou só no Flow 5) e adicionar seletor de idioma no modal.

---

## Problema

Ao criar um projeto do tipo `Traduzir Arquivo` colando uma URL de **pasta** do Google Drive (`drive.google.com/drive/folders/{id}`), o flow `1. [Altabooks] Transcrição de Materiais` falha em `HTTP Get Metadata Arquivo` com 404 ("The resource you are requesting could not be found"). O projeto fica eternamente em `status='traduzindo'`. Diagnóstico:

- `Code Extrair ID Arquivo Traducao` extrai o ID da pasta corretamente.
- `HTTP Get Metadata Arquivo` chama `GET /drive/v3/files/{folderId}?fields=name,mimeType` esperando arquivo único — recebe 404 (ou metadata de pasta, dependendo de credencial).
- Não há `continueOnFail` em nenhum node do branch — workflow para e projeto não é marcado como `erro`.
- Pior ainda: mesmo se o usuário colar URL de arquivo válido, a tradução usa **Gemini 3 Flash via OpenRouter** com prompt hardcoded `"Traduza... para o inglês"`. A migração para DeepL Pro (feita no Flow 5 em 2026-05-07) **não foi aplicada aqui** — gap não intencional.

Adicionalmente, o frontend manda `idioma: 'en'` hardcoded no payload, sem seletor para o usuário.

## Solução em uma frase

Detectar se o link é arquivo ou pasta; se for pasta, listar PDFs/DOCX e processar cada um como item separado de tradução; trocar o motor de tradução para DeepL; adicionar seletor de idioma no modal e per-item status no banco.

---

## Escopo

### Incluído
- Detecção `file` vs `folder` na URL (frontend valida; n8n também decide branch)
- Listagem de arquivos da pasta via pattern já usado no branch `livro` (`Search files and folders`)
- Loop sobre N arquivos da pasta, cada um vira 1 row em nova tabela `traducoes_arquivo_itens`
- Substituição de Gemini 3 Flash por DeepL Pro nas chamadas de tradução
- Seletor de idioma no modal (códigos DeepL, default `EN-US`)
- Error handling em todos HTTPs do branch (continueOnFail + UPDATE de status)
- Agregação de status do projeto após loop (`concluido` se ≥1 item ok, `erro` se 100% falharam, `erro` direto se pasta vazia)
- Seção nova na tela de detalhe do projeto listando os itens com status individual

### Fora de escopo (notas para follow-up)
- **Chunking de texto > 130KB:** DeepL Pro aceita até ~130KB por request; PDFs grandes (livro de 200 páginas) podem passar disso. MVP envia 1 request por arquivo; se quebrar na prática, implementar split por parágrafos.
- **Subpastas recursivas:** filtro `'{folderId}' in parents` lista só direct children. Subpastas são ignoradas.
- **Picker para selecionar subset:** se usuário colou pasta, traduz tudo (PDFs+DOCX). Sem checkboxes.
- **Retry de item individual:** se um arquivo falhar, atualmente é preciso refazer o projeto inteiro. Não há botão de re-tentar item.
- **Cancelamento de tradução em andamento:** não suportado.
- **OAuth Google no frontend:** mantém credencial centralizada no n8n.
- **Preservação de formatação rica:** PDFs/DOCX são extraídos como texto plano. Negrito, listas, tabelas, imagens são perdidos. (Mesmo comportamento do flow atual.)
- **Habilitar RLS na nova tabela:** segue o pattern atual (RLS desabilitado em todas tabelas de domínio). Endereçado pelo `project_security_debt` separadamente.

---

## Arquitetura

Toda a lógica de Drive (listar pasta, baixar arquivo, criar Doc) continua centralizada no n8n usando a credencial OAuth `BessaAulas AltaBooks`. Frontend só valida URL, oferece select de idioma e exibe resultado. Sem novos endpoints, sem novas credenciais, sem novos serviços.

### Componentes alterados
1. **Frontend** (`src/components/CreateProjectModal.tsx`): validação de URL + select de idioma + hint contextual + payload com `idioma`
2. **Frontend** (`src/types.ts`): novo tipo `TraducaoArquivoItem`
3. **Frontend** (`src/pages/DetalheProjeto.tsx`): nova seção para listar itens quando `projeto.tipo === 'traducao_arquivo'`
4. **n8n** (flow `1. [Altabooks] Transcrição de Materiais`, branch `Traducaoarquivo`): refactor completo conforme diagrama abaixo
5. **Banco** (Supabase): nova tabela `traducoes_arquivo_itens` + trigger `updated_at`

### Componentes não alterados
- Webhook URL (`/webhook/ghostwriter/processar`) — mesma rota
- Branches `livro` e `do_executivo` do Switch principal
- Tabela `projetos` (status já aceita `traduzindo/concluido/erro`)
- Tabela `traducoes` e `capitulos_traducao` (uso separado: tradução de livros gerados pela plataforma)
- Pipeline de extração de texto (PDF via `Extrair Texto PDF`, DOCX via copy→export-text)

---

## Frontend

### `src/components/CreateProjectModal.tsx`

**Validação de URL** (no `handleSubmit`, antes do fetch):

```ts
const DRIVE_URL_REGEX = /^https?:\/\/drive\.google\.com\/(file\/d\/([-\w]{20,})|drive\/(?:u\/\d+\/)?folders\/([-\w]{20,}))/;

const match = driveLink.match(DRIVE_URL_REGEX);
if (tipo === 'traducao_arquivo' && !match) {
  setError('Use um link de arquivo (/file/d/) ou pasta (/drive/folders/) do Google Drive.');
  return;
}
const isFolder = !!match?.[3];
```

**Hint contextual** abaixo do input quando `tipo === 'traducao_arquivo'` e URL casa com `/drive/folders/`:

> *"Pasta detectada — todos os PDFs e Word dentro serão traduzidos."*

**Select de idioma** (novo bloco quando `tipo === 'traducao_arquivo'`):

```tsx
import { IDIOMAS_TRADUCAO } from '../lib/idiomas';

const [idioma, setIdioma] = useState<string>('EN-US');

// JSX:
<div>
  <label className="...">Idioma da tradução *</label>
  <select value={idioma} onChange={(e) => setIdioma(e.target.value)} disabled={loading} className="...">
    {IDIOMAS_TRADUCAO.map(({ codigo, label }) => (
      <option key={codigo} value={codigo}>{label}</option>
    ))}
  </select>
</div>
```

**Payload atualizado** (substitui a linha 80):

```ts
{ ...base, driveLink, tipo: 'traducao_arquivo', idioma }
```

(remove `idioma: 'en'` hardcoded antigo)

### `src/types.ts`

Adicionar:

```ts
export interface TraducaoArquivoItem {
  id: string
  projeto_id: string
  drive_file_id: string
  nome_arquivo: string
  tipo_arquivo: 'pdf' | 'docx'
  idioma: string
  drive_url_traduzido: string | null
  status: 'pendente' | 'traduzindo' | 'concluido' | 'erro'
  mensagem_erro: string | null
  created_at: string
  updated_at: string | null
}
```

### `src/pages/DetalheProjeto.tsx`

Nova seção (renderiza somente quando `projeto.tipo === 'traducao_arquivo'`):

- Fetch `traducoes_arquivo_itens` com `select('*').eq('projeto_id', id).order('created_at')`
- Realtime subscription opcional na mesma tabela (segue o pattern já usado em outras seções; se for caro, deixa para follow-up)
- Cada item renderiza: `nome_arquivo` + idioma + `StatusBadge` + link "Abrir tradução" quando `concluido` + texto da `mensagem_erro` quando `erro`

---

## n8n — branch `Traducaoarquivo`

### Topologia nova

```
Insert Traducao Arquivo (status='aguardando')      [edit: tira 'traduzindo' do insert, vira 'aguardando']
       ↓
Code Detectar Tipo URL                              [NOVO]
   { isFolder: bool, id: string, idioma: string, projetoId: string, nomeProjeto: string }
       ↓
Switch isFolder?                                    [NOVO]
  ├── TRUE  (folder):
  │      Search files and folders                   [NOVO — copia config do branch livro]
  │        query: "'{{ folderId }}' in parents and trashed=false
  │                and (mimeType='application/pdf'
  │                  or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document')"
  │      ↓
  │      IF Empty? (returnAll vazio)                [NOVO]
  │        TRUE  → UPDATE projetos status='erro', terminar
  │        FALSE → UPDATE projetos status='traduzindo' → Merge
  │
  └── FALSE (file):
         HTTP Get Metadata Arquivo                  [reuso — fileId vem do detect, retorna name + mimeType]
         ↓
         Code Format Single Item                    [NOVO — array com 1 item compatível com Search]
         ↓
         UPDATE projetos status='traduzindo' → Merge
       ↓
Loop Over Items (Split In Batches, 1 por vez)       [NOVO]
       ↓
Code Tipo Arquivo                                   [NOVO — pdf | docx pela extensão]
       ↓
Insert traducoes_arquivo_itens (status='traduzindo') [NOVO; retorna id do item]
       ↓
Switch Tipo Arquivo (PDF / DOCX)                    [reuso do existente, renomeado]
  ├── PDF:
  │     Download PDF Traducao                       [reuso, mas fileId vem do Loop, não do Code Extrair]
  │     ↓ continueOnFail
  │     Extrair Texto PDF Traducao                  [reuso]
  │     ↓
  │     Preparar Texto PDF                          [edit — pega projetoId, itemId, idioma do contexto]
  │     ↓
  │     HTTP DeepL Traduzir                         [NOVO — substitui HTTP Traduzir PDF]
  │     ↓ continueOnFail
  │     HTTP Criar Doc Traducao PDF                 [edit — nome inclui idioma]
  │     ↓ continueOnFail
  │     HTTP Preencher Doc Traducao PDF             [reuso, mas pega text do DeepL]
  │     ↓ continueOnFail
  │     UPDATE traducoes_arquivo_itens (concluido + drive_url_traduzido)  [NOVO; substitui Postgres Concluir Traducao PDF]
  │
  └── DOCX: análogo ao PDF, reusando nodes de copy/download/extract DOCX existentes
       ↓
Code Aggregate Erros                                 [NOVO — se algum HTTP falhou no item, UPDATE item status='erro' + msg]
       ↓
Loop (volta)
       ↓
[Após loop]
Code Aggregate Projeto Status                        [NOVO]
   SELECT count(*) by status from traducoes_arquivo_itens where projeto_id=X
   UPDATE projetos status = (all concluido → 'concluido' | all erro → 'erro' | mixed → 'concluido')
```

### Detalhes dos nodes novos

**`Code Detectar Tipo URL`** (substitui `Code Extrair ID Arquivo Traducao`):

```js
const proj = $input.first().json;
const url = proj.drive_url;
const body = $('Webhook').first().json.body;

let id, isFolder;
const folderMatch = url.match(/\/drive\/(?:u\/\d+\/)?folders\/([-\w]{20,})/);
const fileMatch = url.match(/\/file\/d\/([-\w]{20,})/);
const idParamMatch = url.match(/[?&]id=([-\w]{20,})/);

if (folderMatch) { id = folderMatch[1]; isFolder = true; }
else if (fileMatch) { id = fileMatch[1]; isFolder = false; }
else if (idParamMatch) { id = idParamMatch[1]; isFolder = false; }
else { throw new Error('URL do Drive inválida: ' + url); }

return [{ json: {
  isFolder,
  id,
  projetoId: proj.id,
  nomeProjeto: proj.nome_projeto,
  idioma: body.idioma || 'EN-US'
}}];
```

**`HTTP DeepL Traduzir`** (substitui `HTTP Traduzir PDF` e `HTTP Traduzir DOCX` — pode ser 1 node compartilhado entre os dois caminhos via merge):

```
Method: POST
URL: https://api.deepl.com/v2/translate
Headers:
  Authorization: DeepL-Auth-Key <KEY hardcoded — mesma do Flow 5; TODO mover pra credencial>
  Content-Type: application/json
Body (JSON):
{
  "text": [{{ JSON.stringify($json.text) }}],
  "target_lang": "{{ $json.idioma }}",
  "source_lang": "PT",
  "preserve_formatting": true
}
continueOnFail: true
```

A resposta é `{ translations: [{ text: "...", detected_source_language: "..." }] }`. O texto traduzido sai em `$json.translations[0].text`.

**`HTTP Preencher Doc Traducao PDF/DOCX`** — edit no `jsonBody` pra usar `$('HTTP DeepL Traduzir').first().json.translations[0].text` em vez de `choices[0].message.content`.

**`HTTP Criar Doc Traducao PDF/DOCX`** — nome do doc passa a incluir idioma:

```
"name": "Tradução [{{ $json.idioma }}] - {{ nomeProjeto }} - {{ nomeArquivo }}"
```

(Mantém pasta destino `1OUTZVmlHH8rRiNzIdXRQZHV0-Q2ceAmI` hardcoded — mesmo padrão atual.)

### Error handling — nodes-chave

Adicionar `continueOnFail: true` em: `Download PDF Traducao`, `HTTP Copiar DOCX Traducao`, `GDrive Baixar Texto DOCX Traducao`, `HTTP DeepL Traduzir`, `HTTP Criar Doc Traducao *`, `HTTP Preencher Doc Traducao *`.

Após o pipeline de cada item, um `IF erro?` checa se algum dos outputs anteriores tem `error`. Se sim → `UPDATE traducoes_arquivo_itens SET status='erro', mensagem_erro='<descrição curta>'`. Se não → o UPDATE de sucesso já roda.

### Agregação final (após o loop completar)

```sql
WITH counts AS (
  SELECT
    COUNT(*) FILTER (WHERE status = 'concluido') AS ok,
    COUNT(*) FILTER (WHERE status = 'erro') AS erro,
    COUNT(*) AS total
  FROM traducoes_arquivo_itens
  WHERE projeto_id = '{{ projetoId }}'
)
UPDATE projetos
SET status = CASE
  WHEN (SELECT erro FROM counts) = (SELECT total FROM counts) THEN 'erro'
  ELSE 'concluido'
END
WHERE id = '{{ projetoId }}';
```

(`drive_url` do `projetos` permanece com o URL original da pasta/arquivo — a lista de Docs traduzidos vive em `traducoes_arquivo_itens.drive_url_traduzido`.)

---

## Banco — migration

```sql
create table public.traducoes_arquivo_itens (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  drive_file_id varchar not null,
  nome_arquivo varchar not null,
  tipo_arquivo varchar not null check (tipo_arquivo in ('pdf','docx')),
  idioma varchar not null,
  drive_url_traduzido text,
  status varchar not null default 'pendente'
    check (status in ('pendente','traduzindo','concluido','erro')),
  mensagem_erro text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_traducoes_arquivo_itens_projeto_id
  on public.traducoes_arquivo_itens(projeto_id);

create trigger trg_traducoes_arquivo_itens_updated_at
  before update on public.traducoes_arquivo_itens
  for each row execute function set_updated_at();
```

Tabela criada **sem RLS habilitado**, em paralelo com o padrão atual das outras tabelas de domínio. (Item já mapeado em `project_security_debt`; será endereçado num passo separado de hardening.)

---

## Fluxo de dados — casos representativos

### Caso 1: usuário cola URL de **arquivo único**, PDF, EN-US
1. Frontend valida URL ✓, mostra select de idioma com `EN-US` default, submete
2. n8n: insert projetos (`status='aguardando'`) → detect (isFolder=false) → Get Metadata → format single item → UPDATE status='traduzindo'
3. Loop (1 iteração): insert item → download PDF → extract → DeepL `target=EN-US` → criar Doc "Tradução [EN-US] - Projeto X - arquivo.pdf" → preencher → UPDATE item concluido
4. Aggregate: 1 ok / 0 erro → UPDATE projetos status='concluido'

### Caso 2: usuário cola URL de **pasta** com 2 PDFs (CAPA + Miolo), ES
1. Frontend valida ✓, mostra hint "Pasta detectada — todos PDFs/DOCX dentro serão traduzidos", select ES
2. n8n: insert projetos → detect (isFolder=true) → Search files (filtro PDF+DOCX) retorna 2 → UPDATE status='traduzindo'
3. Loop iteração 1: insert item CAPA → download → extract → DeepL ES → criar Doc → preencher → UPDATE concluido
4. Loop iteração 2: idem Miolo → UPDATE concluido
5. Aggregate: 2 ok / 0 erro → UPDATE projetos status='concluido'

### Caso 3: pasta vazia (sem PDF/DOCX)
1. Detect (isFolder=true) → Search files retorna 0 → IF Empty=true → UPDATE projetos `status='erro'` → fim

### Caso 4: 1 arquivo da pasta falha no Drive (sem permissão)
1. Loop iteração N: insert item → Download PDF falha (continueOnFail) → IF erro=true → UPDATE item `status='erro', mensagem_erro='Falha no Drive'`
2. Loop continua nas outras iterações normalmente
3. Aggregate: se ≥1 ok → projeto `concluido`, se 100% erro → projeto `erro`

### Caso 5: URL malformada
1. Frontend rejeita no submit, mensagem inline. Nada chega no n8n.

---

## Testes

### Frontend (Vitest)
- `CreateProjectModal`: validação aceita `/file/d/{id}`, `/drive/folders/{id}`, `/drive/u/0/folders/{id}`. Rejeita Dropbox, S3, URL aleatório.
- `CreateProjectModal`: ao colar URL de pasta, hint aparece. Ao colar URL de arquivo, hint some.
- `CreateProjectModal`: idioma default `EN-US`; selecionar `ES` envia `idioma: 'ES'` no payload.

### n8n (manual + Executions tab)
- Smoke: arquivo PDF único → projeto concluído + 1 item com drive_url_traduzido válido
- Smoke: pasta com 1 PDF e 1 DOCX → projeto concluído + 2 itens
- Edge: pasta com subpasta dentro → ignora subpasta, processa só direct children
- Edge: pasta vazia (ou só com `.txt`) → projeto vai pra `erro`
- Edge: arquivo de pasta sem permissão → item vira `erro`, outros seguem
- Edge: URL inválida fugindo do regex frontend (cURL direto no webhook) → n8n joga exception, projeto fica em `aguardando` (acceptable porque é caso impossível no fluxo normal)

### Banco
- Migration aplicada sem erro
- Index `idx_traducoes_arquivo_itens_projeto_id` criado
- Trigger `trg_traducoes_arquivo_itens_updated_at` funcional (UPDATE bate `updated_at`)

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Texto de PDF > 130KB excede limite DeepL | Não trata no MVP; se acontecer, marca item como erro com mensagem clara. Follow-up: chunking. |
| Credencial Drive sem acesso à pasta do usuário | Mensagem genérica "Sem acesso ao Drive" no item; o usuário compartilha a pasta com a conta `BessaAulas AltaBooks` e re-cria projeto. |
| Pasta muito grande (50+ arquivos) trava o flow | Não trata no MVP. Limit do Loop pode ser adicionado depois se necessário. |
| DeepL Pro indisponível (rate limit, quota) | `continueOnFail` marca itens como erro; usuário re-cria projeto após resolver. |
| Memory entry `project_traducao_deepl` afirma só Flow 5 usa DeepL | Atualizar memória após implementação para mencionar que `traducao_arquivo` também usa DeepL agora. |

---

## Migração e rollout

1. **DB migration** primeiro (criar `traducoes_arquivo_itens` em produção via Supabase MCP `apply_migration`)
2. **n8n flow** segundo (editar diretamente — n8n não tem versionamento por ambiente)
3. **Frontend** por último (deploy normal via Vite build)

Ordem importa: se frontend for primeiro com idioma novo, n8n ainda não lê `idioma` do body → traduz para `EN` default (comportamento atual). Sem quebra. Se n8n vier antes do frontend, o branch novo só roda quando user cola folder URL (frontend ainda nem permite isso) — também sem quebra.

Não precisa feature flag.

---

## Acompanhamento depois do merge

- Atualizar memória `project_traducao_deepl.md` para refletir que `traducao_arquivo` também usa DeepL
- Atualizar `CLAUDE.md` removendo a menção a Gemini 3 Flash via OpenRouter para tradução
- Adicionar ao `project_pendentes`: chunking de textos > 130KB; retry de item individual; habilitação de RLS na nova tabela
