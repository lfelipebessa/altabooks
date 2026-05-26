import { useMemo, useState } from 'react';
import { TopBar } from '../../components/TopBar';
import { SearchBar } from '../../components/SearchBar';
import { useMetadadosJobs } from '../../hooks/useMetadadosJobs';
import { MetadadosCard } from '../../components/Metadados/MetadadosCard';
import { NovaGeracaoModal } from '../../components/Metadados/NovaGeracaoModal';
import { useNavigate } from 'react-router-dom';

export function MetadadosListagem() {
  const { jobs, loading } = useMetadadosJobs();
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const nav = useNavigate();

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(j =>
      [j.titulo, j.autor, j.isbn, j.selo].filter(Boolean).some(s => s!.toLowerCase().includes(q))
    );
  }, [jobs, busca]);

  return (
    <div className="min-h-screen bg-brand-bg-section">
      {/* TopBar requires onNewProject; pass a no-op since this page manages its own modal */}
      <TopBar onNewProject={() => undefined} />
      <main className="max-w-6xl mx-auto px-4 pt-[96px] pb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-serif text-brand-text-main">Metadados</h1>
          <button
            onClick={() => setModalAberto(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-brand-primary text-black font-medium hover:bg-brand-hover"
          >
            {/* Plus icon inline to avoid unused import from lucide */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova geração
          </button>
        </div>

        {/* SearchBar does not accept a placeholder prop; uses its built-in placeholder */}
        <SearchBar value={busca} onChange={setBusca} />

        {loading && <p className="text-sm text-gray-500">Carregando…</p>}
        {!loading && filtrados.length === 0 && (
          <p className="text-sm text-gray-500">Nenhum projeto de metadados ainda. Clique em "Nova geração".</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtrados.map(j => <MetadadosCard key={j.id} job={j} />)}
        </div>
      </main>

      <NovaGeracaoModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onSucesso={id => { setModalAberto(false); nav(`/metadados/${id}`); }}
      />
    </div>
  );
}
