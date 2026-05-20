import React from 'react'
import { Info } from 'lucide-react'

export const DemoBanner: React.FC = () => (
  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-start gap-3 text-sm text-amber-900">
    <Info className="w-4 h-4 mt-0.5 shrink-0" />
    <span>
      <strong>Versão de validação.</strong> Dados de demonstração. Botões de ação (aprovar, baixar,
      reprocessar, disparar processamento) ainda não persistem.
    </span>
  </div>
)
