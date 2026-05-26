import { Clock, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { StatusMetadados } from '../../types/metadados';

interface Props {
  status: StatusMetadados;
}

const MAP: Record<StatusMetadados, { label: string; cor: string; Icon: typeof Clock }> = {
  aguardando: { label: 'Aguardando', cor: 'bg-yellow-100 text-yellow-800', Icon: Clock },
  processando: { label: 'Processando', cor: 'bg-blue-100 text-blue-800', Icon: Loader2 },
  pronto: { label: 'Pronto', cor: 'bg-green-100 text-green-800', Icon: CheckCircle2 },
  erro: { label: 'Erro', cor: 'bg-red-100 text-red-800', Icon: AlertTriangle },
};

export function StatusBadgeMetadados({ status }: Props) {
  const { label, cor, Icon } = MAP[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${cor}`}>
      <Icon className={`w-3 h-3 ${status === 'processando' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}
