# Fase 1A — Permissões + Admin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir whitelist hardcoded por sistema de permissões real (Supabase) com tabela `user_modules`, gating genérico em rotas, TopBar dinâmico e tela `/admin/permissoes` pra gerenciar acessos.

**Architecture:** Uma tabela `user_modules` (user_id, module_slug) com RLS. Hook genérico `useUserModules()` retorna `Set<string>`. Componente `<ModuleRoute slug="...">` substitui o `AgenteVerdeRoute` específico. Admin UI lê profiles + user_modules de todos, toggles INSERT/DELETE rows.

**Tech Stack:** Supabase (PostgreSQL 17, RLS, triggers, MCP). React 19 + TypeScript + react-router-dom 7.

**Spec:** `docs/superpowers/specs/2026-05-20-fase-1a-permissoes-admin-design.md`

---

> **✅ STATUS (2026-05-20): IMPLEMENTAÇÃO CONCLUÍDA.** Todos os steps de código/migration/commit executados e commitados. Migration aplicada no Supabase de produção (`tddolcrzmczvoqxkajic`) incluindo o fix de RLS recursion (`is_admin()`). Os checkboxes de **checklist manual de browser** (Task 9, Step 4) ficam desmarcados — são pra o testador confirmar no navegador. Detalhes em `docs/superpowers/SESSION-RECAP-2026-05-20.md`.

---

## Resumo de arquivos

**Criar:**
- `src/lib/permissions.ts` — MODULES constant + useUserModules + useHasModule + useAllUsersWithModules
- `src/components/ModuleRoute.tsx` — wrapper genérico de rota
- `src/pages/SemAcesso.tsx` — landing pra usuários sem módulo
- `src/pages/Admin/Permissoes.tsx` — UI de gerenciamento

**Modificar:**
- `src/App.tsx` — rotas usam ModuleRoute, adiciona /sem-acesso e /admin/permissoes
- `src/components/TopBar.tsx` — links condicionais dinâmicos

**Remover:**
- `src/lib/agenteVerdeAccess.ts`
- `src/lib/agenteVerdeAccess.test.ts`
- `src/components/AgenteVerdeRoute.tsx`

**Supabase (via MCP):**
- Tabelas `public.profiles` e `public.user_modules`
- Trigger `handle_new_user`
- 4 políticas RLS
- Seeds (bessalfs admin + backfill ghostwriter)

---

## Task 1: Aplicar migration Supabase

**Files:** (nenhum no repo — toda a mudança é no banco via MCP)

- [x] **Step 1: Aplicar migration `fase_1a_permissoes`**

Usar a MCP tool `mcp__plugin_supabase_supabase__apply_migration` com:

- `name`: `fase_1a_permissoes`
- `project_id`: `tddolcrzmczvoqxkajic`
- `query`:

```sql
-- =========================================
-- Profiles (espelho de auth.users)
-- =========================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz default now()
);

-- Trigger: ao criar usuario em auth.users, criar profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: criar profiles pros usuarios que ja existem
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- =========================================
-- User modules
-- =========================================
create table if not exists public.user_modules (
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_slug text not null,
  granted_at timestamptz default now(),
  granted_by uuid references public.profiles(id),
  primary key (user_id, module_slug)
);

create index if not exists idx_user_modules_user on public.user_modules(user_id);

-- =========================================
-- RLS
-- =========================================
alter table public.profiles enable row level security;
alter table public.user_modules enable row level security;

drop policy if exists "authenticated read profiles" on public.profiles;
create policy "authenticated read profiles"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "users read own modules" on public.user_modules;
create policy "users read own modules"
  on public.user_modules for select
  to authenticated
  using (user_id = auth.uid());

-- IMPORTANTE: funcao SECURITY DEFINER evita recursao infinita na policy
-- (policy em user_modules consultando user_modules diretamente dispara
-- ERROR 42P17). A funcao roda com privilegios do owner, bypassando RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_modules
    where user_id = auth.uid() and module_slug = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "admin read all modules" on public.user_modules;
create policy "admin read all modules"
  on public.user_modules for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admin write modules" on public.user_modules;
create policy "admin write modules"
  on public.user_modules for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- handle_new_user: trava EXECUTE pra so postgres/service_role
-- (impedir chamada via /rest/v1/rpc/handle_new_user)
revoke execute on function public.handle_new_user() from public;

-- =========================================
-- Seed inicial
-- =========================================
-- bessalfs vira admin + ganha todos os modulos
insert into public.user_modules (user_id, module_slug)
select id, 'admin' from auth.users where email = 'bessalfs@gmail.com'
on conflict do nothing;

insert into public.user_modules (user_id, module_slug)
select id, 'ghostwriter' from auth.users where email = 'bessalfs@gmail.com'
on conflict do nothing;

insert into public.user_modules (user_id, module_slug)
select id, 'agente_verde' from auth.users where email = 'bessalfs@gmail.com'
on conflict do nothing;

-- Backfill ghostwriter pra TODOS os usuarios atuais
insert into public.user_modules (user_id, module_slug)
select id, 'ghostwriter' from auth.users
on conflict do nothing;
```

