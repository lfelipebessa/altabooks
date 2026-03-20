# Autobooks Frontend — Contexto Tecnico

## Visao Geral

Plataforma de automacao editorial para a editora **Alta Books / Gorki**. Automatiza a criacao de livros de nao-ficcao a partir de materiais de autores/influenciadores (videos, PDFs, documentos). Interface de uso **interno** do time da Alta Books — o autor nao acessa a plataforma.

## Stack

| Camada       | Tecnologia                                |
| ------------ | ----------------------------------------- |
| Framework    | React 19 + TypeScript 5.9                 |
| Build        | Vite 7                                    |
| CSS          | Tailwind CSS 4 (via `@tailwindcss/vite`)  |
| Icones       | Lucide React                              |
| Banco        | Supabase (PostgreSQL 17) — regiao sa-east-1 |
| Backend      | n8n (workflows via webhooks no Railway)   |
| Storage      | Google Drive (docs gerados)               |
| IA           | Gemini 3 Flash via OpenRouter             |

## Estrutura do Projeto

```
src/
  main.tsx              — Entry point (React 19 createRoot)
  App.tsx               — Componente raiz, listagem de projetos (DADOS HARDCODED)
  index.css             — Tailwind imports + tema customizado (@theme)
  types.ts              — Tipos TS (Project, ProjectStatus)
  assets/
    logo-alta-books.png — Logo da editora
  components/
    TopBar.tsx           — Header fixo com logo + botao "Novo Projeto"
    SearchBar.tsx        — Input de busca (filtro local por nome/autor)
    ProjectCard.tsx      — Card de projeto (nome, autor, status, progresso, drive link)
    StatusBadge.tsx      — Badge de status com icone (Aguardando/Processando/Concluido/Erro)
    ProgressBar.tsx      — Barra de progresso (X de Y arquivos)
    CreateProjectModal.tsx — Modal de criacao (POST pro webhook n8n)
```

## Design System

- **Fontes**: DM Sans (corpo) + DM Serif Display (titulos) — carregadas via Google Fonts no `index.html`
- **Cores** (definidas em `index.css` via `@theme`):
  - `brand-primary`: `#F5C518` (amarelo/dourado — accent, botoes)
  - `brand-hover`: `#E0B400`
  - `brand-bg`: `#FFFFFF`
  - `brand-bg-section`: `#F8F9FB`
  - `brand-bg-card`: `#F1F3F5`
  - `brand-text-main`: `#111111`
  - `brand-text-body`: `#333333`
  - `brand-bg-badge`: `#FEF9E7`
