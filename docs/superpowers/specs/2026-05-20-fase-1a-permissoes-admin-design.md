# Fase 1A — Sistema de Permissões + Tela de Admin

**Status:** Aprovado pendente review
**Data:** 2026-05-20
**Deadline alvo:** sexta-feira 2026-05-22 (~48h)

## Objetivo

Substituir a whitelist hardcoded da Fase 0.B por um sistema real de permissões por módulo, armazenado no Supabase, gerenciável via UI por administradores. Aplicar gating ao módulo existente (Ghostwriter, hoje em `/`) e ao novo (Agente Verde). Adicionar uma tela `/admin` onde quem tem permissão de admin libera/revoga módulos para usuários.

## Motivação

Confirmado pelo gestor (Gabriel Brocco, 20/05/2026):

> "aquele esquema de autorização por usuário, para que somente os específicos consigam visualizar os módulos. Tanto o atual do livro quanto o outro. Que eles vão centralizar bastante coisa nessa plataforma."

> "admin com acesso pra liberações, e o restante dos usuários só consegue visualizar com base no que foi liberado."

A Fase 0.B explicitamente marcou o whitelist hardcoded em `src/lib/agenteVerdeAccess.ts` como placeholder a ser substituído. É o momento.

## Escopo

**Inclui:**

- Tabela `public.profiles` espelhando `auth.users` (alimentada por trigger) — permite frontend listar usuários sem service_role.
- Tabela `public.user_modules` armazenando quais módulos cada usuário acessa.
- RLS configurada: usuário lê o que é seu, admin lê/escreve tudo.
- Migration com seed: bessalfs@gmail.com vira admin + recebe `ghostwriter` + `agente_verde`. Todos os usuários atuais ganham `ghostwriter` automaticamente pra não perder acesso.
- Hook `useUserModules()` retornando `{ modules: Set<string>, loading, error }`.
- Hook `useHasModule(slug: string)` derivado do anterior.
- Componente `<ModuleRoute slug="...">` genérico — substitui `AgenteVerdeRoute`.
- Refactor: remoção do `src/lib/agenteVerdeAccess.ts` e migração de chamadores pro hook novo.
- Gate de `/` com módulo `ghostwriter`.
- Gate de `/agente-verde` e `/agente-verde/lote/:id` com módulo `agente_verde`.
- TopBar dinâmico: mostra "Projetos", "Agente Verde", "Admin" condicionalmente baseado nos módulos do usuário.
- Página `/admin/permissoes` listando todos os usuários com toggles por módulo. Salvar persiste no Supabase imediatamente.
- Página "sem acesso" pra usuários autenticados que não têm nenhum módulo ainda.
- 3 módulos cadastrados: `ghostwriter`, `agente_verde`, `admin`.

**Não inclui:**

- Convite de novos usuários pelo admin (signup continua via Supabase auth padrão; assim que o usuário se cadastra, aparece na lista do admin).
- Audit log de quem liberou o quê (campo `granted_by` é guardado mas não há UI pra consultar histórico).
- Realtime: ao admin liberar um módulo, o usuário precisa dar F5 pra ver. Sem subscription Supabase.
- Edição de email/nome no profile pelo admin (read-only).
- Múltiplos admins gerenciando em paralelo com lock — last-write-wins é aceitável pro volume.
- Audit/log de quem acessou o quê.

## Decisões técnicas

### Schema

```sql
-- Espelho de auth.users pra consulta sem service_role
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz default now()
);

-- Trigger: ao criar usuario, popular profile automaticamente
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: criar profiles pros usuarios que ja existem
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- Acesso a modulos
create table public.user_modules (
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_slug text not null,
  granted_at timestamptz default now(),
  granted_by uuid references public.profiles(id),
  primary key (user_id, module_slug)
);

create index idx_user_modules_user on public.user_modules(user_id);
```

### Módulos cadastrados

Não há tabela de "módulos disponíveis" — slugs são strings livres no banco, mas o frontend e o admin UI usam uma lista fechada conhecida:

```ts
export const MODULES = [
  { slug: 'ghostwriter',  label: 'Projetos (Livros)' },
  { slug: 'agente_verde', label: 'Agente Verde' },
  { slug: 'admin',        label: 'Administrador' },
] as const
```

Adicionar novo módulo no futuro = adicionar uma entry nessa constante + rows na tabela. Sem migration.

### RLS

```sql
alter table public.profiles enable row level security;
alter table public.user_modules enable row level security;

-- profiles: qualquer usuario autenticado le todos os profiles
-- (precisamos disso pro admin UI listar usuarios; nao ha info sensivel aqui)
create policy "authenticated read profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- user_modules: usuario le suas proprias rows
create policy "users read own modules"
  on public.user_modules for select
  to authenticated
  using (user_id = auth.uid());

-- user_modules: admin le tudo
create policy "admin read all modules"
  on public.user_modules for select
  to authenticated
  using (
    exists (
      select 1 from public.user_modules
      where user_id = auth.uid() and module_slug = 'admin'
    )
  );

-- user_modules: so admin escreve
create policy "admin write modules"
  on public.user_modules for all
  to authenticated
  using (
    exists (
      select 1 from public.user_modules
      where user_id = auth.uid() and module_slug = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_modules
      where user_id = auth.uid() and module_slug = 'admin'
    )
  );
```

