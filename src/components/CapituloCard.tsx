import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { CapituloLivro } from '../types'

interface CapituloCardProps {
  capitulo: CapituloLivro
}

export const CapituloCard: React.FC<CapituloCardProps> = ({ capitulo }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-brand-bg rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-brand-bg-section/60 transition-colors group text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          <span className="w-8 h-8 rounded-full bg-[#111] text-brand-primary text-xs font-bold flex items-center justify-center shrink-0">
            {capitulo.numero}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-brand-text-main truncate">{capitulo.titulo}</p>
            <p className="text-xs text-gray-400 mt-0.5">{capitulo.palavras.toLocaleString('pt-BR')} palavras</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-brand-bg-card text-gray-600 group-hover:bg-brand-primary group-hover:text-brand-text-main transition-all shrink-0 ml-4">
          {expanded
            ? <><ChevronUp className="w-4 h-4" /> Ocultar</>
            : <><ChevronDown className="w-4 h-4" /> Ler</>
          }
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-8 py-6">
          <div
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: capitulo.conteudo.replace(/\n/g, '<br />') }}
          />
        </div>
      )}
    </div>
  )
}
