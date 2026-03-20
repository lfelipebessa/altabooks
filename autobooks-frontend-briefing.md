# Briefing para Claude Code — Autobooks Frontend (Etapa 4)

## Contexto do Projeto

Este é o frontend de uma plataforma de automação editorial chamada **Autobooks**, desenvolvida para a editora **Alta Books / Gorki**. A plataforma automatiza o processo de criação de livros de não-ficção a partir de materiais de autores/influenciadores (vídeos, PDFs, documentos).

O frontend já existe com uma tela de criação de projetos. Agora precisa ser estendido com a interface de acompanhamento.

## Stack Atual

- **Frontend**: React + Vite (localhost:5173)
- **Backend**: n8n (workflows automatizados via webhooks)
- **Banco de dados**: Supabase (PostgreSQL)
- **Storage**: Google Drive (documentos gerados)
- **IA**: Gemini 3 Flash via OpenRouter

## O que já existe

### Tela de criação de projetos
- Modal com 3 campos: Nome do Projeto, Nome do Autor, Link do Google Drive
- Ao criar, faz POST para o webhook do n8n: `https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/processar`
- Body: `{ "projectName": "...", "authorName": "...", "driveLink": "..." }`

### Tela de listagem de projetos (PRECISA SER REFATORADA)
- **PROBLEMA**: Os cards de projetos na tela principal são ESTÁTICOS/HARDCODED no frontend. Não estão conectados ao banco de dados.
- **O QUE PRECISA**: Refatorar para buscar os projetos reais da tabela `projetos` no Supabase
- A estrutura visual dos cards já existe (Nome, Autor, Status badge, botão de ação, data) e pode ser reaproveitada, mas os dados precisam vir do banco
- O campo de busca existe visualmente mas não funciona — precisa implementar filtro real
- A criação de projeto já faz o POST pro webhook mas NÃO salva localmente — o projeto aparece no banco porque o n8n insere via webhook. O frontend precisa fazer um refetch após a criação pra mostrar o novo projeto na lista

## Banco de Dados — Tabelas existentes no Supabase

Use o MCP do Supabase para consultar o schema real, mas aqui está a estrutura planejada:

### projetos
```sql
id UUID PRIMARY KEY
nome_projeto VARCHAR(255)
autor_nome VARCHAR(255)
drive_url TEXT
status VARCHAR(50) -- valores: aguardando, analisando_materiais, gerando_executivo, gerando_sumarios, aguardando_aprovacao, escrevendo_livro, concluido, erro
created_at TIMESTAMP WITH TIME ZONE
updated_at TIMESTAMP WITH TIME ZONE
```

### index_arquivos
```sql
id UUID PRIMARY KEY
projeto_id UUID REFERENCES projetos(id)
nome_arquivo VARCHAR(500)
tipo_arquivo VARCHAR(50) -- video, audio, pdf, texto, imagem
drive_file_id VARCHAR(255)
drive_url TEXT
status VARCHAR(50) -- pendente, processado, erro
created_at TIMESTAMP WITH TIME ZONE
```

### transcricoes_resumos
```sql
id UUID PRIMARY KEY
arquivo_id UUID REFERENCES index_arquivos(id)
transcricao_completa TEXT
resumo TEXT
topicos JSONB -- array de strings
tom VARCHAR(100)
publico_alvo TEXT
argumentos_principais JSONB -- array de strings
idioma VARCHAR(10)
modelo_llm_resumo VARCHAR(100)
created_at TIMESTAMP WITH TIME ZONE
```

### sumarios
```sql
id UUID PRIMARY KEY
projeto_id UUID REFERENCES projetos(id)
opcao INTEGER -- 1, 2 ou 3
abordagem VARCHAR(50) -- cronologica, tematica, narrativa
titulo_sumario VARCHAR(500)
capitulos JSONB -- array de objetos {numero, titulo, descricao}
drive_doc_id VARCHAR(255)
drive_url TEXT
selecionado BOOLEAN DEFAULT false
created_at TIMESTAMP WITH TIME ZONE
```

## O que precisa ser construído

### 1. Tela de listagem de projetos (melhorar a existente)

A tela já existe com cards. Precisa melhorar:

- **Status visual**: cada status do pipeline deve ter uma cor/badge distinto
  - `analisando_materiais` → amarelo, "Analisando materiais..."
  - `gerando_executivo` → amarelo, "Gerando projeto executivo..."
  - `gerando_sumarios` → amarelo, "Gerando sumários..."
  - `aguardando_aprovacao` → azul, "Aguardando aprovação"
  - `escrevendo_livro` → amarelo, "Escrevendo livro..."
  - `concluido` → verde, "Concluído"
  - `erro` → vermelho, "Erro"
- **Progresso**: mostrar quantos arquivos foram processados vs total (consultar index_arquivos)
- **Data de criação** e **última atualização**
- **Busca** por nome do projeto ou autor
- **Clique no card** abre a tela de detalhe do projeto

### 2. Tela de detalhe do projeto (NOVA — principal da Etapa 4)