**Bootstrap (chicken-and-egg):** o primeiro admin precisa ser criado fora das policies. Migration faz isso via insert direto (roda com service_role):

```sql
-- Seed: bessalfs vira admin + ganha todos os modulos
insert into public.user_modules (user_id, module_slug)
select id, 'admin' from auth.users where email = 'bessalfs@gmail.com'
on conflict do nothing;

insert into public.user_modules (user_id, module_slug)
select id, 'ghostwriter' from auth.users where email = 'bessalfs@gmail.com'
on conflict do nothing;

insert into public.user_modules (user_id, module_slug)
select id, 'agente_verde' from auth.users where email = 'bessalfs@gmail.com'
on conflict do nothing;

-- Backfill: TODOS os usuarios atuais ganham ghostwriter (pra nao quebrar acesso existente)
insert into public.user_modules (user_id, module_slug)
select id, 'ghostwriter' from auth.users
on conflict do nothing;
```

### Frontend

**Hook `useUserModules`**: subscribe a profile e modules na montagem, retorna `Set<string>`.

```ts
// src/lib/permissions.ts
export interface UserModulesState {
  modules: Set<string>
  loading: boolean
  error: string | null
}

export function useUserModules(): UserModulesState { /* ... */ }
export function useHasModule(slug: string): boolean { /* derived */ }
```

Internamente, faz `supabase.from('user_modules').select('module_slug').eq('user_id', auth.uid())`. RLS filtra; o usuário só vê as suas (ou admin vê tudo, mas o hook filtra por `user_id` no SELECT mesmo assim).

**Componente `<ModuleRoute slug="...">`**: genérico.

```tsx
// src/components/ModuleRoute.tsx
export const ModuleRoute: React.FC<{ slug: string; children: React.ReactNode }> = ({ slug, children }) => {
  const { modules, loading } = useUserModules()
  if (loading) return <CentralizedLoader />
  return (
    <ProtectedRoute>
      {modules.has(slug) ? <>{children}</> : <Navigate to="/sem-acesso" replace />}
    </ProtectedRoute>
  )
}
```

Substitui o `AgenteVerdeRoute`. Apaga `src/lib/agenteVerdeAccess.ts` e o teste correspondente.

**Routing (`src/App.tsx`)** final:

```tsx
<Route path="/" element={
  <ModuleRoute slug="ghostwriter"><ListagemProjetos /></ModuleRoute>
} />
<Route path="/projetos/:id" element={
  <ModuleRoute slug="ghostwriter"><DetalheProjeto /></ModuleRoute>
} />
<Route path="/agente-verde" element={
  <ModuleRoute slug="agente_verde"><AgenteVerdeListagem /></ModuleRoute>
} />
<Route path="/agente-verde/lote/:id" element={
  <ModuleRoute slug="agente_verde"><AgenteVerdeRevisao /></ModuleRoute>
} />
<Route path="/admin/permissoes" element={
  <ModuleRoute slug="admin"><AdminPermissoes /></ModuleRoute>
} />
<Route path="/sem-acesso" element={<ProtectedRoute><SemAcesso /></ProtectedRoute>} />
<Route path="/conta" element={<ProtectedRoute><Conta /></ProtectedRoute>} />
```

**TopBar dinâmico**: usa `useUserModules` direto. Cada link é condicional:

```tsx
{modules.has('ghostwriter') && <Link to="/">Projetos</Link>}
{modules.has('agente_verde') && <Link to="/agente-verde">Agente Verde</Link>}
{modules.has('admin') && <Link to="/admin/permissoes">Admin</Link>}
```

E o botão "Novo Projeto" da TopBar só aparece se tem `ghostwriter`.

### Página de Admin (`/admin/permissoes`)

Layout simples — sem master-detail, sem mockup novo (não precisa, já temos o design system):

```
TopBar
─────────────────────────────────────────────────
[Banner] "Administração — gerenciamento de acesso"

Buscar usuário... [_____]

┌──────────────────────────────────────────────────┐
│ Usuário                  Projetos AV  Admin      │
│ ────────────────────────────────────────────────│
│ Cristiane Mutus            ☐    ☑    ☐          │
│ cristiane@altabooks...                            │
│ ────────────────────────────────────────────────│
│ Anderson Vieira            ☐    ☑    ☐          │
│ anderson@altabooks...                             │
│ ────────────────────────────────────────────────│
│ Luiz Bessa (você)          ☑    ☑    ☑          │
│ bessalfs@gmail.com         ── não editável ──    │
└──────────────────────────────────────────────────┘
```

Cada toggle:
- Verde quando ligado / cinza quando desligado
- Clicar → INSERT ou DELETE na tabela `user_modules`
- Otimista (atualiza UI antes da confirmação do banco), com rollback em caso de erro
- Toast/feedback visual mínimo após cada ação

