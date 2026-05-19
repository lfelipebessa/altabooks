import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, Loader2, FileText, FileDown } from 'lucide-react'
import { downloadDocx, downloadPdf, filename } from '../lib/download'

interface DownloadButtonProps {
  projetoNome: string
  kind: string
  getHtml: () => string | Promise<string>
  disabled?: boolean
  label?: string
  variant?: 'default' | 'ghost'
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  projetoNome, kind, getHtml, disabled, label = 'Baixar', variant = 'default',
}) => {
  const [open, setOpen] = useState(false)
  const [busyFmt, setBusyFmt] = useState<'docx' | 'pdf' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handle = async (fmt: 'docx' | 'pdf') => {
    setBusyFmt(fmt)
    setError(null)
    try {
      const html = await getHtml()
      const file = filename(projetoNome, kind, fmt)
      if (fmt === 'docx') downloadDocx(html, file)
      else await downloadPdf(html, file)
      setOpen(false)
    } catch (err) {
      console.error('Erro ao baixar:', err)
      setError(fmt === 'pdf' ? 'Falha ao gerar PDF' : 'Falha ao gerar DOCX')
    } finally {
      setBusyFmt(null)
    }
  }

  const triggerCls = variant === 'ghost'
    ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
    : 'bg-brand-bg-card text-gray-600 hover:bg-brand-primary hover:text-brand-text-main'

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled || busyFmt !== null}
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg ${triggerCls} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {busyFmt
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : open
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />}
        {label}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 z-20 bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden min-w-[170px]">
          <button
            type="button"
            disabled={busyFmt !== null}
            onClick={() => handle('docx')}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-bg-section disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {busyFmt === 'docx'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
              : <FileText className="w-3.5 h-3.5 text-gray-400" />}
            DOCX <span className="text-gray-400 text-xs">(Word)</span>
          </button>
          <button
            type="button"
            disabled={busyFmt !== null}
            onClick={() => handle('pdf')}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-bg-section disabled:opacity-50 flex items-center gap-2 border-t border-gray-100 transition-colors"
          >
            {busyFmt === 'pdf'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
              : <FileDown className="w-3.5 h-3.5 text-gray-400" />}
            PDF
          </button>
          {error && (
            <div className="px-3 py-2 text-xs text-red-600 border-t border-gray-100">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
