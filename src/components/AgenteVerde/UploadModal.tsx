import React, { useState } from 'react'
import { X, FileText, Play } from 'lucide-react'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmar: () => void
}

const mockISBNs = [
  { isbn: '978-85-508-2410-7', titulo: 'Pequenos Hábitos, Grandes Resultados', valido: true },
  { isbn: '978-85-508-2411-4', titulo: 'A Lógica do Mercado de Ações', valido: true },
  { isbn: '978-85-508-2412-1', titulo: 'Inteligência Emocional na Prática', valido: true },
  { isbn: '978-85-508-XXX-X', titulo: 'Liderança Quântica', valido: false, motivo: 'ISBN inválido' },
  { isbn: '978-85-508-2414-5', titulo: 'O Manual do Empreendedor Brasileiro', valido: true },
  { isbn: '', titulo: '(linha 24 sem ISBN)', valido: false, motivo: 'vazio' },
]

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onConfirmar }) => {
  const [arquivoSelecionado, setArquivoSelecionado] = useState(true)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="h-1 bg-brand-primary" />
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl text-brand-text-main">Novo lote</h2>
            <p className="text-sm text-gray-500 mt-0.5">Faça upload da planilha do prelo com os ISBNs a catalogar</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-brand-text-main w-8 h-8 flex items-center justify-center rounded-lg hover:bg-brand-bg-card">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {arquivoSelecionado ? (
            <div className="bg-brand-bg-section border border-gray-200 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brand-text-main truncate">prelo-set-2026.xlsx</p>
                <p className="text-xs text-gray-500 mt-0.5">42 KB · arquivo de demonstração</p>
              </div>
              <button onClick={() => setArquivoSelecionado(false)} className="text-xs text-gray-400 hover:text-red-500">trocar</button>
            </div>
          ) : (
            <div onClick={() => setArquivoSelecionado(true)} className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-brand-primary hover:bg-brand-bg-badge transition-colors cursor-pointer">
              <p className="font-semibold text-brand-text-main">Arraste a planilha aqui</p>
              <p className="text-sm text-gray-500 mt-1">ou clique pra escolher um arquivo de demonstração</p>
            </div>
          )}

          {arquivoSelecionado && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-brand-text-main">ISBNs detectados</h3>
                  <span className="text-sm text-gray-500">
                    <span className="font-bold text-brand-text-main">{mockISBNs.filter(i => i.valido).length}</span> linhas válidas ·{' '}
                    <span className="text-amber-700">{mockISBNs.filter(i => !i.valido).length} inválidas</span>
                  </span>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-brand-bg-card px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 grid grid-cols-[1fr_2fr_1fr] gap-3">
                    <span>ISBN físico</span>
                    <span>Título (planilha)</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto text-sm">
                    {mockISBNs.map((linha, idx) => (
                      <div key={idx} className={`px-4 py-2 grid grid-cols-[1fr_2fr_1fr] gap-3 items-center ${!linha.valido ? 'bg-red-50' : ''}`}>
                        <span className={`font-mono text-xs ${!linha.valido ? 'text-red-700' : ''}`}>{linha.isbn || '—'}</span>
                        <span className={`truncate ${linha.valido ? 'text-gray-700' : 'text-gray-500 italic'}`}>{linha.titulo}</span>
                        <span className={`text-xs font-medium ${linha.valido ? 'text-emerald-700' : 'text-red-700'}`}>
                          {linha.valido ? '✓ válido' : `✗ ${linha.motivo}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-brand-bg-section">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-brand-bg-card rounded-lg">
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={!arquivoSelecionado}
            className="flex items-center gap-2 px-5 py-2 bg-brand-primary hover:bg-brand-hover text-brand-text-main font-bold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            Disparar processamento
          </button>
        </div>
      </div>
    </div>
  )
}
