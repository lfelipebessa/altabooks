export type ProjetoStatus =
  | 'aguardando' | 'analisando_materiais' | 'gerando_executivo'
  | 'gerando_sumarios' | 'aguardando_aprovacao' | 'escrevendo_livro'
  | 'concluido' | 'erro'

export type ArquivoTipo = 'video' | 'audio' | 'pdf' | 'texto' | 'imagem'
export type ArquivoStatus = 'pendente' | 'processado' | 'erro'
export type SumarioAbordagem = 'cronologica' | 'tematica' | 'narrativa'

export interface Capitulo { numero: number; titulo: string; descricao: string; subassuntos?: string[] }

export interface Projeto {
  id: string; nome_projeto: string; autor_nome: string
  drive_url: string | null; drive_executivo_url: string | null
  conteudo_executivo: string | null
  status: ProjetoStatus; created_at: string; updated_at: string | null
  qtd_capitulos: number
  qtd_subcapitulos_min: number
  qtd_subcapitulos_max: number
  paginas_min: number
  paginas_max: number
}

export interface Arquivo {
  id: string; projeto_id: string; nome_arquivo: string
  tipo_arquivo: ArquivoTipo; drive_file_id: string | null
  drive_url: string | null; status: ArquivoStatus; created_at: string
}

export interface TranscricaoResumo {
  id: string; arquivo_id: string; transcricao_completa: string | null
  resumo: string | null; topicos: string[] | null; tom: string | null
  publico_alvo: string | null; argumentos_principais: string[] | null
  idioma: string | null; modelo_llm_resumo: string | null; created_at: string
}

export interface Sumario {
  id: string; projeto_id: string; opcao: number
  abordagem: SumarioAbordagem; titulo_sumario: string | null
  capitulos: Capitulo[] | null; drive_doc_id: string | null
  drive_url: string | null; selecionado: boolean
  conteudo: string | null
  created_at: string; updated_at: string | null
}

export interface CapituloLivro {
  id: string; projeto_id: string; sumario_id: string
  numero: number; titulo: string; descricao: string
  conteudo: string; resumo: string; palavras: number
  status: string; created_at: string
}
