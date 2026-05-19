# Download de artefatos gerados (Executivo, Sumário, Livro, Tradução)

**Status:** Aprovado
**Data:** 2026-05-19

## Objetivo

Permitir que o time da Alta Books baixe localmente os artefatos gerados pela plataforma (projeto executivo, sumários, livro completo, traduções) em DOCX e PDF — sem depender do Drive e sem usar o print dialog do navegador.

## Motivação

Hoje:
- **Executivo** tem botão "Baixar DOCX" mas só aparece durante o status `aguardando_revisao_autor` (dentro do banner de revisão). Após revisão, conteúdo fica visível mas sem download. PDF só via `window.print()`.
- **Sumário** não tem download local — só "Ver no Drive".
- **Livro completo** não tem download — só "PDF" por capítulo individual (via `window.print()`).
- **Tradução** não tem download.

O editor da Alta precisa entregar arquivos finais (Word para edição manual no fluxo editorial; PDF para visualização/aprovação). O caminho atual (abrir Drive → baixar) é fricção; o `window.print()` exige interação manual com o sistema operacional e não produz um arquivo bonito.

## Escopo

Inclui:
1. Util compartilhada para download (`src/lib/download.ts`).
2. Builders de HTML por artefato (`src/lib/buildHtml.ts`).
3. Componente `DownloadButton` reutilizável com dropdown DOCX | PDF e estado de loading.
4. Integração nos 4 pontos: Executivo, Sumário, Livro, Tradução.

Não inclui:
- Mudanças nos flows n8n.
- Upload de arquivos (já existe no fluxo de revisão e fica como está).
- Download de transcrições/resumos individuais de arquivos de origem.
- Suporte a outros formatos (EPUB, Markdown).

## Decisões técnicas

### Formato e libs

**DOCX:** mantém abordagem atual de HTML-wrapped-as-Word (helper `htmlToWordBlob` em `ExecutivoPanel.tsx:5`). Funciona em Word/Google Docs, zero dep nova, extensão `.doc`. Será extraído para `src/lib/download.ts`.

**PDF:** `pdfmake` + `html-to-pdfmake`, ambos lazy-loaded.
- Texto vetorial (selecionável).
- Parser de HTML pronto.
- ~500kb baixados apenas quando o usuário clica "PDF" pela primeira vez na sessão.
- Default Roboto cobre acentuação PT.

**Rejeitados:**
- `jspdf + html2canvas` — rasteriza para imagem, texto não selecionável (ruim para ebooks).
- `@react-pdf/renderer` — exigiria mapear cada tag HTML para componentes React-PDF, mais trabalho.
- Trocar DOCX para lib `docx`/`html-to-docx` — sem ganho prático; o `.doc` HTML-wrapped já abre limpo no fluxo editorial.

### Arquitetura

```
src/lib/download.ts                   (novo)
  slug(s: string): string
  filename(projeto, kind, ext): string         // "cafe-com-teu-pai-livro-20260519.docx"
  downloadDocx(html: string, filename: string): void
  downloadPdf(html: string, filename: string): Promise<void>   // lazy import

src/lib/buildHtml.ts                  (novo)
  buildExecutivoHtml(projeto): string
  buildSumarioHtml(sumario, projeto): string
  buildLivroHtml(projeto, capitulos): string
  buildTraducaoHtml(projeto, traducao, capitulos): string

src/components/DownloadButton.tsx     (novo)
  Props: { filename: string, getHtml: () => string | Promise<string>, disabled?: boolean, label?: string }
  Dropdown com opções DOCX | PDF; spinner enquanto gera PDF; fecha ao clicar fora.
```

**Por que extrair `download.ts` em vez de deixar o helper inline no `ExecutivoPanel`:**
três pontos de uso novos (Sumário, Livro, Tradução) replicariam a função; mover é serviço óbvio.

**Por que `buildHtml.ts` separado:** cada artefato tem origem diferente (HTML pronto, JSONB estruturado, array de capítulos) mas o pipeline de download é o mesmo HTML → arquivo. Builders puros são triviais de testar.

### Estrutura HTML por artefato

**Executivo** (já é HTML, só envelopa):
```html
<h1>{nome_projeto}</h1>
<p><em>por {autor_nome}</em></p>
{conteudo_executivo}
```

**Sumário** (renderiza JSONB):
```html
<h1>{nome_projeto}</h1>
<h2>Sumário — Opção {opcao} ({abordagem_label})</h2>
<h3>{titulo_sumario}</h3>
<!-- para cada capítulo de capitulos[]: -->
<h2>Capítulo {numero}: {titulo}</h2>
<p>{descricao}</p>
<ul><li>{subassunto}</li>...</ul>   <!-- se houver -->
```

**Livro completo** (concatena capítulos ordenados por `numero`):
```html
<h1 style="text-align:center">{nome_projeto}</h1>
<p style="text-align:center"><em>por {autor_nome}</em></p>
<!-- para cada capítulo: -->
<h1 style="page-break-before:always">Capítulo {numero}<br/>{titulo}</h1>
{conteudo_normalizado}   <!-- reusa lógica de toHtml de CapituloPanel para conteúdos em texto plano -->
```

Page-break via `page-break-before:always` funciona em Word HTML e em PDF do pdfmake (mapeado para nova página).

