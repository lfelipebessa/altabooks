import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ProjetoStatus } from '../types';
import { ArrowLeft, ExternalLink, Loader2, Settings, Check, AlertCircle, ChevronDown, ChevronUp, BookOpen, FileText, LayoutList, FolderOpen } from 'lucide-react';
import { useProjeto } from '../hooks/useProjeto';
import { useArquivos } from '../hooks/useArquivos';
import { useSumarios } from '../hooks/useSumarios';
import { useCapitulos } from '../hooks/useCapitulos';
import { StatusBadge } from '../components/StatusBadge';
import { ArquivoCard } from '../components/ArquivoCard';
import { SumarioCard } from '../components/SumarioCard';
import { CapituloPanel } from '../components/CapituloPanel';
import { ProgressBar } from '../components/ProgressBar';
import { EscreverLivroBanner } from '../components/EscreverLivroBanner';
import { ConfiguracoesProjetoModal } from '../components/ConfiguracoesProjetoModal';
import { ExecutivoPanel } from '../components/ExecutivoPanel';
import logo from '../assets/logo-alta-books.png';

// ─── Pipeline ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES: { key: ProjetoStatus; label: string }[] = [
  { key: 'aguardando', label: 'Fila' },
  { key: 'analisando_materiais', label: 'Análise' },
  { key: 'gerando_executivo', label: 'Executivo' },
  { key: 'gerando_sumarios', label: 'Sumários' },
  { key: 'aguardando_aprovacao', label: 'Aprovação' },
  { key: 'escrevendo_livro', label: 'Escrita' },
  { key: 'concluido', label: 'Concluído' },
];

const PROCESSING_STATUSES = new Set<ProjetoStatus>([
  'analisando_materiais', 'gerando_executivo', 'gerando_sumarios', 'escrevendo_livro',
]);

