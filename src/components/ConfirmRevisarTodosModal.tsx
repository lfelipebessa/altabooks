import React from 'react'
import { X, Wand2 } from 'lucide-react'

interface ConfirmRevisarTodosModalProps {
  open: boolean
  totalItens: number
  unidade: 'capítulos' | 'arquivos'
  idiomaLabel: string
  onClose: () => void
  onConfirm: () => void
}

export const ConfirmRevisarTodosModal: React.FC<ConfirmRevisarTodosModalProps> = ({
  open,
  totalItens,
  unidade,
  idiomaLabel,
  onClose,
  onConfirm,
}) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-brand-primary" />
            <h2 className="text-lg font-bold text-brand-text-main">Revisar tradução com IA</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-3 text-sm text-brand-text-body mb-6">
          <p>
            Vamos revisar os <strong>{totalItens} {unidade}</strong> em{' '}
            <strong>{idiomaLabel}</strong> comparando com o português original.
          </p>
          <p>
            A tradução atual fica preservada — você poderá comparar as duas versões depois.
          </p>
          <p className="text-xs text-gray-500">Pode levar alguns minutos.</p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-hover text-brand-text-main text-sm font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Wand2 className="w-4 h-4" />
            Revisar todos
          </button>
        </div>
      </div>
    </div>
  )
}
