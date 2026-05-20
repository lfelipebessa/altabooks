import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Download } from 'lucide-react'
import type { Lote } from '../../types/agenteVerde'

interface LoteCardProps {
  lote: Lote
  emphasized?: boolean
  onAcaoNaoImplementada?: (label: string) => void
}

export const LoteCard: React.FC<LoteCardProps> = ({ lote, emphasized = false, onAcaoNaoImplementada }) => {
  const cardCls = emphasized
    ? 'bg-white rounded-2xl border-2 border-brand-primary shadow-md overflow-hidden'
    : 'bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden'

  const stripeCls = lote.status === 'concluido' ? 'h-1 bg-gray-200' : 'h-1 bg-brand-primary'

  return (
    <article className={cardCls}>
      <div className={stripeCls} />
      <div className="p-6 flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-serif text-xl text-brand-text-main truncate">{lote.nome_arquivo.replace(/\.[^.]+$/, '').replace(/-/g, ' ')}</h3>
            <StatusBadge status={lote.status} />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            <span className="font-medium text-gray-700">{lote.nome_arquivo}</span> ·{' '}
            {lote.status === 'concluido' ? 'Aprovado por ' : 'Enviado por '}
            <span className="font-medium text-gray-700">{lote.uploaded_by}</span> ·{' '}
            {lote.uploaded_at}
          </p>
          {lote.status === 'processando' && lote.progress_pct !== undefined && (
            <div className="flex items-center gap-6 text-sm">
              <div>
                <div className="text-2xl font-bold text-brand-text-main">
                  {lote.contadores.prontos}<span className="text-gray-300">/{lote.total_itens}</span>
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">processados</div>
              </div>
              <div className="flex-1 max-w-md">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-primary rounded-full" style={{ width: `${lote.progress_pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                  <span>{lote.progress_pct}%</span>
                  <span>{lote.tempo_restante}</span>
                </div>
              </div>
            </div>
          )}
          {lote.status !== 'processando' && (
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <Contador cor="bg-emerald-500" valor={lote.contadores.prontos} label="prontos" />
              {lote.contadores.pendentes > 0 && (
                <Contador cor="bg-amber-400" valor={lote.contadores.pendentes} label="arquivos faltando" />
              )}
              {lote.contadores.falhas > 0 && (
                <Contador cor="bg-red-500" valor={lote.contadores.falhas} label="com falha" />
              )}
              {lote.contadores.aprovados > 0 && (
                <Contador cor="bg-gray-400" valor={lote.contadores.aprovados} label={lote.status === 'concluido' ? 'aprovados' : 'aprovados'} />
              )}
              <div className="ml-auto text-xs text-gray-400">Total: {lote.total_itens} ISBNs</div>
            </div>
          )}
        </div>

        {lote.status === 'processando' && (
          <button disabled className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-brand-bg-card text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed">
            Aguardando…
          </button>
        )}
        {lote.status === 'aguardando_revisao' && (
          <Link
            to={`/agente-verde/lote/${lote.id}`}
            className={emphasized
              ? 'shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[#111] hover:bg-[#222] text-brand-primary font-bold rounded-lg transition-colors'
              : 'shrink-0 flex items-center gap-2 px-5 py-2.5 bg-brand-bg-card hover:bg-[#111] hover:text-brand-primary text-gray-700 font-bold rounded-lg transition-colors'}
          >
            Revisar lote
            {emphasized && <ArrowRight className="w-4 h-4" />}
          </Link>
        )}
        {lote.status === 'concluido' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onAcaoNaoImplementada?.('Download Book Info.xlsx')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-brand-bg-card hover:bg-brand-primary hover:text-brand-text-main text-gray-600 font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Book Info.xlsx
            </button>
            <button
              type="button"
              onClick={() => onAcaoNaoImplementada?.('Download Metagráfica.xlsx')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-brand-bg-card hover:bg-brand-primary hover:text-brand-text-main text-gray-600 font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Metagráfica.xlsx
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

const StatusBadge: React.FC<{ status: Lote['status'] }> = ({ status }) => {
  if (status === 'processando') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-bg-badge text-amber-800 border border-brand-primary/30">
        <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
        Processando
      </span>
    )
  }
  if (status === 'aguardando_revisao') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Aguardando revisão
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
      <Check className="w-3 h-3" strokeWidth={3} />
      Concluído
    </span>
  )
}

const Contador: React.FC<{ cor: string; valor: number; label: string }> = ({ cor, valor, label }) => (
  <div className="flex items-center gap-1.5">
    <span className={`w-2 h-2 rounded-full ${cor}`} />
    <span className="font-bold text-brand-text-main">{valor}</span>
    <span className="text-gray-500">{label}</span>
  </div>
)
