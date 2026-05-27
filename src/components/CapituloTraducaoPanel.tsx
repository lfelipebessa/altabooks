import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Wand2, Loader2 } from 'lucide-react'
import type { CapituloTraducao } from '../types'

const applyInline = (t: string) =>
  t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')

const markdownToHtml = (text: string): string => {
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  return text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map(block => {
      const b = block.trim()
      if (/^### /.test(b)) return `<h3>${applyInline(b.replace(/^### /, ''))}</h3>`
      if (/^## /.test(b))  return `<h2>${applyInline(b.replace(/^## /, ''))}</h2>`
      if (/^# /.test(b))   return `<h1>${applyInline(b.replace(/^# /, ''))}</h1>`
      const lines = b.split('\n')
      if (lines.every(l => /^- /.test(l.trim()))) {
        const items = lines.map(l => `<li>${applyInline(l.trim().replace(/^- /, ''))}</li>`).join('')
        return `<ul>${items}</ul>`
      }
      return `<p>${applyInline(b.replace(/\n/g, '<br />'))}</p>`
    })
    .join('')
}

const formatDataRevisao = (iso: string | null): string => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

interface CapituloTraducaoPanelProps {
  capitulo: CapituloTraducao
  onRevisar: () => void
}

export const CapituloTraducaoPanel: React.FC<CapituloTraducaoPanelProps> = ({ capitulo, onRevisar }) => {
  const [expanded, setExpanded] = useState(false)
  const [versao, setVersao] = useState<'traducao' | 'revisao'>(
    capitulo.status_revisao === 'revisado' ? 'revisao' : 'traducao'
  )

  const titulo = versao === 'revisao' && capitulo.titulo_revisado
    ? capitulo.titulo_revisado
    : capitulo.titulo

  const conteudoFonte = versao === 'revisao' && capitulo.conteudo_revisado
    ? capitulo.conteudo_revisado
    : capitulo.conteudo

  const conteudoHtml = markdownToHtml(conteudoFonte)

  const podeMostrarRevisao = capitulo.status_revisao === 'revisado'

  return (
    <div className="bg-brand-bg rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 h-8 rounded-full bg-[#111] text-brand-primary text-xs font-bold flex items-center justify-center shrink-0">
            {capitulo.numero}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-brand-text-main truncate">{titulo}</h3>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {capitulo.status_revisao === 'revisando' && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Revisando...
            </span>
          )}
          {capitulo.status_revisao === 'revisado' && !expanded && (
            <span className="text-xs text-emerald-600">· Revisado</span>
          )}
          {capitulo.status_revisao === 'erro' && !expanded && (
            <span className="text-xs text-red-600">· Erro na revisão</span>
          )}

          {expanded && (
            <button
              onClick={onRevisar}
              disabled={capitulo.status_revisao === 'revisando'}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium bg-brand-bg-card text-gray-600 hover:bg-brand-primary hover:text-brand-text-main transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {capitulo.status_revisao === 'revisando' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Revisando...</>
              ) : capitulo.status_revisao === 'revisado' ? (
                <><Wand2 className="w-4 h-4" /> Revisar de novo</>
              ) : (
                <><Wand2 className="w-4 h-4" /> Revisar com IA</>
              )}
            </button>
          )}

          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-brand-bg-card text-gray-600 hover:bg-brand-primary hover:text-brand-text-main transition-all shrink-0 cursor-pointer"
          >
            {expanded
              ? <><ChevronUp className="w-4 h-4" /> Ocultar</>
              : <><ChevronDown className="w-4 h-4" /> Ler</>}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-6">
          {capitulo.status_revisao === 'erro' && capitulo.mensagem_erro_revisao && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              Erro na revisão: {capitulo.mensagem_erro_revisao}
            </div>
          )}

          <div className="flex gap-2 mb-4" role="tablist">
            <button
              role="tab"
              aria-selected={versao === 'traducao'}
              onClick={() => setVersao('traducao')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                versao === 'traducao' ? 'bg-[#111] text-white' : 'bg-brand-bg-card text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tradução
            </button>
            <button
              role="tab"
              aria-selected={versao === 'revisao'}
              disabled={!podeMostrarRevisao}
              onClick={() => setVersao('revisao')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center ${
                versao === 'revisao' ? 'bg-[#111] text-white' : 'bg-brand-bg-card text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Wand2 className="w-3 h-3 inline mr-1" /> Revisão
            </button>
          </div>

          {versao === 'revisao' && capitulo.revisado_em && (
            <p className="text-xs text-gray-400 mb-4">
              Revisada por {capitulo.modelo_revisao || 'IA'} em {formatDataRevisao(capitulo.revisado_em)}
            </p>
          )}

          <div
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: conteudoHtml }}
          />
        </div>
      )}
    </div>
  )
}
