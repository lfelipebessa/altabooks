# Session Recap — 2026-05-20

Handoff document. Tudo que foi feito nessa sessão, estado final, e o que vem a seguir.

## TL;DR

Três entregas grandes:

1. **Download de artefatos** (Executivo/Sumário/Livro/Tradução em DOCX+PDF) — **pushed pro GitHub**.
2. **Agente Verde Fase 0.B** (módulo novo com mockups + scaffold React + dados mock) — **commitado local, NÃO pushed**.
3. **Fase 1A — Permissões + Admin UI** (sistema de roles real no Supabase, substitui whitelist hardcoded) — **commitado local + migration aplicada em produção, NÃO pushed**.

**29 commits locais aguardando push**. Push é seguro (fast-forward).

## Estado do git

- Branch: `main`
- Último commit em origin: `c3dae97` (mockups Agente Verde, do início da sessão)
- HEAD local: `80b95a7`
- Commits ahead: **29** (lista no final)

## Estado do Supabase (produção `tddolcrzmczvoqxkajic`)

**4 migrations novas aplicadas:**

| Versão | Nome | O que faz |
|---|---|---|
| 20260520235704 | `fase_1a_permissoes` | Cria `profiles`, `user_modules`, RLS, trigger, seed |
| 20260520235951 | `fase_1a_lock_handle_new_user` | Revoke EXECUTE de anon/authenticated |
| 20260521000019 | `fase_1a_lock_handle_new_user_public` | Revoke EXECUTE de PUBLIC (lockdown completo) |
| 20260521000656 | `fase_1a_fix_rls_recursion` | Cria `is_admin()` SECURITY DEFINER, recria policies sem EXISTS recursivo |

**Tabelas novas:**
- `public.profiles` (id uuid PK refs auth.users, email, display_name, created_at) — RLS on, 1 policy "authenticated read all".
- `public.user_modules` (user_id, module_slug PK, granted_at, granted_by) — RLS on, 3 policies.

**Função nova:**
- `public.is_admin()` — SECURITY DEFINER, executável só por authenticated. Quebra a recursão das policies em user_modules.
- `public.handle_new_user()` — trigger que popula profiles ao criar auth.users. SECURITY DEFINER, EXECUTE só pra postgres/service_role (não chamável via REST API).

**Trigger:**
- `on_auth_user_created` em `auth.users` AFTER INSERT → roda `handle_new_user()`.

**Usuários e módulos atuais:**

| Email | Módulos |
|---|---|
| bessalfs@gmail.com (Luiz, admin) | admin, agente_verde, ghostwriter |
| admin@addept.com.br | ghostwriter (backfill) |
| viviane@altabooks.com.br | ghostwriter (backfill) |

## Arquitetura de permissões

**Módulos** (constantes no frontend, strings livres no banco):
- `ghostwriter` — geração de livros (área existente da Alta)
- `agente_verde` — catalogação automática (módulo novo)
- `admin` — acesso à tela de gerenciamento de permissões

**Frontend** (`src/lib/permissions.ts`):
- `MODULES: readonly Module[]` — constante com slug+label
- `useUserModules()` — hook que busca módulos do usuário logado
- `useHasModule(slug)` — derivado, retorna boolean
- `useAllUsersWithModules()` — admin only, lista todos
- `grantModule(userId, slug, grantedBy)` / `revokeModule(userId, slug)` — async, RLS protege

**Componente `<ModuleRoute slug="...">`** (`src/components/ModuleRoute.tsx`):
- Substitui o antigo `AgenteVerdeRoute` (deletado).
- Wrappeia `ProtectedRoute` + checa módulo.
- Sem módulo → redirect `/sem-acesso`.

**Rotas em App.tsx:**
- `/` (Listagem Projetos) → `ModuleRoute slug="ghostwriter"`
- `/projetos/:id` → `ModuleRoute slug="ghostwriter"`
- `/agente-verde` → `ModuleRoute slug="agente_verde"`
- `/agente-verde/lote/:id` → `ModuleRoute slug="agente_verde"`
- `/admin/permissoes` → `ModuleRoute slug="admin"`
- `/sem-acesso`, `/conta` → `ProtectedRoute` (sem módulo)
- `/login`, `/reset-password` → públicas

**TopBar dinâmico:** mostra links Projetos / Agente Verde / Admin + botão Novo Projeto baseado em `modules`.

## O que foi entregue (features)

