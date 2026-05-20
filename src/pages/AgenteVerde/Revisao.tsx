import React, { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { TopBar } from '../../components/TopBar'
import { DemoBanner } from '../../components/AgenteVerde/DemoBanner'
import { ItemSidebar } from '../../components/AgenteVerde/ItemSidebar'
import { ItemDetailEditor } from '../../components/AgenteVerde/ItemDetailEditor'
import { MOCK_LOTES, MOCK_ITEMS_BY_LOTE } from '../../data/agenteVerdeMock'
import type { Item, BookInfo, Metagrafica } from '../../types/agenteVerde'

export const Revisao: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const lote = useMemo(() => MOCK_LOTES.find(l => l.id === id), [id])
  const itensIniciais = useMemo(() => (id && MOCK_ITEMS_BY_LOTE[id]) || [], [id])

  const [prevId, setPrevId] = useState<string | undefined>(id)
  const [itens, setItens] = useState<Item[]>(itensIniciais)
  const [selecionadoId, setSelecionadoId] = useState<string | null>(itensIniciais[0]?.id ?? null)
  const [marcadosEmLote, setMarcadosEmLote] = useState<Set<string>>(new Set())

  if (id !== prevId) {
    setPrevId(id)
    setItens(itensIniciais)
    setSelecionadoId(itensIniciais[0]?.id ?? null)
    setMarcadosEmLote(new Set())
  }

  const itemSelecionado = itens.find(i => i.id === selecionadoId)

  const aviso = (label: string) => alert(`Ação ainda não implementada: ${label}`)

  const updateItemBookInfo = (novoBookInfo: BookInfo) => {
    if (!itemSelecionado) return
    setItens(prev => prev.map(it => it.id === itemSelecionado.id ? { ...it, book_info: novoBookInfo } : it))
  }

  const updateItemMetagrafica = (novoMeta: Metagrafica) => {
    if (!itemSelecionado) return
    setItens(prev => prev.map(it => it.id === itemSelecionado.id ? { ...it, metagrafica: novoMeta } : it))
  }

  const toggleMarcado = (itemId: string) => {
    setMarcadosEmLote(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  if (!lote) {
    return (
      <div className="bg-brand-bg-section min-h-screen">
        <TopBar onNewProject={() => navigate('/')} />
        <main className="max-w-6xl mx-auto px-8 pt-[120px]">
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center space-y-4">
            <p className="text-lg text-gray-600">Lote não encontrado.</p>
            <Link to="/agente-verde" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-brand-text-main font-bold rounded-lg">
              <ArrowLeft className="w-4 h-4" />
              Voltar à listagem
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-brand-bg-section min-h-screen pb-20">
      <TopBar onNewProject={() => navigate('/')} />

      <main className="max-w-[1500px] mx-auto px-6 pt-[88px] space-y-4">
        <DemoBanner />

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-brand-primary" />
          <div className="px-6 py-4 flex items-center gap-5 flex-wrap">
            <Link to="/agente-verde" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-text-main">
              <ArrowLeft className="w-4 h-4" />
              Lotes
            </Link>
            <span className="text-gray-300">/</span>
            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-2xl text-brand-text-main truncate">
                {lote.nome_arquivo.replace(/\.[^.]+$/, '').replace(/-/g, ' ')}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {lote.nome_arquivo} · {lote.total_itens} ISBNs · enviado {lote.uploaded_at}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Contador cor="bg-emerald-500" valor={lote.contadores.prontos} label="prontos" />
              {lote.contadores.pendentes > 0 && <Contador cor="bg-amber-400" valor={lote.contadores.pendentes} label="pendentes" />}
              {lote.contadores.falhas > 0 && <Contador cor="bg-red-500" valor={lote.contadores.falhas} label="falhas" />}
              {lote.contadores.aprovados > 0 && <Contador cor="bg-gray-400" valor={lote.contadores.aprovados} label="aprovados" />}
            </div>
            <button
              type="button"
              disabled={marcadosEmLote.size === 0}
              onClick={() => aviso(`Aprovar ${marcadosEmLote.size} selecionado(s)`)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-hover text-brand-text-main font-bold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
              Aprovar selecionados ({marcadosEmLote.size})
            </button>
          </div>
        </section>

        <div className="flex gap-4">
          <ItemSidebar
            itens={itens}
            selecionadoId={selecionadoId}
            marcadosEmLote={marcadosEmLote}
            onSelecionar={setSelecionadoId}
            onToggleMarcado={toggleMarcado}
          />

          {itemSelecionado ? (
            <ItemDetailEditor
              item={itemSelecionado}
              onChangeBookInfo={updateItemBookInfo}
              onChangeMetagrafica={updateItemMetagrafica}
              onAcaoNaoImplementada={aviso}
            />
          ) : (
            <section className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
              Selecione um item na lista para começar a revisão.
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

const Contador: React.FC<{ cor: string; valor: number; label: string }> = ({ cor, valor, label }) => (
  <div className="flex items-center gap-1.5">
    <span className={`w-2 h-2 rounded-full ${cor}`} />
    <span className="font-bold text-brand-text-main">{valor}</span>
    <span className="text-gray-500">{label}</span>
  </div>
)