- **Padrao visual**: Cards com sombra leve, bordas arredondadas, header escuro (#111) com logo invertido

## Supabase

- **Project ID**: `tddolcrzmczvoqxkajic`
- **URL**: `https://tddolcrzmczvoqxkajic.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkZG9sY3J6bWN6dm9xeGthamljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzgxNzgsImV4cCI6MjA3OTYxNDE3OH0.uTm3MXzGvoR1DbjChyOJbrzGmB9_TBC38V5rb3qVdsY`
- **Client**: ainda NAO configurado no frontend — precisa instalar `@supabase/supabase-js` e criar `.env`
- **RLS**: desabilitado em todas as tabelas (uso interno)

### Schema Real (public) — tabelas relevantes

#### `projetos`
| Coluna               | Tipo          | Default             | Constraint |
| -------------------- | ------------- | ------------------- | ---------- |
| id                   | uuid (PK)     | gen_random_uuid()   |            |
| nome_projeto         | varchar       |                     | NOT NULL   |
| autor_nome           | varchar       |                     | NOT NULL   |
| drive_url            | text          |                     | nullable   |
| drive_executivo_url  | text          |                     | nullable — link do Google Doc do projeto executivo |
| status               | varchar       | 'aguardando'        | CHECK: aguardando, analisando_materiais, gerando_executivo, gerando_sumarios, aguardando_aprovacao, escrevendo_livro, concluido, erro |
| created_at           | timestamptz   | now()               | nullable   |
| updated_at           | timestamptz   | now()               | nullable — auto-atualizado por trigger BEFORE UPDATE |

#### `index_arquivos` (16 rows)
| Coluna        | Tipo          | Default             | Constraint |
| ------------- | ------------- | ------------------- | ---------- |
| id            | uuid (PK)     | gen_random_uuid()   |            |
| projeto_id    | uuid (FK)     |                     | -> projetos.id, nullable |
| nome_arquivo  | varchar       |                     | NOT NULL   |
| tipo_arquivo  | varchar       |                     | CHECK: video, audio, pdf, texto, imagem |
| drive_file_id | varchar       |                     | nullable   |
| drive_url     | text          |                     | nullable   |
| status        | varchar       | 'pendente'          | CHECK: pendente, processado, erro |
| created_at    | timestamptz   | now()               | nullable   |

#### `transcricoes_resumos` (1 row)
| Coluna                | Tipo          | Default      | Constraint |
| --------------------- | ------------- | ------------ | ---------- |
| id                    | uuid (PK)     | gen_random_uuid() |       |
| arquivo_id            | uuid (FK)     |              | -> index_arquivos.id, nullable |
| transcricao_completa  | text          |              | nullable   |
| resumo                | text          |              | nullable   |
| topicos               | jsonb         |              | nullable (array de strings) |
| tom                   | varchar       |              | nullable   |
| publico_alvo          | text          |              | nullable   |
| argumentos_principais | jsonb         |              | nullable (array de strings) |
| idioma                | varchar       | 'pt-BR'      | nullable   |
| modelo_llm_resumo     | varchar       |              | nullable   |
| created_at            | timestamptz   | now()        | nullable   |

#### `sumarios`
| Coluna         | Tipo          | Default             | Constraint |
| -------------- | ------------- | ------------------- | ---------- |
| id             | uuid (PK)     | gen_random_uuid()   |            |
| projeto_id     | uuid (FK)     |                     | -> projetos.id ON DELETE CASCADE, nullable |
| opcao          | integer       |                     | NOT NULL |
| abordagem      | varchar       |                     | NOT NULL, CHECK: cronologica, tematica, narrativa |
| titulo_sumario | varchar(500)  |                     | nullable |
| capitulos      | jsonb         |                     | nullable (array de {numero, titulo, descricao}) |
| drive_doc_id   | varchar(255)  |                     | nullable |
| drive_url      | text          |                     | nullable |
| selecionado    | boolean       | false               | nullable |
| created_at     | timestamptz   | now()               | nullable |
| updated_at     | timestamptz   | now()               | nullable — auto-atualizado por trigger |

Unique index parcial: `(projeto_id) WHERE selecionado = true` — garante no banco que apenas 1 sumario por projeto pode ser selecionado.

### Indexes (migration etapa4_schema_improvements)
| Tabela                  | Index                                 | Tipo         |
| ----------------------- | ------------------------------------- | ------------ |
| projetos                | idx_projetos_status                   | btree        |
| index_arquivos          | idx_index_arquivos_projeto_id         | btree        |
| transcricoes_resumos    | idx_transcricoes_resumos_arquivo_id   | btree        |
| sumarios                | idx_sumarios_projeto_id               | btree        |
| sumarios                | sumarios_projeto_id_idx               | btree unique partial (WHERE selecionado = true) |

### Triggers
| Tabela    | Trigger                      | Evento         | Funcao          |
| --------- | ---------------------------- | -------------- | --------------- |
| projetos  | trg_projetos_updated_at      | BEFORE UPDATE  | set_updated_at() |
| sumarios  | trg_sumarios_updated_at      | BEFORE UPDATE  | set_updated_at() |

### Tabelas nao-relacionadas (ignorar)
`request`, `memory`, `documents`, `n8n_chat_histories` — pertencem a outros fluxos/projetos.

## Estado Atual do Frontend

### O que funciona
- Layout visual completo da listagem de projetos (cards, busca, header)
- Modal de criacao de projetos com POST para webhook n8n
- Componentes reutilizaveis: StatusBadge, ProgressBar, SearchBar, TopBar
- Busca local filtra por nome/autor (mas sobre dados mock)

### Problemas criticos
1. **Dados hardcoded**: `App.tsx` usa `INITIAL_PROJECTS` com dados mock estaticos — nao conecta ao Supabase
2. **Tipos desalinhados**: `types.ts` define `ProjectStatus` como `'Aguardando' | 'Processando' | 'Concluido' | 'Erro'` — o banco usa valores diferentes (`aguardando`, `analisando_materiais`, `gerando_executivo`, etc.)
3. **Sem Supabase client**: `@supabase/supabase-js` nao esta instalado, nao existe `.env`
4. **Sem roteamento**: nao ha `react-router-dom` — tudo e uma unica pagina, sem tela de detalhe
5. **Webhook URL errada**: `CreateProjectModal.tsx` usa `/webhook-test/` (endpoint de teste do n8n), o correto e `/webhook/`
6. **Sem realtime**: nenhum subscription para atualizacoes automaticas de status
7. **Sem plugin React no Vite**: `vite.config.ts` nao inclui `@vitejs/plugin-react` (esta nas devDeps mas nao configurado)

## Webhook n8n

- **URL producao**: `https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/processar`
- **URL teste** (usada atualmente): `https://primary-production-bd3cf.up.railway.app/webhook-test/ghostwriter/processar`
- **Body**: `{ "projectName": "...", "authorName": "...", "driveLink": "..." }`
- O n8n insere o projeto no Supabase via workflow — o frontend nao precisa inserir diretamente

## Proximos Passos (Etapa 4)

1. Configurar Supabase client + `.env` + instalar dependencias (`@supabase/supabase-js`, `react-router-dom`)
2. Refatorar listagem de projetos para buscar dados reais do Supabase
3. Alinhar tipos TS com o schema real do banco (8 status ao inves de 4)
4. Implementar roteamento (listagem + detalhe do projeto)
5. Criar tela de detalhe do projeto (info geral, arquivos, transcricoes, sumarios)
6. Criar migration para tabela `sumarios`
7. Implementar selecao de sumario
8. Adicionar Supabase Realtime para updates automaticos de status
9. Corrigir URL do webhook (remover `-test`)

## Comandos

```bash
npm run dev      # Inicia dev server (localhost:5173)
npm run build    # tsc -b && vite build
npm run lint     # ESLint
npm run preview  # Preview do build
```
