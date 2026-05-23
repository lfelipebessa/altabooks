# Tradução de Arquivo: Suporte a Pasta + DeepL — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver o bug em que criar projeto `traducao_arquivo` com URL de pasta do Drive falha em silêncio, suportando agora tanto arquivo único quanto pasta (todos os PDFs/DOCX dentro), trocando o motor de tradução de Gemini Flash para DeepL Pro, e adicionando seletor de idioma no modal.

**Architecture:** Frontend valida tipo de URL (file/folder) e expõe select de idioma; n8n detecta também, e quando pasta usa o pattern `Search files and folders` (já existente no branch `livro`) → `Split In Batches` → cada arquivo vira 1 row em nova tabela `traducoes_arquivo_itens` e passa pelo pipeline de tradução (PDF/DOCX) trocando o node de IA pelo DeepL.

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind • Vitest + React Testing Library • Supabase (PostgreSQL via MCP) • n8n (workflows manuais no Railway) • DeepL Pro API • Google Drive OAuth via n8n.

**Spec:** `docs/superpowers/specs/2026-05-23-traducao-arquivo-folder-deepl-design.md`

---

## File Structure

**Create:**
- `src/lib/driveUrl.ts` — helper puro para parsear URLs do Drive
- `src/lib/driveUrl.test.ts` — testes do helper

**Modify:**
- `src/types.ts` — adiciona interface `TraducaoArquivoItem`
- `src/components/CreateProjectModal.tsx` — validação URL, hint, select idioma, payload
- `src/pages/DetalheProjeto.tsx` — nova seção listando itens de tradução
- `CLAUDE.md` — atualizar nota sobre motor de tradução

**Apply via Supabase MCP (no local SQL file):**
- Migration `create_traducoes_arquivo_itens`

**Edit in n8n UI (workflow `1. [Altabooks] Transcrição de Materiais`, branch `Traducaoarquivo`):**
- Replace `Code Extrair ID Arquivo Traducao` with new logic
- Add `Switch isFolder`, `Search files and folders`, `IF Empty`, `Loop Over Items`
- Add 2 new Postgres inserts and updates for `traducoes_arquivo_itens`
- Replace `HTTP Traduzir PDF` and `HTTP Traduzir DOCX` with `HTTP DeepL Traduzir`
- Add `continueOnFail` + error-routing on critical HTTPs
- Add aggregator at the end of the loop

---

## Task 1: Aplicar migration `create_traducoes_arquivo_itens`

**Files:**
- Apply via Supabase MCP (project_id `tddolcrzmczvoqxkajic`)

- [ ] **Step 1: Aplicar migration**

Use a ferramenta `mcp__plugin_supabase_supabase__apply_migration` com:

- `project_id`: `tddolcrzmczvoqxkajic`
- `name`: `create_traducoes_arquivo_itens`
- `query`:

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

- [ ] **Step 2: Verificar que tabela existe**

Use a ferramenta `mcp__plugin_supabase_supabase__list_tables` com `project_id: tddolcrzmczvoqxkajic`, `schemas: ["public"]`, `verbose: true`.

Expected: response inclui `public.traducoes_arquivo_itens` com as 11 colunas e a FK pra `public.projetos.id` com `ON DELETE CASCADE`.

- [ ] **Step 3: Sem commit** (migration vive no remoto via MCP, não no git)

---

## Task 2: Adicionar interface `TraducaoArquivoItem` em types.ts

**Files:**
- Modify: `src/types.ts` (append at the end)

- [ ] **Step 1: Adicionar interface**

Adicionar ao final do arquivo `src/types.ts`:

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

- [ ] **Step 2: Verificar typecheck**

Run: `npm run build`
Expected: build passa sem erros (apenas o tsc -b).

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "types: adicionar TraducaoArquivoItem"
```

---

## Task 3: Criar helper `driveUrl.ts` com testes (TDD)

**Files:**
- Create: `src/lib/driveUrl.test.ts`
- Create: `src/lib/driveUrl.ts`

- [ ] **Step 1: Escrever testes que falham**

Criar `src/lib/driveUrl.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { detectDriveUrl } from './driveUrl'

