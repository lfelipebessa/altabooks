# Alterar Senha — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que usuários recuperem a senha via email (login page) e a alterem quando logados (página /conta), com dropdown de usuário na TopBar.

**Architecture:** Três novas superfícies — rota pública `/reset-password` para o fluxo pós-email, rota protegida `/conta` para troca de senha autenticada, e dropdown na TopBar substituindo o botão de logout. O fluxo de recuperação usa `supabase.auth.resetPasswordForEmail` (manda email) + `supabase.auth.updateUser` (aplica a nova senha). O fluxo autenticado usa apenas `updateUser`.

**Tech Stack:** React 19, TypeScript, Supabase JS v2, React Router v6, Tailwind CSS 4, Lucide React.

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/App.tsx` | Modificar | Adicionar rotas `/reset-password` e `/conta` |
| `src/pages/Login.tsx` | Modificar | Adicionar modo "Esqueci minha senha" |
| `src/pages/ResetPassword.tsx` | Criar | Formulário pós-link de recuperação |
| `src/pages/Conta.tsx` | Criar | Página de conta com troca de senha |
| `src/components/TopBar.tsx` | Modificar | Dropdown "Minha conta" / "Sair" |

---

### Task 1: Adicionar rotas /reset-password e /conta ao App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Adicionar as duas novas rotas**

Substituir o conteúdo de `src/App.tsx` por:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { ListagemProjetos } from './pages/ListagemProjetos';
import { DetalheProjeto } from './pages/DetalheProjeto';
import { ResetPassword } from './pages/ResetPassword';
import { Conta } from './pages/Conta';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route
            path="/conta"
            element={
              <ProtectedRoute>
                <Conta />
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

- [ ] **Step 2: Verificar que o app compila sem erro**

```bash
npm run build 2>&1 | tail -5
```

Esperado: erros de "Cannot find module" para `ResetPassword` e `Conta` (ainda não criados) — isso confirma que as rotas foram adicionadas corretamente.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add /reset-password and /conta routes"
```

---

### Task 2: Adicionar "Esqueci minha senha" ao Login.tsx

**Files:**
- Modify: `src/pages/Login.tsx`

O formulário de login ganha um link "Esqueci minha senha" abaixo do botão. Clicar alterna para o modo `forgot`, que exibe apenas o campo de email + botão "Enviar link". Após enviar, alterna para `forgot-sent` com mensagem de confirmação. O link usa `window.location.origin` para funcionar tanto em dev quanto em produção.

- [ ] **Step 1: Substituir src/pages/Login.tsx**

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo-alta-books.png';