### 1. Download de artefatos (Fase pré-Agente-Verde)

- Lib `src/lib/download.ts` — slug, filename, downloadDocx, downloadPdf (pdfmake lazy).
- Lib `src/lib/buildHtml.ts` — buildExecutivoHtml/buildSumarioHtml/buildLivroHtml/buildTraducaoHtml.
- Componente `<DownloadButton>` reutilizável com dropdown DOCX/PDF + variant ghost.
- Integrado em ExecutivoPanel, SumarioCard, aba Livro, aba Tradução do DetalheProjeto.
- 22 testes vitest cobrindo as pure functions.

### 2. Agente Verde Fase 0.B (React scaffold)

- Spec: `docs/superpowers/specs/2026-05-20-agente-verde-fase-0b-design.md`
- Plano: `docs/superpowers/plans/2026-05-20-agente-verde-fase-0b.md`
- Mockups: `docs/superpowers/mockups/agente-verde/` (já pushed)
- Tipos: `src/types/agenteVerde.ts` — Lote, Item, BookInfo, Metagrafica
- Mock data: `src/data/agenteVerdeMock.ts` — 4 lotes + 12 itens
- Páginas: `src/pages/AgenteVerde/Listagem.tsx`, `Revisao.tsx`
- Componentes: 8 arquivos em `src/components/AgenteVerde/`
- Toda navegação funciona; tudo é mock em memória (sem persistência).

### 3. Fase 1A — Permissões + Admin UI

- Spec: `docs/superpowers/specs/2026-05-20-fase-1a-permissoes-admin-design.md`
- Plano: `docs/superpowers/plans/2026-05-20-fase-1a-permissoes-admin.md`
- Schema Supabase aplicado (4 migrations).
- Frontend: `src/lib/permissions.ts`, `src/components/ModuleRoute.tsx`
- Páginas: `src/pages/SemAcesso.tsx`, `src/pages/Admin/Permissoes.tsx`
- Refactor: `App.tsx` + `TopBar.tsx`.
- Cleanup: deletados `agenteVerdeAccess.ts`, `agenteVerdeAccess.test.ts`, `AgenteVerdeRoute.tsx`.

## Bug encontrado e corrigido nesta sessão

**RLS Recursão Infinita** (`ERROR 42P17` em Postgres). Policy original tentava `EXISTS (SELECT 1 FROM user_modules WHERE module_slug='admin')` dentro de policy sobre `user_modules` — recursão impossível de resolver. Sintoma: usuários (mesmo admin) viam `/sem-acesso` porque a query retornava vazio.

**Fix:** função `public.is_admin()` SECURITY DEFINER que bypassa RLS internamente. Policies passam a chamar essa função em vez do EXISTS.

**Lição aprendida** (para futuro): RLS policy em uma tabela NUNCA deve fazer subquery na própria tabela. Usar SECURITY DEFINER function.

## Estado de verificação

- ✅ `npm run build` passa
- ✅ `npm run test:run` — 22 passing
- ⚠️ `npm run lint` — 3 errors + 1 warning, **todos pré-existentes em código antigo** (`useCapitulos`, `useCapitulosTraduzidos`, `DetalheProjeto`). Nada de novo introduzido.
- ⚠️ Verificação manual no browser pendente (último teste mostrou `/sem-acesso` antes do fix de RLS — provavelmente OK agora, mas usuário ainda não confirmou após o fix).

## Pendências (críticas pra ser feito agora)

1. **Confirmar no browser** que F5 logado como bessalfs mostra tudo certo.
2. **Push pro GitHub** dos 29 commits locais.

## Pendências (não-críticas, depois)

### Pré-existentes (não criados por esta sessão, mas devem ser tratados)

- **11 tabelas sem RLS** (`projetos`, `traducoes`, `transcricoes_resumos`, `rag_chunks`, `documents`, `sumarios`, `capitulos_traducao`, `capitulos`, `index_arquivos`, `memory`, `request`). ERROR no advisor. Anon key vaza tudo. Tratar como Fase 2 dedicada — ligar RLS sem policies quebra o app.
- **`memory.session_id` exposto** sem RLS. ERROR.
- 3 funções com `search_path` mutável (`match_documents`, `set_traducoes_updated_at`, `set_updated_at`). WARN.
- Extensão `vector` em schema `public`. WARN (deveria estar em schema próprio).
- Leaked Password Protection desabilitada no Auth (Supabase / HaveIBeenPwned).