- [x] **Step 2: Verificar via MCP**

Usar `mcp__plugin_supabase_supabase__list_tables` (schemas: `['public']`) e confirmar que `profiles` e `user_modules` aparecem.

Usar `mcp__plugin_supabase_supabase__execute_sql` com:
```sql
select p.email, array_agg(um.module_slug order by um.module_slug) as modulos
from public.profiles p
left join public.user_modules um on um.user_id = p.id
group by p.email
order by p.email;
```

Expected: bessalfs@gmail.com aparece com `{admin, agente_verde, ghostwriter}`. Demais usuários (se houver) com `{ghostwriter}`.

- [x] **Step 3: Verificar advisors**

Usar `mcp__plugin_supabase_supabase__get_advisors` com `type='security'`. Esperado: sem novos avisos críticos relacionados às tabelas criadas (RLS está habilitada).

- [x] **Step 4: Nada a commitar no repo**

A migration vive no Supabase. Pular pro Task 2.

---

## Task 2: Criar `src/lib/permissions.ts`

**Files:**
- Create: `src/lib/permissions.ts`

- [x] **Step 1: Criar arquivo com constante MODULES + hooks**

Write file `src/lib/permissions.ts`:

```ts
import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../contexts/AuthContext'

export interface Module {
  slug: string
  label: string
}

export const MODULES: readonly Module[] = [
  { slug: 'ghostwriter',  label: 'Projetos (Livros)' },
  { slug: 'agente_verde', label: 'Agente Verde' },
  { slug: 'admin',        label: 'Administrador' },
] as const

export interface UserModulesState {
  modules: Set<string>
  loading: boolean
  error: string | null
}

export function useUserModules(): UserModulesState {
  const { user, loading: authLoading } = useAuth()
  const [modules, setModules] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (authLoading) return
    if (!user) {
      setModules(new Set())
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    supabase
      .from('user_modules')
      .select('module_slug')
      .eq('user_id', user.id)
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          setError(err.message)
          setModules(new Set())
        } else {
          setModules(new Set((data ?? []).map(r => r.module_slug)))
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, authLoading])

  return { modules, loading: loading || authLoading, error }
}

export function useHasModule(slug: string): boolean {
  const { modules } = useUserModules()
  return modules.has(slug)
}

// Admin-only: lista todos os usuarios e seus modulos
export interface UserWithModules {
  id: string
  email: string
  display_name: string | null
  modules: Set<string>
}

export interface AllUsersState {
  users: UserWithModules[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAllUsersWithModules(): AllUsersState {
  const [users, setUsers] = useState<UserWithModules[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const refetch = useCallback(() => setVersion(v => v + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      supabase.from('profiles').select('id, email, display_name').order('email'),
      supabase.from('user_modules').select('user_id, module_slug'),
    ]).then(([profilesRes, modulesRes]) => {
      if (cancelled) return
      if (profilesRes.error) { setError(profilesRes.error.message); setLoading(false); return }
      if (modulesRes.error)  { setError(modulesRes.error.message);  setLoading(false); return }

      const modulesByUser = new Map<string, Set<string>>()
      for (const row of modulesRes.data ?? []) {
        const set = modulesByUser.get(row.user_id) ?? new Set<string>()
        set.add(row.module_slug)
        modulesByUser.set(row.user_id, set)
      }

      setUsers((profilesRes.data ?? []).map(p => ({
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        modules: modulesByUser.get(p.id) ?? new Set<string>(),
      })))
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [version])

  return { users, loading, error, refetch }
}

// Admin-only: grant/revoke a module
export async function grantModule(userId: string, slug: string, grantedBy: string): Promise<void> {
  const { error } = await supabase
    .from('user_modules')
    .insert({ user_id: userId, module_slug: slug, granted_by: grantedBy })
  if (error) throw new Error(error.message)
}

export async function revokeModule(userId: string, slug: string): Promise<void> {
  const { error } = await supabase
    .from('user_modules')
    .delete()
    .eq('user_id', userId)
    .eq('module_slug', slug)
  if (error) throw new Error(error.message)
}
```