type Mode = 'login' | 'forgot' | 'forgot-sent';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError('Email ou senha incorretos.');
        return;
      }
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        setError('Não foi possível enviar o email. Tente novamente.');
        return;
      }
      setMode('forgot-sent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="bg-white rounded-2xl shadow-md p-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Alta Books" className="h-12 w-auto" />
        </div>

        {mode === 'login' && (
          <>
            <h1 className="text-2xl font-bold text-[#111111] mb-6 text-center" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Entrar
            </h1>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
                <p role="alert" className="text-red-600 text-sm">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 bg-[#F5C518] hover:bg-[#E0B400] disabled:opacity-60 text-[#111111] font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
              <button
                type="button"
                onClick={() => { setError(''); setMode('forgot'); }}
                className="text-sm text-[#333333] hover:text-[#111111] underline text-center cursor-pointer"
              >
                Esqueci minha senha
              </button>
            </form>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <h1 className="text-2xl font-bold text-[#111111] mb-2 text-center" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Recuperar senha
            </h1>
            <p className="text-sm text-[#333333] mb-6 text-center">
              Informe seu email e enviaremos um link para redefinir a senha.
            </p>
            <form onSubmit={handleForgot} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[#333333]" htmlFor="forgot-email">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#F5C518] focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>
              {error && (
                <p role="alert" className="text-red-600 text-sm">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 bg-[#F5C518] hover:bg-[#E0B400] disabled:opacity-60 text-[#111111] font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
              <button
                type="button"
                onClick={() => { setError(''); setMode('login'); }}
                className="text-sm text-[#333333] hover:text-[#111111] underline text-center cursor-pointer"
              >
                Voltar para o login
              </button>
            </form>
          </>
        )}

        {mode === 'forgot-sent' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Email enviado!
            </h1>
            <p className="text-sm text-[#333333]">
              Verifique sua caixa de entrada e clique no link para redefinir a senha.
            </p>
            <button
              type="button"
              onClick={() => { setMode('login'); setEmail(''); }}
              className="text-sm text-[#333333] hover:text-[#111111] underline cursor-pointer"
            >
              Voltar para o login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Testar manualmente em dev**

```bash
npm run dev
```

Verificar:
- Botão "Esqueci minha senha" aparece abaixo de "Entrar"
- Clicar alterna para o formulário de recuperação
- "Voltar para o login" retorna ao modo login
- Enviar um email válido mostra a mensagem de confirmação

- [ ] **Step 3: Commit**

```bash
git add src/pages/Login.tsx
git commit -m "feat: add forgot password flow to login page"
```

---

### Task 3: Criar ResetPassword.tsx

**Files:**
- Create: `src/pages/ResetPassword.tsx`

Esta página é acessada após o usuário clicar no link do email de recuperação. O Supabase redireciona para `/reset-password` com o token no hash da URL. O cliente Supabase processa o hash automaticamente e dispara o evento `PASSWORD_RECOVERY` via `onAuthStateChange`. A página aguarda esse evento antes de exibir o formulário. Após `updateUser`, redireciona para `/`.

- [ ] **Step 1: Criar src/pages/ResetPassword.tsx**

```tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo-alta-books.png';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError('Não foi possível redefinir a senha. Tente novamente.');
        return;
      }
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="bg-white rounded-2xl shadow-md p-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Alta Books" className="h-12 w-auto" />
        </div>

        {!ready ? (
          <p className="text-center text-sm text-[#333333]">Verificando link de recuperação...</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[#111111] mb-6 text-center" style={{ fontFamily: 'DM Serif Display, serif' }}>
              Nova senha
            </h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[#333333]" htmlFor="new-password">
                  Nova senha
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#F5C518] focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[#333333]" htmlFor="confirm-password">
                  Confirmar senha
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#F5C518] focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <p role="alert" className="text-red-600 text-sm">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 bg-[#F5C518] hover:bg-[#E0B400] disabled:opacity-60 text-[#111111] font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verificar que compila**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -10
```

Esperado: sem erros relacionados a `ResetPassword`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ResetPassword.tsx
git commit -m "feat: add reset-password page for post-email recovery flow"
```

---

### Task 4: Criar Conta.tsx

**Files:**
- Create: `src/pages/Conta.tsx`

Página protegida que exibe o email do usuário logado e um formulário de troca de senha. Usa `useAuth` para obter o email e `supabase.auth.updateUser` para aplicar a nova senha.

- [ ] **Step 1: Criar src/pages/Conta.tsx**

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo-alta-books.png';
import { ArrowLeft } from 'lucide-react';

export const Conta: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError('Não foi possível alterar a senha. Tente novamente.');
        return;
      }
      setSuccess(true);
      setPassword('');
      setConfirm('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <header className="fixed top-0 left-0 right-0 h-[80px] bg-[#111111] z-40 flex items-center justify-between px-[32px] shadow-md">
        <div className="flex items-center">
          <img src={logo} alt="Alta Books" className="h-[48px] w-auto brightness-0 invert" />
        </div>
      </header>

      <div className="pt-[80px] flex items-start justify-center p-8">
        <div className="bg-white rounded-2xl shadow-md p-10 w-full max-w-md mt-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-[#333333] hover:text-[#111111] mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <h1 className="text-2xl font-bold text-[#111111] mb-1" style={{ fontFamily: 'DM Serif Display, serif' }}>
            Minha conta
          </h1>
          <p className="text-sm text-[#333333] mb-8">{user?.email}</p>

          <h2 className="text-base font-semibold text-[#111111] mb-4">Alterar senha</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#333333]" htmlFor="new-password">
                Nova senha
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#F5C518] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#333333]" htmlFor="confirm-password">
                Confirmar nova senha
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#F5C518] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p role="alert" className="text-red-600 text-sm">{error}</p>
            )}
            {success && (
              <p role="status" className="text-green-600 text-sm">Senha alterada com sucesso!</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-[#F5C518] hover:bg-[#E0B400] disabled:opacity-60 text-[#111111] font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
            >
              {loading ? 'Salvando...' : 'Alterar senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verificar que compila**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -10
```

Esperado: sem erros relacionados a `Conta`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Conta.tsx
git commit -m "feat: add conta page with authenticated password change"
```

---

### Task 5: Atualizar TopBar com dropdown de usuário

**Files:**
- Modify: `src/components/TopBar.tsx`

O ícone de `LogOut` é substituído por um ícone `User` que abre um dropdown com "Minha conta" e "Sair". O dropdown fecha ao clicar fora usando um `ref` + listener de `mousedown`.

- [ ] **Step 1: Substituir src/components/TopBar.tsx**

```tsx
import React, { useRef, useState, useEffect } from 'react';
import { Plus, User, UserCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo-alta-books.png';
import { useAuth } from '../contexts/AuthContext';

interface TopBarProps {
  onNewProject: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onNewProject }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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

        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setOpen(prev => !prev)}
            title="Minha conta"
            aria-label="Minha conta"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm cursor-pointer"
          >
            <UserCircle className="w-5 h-5" />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50">
              <button
                onClick={() => { setOpen(false); navigate('/conta'); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[#111111] hover:bg-[#F8F9FB] cursor-pointer"
              >
                <User className="w-4 h-4 text-[#333333]" />
                Minha conta
              </button>
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[#111111] hover:bg-[#F8F9FB] cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-[#333333]" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
```

- [ ] **Step 2: Testar manualmente**

```bash
npm run dev
```

Verificar:
- Ícone de usuário aparece no lugar do ícone de logout
- Clicar abre o dropdown com "Minha conta" e "Sair"
- "Minha conta" navega para `/conta`
- "Sair" faz logout e redireciona para `/login`
- Clicar fora fecha o dropdown

- [ ] **Step 3: Commit**

```bash
git add src/components/TopBar.tsx
git commit -m "feat: replace logout button with user dropdown in TopBar"
```

---

### Task 6: Configurar URL de redirect no Supabase Dashboard

Esta tarefa é manual — não envolve código.

- [ ] **Step 1: Acessar o Supabase Dashboard**

Ir para: https://supabase.com/dashboard/project/tddolcrzmczvoqxkajic/auth/url-configuration

- [ ] **Step 2: Adicionar URL de redirect**

Em "Redirect URLs", adicionar:
```
https://altabooks.vercel.app/reset-password
```

Salvar as alterações.

- [ ] **Step 3: Verificar fluxo completo em produção**

Após deploy no Vercel:
1. Ir para https://altabooks.vercel.app/login
2. Clicar "Esqueci minha senha"
3. Inserir email válido e clicar "Enviar link de recuperação"
4. Verificar que o email chega
5. Clicar no link do email — deve redirecionar para https://altabooks.vercel.app/reset-password
6. Inserir nova senha e confirmar — deve redirecionar para `/`