Ao clicar num projeto, abre uma tela com várias seções:

#### Seção: Informações gerais
- Nome do projeto, autor, link do Drive
- Status atual com badge colorido
- Datas de criação e atualização

#### Seção: Arquivos processados
- Lista de todos os arquivos do projeto (tabela index_arquivos)
- Colunas: nome, tipo (com ícone: 🎥 vídeo, 📄 PDF, 🖼️ imagem, 📝 texto), status (processado/pendente/erro)
- Barra de progresso: X de Y arquivos processados
- Ao clicar num arquivo, mostra os dados da tabela transcricoes_resumos:
  - Resumo
  - Tópicos (badges/tags)
  - Tom de voz
  - Público-alvo
  - Argumentos principais (lista)

#### Seção: Projeto Executivo
- Visível quando status >= gerando_executivo
- Link para o Google Doc do Projeto Executivo (abrir em nova aba)
- Botão "Baixar como .docx" (se implementado)

#### Seção: Sumários (3 opções)
- Visível quando status >= gerando_sumarios
- Mostra 3 cards, um para cada opção de sumário:
  - Título do sumário
  - Abordagem (Cronológica, Temática, Narrativa)
  - Número de capítulos
  - Lista dos capítulos (expansível: título + descrição)
  - Link para o Google Doc
  - Botão "Selecionar este sumário" (marca selecionado=true no banco, desmarca os outros)
- Destacar visualmente o sumário selecionado (borda colorida ou badge)

#### Seção: Upload dos documentos revisados (FUTURO)
- Visível quando status = aguardando_aprovacao e um sumário foi selecionado
- Área de upload para 2 arquivos:
  - Projeto Executivo revisado pelo autor
  - Sumário aprovado revisado pelo autor
- Após upload dos dois → habilita botão "Iniciar escrita do livro"
- Esse botão mudaria o status para escrevendo_livro e dispararia o Fluxo 5

### 3. Componentes visuais

#### Badge de status
Componente reutilizável que recebe o status e renderiza com a cor correta.

#### Card de arquivo
Mostra nome, tipo (ícone), status. Clicável para expandir detalhes.

#### Card de sumário
Mostra título, abordagem, contagem de capítulos. Expansível pra ver a lista. Botão de seleção.

#### Barra de progresso
Mostra X/Y com porcentagem visual.

## Integração com Supabase

### Setup inicial (se não existir)
O frontend precisa do client Supabase configurado. Instalar `@supabase/supabase-js` e criar um arquivo de configuração:
```js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```
As variáveis devem estar no `.env` do projeto. Consultar o MCP do Supabase para obter a URL e anon key corretas.

### Queries principais
- Listar projetos: `supabase.from('projetos').select('*').order('created_at', { ascending: false })`
- Detalhe do projeto: `supabase.from('projetos').select('*').eq('id', projetoId).single()`
- Listar arquivos: `supabase.from('index_arquivos').select('*').eq('projeto_id', projetoId)`
- Listar resumos: `supabase.from('transcricoes_resumos').select('*, index_arquivos(nome_arquivo, tipo_arquivo)').eq('index_arquivos.projeto_id', projetoId)`
- Listar sumários: `supabase.from('sumarios').select('*').eq('projeto_id', projetoId).order('opcao')`
- Selecionar sumário: 
  ```js
  // Desmarca todos
  await supabase.from('sumarios').update({ selecionado: false }).eq('projeto_id', projetoId)
  // Marca o escolhido
  await supabase.from('sumarios').update({ selecionado: true }).eq('id', sumarioId)
  ```

### Realtime (opcional mas recomendado)
Usar Supabase Realtime para atualizar o status do projeto automaticamente quando os workflows do n8n atualizarem o banco:
```js
supabase
  .channel('projetos')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projetos' }, payload => {
    // Atualiza o estado local
  })
  .subscribe()
```

## Design

A interface deve seguir o padrão visual que já existe no protótipo:
- Header com logo Alta Books (canto esquerdo) + botão "+ Novo Projeto" (canto direito)
- Fundo claro
- Cards com sombra leve e bordas arredondadas
- Cores: amarelo/dourado como accent (botões, destaques), preto para CTAs, cinza para textos secundários
- Tipografia clean e moderna

## Prioridades

1. **Refatorar listagem de projetos** — conectar ao Supabase, remover dados hardcoded, implementar busca real
2. **Configurar Supabase client** no frontend (se ainda não existe) com as variáveis de ambiente (SUPABASE_URL e SUPABASE_ANON_KEY)
3. Tela de detalhe do projeto com todas as seções
4. Listagem de sumários com seleção
5. Realtime updates no status
6. Upload de documentos revisados (pode ser placeholder por agora)

## Observações

- O autor NÃO acessa a plataforma. Toda comunicação com ele é por email/WhatsApp
- A interface é para uso interno do time da Alta Books
- Os Google Docs são acessados via links diretos (abrir em nova aba)
- Consulte o schema real das tabelas via MCP do Supabase antes de implementar para confirmar tipos e colunas