- [x] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [x] **Step 3: Commit**

```bash
git add src/lib/permissions.ts
git commit -m "feat(permissions): adicionar hooks e MODULES constant"
```

---

## Task 3: Criar `ModuleRoute` genérico

**Files:**
- Create: `src/components/ModuleRoute.tsx`

- [x] **Step 1: Criar componente**

Write file `src/components/ModuleRoute.tsx`:

```tsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { ProtectedRoute } from './ProtectedRoute'
import { useUserModules } from '../lib/permissions'

interface ModuleRouteProps {
  slug: string
  children: React.ReactNode
}

export const ModuleRoute: React.FC<ModuleRouteProps> = ({ slug, children }) => {
  return (
    <ProtectedRoute>
      <ModuleGuard slug={slug}>{children}</ModuleGuard>
    </ProtectedRoute>
  )
}

const ModuleGuard: React.FC<ModuleRouteProps> = ({ slug, children }) => {
  const { modules, loading } = useUserModules()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <Loader2 className="w-8 h-8 text-[#F5C518] animate-spin" />
      </div>
    )
  }

  if (!modules.has(slug)) {
    return <Navigate to="/sem-acesso" replace />
  }

  return <>{children}</>
}
```

- [x] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [x] **Step 3: Commit**

```bash
git add src/components/ModuleRoute.tsx
git commit -m "feat(permissions): adicionar ModuleRoute generico"
```

---

## Task 4: Criar página `/sem-acesso`

**Files:**
- Create: `src/pages/SemAcesso.tsx`

- [x] **Step 1: Criar página**

Write file `src/pages/SemAcesso.tsx`:

```tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import logo from '../assets/logo-alta-books.png'

export const SemAcesso: React.FC = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-brand-bg-section flex flex-col">
      <header className="h-[80px] bg-[#111111] flex items-center px-8 shadow-md">
        <img src={logo} alt="Alta Books" className="h-[48px] w-auto brightness-0 invert" />
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm max-w-md w-full overflow-hidden">
          <div className="h-1 bg-brand-primary" />
          <div className="p-8 text-center space-y-5">
            <h1 className="font-serif text-3xl text-brand-text-main">Bem-vindo à Alta Books</h1>

            <p className="text-sm text-gray-600 leading-relaxed">
              Você ainda não tem acesso a nenhum módulo da plataforma.
              Aguarde um administrador liberar seu acesso.
            </p>

            {user?.email && (
              <p className="text-xs text-gray-500">
                Logado como <span className="font-medium text-gray-700">{user.email}</span>
              </p>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <a
                href="mailto:bessalfs@gmail.com"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-bg-card hover:bg-brand-primary hover:text-brand-text-main text-gray-700 font-medium rounded-lg text-sm transition-colors"
              >
                <Mail className="w-4 h-4" />
                Falar com o administrador
              </a>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-gray-500 hover:text-brand-text-main text-sm transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [x] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [x] **Step 3: Commit**

```bash
git add src/pages/SemAcesso.tsx
git commit -m "feat(permissions): adicionar pagina sem-acesso"
```

---

## Task 5: Criar página `/admin/permissoes`

**Files:**
- Create: `src/pages/Admin/Permissoes.tsx`

- [x] **Step 1: Criar pasta e arquivo**

Criar diretório `src/pages/Admin/` se não existir.

Write file `src/pages/Admin/Permissoes.tsx`:

```tsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, Search, Check, X as XIcon } from 'lucide-react'
import { TopBar } from '../../components/TopBar'
import { useAuth } from '../../contexts/AuthContext'
import {
  MODULES,
  useAllUsersWithModules,
  grantModule,
  revokeModule,
  type UserWithModules,
} from '../../lib/permissions'

