import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { TopBar } from '../../components/TopBar'
import { DemoBanner } from '../../components/AgenteVerde/DemoBanner'
import { LoteCard } from '../../components/AgenteVerde/LoteCard'
import { UploadModal } from '../../components/AgenteVerde/UploadModal'
import { MOCK_LOTES } from '../../data/agenteVerdeMock'

export const Listagem: React.FC = () => {
  const navigate = useNavigate()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [busca, setBusca] = useState('')

  const lotesFiltrados = MOCK_LOTES.filter(l =>
    l.nome_arquivo.toLowerCase().includes(busca.toLowerCase())
  )

  const aviso = (label: string) => alert(`Ação ainda não implementada: ${label}`)

  return (
    <div className="bg-brand-bg-section min-h-screen pb-20">
      <TopBar onNewProject={() => navigate('/')} />

      <main className="max-w-6xl mx-auto px-8 pt-[100px] space-y-6">
        <DemoBanner />

        <section className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Agente Verde</div>
            <h1 className="font-serif text-4xl text-brand-text-main">Lotes de catalogação</h1>
            <p className="text-sm text-gray-500 mt-2">
              Cada lote corresponde a um upload de planilha do prelo. Acompanhe o status agregado e abra para revisar.
            </p>
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-hover text-brand-text-main font-bold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo lote
          </button>
        </section>

        <section className="flex items-center gap-2 text-sm">
          <div className="ml-auto relative">
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome do lote..."
              className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 w-72 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
            <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
          </div>
        </section>

        <section className="space-y-3">
          {lotesFiltrados.map((lote, idx) => (
            <LoteCard
              key={lote.id}
              lote={lote}
              emphasized={idx === 1 && lote.status === 'aguardando_revisao'}
              onAcaoNaoImplementada={aviso}
            />
          ))}
          {lotesFiltrados.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400">
              Nenhum lote encontrado.
            </div>
          )}
        </section>
      </main>

      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onConfirmar={() => {
          aviso('Disparar processamento')
          setUploadOpen(false)
        }}
      />
    </div>
  )
}
