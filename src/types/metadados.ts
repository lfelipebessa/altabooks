export type StatusMetadados = 'aguardando' | 'processando' | 'pronto' | 'erro';
export type SeveridadeAlerta = 'info' | 'aviso' | 'erro';

export interface AlertaMetadados {
  campo: string;
  severidade: SeveridadeAlerta;
  mensagem: string;
}

export interface DadosBasicos {
  titulo: string | null;
  subtitulo: string | null;
  autor: string | null;
  coautores: string[];
  tradutor: string | null;
  prefacio_por: string | null;
  ilustrador: string | null;
  idioma_original: string | null;
  idioma_publicacao: string | null;
  edicao: string | null;
  ano_publicacao: number | null;
  isbn: string | null;
  ean: string | null;
}

export interface DadosEditoriais {
  selo: string | null;
  colecao: string | null;
  formato: 'brochura' | 'capa_dura' | 'ebook' | 'audiolivro' | null;
  dimensoes_cm: { largura: number | null; altura: number | null; lombada: number | null } | null;
  peso_g: number | null;
  num_paginas: number | null;
  preco_capa_brl: number | null;
  cdd: string | null;
  cdu: string | null;
  bisac: string[];
  thema: string[];
  categorias_alta_books: string[];
  publico_alvo: string | null;
  faixa_etaria: string | null;
}

export interface Textos {
  sinopse: string | null;
  biografia_autor: string | null;
  texto_contracapa_completo: string | null;
  frases_marketing: string[];
  palavras_chave_seo: string[];
  assuntos_matriz_cip: string[];
}

export interface Relacionadas {
  obras_do_autor: string[];
  livros_relacionados_catalogo_alta: string[];
  comparaveis_mercado: string[];
}

export interface MetadadosJSON {
  dados_basicos: DadosBasicos;
  dados_editoriais: DadosEditoriais;
  textos: Textos;
  relacionadas: Relacionadas;
}

export interface MetadadosJob {
  id: string;
  isbn: string | null;
  titulo: string | null;
  autor: string | null;
  selo: string | null;
  status: StatusMetadados;
  erro_mensagem: string | null;
  capa_path: string;
  miolo_path: string;
  pcp_path: string;
  metadados_json: MetadadosJSON | null;
  alertas: AlertaMetadados[];
  xlsx_bookinfo_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
