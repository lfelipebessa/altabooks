export type LoteStatus = 'processando' | 'aguardando_revisao' | 'concluido'

export type ItemStatus =
  | 'pendente'
  | 'pending_files'
  | 'extraindo'
  | 'pronto_revisao'
  | 'aprovado'
  | 'falha'

export type FormatoDigital = 'epub' | 'pdf' | 'mobi'

export interface Lote {
  id: string
  nome_arquivo: string
  uploaded_by: string
  uploaded_at: string
  total_itens: number
  status: LoteStatus
  contadores: {
    prontos: number
    pendentes: number
    falhas: number
    aprovados: number
  }
  progress_pct?: number
  tempo_restante?: string
}

export interface BisacEntry {
  codigo: string
  descricao: string
}

export interface BookInfo {
  titulo: string
  subtitulo: string
  autor: string
  marca: string
  idioma: string
  paginas: number
  sinopse: string
  bisac_principal: BisacEntry
  bisac_secundarios: BisacEntry[]
  palavras_chave: string[]
  isbn_fisico: string
  isbn_digital: string
  preco_fisico: string
  preco_digital: string
  tiragem_inicial: string
  formato_digital: FormatoDigital
}

export interface Metagrafica {
  largura_mm: number
  altura_mm: number
  lombada_mm: number
  gramatura_miolo: number
  gramatura_capa: number
  peso_g: number
  codigo_barras: string
  cdd: string
  departamento: string
  cat1: string
  cat2: string
  cat3: string
}

export interface Item {
  id: string
  lote_id: string
  isbn: string
  titulo: string
  autor: string
  marca: string
  status: ItemStatus
  status_detalhe?: string
  book_info: BookInfo | null
  metagrafica: Metagrafica | null
}
