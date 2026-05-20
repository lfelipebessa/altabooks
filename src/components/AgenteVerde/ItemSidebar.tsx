import React, { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { Item } from '../../types/agenteVerde'
import { ItemRow } from './ItemRow'

type FiltroStatus = 'todos' | 'prontos' | 'pendentes' | 'falhas' | 'aprovados'

interface ItemSidebarProps {
  itens: Item[]
  selecionadoId: string | null
  marcadosEmLote: Set<string>
  onSelecionar: (id: string) => void
  onToggleMarcado: (id: string) => void
}

export const ItemSidebar: React.FC<ItemSidebarProps> = ({ itens, selecionadoId, marcadosEmLote, onSelecionar, onToggleMarcado }) => {
  const [filtro, setFiltro] = useState<FiltroStatus>('prontos')
  const [busca, setBusca] = useState('')

  const contagens = useMemo(() => ({
    prontos: itens.filter(i => i.status === 'pronto_revisao').length,
    pendentes: itens.filter(i => i.status === 'pending_files').length,
    falhas: itens.filter(i => i.status === 'falha').length,
    aprovados: itens.filter(i => i.status === 'aprovado').length,
  }), [itens])

  const itensFiltrados = useMemo(() => {
    const buscaLower = busca.toLowerCase()
    return itens
      .filter(i => {
        if (filtro === 'prontos') return i.status === 'pronto_revisao'
        if (filtro === 'pendentes') return i.status === 'pending_files'
        if (filtro === 'falhas') return i.status === 'falha'
        if (filtro === 'aprovados') return i.status === 'aprovado'
        return true
      })
      .filter(i =>
        !busca ||
        i.isbn.toLowerCase().includes(buscaLower) ||
        i.titulo.toLowerCase().includes(buscaLower)
      )
  }, [itens, filtro, busca])

  return (
    <aside
      className="w-[360px] shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
      style={{ height: 'calc(100vh - 168px)', position: 'sticky', top: '88px' }}
    >
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="relative">
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por ISBN ou título..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <ChipFiltro ativo={filtro === 'prontos'} onClick={() => setFiltro('prontos')} label={`Prontos (${contagens.prontos})`} />
          <ChipFiltro ativo={filtro === 'pendentes'} onClick={() => setFiltro('pendentes')} label={`Pendentes (${contagens.pendentes})`} />
          <ChipFiltro ativo={filtro === 'falhas'} onClick={() => setFiltro('falhas')} label={`Falhas (${contagens.falhas})`} />
          <ChipFiltro ativo={filtro === 'aprovados'} onClick={() => setFiltro('aprovados')} label={`Aprovados (${contagens.aprovados})`} />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
        {itensFiltrados.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Nenhum item neste filtro.</p>
        ) : (
          itensFiltrados.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              selecionado={item.id === selecionadoId}
              marcadoEmLote={marcadosEmLote.has(item.id)}
              onSelecionar={onSelecionar}
              onToggleMarcado={onToggleMarcado}
            />
          ))
        )}
      </div>
    </aside>
  )
}

const ChipFiltro: React.FC<{ ativo: boolean; onClick: () => void; label: string }> = ({ ativo, onClick, label }) => (
  <button
    onClick={onClick}
    className={ativo
      ? 'px-2.5 py-1 text-xs rounded-full bg-[#111] text-brand-primary font-semibold'
      : 'px-2.5 py-1 text-xs rounded-full bg-brand-bg-card text-gray-600 hover:bg-gray-200 font-medium'}
  >
    {label}
  </button>
)
