import React from 'react'
import { Sparkles, Plus, X as XIcon } from 'lucide-react'
import type { BookInfo } from '../../types/agenteVerde'

interface BookInfoFormProps {
  value: BookInfo
  onChange: (next: BookInfo) => void
}

export const BookInfoForm: React.FC<BookInfoFormProps> = ({ value, onChange }) => {
  const set = <K extends keyof BookInfo>(key: K, v: BookInfo[K]) => onChange({ ...value, [key]: v })

  const removerPalavra = (palavra: string) => {
    set('palavras_chave', value.palavras_chave.filter(p => p !== palavra))
  }

  return (
    <div className="p-6 space-y-6">
      <Secao titulo="Identificação" subtitulo="Campos extraídos da capa, miolo e planilha técnica">
        <Grid2>
          <Campo label="Título"><Input value={value.titulo} onChange={v => set('titulo', v)} /></Campo>
          <Campo label="Subtítulo"><Input value={value.subtitulo} onChange={v => set('subtitulo', v)} /></Campo>
          <Campo label="Autor principal"><Input value={value.autor} onChange={v => set('autor', v)} /></Campo>
          <Campo label="Marca"><Input value={value.marca} onChange={v => set('marca', v)} /></Campo>
          <Campo label="Idioma"><Input value={value.idioma} onChange={v => set('idioma', v)} /></Campo>
          <Campo label="Páginas"><Input value={String(value.paginas)} onChange={v => set('paginas', Number(v) || 0)} /></Campo>
        </Grid2>
      </Secao>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-serif text-lg text-brand-text-main">Sinopse</h3>
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <Sparkles className="w-3.5 h-3.5" />
            Gerado pela IA
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">Editável. Mudanças sobrescrevem a sugestão.</p>
        <textarea
          rows={5}
          value={value.sinopse}
          onChange={e => set('sinopse', e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
        />
      </div>

      <Secao titulo="Classificação BISAC" subtitulo="Sugestões baseadas em conteúdo do miolo">
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 bg-brand-bg-badge rounded-lg border border-brand-primary/30">
            <span className="font-mono text-xs font-bold bg-white px-2 py-1 rounded border border-gray-200">{value.bisac_principal.codigo}</span>
            <span className="text-sm flex-1">{value.bisac_principal.descricao}</span>
            <span className="text-xs text-emerald-700 font-semibold">Principal</span>
          </div>
          {value.bisac_secundarios.map((bisac, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
              <span className="font-mono text-xs font-bold bg-brand-bg-card px-2 py-1 rounded border border-gray-200">{bisac.codigo}</span>
              <span className="text-sm flex-1">{bisac.descricao}</span>
              <button
                type="button"
                onClick={() => set('bisac_secundarios', value.bisac_secundarios.filter((_, i) => i !== idx))}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                remover
              </button>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Palavras-chave" subtitulo="Pra busca em marketplaces. Ajuste livremente.">
        <div className="flex flex-wrap items-center gap-1.5">
          {value.palavras_chave.map(p => (
            <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-bg-card text-gray-700 border border-gray-200">
              {p}
              <button type="button" onClick={() => removerPalavra(p)} className="text-gray-400 hover:text-red-500 ml-0.5">
                <XIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-gray-400 border border-dashed border-gray-300">
            <Plus className="w-3 h-3" />
            adicionar
          </span>
        </div>
      </Secao>

      <Secao titulo="Dados comerciais" subtitulo="Cada ISBN gera dois cadastros — físico e digital">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-brand-bg-section rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-[#111] text-brand-primary text-xs font-bold flex items-center justify-center">📕</span>
              <span className="font-semibold text-sm">Físico</span>
            </div>
            <div className="space-y-3">
              <Campo label="ISBN físico"><InputMono value={value.isbn_fisico} onChange={v => set('isbn_fisico', v)} /></Campo>
              <Campo label="Preço (R$)"><Input value={value.preco_fisico} onChange={v => set('preco_fisico', v)} /></Campo>
              <Campo label="Tiragem inicial"><Input value={value.tiragem_inicial} onChange={v => set('tiragem_inicial', v)} /></Campo>
            </div>
          </div>
          <div className="bg-brand-bg-section rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-[#111] text-brand-primary text-xs font-bold flex items-center justify-center">📱</span>
              <span className="font-semibold text-sm">Digital</span>
            </div>
            <div className="space-y-3">
              <Campo label="ISBN digital"><InputMono value={value.isbn_digital} onChange={v => set('isbn_digital', v)} /></Campo>
              <Campo label="Preço (R$)"><Input value={value.preco_digital} onChange={v => set('preco_digital', v)} /></Campo>
              <Campo label="Formato">
                <select
                  value={value.formato_digital}
                  onChange={e => set('formato_digital', e.target.value as BookInfo['formato_digital'])}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                >
                  <option value="epub">ePub</option>
                  <option value="pdf">PDF</option>
                  <option value="mobi">MOBI</option>
                </select>
              </Campo>
            </div>
          </div>
        </div>
      </Secao>
    </div>
  )
}

const Secao: React.FC<{ titulo: string; subtitulo: string; children: React.ReactNode }> = ({ titulo, subtitulo, children }) => (
  <div>
    <h3 className="font-serif text-lg text-brand-text-main mb-1">{titulo}</h3>
    <p className="text-xs text-gray-500 mb-3">{subtitulo}</p>
    {children}
  </div>
)

const Grid2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-2 gap-4">{children}</div>
)

const Campo: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</div>
    {children}
  </div>
)

const Input: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input
    type="text"
    value={value}
    onChange={e => onChange(e.target.value)}
    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
  />
)

const InputMono: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input
    type="text"
    value={value}
    onChange={e => onChange(e.target.value)}
    className="w-full text-sm font-mono border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
  />
)
