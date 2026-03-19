import React from 'react';
import { Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ProjetoStatus } from '../types';

interface StatusBadgeProps {
  status: ProjetoStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'aguardando':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Clock className="w-3.5 h-3.5" />
          Aguardando
        </span>
      );
    case 'analisando_materiais':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-bg-badge text-amber-800 border border-brand-primary">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Analisando Materiais
        </span>
      );
    case 'gerando_executivo':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-bg-badge text-amber-800 border border-brand-primary">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Gerando Executivo
        </span>
      );
    case 'gerando_sumarios':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-bg-badge text-amber-800 border border-brand-primary">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Gerando Sumários
        </span>
      );
    case 'aguardando_aprovacao':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="w-3.5 h-3.5" />
          Aguardando Aprovação
        </span>
      );
    case 'escrevendo_livro':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-bg-badge text-amber-800 border border-brand-primary">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Escrevendo Livro
        </span>
      );
    case 'concluido':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Concluído
        </span>
      );
    case 'erro':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="w-3.5 h-3.5" />
          Erro
        </span>
      );
    default:
      return null;
  }
};
