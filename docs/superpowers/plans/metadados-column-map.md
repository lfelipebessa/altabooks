# COLUMN_MAP — BookInfo (geração do xlsx)

**Fonte:** aba `PLANILHA BOOKINFO IMPOR EM LOTE` do arquivo `Relação saídas planilhas cadastros.xlsx`. 103 colunas (A–CY) na linha 4 (dados); linhas 1-3 são cabeçalho/obrigatoriedade/nome.

Mapeia célula do template → path no JSON canônico do `metadados_json`. Lido pelo Code node `gerarXlsxBookInfo` no n8n (Task 8/9 do plano).

## Convenções de path

- `dados_basicos.titulo` — path simples
- `dados_basicos.bisac[0]`, `bisac[1]` ... — quando o array do JSON é espalhado em N colunas individuais. Se `bisac.length < N`, células sobrando ficam vazias.
- `dados_editoriais.peso_g|TO_KG` — sufixo `|TRANSFORMACAO` indica conversão antes de gravar. Transformações suportadas:
  - `TO_KG` — divide por 1000 (gramas → kg; usado em BR4 porque a planilha pede peso em kg)
  - `JOIN_COAUTORES` — junta `[autor, ...coautores].join('; ')` antes de gravar (usado em K4 porque o BookInfo lista todos os autores numa única célula separados por `;`)

## Campos do JSON canônico SEM correspondente no BookInfo (esperado — não vão pro xlsx)

| Campo | Por quê |
|---|---|
| `dados_basicos.coautores` | BookInfo agrupa autores+coautores em K4 separados por `;`. Resolvido via `K4: dados_basicos.autor\|JOIN_COAUTORES` — o Code node junta `[autor, ...coautores].join('; ')`. |
| `dados_basicos.idioma_original` | BookInfo só tem idioma de publicação |
| `dados_editoriais.cdu` | BookInfo só tem CDD |
| `textos.biografia_autor` | Não cabe no BookInfo (vai pra outras planilhas) |
| `textos.texto_contracapa_completo` | idem |
| `textos.frases_marketing` | idem |
| `textos.assuntos_matriz_cip` | idem |
| `relacionadas.*` | Não cabe no BookInfo |

## Campos do BookInfo que NÃO mapeamos (~65 colunas)

Vários blocos do BookInfo são específicos pra cadastro em distribuidoras e ficam vazios pra MVP:
- D4 (Volume), F4 (Volume na coleção), J4 (Título original)
- L4-S4: Organizadores, Coordenadores, Editor, Editor Técnico, Editor Associado, Espírito, Colaboradores
- V4, X4: Apresentação, Posfácio
- Y4-AM4: Projeto gráfico, Diagramadores, Capistas, etc.
- BD4 (Data de publicação), BE4 (Número da edição)
- BG4 (Origem do produto — sempre "Brasil")
- BK4-BM4: Sumário, Link do livro, Link booktrailer
- BS4 (Encadernação — derivável de `formato`)
- BT4-BU4: Data prevista, Material adicional
- BV4-BX4: Formato arquivo / Plataformas / DRM (campos de ebook)
- BY4-CA4: Grau / Ano-Série / Matéria (campos de didático)
- CB4 (Status), CE4 (Classif fiscal), CF4 (Cód editora)
- CG4-CY4: 18 campos diversos (URLs, CST, ISBNs alternativos)

Se algum desses for "obrigatório" no template, o n8n pode preencher com default fixo (ex: `BG4="Brasil"`, `CB4="Disponível"`, `BS4` derivado de `formato`). Ver Task 8 do plano pra implementar.
