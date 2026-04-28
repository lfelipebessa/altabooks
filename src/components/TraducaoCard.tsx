import React from 'react'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { Traducao } from '../types'

const IDIOMA_LABELS: Record<string, string> = {
  en: 'Inglês', es: 'Espanhol', fr: 'Francês',
  de: 'Alemão', it: 'Italiano', ja: 'Japonês',
}

interface TraducaoCardProps {
  traducao: Traducao
}

export const TraducaoCard: React.FC<TraducaoCardProps> = ({ traducao }) => {
  const label = IDIOMA_LABELS[traducao.idioma] ?? traducao.idioma

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-brand-bg-section rounded-xl border border-gray-200">
      {traducao.status === 'traduzindo' && (
        <Loader2 className="w-4 h-4 animate-spin text-brand-primary shrink-0" />
      )}
      {traducao.status === 'concluido' && (
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
      )}
      {traducao.status === 'erro' && (
        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-brand-text-main">Tradução — {label}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {traducao.status === 'traduzindo' && 'Em andamento…'}
          {traducao.status === 'concluido' && 'Concluída'}
          {traducao.status === 'erro' && 'Falhou — verifique o n8n'}
        </p>
      </div>
    </div>
  )
}
