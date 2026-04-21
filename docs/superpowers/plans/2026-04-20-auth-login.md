# Auth Login — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar autenticação email + senha via Supabase Auth, bloqueando todas as rotas para usuários não autenticados.

**Architecture:** Um `AuthContext` global gerencia a sessão Supabase e escuta mudanças via `onAuthStateChange`. Um componente `ProtectedRoute` redireciona para `/login` se não houver sessão. A página `/login` usa `supabase.auth.signInWithPassword()` e redireciona para `/` em caso de sucesso.

**Tech Stack:** React 19, TypeScript, Supabase Auth (`@supabase/supabase-js` já instalado), React Router DOM v7, Tailwind CSS 4, Lucide React.

---

## File Map

| Ação | Arquivo | Responsabilidade |
|---|---|---|
| Criar | `src/contexts/AuthContext.tsx` | Provê `session`, `user`, `signOut`, escuta `onAuthStateChange` |
| Criar | `src/components/ProtectedRoute.tsx` | Redireciona para `/login` se não autenticado |
| Criar | `src/pages/Login.tsx` | Formulário email + senha, chama `signInWithPassword` |
| Modificar | `src/App.tsx` | Envolve tudo com `AuthProvider`, adiciona rota `/login`, protege rotas existentes |
| Modificar | `src/components/TopBar.tsx` | Adiciona botão de logout |

---

### Task 1: AuthContext

**Files:**
- Create: `src/contexts/AuthContext.tsx`

- [ ] **Step 1: Criar o arquivo `src/contexts/AuthContext.tsx`**

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```

- [ ] **Step 2: Verificar que o arquivo foi criado sem erros de TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros relacionados ao AuthContext.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/AuthContext.tsx
git commit -m "feat: add AuthContext with Supabase session management"
```

---

### Task 2: ProtectedRoute

**Files:**
- Create: `src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Criar o arquivo `src/components/ProtectedRoute.tsx`**

```tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <Loader2 className="w-8 h-8 text-[#F5C518] animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProtectedRoute.tsx
git commit -m "feat: add ProtectedRoute component"
```

---

### Task 3: Página de Login

**Files:**
- Create: `src/pages/Login.tsx`

- [ ] **Step 1: Criar o arquivo `src/pages/Login.tsx`**

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo-alta-books.png';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('Email ou senha incorretos.');
      setLoading(false);
      return;
    }

    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="bg-white rounded-2xl shadow-md p-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Alta Books" className="h-12 w-auto" />
        </div>

        <h1 className="text-2xl font-bold text-[#111111] mb-6 text-center" style={{ fontFamily: 'DM Serif Display, serif' }}>
          Entrar
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#333333]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#F5C518] focus:border-transparent"
              placeholder="seu@email.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#333333]" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#F5C518] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-[#F5C518] hover:bg-[#E0B400] disabled:opacity-60 text-[#111111] font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Login.tsx
git commit -m "feat: add Login page with email/password form"
```

---

### Task 4: Atualizar App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Substituir o conteúdo de `src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { ListagemProjetos } from './pages/ListagemProjetos';
import { DetalheProjeto } from './pages/DetalheProjeto';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ListagemProjetos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projetos/:id"
            element={
              <ProtectedRoute>
                <DetalheProjeto />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire AuthProvider and ProtectedRoute into app routes"
```

---

### Task 5: Adicionar botão de logout na TopBar

**Files:**
- Modify: `src/components/TopBar.tsx`

- [ ] **Step 1: Substituir o conteúdo de `src/components/TopBar.tsx`**

```tsx
import React from 'react';
import { Plus, LogOut } from 'lucide-react';
import logo from '../assets/logo-alta-books.png';
import { useAuth } from '../contexts/AuthContext';

interface TopBarProps {
  onNewProject: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onNewProject }) => {
  const { signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 h-[80px] bg-[#111111] z-40 flex items-center justify-between px-[32px] shadow-md">
      <div className="flex items-center">
        <img
          src={logo}
          alt="Alta Books"
          className="h-[48px] w-auto brightness-0 invert"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onNewProject}
          className="flex items-center gap-2 bg-[#F5C518] hover:bg-[#E0B400] text-[#111111] font-bold py-1.5 px-4 rounded transition-colors text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Projeto
        </button>

        <button
          onClick={signOut}
          title="Sair"
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
```

- [ ] **Step 2: Verificar TypeScript e build completo**

```bash
npx tsc --noEmit && npm run build
```

Expected: build finaliza sem erros.

- [ ] **Step 3: Testar manualmente**

```bash
npm run dev
```

Verificar:
1. Acessar `http://localhost:5173` → deve redirecionar para `/login`
2. Tentar credenciais erradas → deve exibir "Email ou senha incorretos."
3. Fazer login com credenciais válidas (criar usuário no painel Supabase: Authentication > Users > Add user) → deve redirecionar para `/`
4. Clicar no ícone de logout na TopBar → deve voltar para `/login`

- [ ] **Step 4: Commit final**

```bash
git add src/components/TopBar.tsx
git commit -m "feat: add logout button to TopBar"
```