**Tradução completa** (idêntico à estrutura do livro, mas com chapters traduzidos):
```html
<h1 style="text-align:center">{nome_projeto}</h1>
<p style="text-align:center"><em>por {autor_nome} — Tradução: {idioma_label}</em></p>
<!-- para cada capítulo de useCapitulosTraduzidos(traducao_id): -->
<h1 style="page-break-before:always">Capítulo {numero}<br/>{titulo}</h1>
{conteudo_normalizado}
```

### Onde os botões aparecem

| Local | Arquivo | Quando aparece | Notas |
|---|---|---|---|
| Header do `ExecutivoPanel` (sempre quando `isReady=true`) | `src/components/ExecutivoPanel.tsx` | Conteúdo existe (`isReady=true`) | Substitui botão atual que só aparecia em `aguardando_revisao_autor` |
| Banner de revisão do executivo | mesmo arquivo | Mesmo do hoje (`aguardando_revisao_autor`) | Reutiliza o componente `DownloadButton`; mantém contexto do fluxo de revisão |
| Header de cada `SumarioCard` | `src/components/SumarioCard.tsx` | Sempre | Ao lado dos botões "Ver no Drive" / "Editar"; cada uma das 3 opções tem o seu |
| Header da aba Livro em `DetalheProjeto` | `src/pages/DetalheProjeto.tsx` | Quando há capítulos (`capitulos.length > 0`) | Próximo do contador "X capítulos · Y palavras" |
| Header de cada `TraducaoSetor` | `src/pages/DetalheProjeto.tsx` (componente local) | `traducao.status === 'concluido'` | Desabilitado durante `traduzindo`/`erro` |

### Naming de arquivo

`{slug(nome_projeto)}-{kind}-{YYYYMMDD}.{ext}`

- `kind` por artefato: `executivo`, `sumario-{opcao}-{abordagem}`, `livro`, `traducao-{idioma}`.
- `slug()`: normaliza acentos (NFD + strip diacríticos), troca não-alfanuméricos por `-`, lowercase.
- Exemplos:
  - `cafe-com-teu-pai-executivo-20260519.docx`
  - `cafe-com-teu-pai-sumario-2-tematica-20260519.pdf`
  - `cafe-com-teu-pai-livro-20260519.docx`
  - `cafe-com-teu-pai-traducao-en-us-20260519.pdf`

## Edge cases

1. **Capítulos com `conteudo` em texto plano (não HTML):** o `CapituloPanel.toHtml()` já trata; a lógica é movida para `buildHtml.ts` como helper interno.
2. **Sumário sem capítulos (`capitulos = null`)**: builder gera só o cabeçalho. Botão fica habilitado (download válido, mesmo que magro).
3. **Tradução em andamento (`status = 'traduzindo'`)**: botão desabilitado; UI esclarece via `disabled` + tooltip implícito.
4. **Erros na geração de PDF**: `DownloadButton` mostra estado de erro (toast simples ou texto inline) e mantém o dropdown aberto para retry. Não há retry automático.
5. **Conteúdo com `<img>` inline**: pdfmake suporta apenas data-URIs ou URLs absolutas. Se o conteúdo gerado pela IA usar imagens externas (ex: Drive), elas serão omitidas no PDF. **Fora do escopo desta etapa** — a IA não tem gerado imagens hoje, e tratar isso exigiria proxy de imagens.
6. **Múltiplos cliques rápidos no botão PDF**: o estado `isGenerating` desabilita o botão durante a geração.

## Dependências novas

```
pdfmake          ~400kb (gzipped, com fontes Roboto)
html-to-pdfmake  ~50kb
```

Ambos lazy-loaded via `import()` dentro de `downloadPdf()`. Bundle inicial inalterado.

## Riscos

| Risco | Mitigação |
|---|---|
| pdfmake gera PDF com tipografia genérica (Roboto) — perde DM Serif do projeto | Aceito: uso interno, prioridade é fidelidade de texto, não estética. Futuro: embarcar DM Serif via configuração `pdfMake.vfs` se cliente reclamar. |
| `.doc` HTML-wrapped pode trigger alerta de "arquivo de origem diferente" em versões antigas do Word | Já é o comportamento de hoje no botão da revisão; cliente não reclamou. Sem mudança. |
| Livro grande (100k palavras) demora >5s no PDF | `DownloadButton` mostra spinner. Tempo aceitável para essa pipeline. |
| Page-break não respeitado em DOCX por alguns visualizadores | Word respeita `page-break-before:always`. Google Docs respeita. Aceito. |

## Critérios de aceite

- [ ] Clicar "Baixar DOCX" em cada um dos 4 pontos gera arquivo `.docx`/`.doc` válido que abre no Word ou Google Docs sem erro.
- [ ] Clicar "Baixar PDF" em cada um dos 4 pontos gera arquivo `.pdf` com texto selecionável e capítulos em páginas separadas (para livro/tradução).
- [ ] Botão no Executivo aparece sempre que `isReady=true`, não só durante revisão.
- [ ] Botão na Tradução só fica habilitado quando `traducao.status === 'concluido'`.
- [ ] Filename inclui nome do projeto e data: `cafe-com-teu-pai-livro-20260519.docx`.
- [ ] Bundle inicial não cresce (pdfmake é lazy).
- [ ] Helper `htmlToWordBlob` antigo no `ExecutivoPanel.tsx` é removido — uso unificado via `download.ts`.