### Decisões em aberto pro Agente Verde Fase 1B+

- Convenção de nomenclatura das pastas no Drive — Anderson.
- Template definitivo da planilha técnica — Anderson.
- ISBN digital: vem no prelo ou é gerado? — Cristiane.
- 4 bases de conhecimento (BISAC PT-BR, briefs das 16 marcas, taxonomia Metagráfica, mapeamento ME202204V4 + v.2023).
- Fórmulas exatas de lombada/peso/dimensões — Anderson.
- 3-5 exemplos reais de catalogação manual pra calibrar prompt.

### Melhorias técnicas adiáveis

- **Realtime nas permissões**: hoje admin libera, usuário precisa F5. Adicionar Supabase channel subscription em `useUserModules` → fica reactive.
- **Histórico/audit de mudanças** em `user_modules` (UI consultar).
- **Convite de usuário pelo admin** (signup hoje é via Supabase auth UI).
- **Self-promote admin via UI** (hoje desabilitado por anti-lockout; pra mudar, SQL no Studio).

## Próximos passos lógicos

**Para hoje/amanhã (sexta-feira):**
1. Hard refresh no browser e validar fluxo de bessalfs (Projetos, Agente Verde, Admin todos visíveis).
2. Push pro GitHub (29 commits — squash ou individuais, decisão do user).
3. Demo informal pra Gabriel/Cristiane/Anderson/Gorki na sexta — eles abrem o site, logam, vêem os módulos.

**Para depois (Fase 1B do Agente Verde, quando os artefatos chegarem):**
1. Integração Google Drive (busca de pasta por ISBN, validação dos 3 arquivos).
2. Extração de PDF (texto + imagem da capa, texto do miolo).
3. Parse da planilha técnica.
4. Fluxo n8n Flow 6 — Agente Verde.

**Para depois (Fase 1C):**
1. Knowledge base populada (BISAC, marcas, taxonomia, templates).
2. Claude API + retrieval.
3. Cálculos derivados.
4. Geração das planilhas finais.

**Sempre na fila:**
- Fechar os advisors de segurança pré-existentes (RLS nas 11 tabelas, search_path nas funções).

## 29 commits locais (chronological)

```
80b95a7 docs(fase-1a): atualizar SQL com fix de RLS recursion e lockdown de handle_new_user
30ca030 fix(permissions): silenciar lint setState-in-effect para fetch-on-mount
62cc196 refactor(permissions): remover whitelist hardcoded do Agente Verde
5d0b106 feat(permissions): TopBar com links condicionais dinamicos
f533d0d feat(permissions): rotas refatoradas com ModuleRoute
1468441 feat(permissions): adicionar pagina admin de permissoes
5d5bf61 feat(permissions): adicionar pagina sem-acesso
919ea6b feat(permissions): adicionar ModuleRoute generico
ddc5417 feat(permissions): adicionar hooks e MODULES constant
386af96 docs(fase-1a): plano de implementacao de permissoes + admin
544c5dc docs(fase-1a): design spec de permissoes + admin UI
4c21690 fix(agente-verde): substituir useEffect de reset por padrao prevId em render
3a30f21 feat(agente-verde): adicionar pagina de revisao e rota
e996f4a feat(agente-verde): adicionar ItemDetailEditor com tabs
6bebd46 feat(agente-verde): adicionar MetagraficaForm
1333ffc feat(agente-verde): adicionar BookInfoForm
b3cf77b feat(agente-verde): adicionar ItemSidebar com filtros
26d7d86 feat(agente-verde): adicionar componente ItemRow
5a8bb54 feat(agente-verde): adicionar pagina de listagem e rota
d6c2456 feat(agente-verde): adicionar modal de upload
3aa84d4 feat(agente-verde): adicionar componente LoteCard
c530bb2 feat(agente-verde): adicionar banner de versao de validacao
41c4c02 feat(agente-verde): adicionar link condicional no TopBar
a2bd71a feat(agente-verde): adicionar wrapper de rota com gating
1c17a51 feat(agente-verde): adicionar dados mock para 4 lotes
799a9a7 feat(agente-verde): adicionar whitelist de acesso e hook
8d8ea3d feat(agente-verde): adicionar tipos TypeScript do dominio
3718284 docs(agente-verde): plano de implementacao da Fase 0.B
d860c9d docs(agente-verde): design spec da Fase 0.B (React scaffold)
```
