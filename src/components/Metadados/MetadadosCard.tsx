import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { MetadadosJob } from '../../types/metadados';
import { StatusBadgeMetadados } from './StatusBadgeMetadados';

interface Props {
  job: MetadadosJob;
}

export const MetadadosCard: React.FC<Props> = ({ job }) => {
  const navigate = useNavigate();
  const titulo = job.titulo || (job.status === 'pronto' ? 'Sem título' : 'Em processamento');
  const qtdAlertas = job.alertas?.length ?? 0;
  const formattedDate = new Date(job.created_at).toLocaleDateString('pt-BR');

  const onClick = () => navigate(`/metadados/${job.id}`);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onClick();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className="bg-brand-bg border border-gray-200 rounded-xl p-5 hover:border-brand-primary hover:shadow-md transition-all text-left cursor-pointer group flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <StatusBadgeMetadados status={job.status} />
        <span className="text-xs text-gray-500">{formattedDate}</span>
      </div>

      <h3 className="font-serif text-xl font-bold text-brand-text-main mb-1 truncate">
        {titulo}
      </h3>
      {job.autor && (
        <p className="text-sm text-gray-600 mb-2 truncate">por {job.autor}</p>
      )}

      <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 pt-2">
        {job.selo && <span>{job.selo}</span>}
        {job.isbn && <span>ISBN {job.isbn}</span>}
        {qtdAlertas > 0 && (
          <span className="text-yellow-700">⚠ {qtdAlertas} alerta(s)</span>
        )}
      </div>
    </div>
  );
};
