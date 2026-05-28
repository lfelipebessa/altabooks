import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageLayout, PageHeader, EmptyState, LoadingState, ErrorState } from '../../components/ui';
import { useMetadadosJobs } from '../../hooks/useMetadadosJobs';
import { MetadadosCard } from '../../components/Metadados/MetadadosCard';
import { NovaGeracaoModal } from '../../components/Metadados/NovaGeracaoModal';

export function MetadadosListagem() {
  const { jobs, loading, error, refetch } = useMetadadosJobs();
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const nav = useNavigate();

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      [j.titulo, j.autor, j.isbn, j.selo]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q))
    );
  }, [jobs, busca]);

  return (
    <PageLayout>
      <PageHeader
        title="Metadados"
        action={
          <button
            onClick={() => setModalAberto(true)}
            className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 bg-brand-primary hover:bg-brand-hover text-brand-text-main font-bold py-2 px-4 rounded-lg transition-colors text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova geração
          </button>
        }
        search={{
          value: busca,
          onChange: setBusca,
          placeholder: 'Buscar por título, autor, ISBN ou selo…',
        }}
      />

      {loading && <LoadingState message="Carregando metadados…" />}

      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && filtrados.length === 0 && busca && (
        <EmptyState
          title={`Nenhum resultado para "${busca}"`}
          action={
            <button
              onClick={() => setBusca('')}
              className="text-brand-primary font-medium hover:underline cursor-pointer"
            >
              Limpar busca
            </button>
          }
        />
      )}

      {!loading && !error && filtrados.length === 0 && !busca && (
        <EmptyState
          title="Nenhuma geração ainda"
          description='Clique em "Nova geração" pra começar.'
          action={
            <button
              onClick={() => setModalAberto(true)}
              className="bg-brand-primary hover:bg-brand-hover text-brand-text-main font-bold py-2 px-6 rounded-lg transition-colors cursor-pointer"
            >
              Nova geração
            </button>
          }
        />
      )}

      {!loading && !error && filtrados.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrados.map((j) => (
            <MetadadosCard key={j.id} job={j} />
          ))}
        </div>
      )}

      <NovaGeracaoModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onSucesso={(id) => {
          setModalAberto(false);
          nav(`/metadados/${id}`);
        }}
      />
    </PageLayout>
  );
}
