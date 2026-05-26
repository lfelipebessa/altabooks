import { Link } from 'react-router-dom';
import type { MetadadosJob } from '../../types/metadados';
import { StatusBadgeMetadados } from './StatusBadgeMetadados';

interface Props {
  job: MetadadosJob;
}

export function MetadadosCard({ job }: Props) {
  const titulo = job.titulo || (job.status === 'pronto' ? 'Sem título' : 'Em processamento');
  const qtdAlertas = job.alertas?.length ?? 0;

  return (
    <Link
      to={`/metadados/${job.id}`}
      className="block bg-white border rounded-lg p-4 hover:shadow transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-brand-text-main truncate">{titulo}</h3>
          {job.autor && <p className="text-sm text-brand-text-body truncate">por {job.autor}</p>}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-600">
            {job.selo && <span>{job.selo}</span>}
            {job.isbn && <span>ISBN {job.isbn}</span>}
            <span>{new Date(job.created_at).toLocaleDateString('pt-BR')}</span>
            {qtdAlertas > 0 && <span className="text-yellow-700">⚠ {qtdAlertas} alerta(s)</span>}
          </div>
        </div>
        <StatusBadgeMetadados status={job.status} />
      </div>
    </Link>
  );
}
