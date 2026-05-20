import React from 'react'
import { Check } from 'lucide-react'
import type { Item } from '../../types/agenteVerde'

interface ItemRowProps {
  item: Item
  selecionado: boolean
  marcadoEmLote: boolean
  onSelecionar: (id: string) => void
  onToggleMarcado: (id: string) => void
}

export const ItemRow: React.FC<ItemRowProps> = ({ item, selecionado, marcadoEmLote, onSelecionar, onToggleMarcado }) => {
  const baseCls = 'px-4 py-3 cursor-pointer transition-colors'
  const selecionadoCls = selecionado
    ? 'bg-brand-bg-badge border-l-4 border-brand-primary'
    : item.status === 'aprovado'
      ? 'hover:bg-brand-bg-section opacity-60'
      : 'hover:bg-brand-bg-section'

  const desabilitarCheckbox = item.status === 'pending_files' || item.status === 'falha' || item.status === 'aprovado'

  return (
    <div className={`${baseCls} ${selecionadoCls}`} onClick={() => onSelecionar(item.id)}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.status === 'aprovado' ? true : marcadoEmLote}
          disabled={desabilitarCheckbox}
          onClick={e => e.stopPropagation()}
          onChange={() => onToggleMarcado(item.id)}
          className={desabilitarCheckbox && item.status !== 'aprovado' ? 'mt-1 opacity-30' : 'mt-1 accent-brand-primary'}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-gray-400 mb-0.5">{item.isbn}</p>
          <p className={`text-sm leading-tight truncate ${selecionado ? 'font-semibold text-brand-text-main' : 'font-medium text-brand-text-main'}`}>
            {item.titulo}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {item.status === 'pending_files' || item.status === 'falha'
              ? <span className="text-gray-400">— {item.status_detalhe || 'sem dados'} —</span>
              : `${item.autor} · ${item.marca}`}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <ItemStatusBadge status={item.status} />
          </div>
        </div>
      </div>
    </div>
  )
}

const ItemStatusBadge: React.FC<{ status: Item['status'] }> = ({ status }) => {
  if (status === 'pronto_revisao') {
    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Pronto</span>
  }
  if (status === 'pending_files') {
    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pendente</span>
  }
  if (status === 'falha') {
    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">Falha</span>
  }
  if (status === 'aprovado') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
        <Check className="w-2.5 h-2.5" strokeWidth={3} />
        Aprovado
      </span>
    )
  }
  return null
}
