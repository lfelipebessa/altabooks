export type TipoCampo = 'texto' | 'texto_longo' | 'numero' | 'lista_texto' | 'select';

export interface DefinicaoCampo {
  path: string;
  label: string;
  tipo: TipoCampo;
  opcoes?: string[];
  placeholder?: string;
}

export const CAMPOS_DADOS_BASICOS: DefinicaoCampo[] = [
  { path: 'dados_basicos.titulo', label: 'Título', tipo: 'texto' },
  { path: 'dados_basicos.subtitulo', label: 'Subtítulo', tipo: 'texto' },
  { path: 'dados_basicos.autor', label: 'Autor', tipo: 'texto' },
  { path: 'dados_basicos.coautores', label: 'Coautores', tipo: 'lista_texto' },
  { path: 'dados_basicos.tradutor', label: 'Tradutor', tipo: 'texto' },
  { path: 'dados_basicos.prefacio_por', label: 'Prefácio por', tipo: 'texto' },
  { path: 'dados_basicos.ilustrador', label: 'Ilustrador', tipo: 'texto' },
  { path: 'dados_basicos.idioma_original', label: 'Idioma original', tipo: 'texto' },
  { path: 'dados_basicos.idioma_publicacao', label: 'Idioma de publicação', tipo: 'texto' },
  { path: 'dados_basicos.edicao', label: 'Edição', tipo: 'texto', placeholder: '1ª edição' },
  { path: 'dados_basicos.ano_publicacao', label: 'Ano de publicação', tipo: 'numero' },
  { path: 'dados_basicos.isbn', label: 'ISBN', tipo: 'texto' },
  { path: 'dados_basicos.ean', label: 'EAN', tipo: 'texto' },
];

export const CAMPOS_DADOS_EDITORIAIS: DefinicaoCampo[] = [
  { path: 'dados_editoriais.selo', label: 'Selo', tipo: 'texto' },
  { path: 'dados_editoriais.colecao', label: 'Coleção', tipo: 'texto' },
  { path: 'dados_editoriais.formato', label: 'Formato', tipo: 'select', opcoes: ['brochura', 'capa_dura', 'ebook', 'audiolivro'] },
  { path: 'dados_editoriais.dimensoes_cm.largura', label: 'Largura (cm)', tipo: 'numero' },
  { path: 'dados_editoriais.dimensoes_cm.altura', label: 'Altura (cm)', tipo: 'numero' },
  { path: 'dados_editoriais.dimensoes_cm.lombada', label: 'Lombada (cm)', tipo: 'numero' },
  { path: 'dados_editoriais.peso_g', label: 'Peso (g)', tipo: 'numero' },
  { path: 'dados_editoriais.num_paginas', label: 'Número de páginas', tipo: 'numero' },
  { path: 'dados_editoriais.preco_capa_brl', label: 'Preço de capa (BRL)', tipo: 'numero' },
  { path: 'dados_editoriais.cdd', label: 'CDD', tipo: 'texto' },
  { path: 'dados_editoriais.cdu', label: 'CDU', tipo: 'texto' },
  { path: 'dados_editoriais.bisac', label: 'Códigos BISAC', tipo: 'lista_texto' },
  { path: 'dados_editoriais.thema', label: 'Códigos THEMA', tipo: 'lista_texto' },
  { path: 'dados_editoriais.categorias_alta_books', label: 'Categorias Alta Books', tipo: 'lista_texto' },
  { path: 'dados_editoriais.publico_alvo', label: 'Público-alvo', tipo: 'texto' },
  { path: 'dados_editoriais.faixa_etaria', label: 'Faixa etária', tipo: 'texto' },
];

export const CAMPOS_TEXTOS: DefinicaoCampo[] = [
  { path: 'textos.sinopse', label: 'Sinopse (contracapa)', tipo: 'texto_longo' },
  { path: 'textos.biografia_autor', label: 'Biografia do autor (orelha)', tipo: 'texto_longo' },
  { path: 'textos.texto_contracapa_completo', label: 'Texto completo da contracapa', tipo: 'texto_longo' },
  { path: 'textos.frases_marketing', label: 'Frases de marketing', tipo: 'lista_texto' },
  { path: 'textos.palavras_chave_seo', label: 'Palavras-chave SEO', tipo: 'lista_texto' },
  { path: 'textos.assuntos_matriz_cip', label: 'Assuntos (matriz CIP)', tipo: 'lista_texto' },
];

export const CAMPOS_RELACIONADAS: DefinicaoCampo[] = [
  { path: 'relacionadas.obras_do_autor', label: 'Obras do autor', tipo: 'lista_texto' },
  { path: 'relacionadas.livros_relacionados_catalogo_alta', label: 'Livros relacionados (catálogo Alta)', tipo: 'lista_texto' },
  { path: 'relacionadas.comparaveis_mercado', label: 'Comparáveis de mercado', tipo: 'lista_texto' },
];