describe('detectDriveUrl', () => {
  it('reconhece URL de arquivo /file/d/{id}', () => {
    expect(detectDriveUrl('https://drive.google.com/file/d/1ABCdef1234567890XYZuvwXYZuvw/view'))
      .toEqual({ kind: 'file', id: '1ABCdef1234567890XYZuvwXYZuvw' })
  })

  it('reconhece URL de arquivo com query string', () => {
    expect(detectDriveUrl('https://drive.google.com/file/d/1ABCdef1234567890XYZuvwXYZuvw/view?usp=sharing'))
      .toEqual({ kind: 'file', id: '1ABCdef1234567890XYZuvwXYZuvw' })
  })

  it('reconhece URL de pasta /drive/folders/{id}', () => {
    expect(detectDriveUrl('https://drive.google.com/drive/folders/1Ix0ii5GBCwGZEsLaMdxiAL1kvpFpHV08'))
      .toEqual({ kind: 'folder', id: '1Ix0ii5GBCwGZEsLaMdxiAL1kvpFpHV08' })
  })

  it('reconhece URL de pasta com query string', () => {
    expect(detectDriveUrl('https://drive.google.com/drive/folders/1Ix0ii5GBCwGZEsLaMdxiAL1kvpFpHV08?usp=sharing'))
      .toEqual({ kind: 'folder', id: '1Ix0ii5GBCwGZEsLaMdxiAL1kvpFpHV08' })
  })

  it('reconhece URL de pasta com user index /drive/u/0/folders/{id}', () => {
    expect(detectDriveUrl('https://drive.google.com/drive/u/0/folders/1Ix0ii5GBCwGZEsLaMdxiAL1kvpFpHV08'))
      .toEqual({ kind: 'folder', id: '1Ix0ii5GBCwGZEsLaMdxiAL1kvpFpHV08' })
  })

  it('retorna null pra URL não-Drive', () => {
    expect(detectDriveUrl('https://dropbox.com/foo/bar')).toBeNull()
  })

  it('retorna null pra string vazia', () => {
    expect(detectDriveUrl('')).toBeNull()
  })

  it('retorna null pra URL do Drive sem ID válido', () => {
    expect(detectDriveUrl('https://drive.google.com/drive/my-drive')).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar testes pra confirmar que falham**

Run: `npx vitest run src/lib/driveUrl.test.ts`
Expected: FAIL com erro `Cannot find module './driveUrl'`.

- [ ] **Step 3: Criar implementação mínima**

Criar `src/lib/driveUrl.ts`:

```ts
export type DriveUrlKind = 'file' | 'folder'

export interface DriveUrlMatch {
  kind: DriveUrlKind
  id: string
}

const FILE_RE = /\/file\/d\/([-\w]{20,})/
const FOLDER_RE = /\/drive\/(?:u\/\d+\/)?folders\/([-\w]{20,})/

export function detectDriveUrl(url: string): DriveUrlMatch | null {
  if (!url) return null
  const folder = url.match(FOLDER_RE)
  if (folder) return { kind: 'folder', id: folder[1] }
  const file = url.match(FILE_RE)
  if (file) return { kind: 'file', id: file[1] }
  return null
}
```

- [ ] **Step 4: Rodar testes pra confirmar que passam**

Run: `npx vitest run src/lib/driveUrl.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/driveUrl.ts src/lib/driveUrl.test.ts
git commit -m "feat(drive): helper detectDriveUrl para arquivo/pasta"
```

---

## Task 4: Modal — adicionar select de idioma

**Files:**
- Modify: `src/components/CreateProjectModal.tsx`

- [ ] **Step 1: Importar IDIOMAS_TRADUCAO**

No topo de `src/components/CreateProjectModal.tsx`, adicionar à lista de imports (logo após o import de `types`):

```ts
import { IDIOMAS_TRADUCAO } from '../lib/idiomas';
```

- [ ] **Step 2: Adicionar estado de idioma**

Logo após `const [paginasMax, setPaginasMax] = useState('205');` (linha 33), adicionar:

```ts
    const [idioma, setIdioma] = useState<string>('EN-US');
```

- [ ] **Step 3: Resetar idioma no `resetForm`**

Dentro de `resetForm` (linha 43-48), adicionar antes do `};`:

```ts
        setIdioma('EN-US');
```

- [ ] **Step 4: Renderizar select quando `tipo === 'traducao_arquivo'`**

Logo após o bloco `{tipo === 'do_executivo' ? (...) : (...)}` (que termina perto da linha 181), antes do `{tipo === 'livro' && (...)}` (linha 183), adicionar:

```tsx
                        {tipo === 'traducao_arquivo' && (
                            <div>
                                <label className="block text-sm font-medium text-brand-text-main mb-1">Idioma da tradução *</label>
                                <select
                                    value={idioma}
                                    onChange={(e) => setIdioma(e.target.value)}
                                    disabled={loading}
                                    className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                >
                                    {IDIOMAS_TRADUCAO.map(({ code, label }) => (
                                        <option key={code} value={code}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
```

- [ ] **Step 5: Verificar typecheck**

Run: `npm run build`
Expected: build passa sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/CreateProjectModal.tsx
git commit -m "feat(modal): select de idioma para tradução de arquivo"
```

---

## Task 5: Modal — validação de URL + hint de pasta + payload com idioma

**Files:**
- Modify: `src/components/CreateProjectModal.tsx`

- [ ] **Step 1: Importar helper**

No topo do arquivo, junto dos outros imports:

```ts
import { detectDriveUrl } from '../lib/driveUrl';
```

- [ ] **Step 2: Adicionar validação dentro de `handleSubmit`**

Dentro de `handleSubmit`, logo após o bloco `if (hasBookConfig) {...}` (que termina perto da linha 68), antes do `if (!isFormValid) return;` (linha 70), adicionar:

```ts
        if (tipo === 'traducao_arquivo') {
            const match = detectDriveUrl(driveLink);
            if (!match) {
                setError('Use um link de arquivo (/file/d/) ou pasta (/drive/folders/) do Google Drive.');
                return;
            }
        }
```

- [ ] **Step 3: Adicionar hint contextual abaixo do input do Drive link**

Dentro do bloco `else` (linha 169-181) que renderiza o input `driveLink` quando `tipo !== 'do_executivo'`, logo após o fechamento da tag `<input>` e antes do fechamento `</div>`, adicionar:

```tsx
                                {tipo === 'traducao_arquivo' && detectDriveUrl(driveLink)?.kind === 'folder' && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Pasta detectada — todos os PDFs e Word dentro serão traduzidos.
                                    </p>
                                )}
```

(O `detectDriveUrl` aqui é chamado em cada render — é uma função pura barata, sem problemas de performance.)

- [ ] **Step 4: Atualizar payload pra incluir idioma**

Dentro de `handleSubmit`, no bloco `const payload = ...` (linha 75-80), substituir a linha do `traducao_arquivo` (linha 80):

**De:**
```ts
                    : { ...base, driveLink, tipo: 'traducao_arquivo', idioma: 'en' };
```

**Para:**
```ts
                    : { ...base, driveLink, tipo: 'traducao_arquivo', idioma };
```

- [ ] **Step 5: Verificar typecheck**

Run: `npm run build`
Expected: build passa sem erros.

- [ ] **Step 6: Smoke test manual no dev server**

Run: `npm run dev`

Abrir `http://localhost:5173`, clicar "Novo Projeto", testar:

1. Selecionar "Traduzir Arquivo".
2. Preencher Nome + Autor.
3. Colar URL inválida (ex: `https://example.com`). Clicar Criar → deve mostrar erro inline "Use um link de arquivo...".
4. Colar URL de pasta (ex: `https://drive.google.com/drive/folders/1Ix0ii5GBCwGZEsLaMdxiAL1kvpFpHV08`). Hint cinza deve aparecer.
5. Colar URL de arquivo (`https://drive.google.com/file/d/1abc...123/view`). Hint deve sumir.
6. Mudar idioma para "Espanhol", abrir DevTools → Network. Clicar Criar. Verificar payload tem `"idioma":"ES"`.

Expected: todos os passos comportam como descrito.

- [ ] **Step 7: Commit**

```bash
git add src/components/CreateProjectModal.tsx
git commit -m "feat(modal): validação de URL Drive e hint de pasta para tradução"
```

---

## Task 6: Detalhe do projeto — seção de itens de tradução

**Files:**
- Modify: `src/pages/DetalheProjeto.tsx`

- [ ] **Step 1: Ler a estrutura atual da página pra achar onde inserir**

Run: `grep -n "tipo === 'traducao_arquivo'\|projeto?.tipo\|projeto.tipo" src/pages/DetalheProjeto.tsx`

Tomar nota das linhas onde já há checks de `projeto.tipo` para localizar onde colocar a nova seção de forma consistente. Se já existir uma seção condicional pra `traducao_arquivo`, substituí-la; caso contrário, adicionar nova.

- [ ] **Step 2: Adicionar state pros itens**

No componente `DetalheProjeto`, junto dos outros `useState` (geralmente perto do topo do componente):

```ts
import type { TraducaoArquivoItem } from '../types';

// ...

const [itensTraducao, setItensTraducao] = useState<TraducaoArquivoItem[]>([]);
```

- [ ] **Step 3: Adicionar fetch dos itens**

Dentro do `useEffect` que carrega dados do projeto (procure pelo trecho que faz `supabase.from('projetos')` ou similar), adicionar uma chamada paralela:

```ts
    const fetchItensTraducao = async () => {
        if (!id) return;
        const { data, error } = await supabase
            .from('traducoes_arquivo_itens')
            .select('*')
            .eq('projeto_id', id)
            .order('created_at', { ascending: true });
        if (error) {
            console.error('Erro ao carregar itens de tradução:', error);
            return;
        }
        setItensTraducao((data ?? []) as TraducaoArquivoItem[]);
    };

    fetchItensTraducao();
```

(Adapte o nome da função e o lugar exato de chamada ao padrão do `useEffect` existente.)

- [ ] **Step 4: Renderizar a seção quando `projeto.tipo === 'traducao_arquivo'`**

Encontrar o ponto onde os conteúdos do projeto são renderizados (provavelmente um JSX que mostra arquivos, sumários, etc.) e adicionar:

```tsx
{projeto.tipo === 'traducao_arquivo' && (
    <section className="bg-brand-bg rounded-2xl shadow-sm p-6">
        <h2 className="font-serif text-xl font-bold text-brand-text-main mb-4">
            Arquivos traduzidos
        </h2>
        {itensTraducao.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum arquivo processado ainda.</p>
        ) : (
            <ul className="space-y-3">
                {itensTraducao.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 p-3 bg-brand-bg-section rounded-lg">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-text-main truncate">{item.nome_arquivo}</p>
                            <p className="text-xs text-gray-500">
                                {item.tipo_arquivo.toUpperCase()} · {item.idioma}
                                {item.status === 'erro' && item.mensagem_erro && (
                                    <span className="text-red-600 ml-2">— {item.mensagem_erro}</span>
                                )}
                            </p>
                        </div>
                        <StatusBadge status={mapItemStatus(item.status)} />
                        {item.status === 'concluido' && item.drive_url_traduzido && (
                            <a
                                href={item.drive_url_traduzido}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-brand-text-main bg-brand-primary hover:bg-brand-hover px-3 py-1.5 rounded-lg font-medium"
                            >
                                Abrir tradução
                            </a>
                        )}
                    </li>
                ))}
            </ul>
        )}
    </section>
)}
```

E definir o helper `mapItemStatus` no topo do arquivo (fora do componente) — ele converte o status do item para um status reconhecido pelo `StatusBadge` existente:

```ts
import type { ProjetoStatus } from '../types';

function mapItemStatus(status: TraducaoArquivoItem['status']): ProjetoStatus {
    if (status === 'pendente' || status === 'traduzindo') return 'traduzindo';
    if (status === 'concluido') return 'concluido';
    return 'erro';
}
```

(Se `StatusBadge` aceitar outro tipo, adapte; o objetivo é reusar o componente existente.)

- [ ] **Step 5: Verificar typecheck**

Run: `npm run build`
Expected: build passa sem erros.

- [ ] **Step 6: Smoke test manual**

Run: `npm run dev`

Como ainda não há itens reais no banco (esperando n8n), insira um item de teste via Supabase MCP:

```sql
-- Use o ID de um projeto traducao_arquivo existente OU crie um para teste:
INSERT INTO projetos (nome_projeto, autor_nome, drive_url, tipo, status, auto_start)
VALUES ('Teste UI', 'Autor Teste', 'https://drive.google.com/file/d/teste123/view', 'traducao_arquivo', 'traduzindo', true)
RETURNING id;

-- Use o id retornado abaixo:
INSERT INTO traducoes_arquivo_itens
  (projeto_id, drive_file_id, nome_arquivo, tipo_arquivo, idioma, status, drive_url_traduzido)
VALUES
  ('<projeto_id>', 'fake-file-1', 'CAPA_teste.pdf', 'pdf', 'EN-US', 'concluido', 'https://docs.google.com/document/d/fake/edit'),
  ('<projeto_id>', 'fake-file-2', 'Miolo_teste.pdf', 'pdf', 'EN-US', 'traduzindo', null),
  ('<projeto_id>', 'fake-file-3', 'Capitulo3.docx', 'docx', 'EN-US', 'erro', null);

UPDATE traducoes_arquivo_itens
SET mensagem_erro = 'Falha no Drive'
WHERE projeto_id = '<projeto_id>' AND status = 'erro';
```

Abrir o detalhe desse projeto no browser. Verificar:
- Seção "Arquivos traduzidos" aparece
- 3 itens listados com nome + tipo + idioma
- Item concluido tem botão "Abrir tradução"
- Item erro mostra "— Falha no Drive" em vermelho
- Status badges corretos

Cleanup:
```sql
DELETE FROM projetos WHERE nome_projeto = 'Teste UI';
-- O CASCADE deleta os itens automaticamente
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/DetalheProjeto.tsx
git commit -m "feat(detalhe): seção de arquivos traduzidos para projeto tipo traducao_arquivo"
```

---

## Task 7: n8n — Backup do flow atual

**Files:**
- Local backup: `~/Downloads/altabooks-transcricao-materiais-pre-deepl-backup.json`

- [ ] **Step 1: Exportar flow do n8n**

Abrir o workflow `1. [Altabooks] Transcrição de Materiais` no n8n (Railway).

Menu superior direito → "Download" → salvar como `~/Downloads/altabooks-transcricao-materiais-pre-deepl-backup.json`.

Confirmar arquivo existe e tem > 50KB:
```bash
ls -lh ~/Downloads/altabooks-transcricao-materiais-pre-deepl-backup.json
```

- [ ] **Step 2: Sem commit** (backup local; não vai pro repo)

---

## Task 8: n8n — Substituir Code Extrair por Code Detectar Tipo URL

**Files:**
- Edit node: `Code Extrair ID Arquivo Traducao` no n8n

- [ ] **Step 1: Renomear node e substituir código**

No n8n, abrir o workflow. Clicar no node `Code Extrair ID Arquivo Traducao`.

- Renomear para: `Code Detectar Tipo URL`
- Substituir o jsCode por:

```js
const proj = $input.first().json;
const url = proj.drive_url || '';
const body = $('Webhook').first().json.body || {};

const folderMatch = url.match(/\/drive\/(?:u\/\d+\/)?folders\/([-\w]{20,})/);
const fileMatch = url.match(/\/file\/d\/([-\w]{20,})/);
const idParamMatch = url.match(/[?&]id=([-\w]{20,})/);

let id, isFolder;
if (folderMatch)        { id = folderMatch[1];    isFolder = true; }
else if (fileMatch)     { id = fileMatch[1];      isFolder = false; }
else if (idParamMatch)  { id = idParamMatch[1];   isFolder = false; }
else {
  throw new Error('URL do Drive inválida ou ID não encontrado: ' + url);
}

return [{ json: {
  isFolder,
  id,
  projetoId: proj.id,
  nomeProjeto: proj.nome_projeto,
  idioma: body.idioma || 'EN-US'
} }];
```

Salvar (Save).

---

## Task 9: n8n — Adicionar Switch isFolder

**Files:**
- New node: `Switch isFolder` no n8n

- [ ] **Step 1: Adicionar node Switch**

Adicionar novo node tipo `Switch` (n8n-nodes-base.switch v3.4) conectado **após** `Code Detectar Tipo URL`.

- Nome: `Switch isFolder`
- Mode: Rules
- Rule 1:
  - Condition: `{{ $json.isFolder }}` equals `true` (Boolean)
  - Output name: `Folder`
- Fallback output: `File`

- [ ] **Step 2: Desconectar o caminho antigo**

Remover a conexão direta entre `Code Detectar Tipo URL` e `HTTP Get Metadata Arquivo`. Conectar:
- `Code Detectar Tipo URL` → `Switch isFolder`

(`HTTP Get Metadata Arquivo` ficará órfão temporariamente; será reconectado na Task 11.)

---

## Task 10: n8n — Branch da pasta (Search + IF Empty + UPDATE)

**Files:**
- New nodes em n8n: `Search files and folders Traducao`, `IF Pasta Vazia`, `UPDATE Projeto Erro Pasta Vazia`

- [ ] **Step 1: Adicionar `Search files and folders Traducao`**

Adicionar novo node tipo `Google Drive` (n8n-nodes-base.googleDrive v3) conectado ao output `Folder` do `Switch isFolder`:

- Nome: `Search files and folders Traducao`
- Resource: `File/Folder`
- Operation: `Search`
- Search Method: `Query String`
- Query String: `'{{ $json.id }}' in parents and trashed = false and (mimeType = 'application/pdf' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')`
- Return All: true
- Credentials: `BessaAulas AltaBooks` (mesma do `Search files and folders` do branch livro)

- [ ] **Step 2: Adicionar `IF Pasta Vazia`**

Adicionar node `IF` (n8n-nodes-base.if v2.3) conectado após `Search files and folders Traducao`:

- Nome: `IF Pasta Vazia`
- Condition: `{{ $items().length }}` equals `0` (Number)

A saída `true` é "pasta vazia", `false` é "tem arquivos".

- [ ] **Step 3: Adicionar `UPDATE Projeto Erro Pasta Vazia`**

Adicionar node Postgres (n8n-nodes-base.postgres v2.6) conectado ao output `true` do `IF Pasta Vazia`:

- Nome: `UPDATE Projeto Erro Pasta Vazia`
- Operation: Execute Query
- Query:
```sql
UPDATE projetos SET status = 'erro' WHERE id = '{{ $('Code Detectar Tipo URL').first().json.projetoId }}'
```
- Credentials: `Postgres AltaBooks account`

Esse node é terminal (não conecta a nada).

- [ ] **Step 4: Salvar e validar visualmente**

Verificar que o branch `Folder` está:
```
Switch isFolder (Folder) → Search files and folders Traducao → IF Pasta Vazia
                                                                ├── true → UPDATE Projeto Erro Pasta Vazia
                                                                └── false → (próximo node, a definir na Task 12)
```

---

## Task 11: n8n — Branch do arquivo (Get Metadata + Format Single Item)

**Files:**
- Reconnect node: `HTTP Get Metadata Arquivo`
- New node: `Code Format Single Item`

- [ ] **Step 1: Reconectar `HTTP Get Metadata Arquivo` ao branch File**

Conectar a saída `File` do `Switch isFolder` → `HTTP Get Metadata Arquivo`.

Editar `HTTP Get Metadata Arquivo`:
- URL: `=https://www.googleapis.com/drive/v3/files/{{ $json.id }}?fields=id,name,mimeType` (estava usando `$json.fileId`, agora vem `$json.id`)

- [ ] **Step 2: Adicionar `Code Format Single Item`**

Adicionar node Code (n8n-nodes-base.code v2) conectado após `HTTP Get Metadata Arquivo`:

- Nome: `Code Format Single Item`
- jsCode:

```js
const meta = $input.first().json;
return [{ json: {
  id: meta.id,
  name: meta.name,
  mimeType: meta.mimeType
} }];
```

(O objetivo é deixar o output compatível com o que `Search files and folders Traducao` retorna: array de items com `{ id, name, mimeType }`.)

---

## Task 12: n8n — Mesclar branches + UPDATE status traduzindo + Loop

**Files:**
- New nodes em n8n: `UPDATE Projeto Traduzindo`, `Loop Over Itens Traducao`

- [ ] **Step 1: Adicionar `UPDATE Projeto Traduzindo`**

Adicionar node Postgres v2.6 conectado **tanto** ao output `false` do `IF Pasta Vazia` **quanto** após `Code Format Single Item`:

- Nome: `UPDATE Projeto Traduzindo`
- Operation: Execute Query
- Query:
```sql
UPDATE projetos SET status = 'traduzindo' WHERE id = '{{ $('Code Detectar Tipo URL').first().json.projetoId }}'
```
- Credentials: `Postgres AltaBooks account`

(O node Postgres em n8n aceita múltiplas inputs; se houver problema, use um node `Merge` antes em modo "Append" para combinar os items.)

- [ ] **Step 2: Adicionar `Loop Over Itens Traducao`**

Adicionar node `Split In Batches` (n8n-nodes-base.splitInBatches v3) conectado após `UPDATE Projeto Traduzindo`:

- Nome: `Loop Over Itens Traducao`
- Batch Size: 1 (default)
- Options: (vazio)

A saída do loop é o item atual da iteração. Ele tem `{ id, name, mimeType }` de cada arquivo.

Mas atenção: o `UPDATE Projeto Traduzindo` quebrou o context — os items que vão pro loop precisam ser os arquivos do Search/Format, não o output do UPDATE. Para isso:

**Reconectar:** o `Loop Over Itens Traducao` deve receber input **das duas fontes anteriores** (`IF Pasta Vazia` false, `Code Format Single Item`), **antes** do UPDATE Projeto Traduzindo.

Estrutura correta:
```
IF Pasta Vazia (false) ─┐
                         ├─→ UPDATE Projeto Traduzindo ─→ (nada, é terminal)
Code Format Single Item ─┘

IF Pasta Vazia (false) ─┐
                         ├─→ Loop Over Itens Traducao → (próximo node)
Code Format Single Item ─┘
```

Ou seja: o UPDATE roda em paralelo com o Loop. Para garantir que rode antes, use um node `Merge` (Append mode) seguido do UPDATE em sequência, mas saindo do Merge para o Loop também.

**Solução mais simples:** rodar o UPDATE Projeto Traduzindo como **subworkflow paralelo** — adicione apenas a conexão de UMA das duas fontes (`IF Pasta Vazia` false) e ignore que single-file não tem update intermediário (ele vai pra 'concluido' direto no aggregator final). Single-file ainda fica em `aguardando` por alguns segundos — aceitável.

Implementação:
- `IF Pasta Vazia` (false) → `UPDATE Projeto Traduzindo` → (nada)
- `IF Pasta Vazia` (false) → `Loop Over Itens Traducao` (uma segunda saída do mesmo node? não — duplicar o output: adicionar uma "fake branch" no Switch ou conectar 2x)

Em n8n, um output pode conectar a múltiplos nodes. Então:
- `IF Pasta Vazia` (output false) → conecta a 2 nodes: `UPDATE Projeto Traduzindo` E `Loop Over Itens Traducao`
- `Code Format Single Item` → conecta diretamente a `Loop Over Itens Traducao` (sem UPDATE intermediário)

- [ ] **Step 3: Salvar e revisar conexões**

---

## Task 13: n8n — Dentro do loop: Code Tipo + Insert Item + Switch PDF/DOCX

**Files:**
- New nodes em n8n: `Code Tipo Arquivo Traducao`, `Insert Item Traducao`
- Modify: `Switch Tipo Arquivo Traducao` (já existe — vai ser reconectado)

- [ ] **Step 1: Adicionar `Code Tipo Arquivo Traducao`**

Adicionar node Code v2 conectado **após** `Loop Over Itens Traducao` (output 0):

- Nome: `Code Tipo Arquivo Traducao`
- jsCode:

```js
const item = $input.first().json;
const mime = item.mimeType || '';
let tipo;
if (mime === 'application/pdf') tipo = 'pdf';
else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') tipo = 'docx';
else tipo = 'docx'; // fallback (não deveria acontecer pelo filtro)

const ctx = $('Code Detectar Tipo URL').first().json;
return [{ json: {
  fileId: item.id,
  nomeArquivo: item.name,
  mimeType: mime,
  tipo,
  projetoId: ctx.projetoId,
  nomeProjeto: ctx.nomeProjeto,
  idioma: ctx.idioma
} }];
```

- [ ] **Step 2: Adicionar `Insert Item Traducao`**

Adicionar node Postgres v2.6 conectado após `Code Tipo Arquivo Traducao`:

- Nome: `Insert Item Traducao`
- Operation: Insert
- Schema: `public`
- Table: `traducoes_arquivo_itens`
- Columns (defineBelow):
  - `projeto_id`: `={{ $json.projetoId }}`
  - `drive_file_id`: `={{ $json.fileId }}`
  - `nome_arquivo`: `={{ $json.nomeArquivo }}`
  - `tipo_arquivo`: `={{ $json.tipo }}`
  - `idioma`: `={{ $json.idioma }}`
  - `status`: `=traduzindo`
- Options: leave `Return Fields` so que o node retorne `id` do row criado.
- Credentials: `Postgres AltaBooks account`

- [ ] **Step 3: Reconectar `Switch Tipo Arquivo Traducao`**

Conectar `Insert Item Traducao` → `Switch Tipo Arquivo Traducao` (node já existente).

Editar o `Switch Tipo Arquivo Traducao` para que a condição compare `tipo` (não `mimeType`):

- Rule 1: `={{ $('Code Tipo Arquivo Traducao').first().json.tipo }}` equals `pdf` → output `PDF`
- Fallback output: `DOCX`

(Importante: o output do `Insert` é o row inserido, não tem `tipo`. Por isso buscamos do node anterior.)

---

## Task 14: n8n — Subbranch PDF com DeepL e error handling

**Files:**
- Edit nodes em n8n: `Download PDF Traducao`, `Extrair Texto PDF Traducao`, `Preparar Texto PDF`, `HTTP Traduzir PDF` (vai ser substituído), `HTTP Criar Doc Traducao PDF`, `HTTP Preencher Doc Traducao PDF`, `Postgres Concluir Traducao PDF` (vai ser substituído)
- New nodes: `HTTP DeepL Traduzir PDF`, `UPDATE Item Traducao PDF`, `IF Erro PDF`, `UPDATE Item Erro PDF`

- [ ] **Step 1: Editar `Download PDF Traducao` para usar fileId do contexto novo**

Abrir node `Download PDF Traducao`. Editar:
- File ID: `={{ $('Code Tipo Arquivo Traducao').first().json.fileId }}`
- (Antes era `$('Code Extrair ID Arquivo Traducao').first().json.fileId` — agora não existe mais.)

Settings → `Continue On Fail`: true

- [ ] **Step 2: Editar `Preparar Texto PDF` para incluir idioma e itemId**

Substituir o jsCode por:

```js
const text = $json.text || '';
const ctx = $('Code Tipo Arquivo Traducao').first().json;
const item = $('Insert Item Traducao').first().json;
return [{ json: {
  text,
  projetoId: ctx.projetoId,
  nomeProjeto: ctx.nomeProjeto,
  nomeArquivo: ctx.nomeArquivo,
  idioma: ctx.idioma,
  itemId: item.id
} }];
```

- [ ] **Step 3: Substituir `HTTP Traduzir PDF` (Gemini) por `HTTP DeepL Traduzir PDF`**

Renomear node `HTTP Traduzir PDF` para `HTTP DeepL Traduzir PDF`. Substituir parâmetros:

- Method: POST
- URL: `https://api.deepl.com/v2/translate`
- Authentication: None (header manual)
- Send Headers: true
- Header Parameters:
  - `Authorization`: `DeepL-Auth-Key <KEY>` (substituir `<KEY>` pela chave hardcoded no Flow 5 — abrir Flow 5 no n8n para copiar; TODO mover para credencial)
  - `Content-Type`: `application/json`
- Send Body: true
- Specify Body: JSON
- JSON Body:
```
={
  "text": [{{ JSON.stringify($json.text) }}],
  "target_lang": "{{ $json.idioma }}",
  "source_lang": "PT",
  "preserve_formatting": true
}
```

Settings → `Continue On Fail`: true

- [ ] **Step 4: Editar `HTTP Criar Doc Traducao PDF`**

JSON Body:
```
={
  "name": "Tradução [{{ $('Preparar Texto PDF').first().json.idioma }}] - {{ $('Preparar Texto PDF').first().json.nomeProjeto }} - {{ $('Preparar Texto PDF').first().json.nomeArquivo }}",
  "mimeType": "application/vnd.google-apps.document",
  "parents": ["1OUTZVmlHH8rRiNzIdXRQZHV0-Q2ceAmI"]
}
```

Settings → `Continue On Fail`: true

- [ ] **Step 5: Editar `HTTP Preencher Doc Traducao PDF`**

JSON Body:
```
={{ JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text: $('HTTP DeepL Traduzir PDF').first().json.translations[0].text } }] }) }}
```

(Mudou de `choices[0].message.content` para `translations[0].text`.)

Settings → `Continue On Fail`: true

- [ ] **Step 6: Substituir `Postgres Concluir Traducao PDF` por `UPDATE Item Traducao PDF`**

Renomear e editar:

- Nome: `UPDATE Item Traducao PDF`
- Operation: Execute Query
- Query:
```sql
UPDATE traducoes_arquivo_itens
SET status = 'concluido',
    drive_url_traduzido = 'https://docs.google.com/document/d/{{ $('HTTP Criar Doc Traducao PDF').first().json.id }}/edit'
WHERE id = '{{ $('Preparar Texto PDF').first().json.itemId }}'
```

Settings → `Continue On Fail`: true (defensivo)

- [ ] **Step 7: Adicionar `IF Erro PDF` antes do UPDATE de sucesso**

Adicionar node IF v2.3 entre `HTTP Preencher Doc Traducao PDF` e `UPDATE Item Traducao PDF`:

- Nome: `IF Erro PDF`
- Condition: `{{ $('HTTP Preencher Doc Traducao PDF').first().error !== undefined || $('HTTP Criar Doc Traducao PDF').first().error !== undefined || $('HTTP DeepL Traduzir PDF').first().error !== undefined || $('Download PDF Traducao').first().error !== undefined }}` equals `true` (Boolean)

(Em n8n, quando `continueOnFail: true`, o item carrega `error` se algo falhou.)

Conexões:
- output `true` → `UPDATE Item Erro PDF` (next step)
- output `false` → `UPDATE Item Traducao PDF` (existente)

- [ ] **Step 8: Adicionar `UPDATE Item Erro PDF`**

Adicionar node Postgres v2.6:

- Nome: `UPDATE Item Erro PDF`
- Operation: Execute Query
- Query:
```sql
UPDATE traducoes_arquivo_itens
SET status = 'erro',
    mensagem_erro = 'Falha no pipeline PDF (Drive, DeepL ou Docs)'
WHERE id = '{{ $('Preparar Texto PDF').first().json.itemId }}'
```

- [ ] **Step 9: Conectar de volta ao Loop**

Tanto `UPDATE Item Traducao PDF` quanto `UPDATE Item Erro PDF` devem conectar de volta a `Loop Over Itens Traducao` (input 0, o "loop input").

---

## Task 15: n8n — Subbranch DOCX com DeepL e error handling

**Files:**
- Edit nodes em n8n: `HTTP Copiar DOCX Traducao`, `GDrive Baixar Texto DOCX Traducao`, `Extract Texto DOCX Traducao`, `HTTP Deletar Temp Traducao`, `Code Preparar Texto DOCX`, `HTTP Traduzir DOCX` (substituir), `HTTP Criar Doc Traducao DOCX`, `HTTP Preencher Doc Traducao DOCX`, `Postgres Concluir Traducao DOCX` (substituir)
- New nodes: `HTTP DeepL Traduzir DOCX`, `UPDATE Item Traducao DOCX`, `IF Erro DOCX`, `UPDATE Item Erro DOCX`

- [ ] **Step 1: Editar `HTTP Copiar DOCX Traducao`**

URL: `=https://www.googleapis.com/drive/v3/files/{{ $('Code Tipo Arquivo Traducao').first().json.fileId }}/copy`

Settings → `Continue On Fail`: true

- [ ] **Step 2: Editar `GDrive Baixar Texto DOCX Traducao`**

Settings → `Continue On Fail`: true

- [ ] **Step 3: Editar `Code Preparar Texto DOCX`**

Substituir jsCode:

```js
const text = $('Extract Texto DOCX Traducao').first().json.data || '';
const ctx = $('Code Tipo Arquivo Traducao').first().json;
const item = $('Insert Item Traducao').first().json;
return [{ json: {
  text,
  projetoId: ctx.projetoId,
  nomeProjeto: ctx.nomeProjeto,
  nomeArquivo: ctx.nomeArquivo,
  idioma: ctx.idioma,
  itemId: item.id
} }];
```

- [ ] **Step 4: Substituir `HTTP Traduzir DOCX` por `HTTP DeepL Traduzir DOCX`**

Renomear e configurar exatamente como o `HTTP DeepL Traduzir PDF` do Task 14 Step 3. Settings → `Continue On Fail`: true

- [ ] **Step 5: Editar `HTTP Criar Doc Traducao DOCX`**

JSON Body:
```
={
  "name": "Tradução [{{ $('Code Preparar Texto DOCX').first().json.idioma }}] - {{ $('Code Preparar Texto DOCX').first().json.nomeProjeto }} - {{ $('Code Preparar Texto DOCX').first().json.nomeArquivo }}",
  "mimeType": "application/vnd.google-apps.document",
  "parents": ["1OUTZVmlHH8rRiNzIdXRQZHV0-Q2ceAmI"]
}
```

Settings → `Continue On Fail`: true

- [ ] **Step 6: Editar `HTTP Preencher Doc Traducao DOCX`**

JSON Body:
```
={{ JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text: $('HTTP DeepL Traduzir DOCX').first().json.translations[0].text } }] }) }}
```

Settings → `Continue On Fail`: true

- [ ] **Step 7: Substituir `Postgres Concluir Traducao DOCX` por `UPDATE Item Traducao DOCX`**

- Nome: `UPDATE Item Traducao DOCX`
- Query:
```sql
UPDATE traducoes_arquivo_itens
SET status = 'concluido',
    drive_url_traduzido = 'https://docs.google.com/document/d/{{ $('HTTP Criar Doc Traducao DOCX').first().json.id }}/edit'
WHERE id = '{{ $('Code Preparar Texto DOCX').first().json.itemId }}'
```

- [ ] **Step 8: Adicionar `IF Erro DOCX` + `UPDATE Item Erro DOCX`**

Mesmo padrão do Task 14 Steps 7–8, adaptando nomes:

`IF Erro DOCX` condition:
```
{{ $('HTTP Preencher Doc Traducao DOCX').first().error !== undefined || $('HTTP Criar Doc Traducao DOCX').first().error !== undefined || $('HTTP DeepL Traduzir DOCX').first().error !== undefined || $('HTTP Copiar DOCX Traducao').first().error !== undefined || $('GDrive Baixar Texto DOCX Traducao').first().error !== undefined }}
```

`UPDATE Item Erro DOCX` query:
```sql
UPDATE traducoes_arquivo_itens
SET status = 'erro',
    mensagem_erro = 'Falha no pipeline DOCX (Drive, DeepL ou Docs)'
WHERE id = '{{ $('Code Preparar Texto DOCX').first().json.itemId }}'
```

- [ ] **Step 9: Conectar de volta ao Loop**

Tanto `UPDATE Item Traducao DOCX` quanto `UPDATE Item Erro DOCX` devem conectar de volta a `Loop Over Itens Traducao` (input 0).

---

## Task 16: n8n — Aggregator de status do projeto após o loop

**Files:**
- New node em n8n: `Postgres Aggregate Status Projeto`

- [ ] **Step 1: Adicionar node aggregator**

Adicionar node Postgres v2.6 conectado ao **output 1** do `Loop Over Itens Traducao` (que dispara apenas quando o loop termina todas as iterações):

- Nome: `Postgres Aggregate Status Projeto`
- Operation: Execute Query
- Query:
```sql
WITH counts AS (
  SELECT
    COUNT(*) FILTER (WHERE status = 'concluido') AS ok,
    COUNT(*) FILTER (WHERE status = 'erro') AS erro,
    COUNT(*) AS total
  FROM traducoes_arquivo_itens
  WHERE projeto_id = '{{ $('Code Detectar Tipo URL').first().json.projetoId }}'
)
UPDATE projetos
SET status = CASE
  WHEN (SELECT erro FROM counts) = (SELECT total FROM counts) THEN 'erro'
  ELSE 'concluido'
END
WHERE id = '{{ $('Code Detectar Tipo URL').first().json.projetoId }}'
```

- [ ] **Step 2: Salvar workflow**

Save (Cmd/Ctrl+S no n8n).

---

## Task 17: n8n — Smoke test: arquivo único PDF

**Files:**
- (testes manuais, sem alteração de arquivos)

- [ ] **Step 1: Criar projeto via webhook**

Run no terminal local:

```bash
curl -X POST https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/processar \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Smoke Test PDF Único",
    "authorName": "Teste",
    "driveLink": "<URL_DE_UM_PDF_VALIDO_NO_DRIVE>",
    "tipo": "traducao_arquivo",
    "idioma": "EN-US"
  }'
```

(Substituir `<URL_DE_UM_PDF_VALIDO_NO_DRIVE>` por um PDF que `BessaAulas AltaBooks` tenha acesso. Pegue qualquer PDF pequeno.)

Expected response: 200 OK (instantâneo).

- [ ] **Step 2: Acompanhar execução no n8n**

Abrir n8n → workflow `1. [Altabooks] Transcrição de Materiais` → tab "Executions". Esperar até a execução terminar (geralmente 30-90s).

Verificar visualmente:
- `Code Detectar Tipo URL` → `isFolder: false`, `id: <fileId>`
- `Switch isFolder` → branch `File` 
- `HTTP Get Metadata Arquivo` → 200, name + mimeType corretos
- `Code Format Single Item` → 1 item
- `Loop Over Itens Traducao` → 1 iteração
- `Insert Item Traducao` → 1 row inserido
- Branch PDF → DeepL → Criar Doc → Preencher → `UPDATE Item Traducao PDF`
- `Postgres Aggregate Status Projeto` rodou

- [ ] **Step 3: Verificar DB**

Via Supabase MCP `execute_sql`:

```sql
SELECT id, nome_projeto, status FROM projetos WHERE nome_projeto = 'Smoke Test PDF Único' ORDER BY created_at DESC LIMIT 1;
```

Expected: status = `concluido`.

```sql
SELECT nome_arquivo, status, drive_url_traduzido, mensagem_erro
FROM traducoes_arquivo_itens
WHERE projeto_id = (SELECT id FROM projetos WHERE nome_projeto = 'Smoke Test PDF Único' ORDER BY created_at DESC LIMIT 1);
```

Expected: 1 row, status = `concluido`, drive_url_traduzido apontando pra Google Doc, mensagem_erro = NULL.

- [ ] **Step 4: Abrir o Doc traduzido no Drive**

Copiar `drive_url_traduzido` no browser. Confirmar:
- Doc abre
- Tem conteúdo traduzido para inglês
- Tamanho compatível com o PDF original

---

## Task 18: n8n — Smoke test: pasta com 1 PDF + 1 DOCX

**Files:**
- (testes manuais)

- [ ] **Step 1: Preparar pasta de teste no Drive**

Criar pasta no Drive da `BessaAulas AltaBooks`. Colocar dentro:
- 1 PDF pequeno (pode reusar o do Task 17)
- 1 DOCX pequeno

Compartilhar a pasta com a credencial (ou colocar em local acessível à conta).

Pegar URL: `https://drive.google.com/drive/folders/<folderId>`.

- [ ] **Step 2: Criar projeto via webhook**

```bash
curl -X POST https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/processar \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Smoke Test Pasta Mista",
    "authorName": "Teste",
    "driveLink": "<URL_DA_PASTA>",
    "tipo": "traducao_arquivo",
    "idioma": "ES"
  }'
```

- [ ] **Step 3: Acompanhar execução no n8n**

Verificar:
- `Switch isFolder` → branch `Folder`
- `Search files and folders Traducao` → 2 items
- `IF Pasta Vazia` → false
- `UPDATE Projeto Traduzindo` rodou
- `Loop Over Itens Traducao` → 2 iterações
- Iteração 1 entrou no branch PDF; Iteração 2 no branch DOCX
- `Postgres Aggregate Status Projeto` rodou ao final

- [ ] **Step 4: Verificar DB e Docs traduzidos**

```sql
SELECT nome_arquivo, tipo_arquivo, status, drive_url_traduzido, idioma
FROM traducoes_arquivo_itens
WHERE projeto_id = (SELECT id FROM projetos WHERE nome_projeto = 'Smoke Test Pasta Mista' ORDER BY created_at DESC LIMIT 1);
```

Expected: 2 rows, ambas com status=`concluido`, idioma=`ES`, drive_url_traduzido válido.

Abrir os 2 Docs traduzidos — devem estar em espanhol.

---

## Task 19: n8n — Smoke test: pasta vazia

**Files:**
- (testes manuais)

- [ ] **Step 1: Preparar pasta vazia (ou só com arquivos não-PDF/DOCX)**

Criar pasta com 1 arquivo `.txt` ou imagem. URL: `https://drive.google.com/drive/folders/<folderId>`.

- [ ] **Step 2: Criar projeto**

```bash
curl -X POST https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/processar \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Smoke Test Pasta Vazia",
    "authorName": "Teste",
    "driveLink": "<URL_DA_PASTA>",
    "tipo": "traducao_arquivo",
    "idioma": "EN-US"
  }'
```

- [ ] **Step 3: Verificar execução e DB**

Execução n8n: branch Folder → Search retornou 0 → `IF Pasta Vazia` → true → `UPDATE Projeto Erro Pasta Vazia` rodou. Loop NUNCA executou.

DB:
```sql
SELECT status FROM projetos WHERE nome_projeto = 'Smoke Test Pasta Vazia';
SELECT COUNT(*) FROM traducoes_arquivo_itens WHERE projeto_id = (SELECT id FROM projetos WHERE nome_projeto = 'Smoke Test Pasta Vazia');
```

Expected: projeto `status='erro'`, count de itens = 0.

- [ ] **Step 4: Cleanup dos projetos de teste**

```sql
DELETE FROM projetos WHERE nome_projeto LIKE 'Smoke Test%';
```

(CASCADE remove itens automaticamente.)

---

## Task 20: Atualizar CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Atualizar a tabela de Stack**

Na seção `## Stack`, na linha de "IA", substituir:

**De:** `| IA           | Gemini 3 Flash via OpenRouter             |`

**Para:** `| IA           | DeepL Pro (tradução) + Gemini 3 Flash via OpenRouter (análise) |`

- [ ] **Step 2: Adicionar `traducoes_arquivo_itens` ao schema documentado**

Após a seção `#### sumarios`, adicionar nova subseção:

```markdown
#### `traducoes_arquivo_itens`
| Coluna              | Tipo          | Default             | Constraint |
| ------------------- | ------------- | ------------------- | ---------- |
| id                  | uuid (PK)     | gen_random_uuid()   |            |
| projeto_id          | uuid (FK)     |                     | -> projetos.id ON DELETE CASCADE, NOT NULL |
| drive_file_id       | varchar       |                     | NOT NULL   |
| nome_arquivo        | varchar       |                     | NOT NULL   |
| tipo_arquivo        | varchar       |                     | NOT NULL, CHECK: pdf, docx |
| idioma              | varchar       |                     | NOT NULL (código DeepL: EN-US, ES, FR, DE, IT, JA) |
| drive_url_traduzido | text          |                     | nullable   |
| status              | varchar       | 'pendente'          | NOT NULL, CHECK: pendente, traduzindo, concluido, erro |
| mensagem_erro       | text          |                     | nullable   |
| created_at          | timestamptz   | now()               |            |
| updated_at          | timestamptz   | now()               | auto via trigger |
```

E adicionar à tabela de indexes:
```markdown
| traducoes_arquivo_itens | idx_traducoes_arquivo_itens_projeto_id | btree        |
```

E à tabela de triggers:
```markdown
| traducoes_arquivo_itens | trg_traducoes_arquivo_itens_updated_at | BEFORE UPDATE  | set_updated_at() |
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): adicionar traducoes_arquivo_itens + nota DeepL"
```

---

## Task 21: Atualizar memória `project_traducao_deepl`

**Files:**
- Modify: `/Users/luizfelipebessa/.claude/projects/-Users-luizfelipebessa-development-Addept-AltaBooks/memory/project_traducao_deepl.md`

- [ ] **Step 1: Adicionar seção sobre `traducao_arquivo`**

Adicionar ao final do arquivo:

```markdown
---

## 2026-05-23 — `traducao_arquivo` também migrou para DeepL

O branch `Traducaoarquivo` do flow `1. [Altabooks] Transcrição de Materiais` foi refatorado:
- Substituídos `HTTP Traduzir PDF` e `HTTP Traduzir DOCX` (Gemini Flash via OpenRouter) por `HTTP DeepL Traduzir PDF` e `HTTP DeepL Traduzir DOCX`.
- Aceita URL de pasta do Drive — lista PDFs/DOCX e processa cada um como 1 row em `traducoes_arquivo_itens`.
- Modal de criação no frontend tem select de idioma (códigos DeepL).
- Status agregado: ≥1 item OK → projeto `concluido`; 100% erro → `erro`.

**Why:** Bug onde URL de pasta dava 404 silencioso + dívida de não ter migrado pra DeepL.
**How to apply:** Ao tocar no branch `traducao_arquivo`, lembrar que agora o `text` enviado pro DeepL é texto plano (sem `tag_handling`) e o response sai em `translations[0].text`.
```

- [ ] **Step 2: Sem commit** (memória vive fora do repo)

---

## Self-Review

Antes de marcar o plano como pronto, foi feito:

- **Spec coverage:** Cada seção do spec tem task correspondente:
  - Frontend validação → Task 5
  - Frontend hint → Task 5
  - Frontend select idioma → Task 4
  - Tipos → Task 2
  - Detalhe page → Task 6
  - n8n detect+switch → Tasks 8–9
  - n8n folder branch → Task 10
  - n8n file branch → Task 11
  - n8n loop + insert → Tasks 12–13
  - n8n DeepL PDF → Task 14
  - n8n DeepL DOCX → Task 15
  - n8n aggregator → Task 16
  - DB migration → Task 1
  - Smoke tests → Tasks 17–19
  - Memory/CLAUDE.md update → Tasks 20–21

- **Placeholders:** Sem `TBD/TODO/implement later` no plano. A única menção de TODO é nota intencional para mover a key DeepL pra credencial (mesmo padrão do Flow 5).

- **Type consistency:** `TraducaoArquivoItem` definido na Task 2 é usado consistentemente na Task 6 (`as TraducaoArquivoItem[]`).

- **Field names:** `IDIOMAS_TRADUCAO[i].code` (verificado em `src/lib/idiomas.ts` — não é `codigo`).