**Salvaguarda anti-tiro-no-pé:** os toggles da própria linha do admin ficam **desabilitados** na UI. Pra rebaixar a si mesmo (ou ajustar próprios módulos), admin executa SQL no Supabase Studio. Simples, previne auto-lockout acidental, e admin raramente precisa editar a si mesmo.

### Página "Sem Acesso" (`/sem-acesso`)

Página simples mostrada pra usuário autenticado sem nenhum módulo:

```
TopBar (sem links de módulos)
─────────────────────────────────
        Bem-vindo à Alta Books

Você ainda não tem acesso a nenhum módulo. Aguarde
um administrador liberar.

[Botão: Sair]   [Email: admin@...]
```

Sem auto-refresh — usuário pode dar F5 quando souber que foi liberado.

### Estrutura de arquivos

**Criar:**
- `src/lib/permissions.ts` — hooks + constante MODULES
- `src/components/ModuleRoute.tsx` — wrapper genérico
- `src/pages/SemAcesso.tsx` — landing
- `src/pages/Admin/Permissoes.tsx` — UI de admin
- `supabase/migrations/<timestamp>_add_profiles_user_modules.sql` — schema + seed
- `src/lib/permissions.test.ts` — testes do hook (mockando supabase)

**Modificar:**
- `src/App.tsx` — refactor de rotas (todas usam `ModuleRoute` exceto `/conta`, `/login`, `/reset-password`, `/sem-acesso`)
- `src/components/TopBar.tsx` — links condicionais baseados em modules
- `src/pages/AgenteVerde/Listagem.tsx` — não precisa mudar; `TopBar.onNewProject` continua igual mas pode ser desabilitado se não tiver ghostwriter
- `src/pages/AgenteVerde/Revisao.tsx` — idem

**Remover:**
- `src/lib/agenteVerdeAccess.ts`
- `src/lib/agenteVerdeAccess.test.ts`
- `src/components/AgenteVerdeRoute.tsx`

## Edge cases

1. **Usuário sem módulo nenhum:** redirect pra `/sem-acesso`. Página tem botão Sair e info do admin pra contato.
2. **Admin tenta editar a própria linha:** toggles desabilitados na UI. Pra alterar módulos próprios, executar SQL direto no Supabase Studio.
3. **Token expirado durante uso:** `useUserModules` recebe erro → exibe estado "Sessão expirada, faça login novamente". `ProtectedRoute` já cuida do redirect.
4. **Race condition de toggle:** o usuário clica rápido várias vezes. Estado otimista + rollback em erro. UI mostra spinner por linha enquanto operação pendente.
5. **Novo signup:** trigger cria profile automaticamente. Usuário aparece na listagem do admin com **zero módulos**. Admin libera explicitamente.
6. **Bessalfs perde admin acidentalmente (bug):** SQL de recuperação no spec — admin executa manualmente no Supabase Studio:
   ```sql
   insert into user_modules (user_id, module_slug)
   select id, 'admin' from auth.users where email = 'bessalfs@gmail.com'
   on conflict do nothing;
   ```

## Riscos

| Risco | Mitigação |
|---|---|
| Migration aplicada mas alguém em produção perde acesso | Backfill na migration garante todos os atuais mantêm `ghostwriter`. Testar em branch Supabase antes de aplicar em main. |
| RLS mal configurada deixa usuário sem acesso ler tudo | Testar manualmente após migração: logar como user não-admin e tentar ler user_modules de outros — deve dar zero rows. |
| Self-lockout (admin remove próprio acesso sem querer) | Modal de confirmação no toggle. SQL de recuperação documentado. |
| F5 pra ver liberação é UX ruim | Aceitável pra MVP. Realtime via Supabase channels fica pra Fase 1B. |
| Trigger `handle_new_user` falha silenciosamente em algum signup | `security definer` + try/catch implícito. Pior caso: admin precisa criar profile manualmente. Raro, aceitável. |
| Deadline apertado, escopo não fecha | Cortar primeiro: ordenação/busca da lista de usuários, polish visual da admin UI. Não cortar: schema, RLS, gating. |

## Critérios de aceite

- [ ] Migration aplicada cria tabelas profiles + user_modules com RLS ativa.
- [ ] Trigger preenche profile ao criar usuário em auth.users.
- [ ] Backfill garantiu que todos os usuários atuais têm `ghostwriter`.
- [ ] Seed garantiu que `bessalfs@gmail.com` tem `admin`, `ghostwriter`, `agente_verde`.
- [ ] Logando como bessalfs: vê "Projetos", "Agente Verde", "Admin" no TopBar.
- [ ] Logando como usuário hipotético sem módulos: vai pra `/sem-acesso`.
- [ ] Logando como usuário com só `ghostwriter`: TopBar mostra só "Projetos", `/agente-verde` redireciona pra `/sem-acesso`.
- [ ] `/admin/permissoes` lista todos os usuários e seus módulos.
- [ ] Toggle de módulo no admin persiste no banco e atualiza UI.
- [ ] Tentar remover próprio `admin` mostra confirmação.
- [ ] `src/lib/agenteVerdeAccess.ts` foi removido. Nenhuma referência sobrou no código.
- [ ] `npm run build`, `npm run lint`, `npm run test:run` passam sem novos erros.