const ProjectPipeline: React.FC<{ status: ProjetoStatus }> = ({ status }) => {
  const isError = status === 'erro';
  const currentIdx = isError ? -1 : PIPELINE_STAGES.findIndex(s => s.key === status);
  const isProcessing = PROCESSING_STATUSES.has(status);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start pb-1" style={{ minWidth: 'max-content' }}>
        {PIPELINE_STAGES.map((stage, i) => {
          const isCompleted = !isError && i < currentIdx;
          const isActive = !isError && i === currentIdx;
          const isPending = isError || i > currentIdx;

          return (
            <React.Fragment key={stage.key}>
              {i > 0 && (
                <div className="flex items-center self-start mt-[13px] mx-1.5">
                  <div className={`h-px w-8 transition-colors duration-500 ${isCompleted || (isActive && i > 0) ? 'bg-brand-primary' : 'bg-gray-200'}`} />
                </div>
              )}
              <div className="flex flex-col items-center gap-1.5" style={{ width: '3.5rem' }}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                  ${isCompleted ? 'bg-[#111] text-[#F5C518]' : ''}
                  ${isActive ? `bg-brand-primary text-[#111] ring-2 ring-brand-primary/25 ring-offset-2 ${isProcessing ? 'animate-pulse' : ''}` : ''}
                  ${isPending ? 'bg-gray-100 text-gray-400 border border-gray-200' : ''}
                `}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <span>{i + 1}</span>}
                </div>
                <span className={`text-[10px] text-center leading-tight transition-colors
                  ${isCompleted ? 'text-gray-500 font-medium' : ''}
                  ${isActive ? 'text-brand-text-main font-bold' : ''}
                  ${isPending ? 'text-gray-400' : ''}
                `}>
                  {stage.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}

        {isError && (
          <>
            <div className="flex items-center self-start mt-[13px] mx-1.5">
              <div className="h-px w-8 bg-red-200" />
            </div>
            <div className="flex flex-col items-center gap-1.5" style={{ width: '3.5rem' }}>
              <div className="w-7 h-7 rounded-full bg-red-100 text-red-500 flex items-center justify-center border border-red-200">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] text-center font-medium text-red-500">Erro</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabId = 'materiais' | 'executivo' | 'sumarios' | 'livro';

const TABS: { id: TabId; label: string; icon: React.ReactNode; available: (s: ProjetoStatus) => boolean }[] = [
  {
    id: 'materiais',
    label: 'Materiais',
    icon: <FolderOpen className="w-4 h-4" />,
    available: () => true,
  },
  {
    id: 'executivo',
    label: 'Executivo',
    icon: <FileText className="w-4 h-4" />,
    available: s => ['gerando_executivo', 'aguardando_aprovacao', 'escrevendo_livro', 'concluido'].includes(s),
  },
  {
    id: 'sumarios',
    label: 'Sumários',
    icon: <LayoutList className="w-4 h-4" />,
    available: s => ['gerando_sumarios', 'aguardando_aprovacao', 'escrevendo_livro', 'concluido'].includes(s),
  },
  {
    id: 'livro',
    label: 'Livro',
    icon: <BookOpen className="w-4 h-4" />,
    available: s => ['escrevendo_livro', 'concluido'].includes(s),
  },
];

const getInitialTab = (status: ProjetoStatus): TabId => {
  if (['escrevendo_livro', 'concluido'].includes(status)) return 'livro';
  if (['gerando_sumarios', 'aguardando_aprovacao'].includes(status)) return 'sumarios';
  if (status === 'gerando_executivo') return 'executivo';
  return 'materiais';
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const DetalheProjeto: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { projeto, loading: loadingProjeto, error: errorProjeto, salvarExecutivo } = useProjeto(id);
  const { arquivos, loading: loadingArquivos } = useArquivos(id);
  const { sumarios, loading: loadingSumarios, selecionarSumario, atualizarSumario } = useSumarios(id);
  const { capitulos, loading: loadingCapitulos, atualizarCapitulo } = useCapitulos(id);

  const [showConfiguracoes, setShowConfiguracoes] = useState(false);
  const [arquivosExpanded, setArquivosExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('materiais');

  useEffect(() => {
    if (projeto) setActiveTab(getInitialTab(projeto.status));
  }, [projeto?.status]);

  if (loadingProjeto) {
    return (
      <div className="min-h-screen bg-brand-bg-section flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    );
  }

  if (errorProjeto || !projeto) {
    return (
      <div className="min-h-screen bg-brand-bg-section flex flex-col items-center justify-center p-6">
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-100 max-w-md w-full text-center">
          <p className="font-semibold mb-4">{errorProjeto || 'Projeto não encontrado'}</p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white text-red-700 font-medium rounded border border-red-200 hover:bg-red-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar à listagem
          </button>
        </div>
      </div>
    );
  }

  const arquivosProcessadosCount = arquivos.filter(a => a.status === 'processado').length;
  const arquivosTotalCount = arquivos.length;

  return (
    <div className="min-h-screen bg-brand-bg-section pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-[72px] bg-[#111111] z-40 flex items-center justify-between px-8 shadow-md">
        <img src={logo} alt="Alta Books" className="h-[42px] w-auto brightness-0 invert" />
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-[#F5C518] font-medium py-1.5 px-3 rounded transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Todos os projetos
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-[100px] space-y-6">

        {/* Project Hero */}
        <section className="bg-brand-bg rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-brand-primary" />
          <div className="p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-2">
              <h1 className="font-serif text-[2rem] md:text-[2.4rem] font-bold text-brand-text-main leading-tight">
                {projeto.nome_projeto}
              </h1>
              <div className="flex items-center gap-2 shrink-0 md:mt-1">
                <button
                  onClick={() => setShowConfiguracoes(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-brand-text-main bg-brand-bg-card hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Configurações</span>
                </button>
                <StatusBadge status={projeto.status} />
              </div>
            </div>

            <p className="text-sm uppercase tracking-widest text-gray-400 font-medium mb-6">
              por{' '}
              <span className="normal-case tracking-normal font-semibold text-base text-gray-700">
                {projeto.autor_nome}
              </span>
            </p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500 border-t border-gray-100 pt-5 mb-7">
              <span>
                Criado em{' '}
                <span className="font-medium text-gray-800">
                  {new Date(projeto.created_at).toLocaleDateString('pt-BR')}
                </span>
              </span>
              {projeto.updated_at && (
                <span>
                  · Atualizado em{' '}
                  <span className="font-medium text-gray-800">
                    {new Date(projeto.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                </span>
              )}
              {projeto.drive_url && (
                <a
                  href={projeto.drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand-primary font-medium hover:text-brand-hover hover:underline ml-auto"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Pasta no Drive
                </a>
              )}
            </div>

            <ProjectPipeline status={projeto.status} />
          </div>
        </section>

        {/* Tabs */}
        <div className="flex gap-1 bg-brand-bg rounded-xl border border-gray-200 shadow-sm p-1.5">
          {TABS.map(tab => {
            const available = tab.available(projeto.status);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => available && setActiveTab(tab.id)}
                disabled={!available}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all
                  ${isActive ? 'bg-[#111] text-brand-primary shadow-sm' : ''}
                  ${!isActive && available ? 'text-gray-500 hover:text-brand-text-main hover:bg-brand-bg-section' : ''}
                  ${!available ? 'text-gray-300 cursor-not-allowed' : ''}
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab: Materiais */}
        {activeTab === 'materiais' && (
          <section>
            <div className="bg-brand-bg rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setArquivosExpanded(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-brand-bg-section/60 transition-colors group"
              >
                <ProgressBar
                  current={arquivosProcessadosCount}
                  total={arquivosTotalCount}
                  label={`${arquivosProcessadosCount} de ${arquivosTotalCount} arquivos processados`}
                />
                <span className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-brand-bg-card text-gray-600 group-hover:bg-brand-primary group-hover:text-brand-text-main transition-all shrink-0 ml-4">
                  {arquivosExpanded ? (
                    <><ChevronUp className="w-4 h-4" /> Ocultar</>
                  ) : (
                    <><ChevronDown className="w-4 h-4" /> Mostrar</>
                  )}
                </span>
              </button>

              {arquivosExpanded && (
                <div className="p-4 border-t border-gray-100">
                  {loadingArquivos ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : arquivos.length > 0 ? (
                    <div className="space-y-2">
                      {arquivos.map(arq => (
                        <ArquivoCard key={arq.id} arquivo={arq} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      Nenhum arquivo encontrado para este projeto.
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tab: Executivo */}
        {activeTab === 'executivo' && (
          <section>
            <ExecutivoPanel
              conteudo={projeto.conteudo_executivo}
              driveUrl={projeto.drive_executivo_url}
              isReady={!!(projeto.drive_executivo_url || projeto.conteudo_executivo)}
              onSave={salvarExecutivo}
            />
          </section>
        )}

        {/* Tab: Sumários */}
        {activeTab === 'sumarios' && (
          <section className="space-y-4">
            {loadingSumarios ? (
              <div className="bg-brand-bg rounded-2xl p-8 border border-gray-200 shadow-sm flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : sumarios.length > 0 ? (
              <>
                {sumarios.map(sumario => (
                  <SumarioCard
                    key={sumario.id}
                    sumario={sumario}
                    onSelecionar={selecionarSumario}
                    onAtualizar={atualizarSumario}
                  />
                ))}
                {projeto.status === 'aguardando_aprovacao' && (
                  <EscreverLivroBanner
                    projetoId={projeto.id}
                    temSumarioSelecionado={sumarios.some(s => s.selecionado)}
                  />
                )}
              </>
            ) : (
              <div className="bg-brand-bg rounded-2xl p-10 border border-gray-200 shadow-sm text-center flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                <span className="text-sm text-gray-400">Sumários sendo gerados...</span>
              </div>
            )}
          </section>
        )}

        {/* Tab: Livro */}
        {activeTab === 'livro' && (
          <section className="space-y-4">
            {loadingCapitulos ? (
              <div className="bg-brand-bg rounded-2xl p-8 border border-gray-200 shadow-sm flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : capitulos.length > 0 ? (
              <>
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-brand-text-main">{capitulos.length}</span> capítulos ·{' '}
                    <span className="font-semibold text-brand-text-main">
                      {capitulos.reduce((acc, c) => acc + c.palavras, 0).toLocaleString('pt-BR')}
                    </span> palavras no total
                  </p>
                </div>
                {capitulos.map(cap => (
                  <CapituloPanel key={cap.id} capitulo={cap} onSave={atualizarCapitulo} />
                ))}
              </>
            ) : (
              <div className="bg-brand-bg rounded-2xl p-10 border border-gray-200 shadow-sm text-center flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                <span className="text-sm text-gray-400">Capítulos sendo escritos...</span>
              </div>
            )}
          </section>
        )}

      </main>

      {showConfiguracoes && (
        <ConfiguracoesProjetoModal
          projeto={projeto}
          isOpen={showConfiguracoes}
          onClose={() => setShowConfiguracoes(false)}
          onSaved={() => setShowConfiguracoes(false)}
        />
      )}
    </div>
  );
};
