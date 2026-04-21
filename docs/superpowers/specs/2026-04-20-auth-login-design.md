# Auth — Login com Supabase Auth

**Data:** 2026-04-20  
**Status:** Aprovado

## Contexto

Plataforma Autobooks é de uso interno do time Alta Books. Não havia nenhum mecanismo de autenticação — qualquer pessoa com a URL acessava o sistema. O objetivo é adicionar login com email + senha via Supabase Auth.

## Abordagem Escolhida

Supabase Auth nativo (email + senha). Usuários são criados manualmente pelo admin no painel do Supabase (Authentication > Users). Sem página de cadastro pública.

## Arquitetura

### Fluxo de autenticação

```
Usuário acessa qualquer rota
        ↓
AuthContext verifica sessão (supabase.auth.getSession)
        ↓
  Não autenticado → redireciona para /login
  Autenticado → renderiza a rota normalmente
        ↓
/login → formulário email + senha
        ↓
supabase.auth.signInWithPassword()
  ✓ sucesso → redireciona para /
  ✗ erro → exibe mensagem de erro inline
```

### Componentes novos

| Arquivo | Responsabilidade |
|---|---|
| `src/contexts/AuthContext.tsx` | Provê `session`, `user`, `signOut`. Escuta `onAuthStateChange` para manter estado sincronizado. |
| `src/pages/Login.tsx` | Página de login com formulário email + senha. |
| `src/components/ProtectedRoute.tsx` | Wrapper que redireciona para `/login` se não houver sessão. |

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Envolve tudo com `AuthProvider`. Adiciona rota `/login`. Envolve `/` e `/projetos/:id` com `ProtectedRoute`. |
| `src/components/TopBar.tsx` | Adiciona botão de logout (`supabase.auth.signOut`). |

## UI da Tela de Login

- Fundo `#F8F9FB` (brand-bg-section)
- Card centralizado com sombra leve e bordas arredondadas
- Logo Alta Books no topo
- Campos: Email + Senha com labels
- Botão "Entrar" em `#F5C518` (brand-primary) com texto escuro
- Mensagem de erro inline em vermelho discreto
- Sem link de cadastro ou recuperação de senha (uso interno — admin gerencia no painel Supabase)

## O que está fora do escopo

- Página de cadastro pública
- "Esqueci minha senha" (Supabase tem isso embutido, mas não expor na UI por ora)
- Email allowlist / tabela de usuários permitidos
- Deploy na Railway (próxima etapa)
