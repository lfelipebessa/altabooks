import React, { useState } from 'react'
import { ExternalLink, RotateCcw, Check, FileText, LayoutGrid, AlertCircle } from 'lucide-react'
import type { Item, BookInfo, Metagrafica } from '../../types/agenteVerde'
import { BookInfoForm } from './BookInfoForm'
import { MetagraficaForm } from './MetagraficaForm'

type TabId = 'book_info' | 'metagrafica'

interface ItemDetailEditorProps {
  item: Item
  onChangeBookInfo: (next: BookInfo) => void
  onChangeMetagrafica: (next: Metagrafica) => void
  onAcaoNaoImplementada: (label: string) => void
}

export const ItemDetailEditor: React.FC<ItemDetailEditorProps> = ({
  item, onChangeBookInfo, onChangeMetagrafica, onAcaoNaoImplementada,
}) => {
  const [tab, setTab] = useState<TabId>('book_info')

  if (!item.book_info || !item.metagrafica) {
    return (
      <section className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-1 bg-amber-300" />
        <div className="p-10 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="font-serif text-2xl text-brand-text-main">{item.titulo}</h2>
          <p className="text-xs font-mono text-gray-400">{item.isbn}</p>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Este item está em <strong>{item.status === 'falha' ? 'falha' : 'pendência'}</strong>.
            Motivo: <em>{item.status_detalhe || 'sem detalhes'}</em>.
            Resolva o problema no Drive e reprocesse pra continuar.
          </p>
          <button
            type="button"
            onClick={() => onAcaoNaoImplementada('Reprocessar item')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-bg-card hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reprocessar
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-brand-primary" />

      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start gap-5">
          <div className="w-20 h-28 rounded-lg bg-gradient-to-br from-amber-100 to-amber-300 shrink-0 flex items-center justify-center shadow-md">
            <span className="text-amber-900 text-[10px] font-bold tracking-wider text-center px-1.5">{item.titulo.split(' ').slice(0, 2).join('\n').toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {item.status === 'aprovado' ? 'Aprovado' : 'Pronto para revisão'}
              </span>
            </div>
            <h2 className="font-serif text-2xl text-brand-text-main leading-tight">{item.titulo}</h2>
            <p className="text-sm text-gray-500 mt-1">por <span className="font-medium text-gray-700">{item.autor}</span> · <span className="font-medium text-gray-700">{item.marca}</span></p>
            <p className="text-xs font-mono text-gray-400 mt-2">ISBN físico: {item.book_info.isbn_fisico} · ISBN digital: {item.book_info.isbn_digital}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => onAcaoNaoImplementada('Pasta no Drive')} className="flex items-center gap-1.5 text-xs text-brand-primary hover:underline">
              <ExternalLink className="w-3.5 h-3.5" />
              Pasta no Drive
            </button>
            <button type="button" onClick={() => onAcaoNaoImplementada('Reprocessar')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-brand-bg-card hover:bg-gray-200 rounded-lg transition-colors">
              <RotateCcw className="w-4 h-4" />
              Reprocessar
            </button>
            <button type="button" onClick={() => onAcaoNaoImplementada('Aprovar item')} className="flex items-center gap-1.5 px-4 py-2 bg-[#111] hover:bg-[#222] text-brand-primary font-bold rounded-lg text-sm transition-colors">
              <Check className="w-4 h-4" strokeWidth={2.5} />
              Aprovar
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 px-6 py-3 border-b border-gray-100 bg-brand-bg-section/50">
        <TabButton ativo={tab === 'book_info'} onClick={() => setTab('book_info')} icon={<FileText className="w-4 h-4" />} label="Book Info" sub="comercial" />
        <TabButton ativo={tab === 'metagrafica'} onClick={() => setTab('metagrafica')} icon={<LayoutGrid className="w-4 h-4" />} label="Metagráfica" sub="produção" />
      </div>

      {tab === 'book_info'
        ? <BookInfoForm value={item.book_info} onChange={onChangeBookInfo} />
        : <MetagraficaForm value={item.metagrafica} onChange={onChangeMetagrafica} />}
    </section>
  )
}

const TabButton: React.FC<{ ativo: boolean; onClick: () => void; icon: React.ReactNode; label: string; sub: string }> = ({ ativo, onClick, icon, label, sub }) => (
  <button
    type="button"
    onClick={onClick}
    className={ativo
      ? 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#111] text-brand-primary'
      : 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-brand-text-main hover:bg-white'}
  >
    {icon}
    {label}
    <span className={ativo
      ? 'ml-1 px-1.5 py-0.5 text-[10px] bg-white/10 rounded-full'
      : 'ml-1 px-1.5 py-0.5 text-[10px] bg-gray-100 rounded-full text-gray-500'}>
      {sub}
    </span>
  </button>
)