export const Permissoes: React.FC = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const { users, loading, error, refetch } = useAllUsersWithModules()
  const [busca, setBusca] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const usersFiltrados = users.filter(u =>
    u.email.toLowerCase().includes(busca.toLowerCase()) ||
    (u.display_name?.toLowerCase().includes(busca.toLowerCase()) ?? false)
  )

  const toggle = async (user: UserWithModules, slug: string) => {
    if (!currentUser) return
    const key = `${user.id}:${slug}`
    setBusy(key)
    try {
      if (user.modules.has(slug)) {
        await revokeModule(user.id, slug)
      } else {
        await grantModule(user.id, slug, currentUser.id)
      }
      refetch()
    } catch (err) {
      console.error('Erro ao alterar modulo:', err)
      alert(`Falha ao salvar: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-brand-bg-section min-h-screen pb-20">
      <TopBar onNewProject={() => navigate('/')} />

      <main className="max-w-5xl mx-auto px-8 pt-[100px] space-y-6">
        <section>
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Administração</div>
          <h1 className="font-serif text-4xl text-brand-text-main">Permissões</h1>
          <p className="text-sm text-gray-500 mt-2">
            Liberar ou revogar módulos por usuário. Mudanças são salvas imediatamente.
          </p>
        </section>

        <section className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por email ou nome..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>
          <span className="text-sm text-gray-500 ml-auto">
            {usersFiltrados.length} de {users.length} usuários
          </span>
        </section>

        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-900">Erro ao carregar usuários</p>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 bg-brand-primary" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-bg-card">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500">
                      Usuário
                    </th>
                    {MODULES.map(m => (
                      <th key={m.slug} className="text-center px-3 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usersFiltrados.map(user => {
                    const isSelf = user.id === currentUser?.id
                    return (
                      <tr key={user.id} className={isSelf ? 'bg-brand-bg-section/50' : ''}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-brand-text-main">
                            {user.display_name || user.email}
                            {isSelf && <span className="ml-2 text-xs text-gray-400">(você)</span>}
                          </p>
                          {user.display_name && (
                            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                          )}
                        </td>
                        {MODULES.map(m => {
                          const granted = user.modules.has(m.slug)
                          const key = `${user.id}:${m.slug}`
                          const isBusy = busy === key
                          const disabled = isSelf || isBusy
                          return (
                            <td key={m.slug} className="px-3 py-3 text-center">
                              <button
                                type="button"
                                disabled={disabled}
                                onClick={() => toggle(user, m.slug)}
                                title={isSelf ? 'Não pode editar a si mesmo' : granted ? 'Revogar' : 'Liberar'}
                                className={
                                  'inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ' +
                                  (granted
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200')
                                }
                              >
                                {isBusy
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : granted
                                    ? <Check className="w-4 h-4" strokeWidth={3} />
                                    : <XIcon className="w-4 h-4" />}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                  {usersFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={MODULES.length + 1} className="px-5 py-12 text-center text-gray-400">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
```

- [x] **Step 2: Type-check**

A página depende dos hooks (Task 2) e do TopBar (existente). Não depende de App.tsx ter as rotas novas ainda — é renderizável em isolamento.

Run: `npx tsc -b`
Expected: sem erros.

- [x] **Step 3: Commit**

```bash
git add src/pages/Admin/Permissoes.tsx
git commit -m "feat(permissions): adicionar pagina admin de permissoes"
```

---

## Task 6: Refatorar `App.tsx` (rotas usam ModuleRoute)

**Files:**
- Modify: `src/App.tsx`

- [x] **Step 1: Reescrever App.tsx completo**

Editar `src/App.tsx`. Substituir o conteúdo todo por:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ModuleRoute } from './components/ModuleRoute';
import { Login } from './pages/Login';
import { ListagemProjetos } from './pages/ListagemProjetos';
import { DetalheProjeto } from './pages/DetalheProjeto';
import { ResetPassword } from './pages/ResetPassword';
import { Conta } from './pages/Conta';
import { SemAcesso } from './pages/SemAcesso';
import { Listagem as AgenteVerdeListagem } from './pages/AgenteVerde/Listagem';
import { Revisao as AgenteVerdeRevisao } from './pages/AgenteVerde/Revisao';
import { Permissoes as AdminPermissoes } from './pages/Admin/Permissoes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/sem-acesso" element={
            <ProtectedRoute><SemAcesso /></ProtectedRoute>
          } />
          <Route path="/conta" element={
            <ProtectedRoute><Conta /></ProtectedRoute>
          } />
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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

Observações importantes:
- O import de `AdminPermissoes` agora resolve (Task 5 criou a página).
- O import de `AgenteVerdeRoute` foi removido — ele será deletado na Task 8.

- [x] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [x] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(permissions): rotas refatoradas com ModuleRoute"
```

---

## Task 7: Refatorar `TopBar.tsx` (links condicionais dinâmicos)

**Files:**
- Modify: `src/components/TopBar.tsx`

- [x] **Step 1: Reler TopBar.tsx primeiro**

Run: `cat src/components/TopBar.tsx`

Tomar nota da estrutura atual (header, botão Novo Projeto, user dropdown).

- [x] **Step 2: Editar imports**

No topo do arquivo, remover:
```tsx
import { useAgenteVerdeAccess } from '../lib/agenteVerdeAccess'
```

E o import de `Link` se já existir, garantir que está presente:
```tsx
import { Link, useNavigate } from 'react-router-dom'
```

Adicionar:
```tsx
import { useUserModules } from '../lib/permissions'
```

- [x] **Step 3: Substituir o hook antigo**

Dentro do componente `TopBar`, localizar a linha:
```tsx
const hasAgenteVerdeAccess = useAgenteVerdeAccess()
```

Substituir por:
```tsx
const { modules } = useUserModules()
```

- [x] **Step 4: Trocar o link condicional do Agente Verde**

Substituir o bloco:
```tsx
{hasAgenteVerdeAccess && (
  <Link
    to="/agente-verde"
    className="flex items-center gap-2 text-white/70 hover:text-[#F5C518] transition-colors text-sm font-medium px-3 py-1.5 rounded"
  >
    Agente Verde
  </Link>
)}
```

Por um bloco mais amplo com 3 links + botão Novo Projeto condicional. Localizar o `<div className="flex items-center gap-3">` que envolve os botões. O conteúdo desse div deve ficar:

```tsx
{modules.has('ghostwriter') && (
  <Link
    to="/"
    className="flex items-center gap-2 text-white/70 hover:text-[#F5C518] transition-colors text-sm font-medium px-3 py-1.5 rounded"
  >
    Projetos
  </Link>
)}
{modules.has('agente_verde') && (
  <Link
    to="/agente-verde"
    className="flex items-center gap-2 text-white/70 hover:text-[#F5C518] transition-colors text-sm font-medium px-3 py-1.5 rounded"
  >
    Agente Verde
  </Link>
)}
{modules.has('admin') && (
  <Link
    to="/admin/permissoes"
    className="flex items-center gap-2 text-white/70 hover:text-[#F5C518] transition-colors text-sm font-medium px-3 py-1.5 rounded"
  >
    Admin
  </Link>
)}
{modules.has('ghostwriter') && (
  <button
    onClick={onNewProject}
    className="flex items-center gap-2 bg-[#F5C518] hover:bg-[#E0B400] text-[#111111] font-bold py-1.5 px-4 rounded transition-colors text-sm cursor-pointer"
  >
    <Plus className="w-4 h-4" />
    Novo Projeto
  </button>
)}
```

Manter o `<div ref={dropdownRef} ...>` do user dropdown logo depois, sem alterar.

- [x] **Step 5: Type-check + commit**

Run: `npx tsc -b`
Expected: sem erros.

```bash
git add src/components/TopBar.tsx
git commit -m "feat(permissions): TopBar com links condicionais dinamicos"
```

---

## Task 8: Cleanup — remover whitelist hardcoded

**Files:**
- Delete: `src/lib/agenteVerdeAccess.ts`
- Delete: `src/lib/agenteVerdeAccess.test.ts`
- Delete: `src/components/AgenteVerdeRoute.tsx`

- [x] **Step 1: Confirmar que nada mais referencia esses arquivos**

Run: `grep -r "agenteVerdeAccess\|AgenteVerdeRoute" src/`
Expected: zero matches. Se houver, corrigir antes de deletar (provavelmente um import esquecido).

- [x] **Step 2: Deletar os 3 arquivos**

```bash
rm src/lib/agenteVerdeAccess.ts
rm src/lib/agenteVerdeAccess.test.ts
rm src/components/AgenteVerdeRoute.tsx
```

- [x] **Step 3: Verificar build + testes**

Run: `npx tsc -b`
Expected: sem erros.

Run: `npm run test:run`
Expected: agora são **22 testes passando** (29 menos os 7 do `agenteVerdeAccess.test.ts` removido).

- [x] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(permissions): remover whitelist hardcoded do Agente Verde"
```

---

## Task 9: Build final + lint + checklist manual

**Files:** (nenhum)

- [x] **Step 1: Build**

Run: `npm run build`
Expected: sem erros TypeScript.

- [x] **Step 2: Lint**

Run: `npm run lint`
Expected: nenhum erro novo. Os 3 warnings pré-existentes em hooks antigos (`useCapitulos`, `useCapitulosTraduzidos`, `DetalheProjeto`) podem permanecer.

- [x] **Step 3: Testes**

Run: `npm run test:run`
Expected: 22 passando.

- [x] **Step 4: Checklist manual no browser**

Subir o dev server (se não estiver): `npm run dev`. Abrir http://localhost:5173.

**Como bessalfs@gmail.com:**

- [ ] TopBar mostra "Projetos", "Agente Verde", "Admin", e botão "Novo Projeto"
- [ ] `/` mostra a Listagem de Projetos da Alta Books (como antes da Fase 1A)
- [ ] `/agente-verde` mostra a Listagem de Lotes
- [ ] `/admin/permissoes` mostra a tabela de usuários × módulos
- [ ] Sua própria linha tem os 3 módulos ligados (verde) e os toggles **desabilitados**
- [ ] Buscar por email no admin filtra a lista
- [ ] (Opcional, se houver outro usuário no banco) Clicar num toggle de outro usuário muda do cinza pro verde, persiste, e F5 mantém

**Teste de redirect (criar conta de teste OU pedir pra outra pessoa logar):**

- [ ] Logar com email não cadastrado em `user_modules` (ou criar conta nova via /login)
- [ ] É redirecionado pra `/sem-acesso`
- [ ] TopBar NÃO mostra Projetos / Agente Verde / Admin
- [ ] Página `/sem-acesso` mostra "Aguarde administrador liberar"
- [ ] Tentar acessar `/agente-verde` direto via URL → vai pra `/sem-acesso`
- [ ] Tentar acessar `/admin/permissoes` direto via URL → vai pra `/sem-acesso`

**Voltar como bessalfs e conceder ghostwriter pro usuário de teste:**

- [ ] No `/admin/permissoes`, clicar no toggle "Projetos" do usuário de teste
- [ ] Sair (logout)
- [ ] Logar de novo como o usuário de teste
- [ ] TopBar agora mostra "Projetos"
- [ ] `/` é acessível
- [ ] `/agente-verde` continua redirecionando pra `/sem-acesso` (não foi liberado)

- [x] **Step 5: Nada a commitar se tudo passou**

Se o checklist completou sem ajustes, esta task é só verificação.

Se houve ajustes durante a verificação manual, commits específicos pra cada um.

---

## Notas finais

- **Whitelist morreu:** `src/lib/agenteVerdeAccess.ts` não existe mais. A fonte de verdade agora é `public.user_modules` no Supabase.
- **Adicionar novo módulo no futuro:** 1 linha em `MODULES` (em `src/lib/permissions.ts`) + INSERTs na tabela. Zero migration.
- **Self-lockout não acontece:** toggles da própria linha do admin estão sempre desabilitados. Pra mudar próprios módulos, SQL direto no Studio.
- **Realtime (Fase 1B):** ao admin liberar, usuário precisa F5. Subscription via Supabase channels fica pra próxima fase.
- **Risco principal:** se a migration aplicar parcial (erro no meio), o banco fica inconsistente. Pra rollback manual:
  ```sql
  drop table public.user_modules;
  drop trigger on_auth_user_created on auth.users;
  drop function public.handle_new_user;
  drop table public.profiles;
  ```
  Mas como os comandos são `if not exists` + `on conflict`, re-aplicar é seguro.
