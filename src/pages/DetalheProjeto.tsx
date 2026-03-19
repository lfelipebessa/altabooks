import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ProjetoStatus } from '../types';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { useProjeto } from '../hooks/useProjeto';
import { useArquivos } from '../hooks/useArquivos';
import { useSumarios } from '../hooks/useSumarios';
import { StatusBadge } from '../components/StatusBadge';
import { ArquivoCard } from '../components/ArquivoCard';
import { SumarioCard } from '../components/SumarioCard';
import { ProgressBar } from '../components/ProgressBar';
import { EscreverLivroBanner } from '../components/EscreverLivroBanner';
import logo from '../assets/logo-alta-books.png';

const MOSTRA_EXECUTIVO: readonly ProjetoStatus[] = [
  'gerando_executivo', 'gerando_sumarios', 'aguardando_aprovacao', 'escrevendo_livro', 'concluido',
] as const

const MOSTRA_SUMARIOS: readonly ProjetoStatus[] = [
  'gerando_sumarios', 'aguardando_aprovacao', 'escrevendo_livro', 'concluido',
] as const

export const DetalheProjeto: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { projeto, loading: loadingProjeto, error: errorProjeto } = useProjeto(id);
  const { arquivos, loading: loadingArquivos } = useArquivos(id);
  const { sumarios, loading: loadingSumarios, selecionarSumario } = useSumarios(id);

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

  const showExecutivo = MOSTRA_EXECUTIVO.includes(projeto.status);
  const showSumarios = MOSTRA_SUMARIOS.includes(projeto.status);

  return (
    <div className="min-h-screen bg-brand-bg-section pb-20">
      {/* Header Fixo Tipo TopBar */}
      <header className="fixed top-0 left-0 right-0 h-[80px] bg-[#111111] z-40 flex items-center justify-between px-[32px] shadow-md">
        <div className="flex items-center">
          <img src={logo} alt="Alta Books" className="h-[48px] w-auto brightness-0 invert" />
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white hover:text-[#F5C518] font-medium py-1.5 px-3 rounded transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar à listagem
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-32 space-y-8">
        {/* Banner: Escrever Livro */}
        {projeto.status === 'aguardando_aprovacao' && (
          <EscreverLivroBanner
            projetoId={projeto.id}
            driveExecutivoUrl={projeto.drive_executivo_url}
          />
        )}

        {/* Seção: Header do Projeto */}
        <section className="bg-brand-bg rounded-2xl p-8 border border-gray-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
            <div>
              <h1 className="font-serif text-3xl font-bold text-brand-text-main mb-2">
                {projeto.nome_projeto}
              </h1>
              <p className="text-lg text-gray-600">Autor: {projeto.autor_nome}</p>
            </div>
            <div className="shrink-0">
              <StatusBadge status={projeto.status} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm border-t border-gray-100 pt-6">
            <div>
              <span className="text-gray-500 block mb-1">Criado em</span>
              <span className="font-medium text-gray-900">
                {new Date(projeto.created_at).toLocaleString('pt-BR')}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Atualizado em</span>
              <span className="font-medium text-gray-900">
                {projeto.updated_at ? new Date(projeto.updated_at).toLocaleString('pt-BR') : '-'}
              </span>
            </div>
            {projeto.drive_url && (
              <div className="sm:col-span-2 pt-2">
                <a 
                  href={projeto.drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-brand-primary font-medium hover:text-brand-hover hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Pasta no Drive
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Seção: Arquivos Processados */}
        <section>
          <h2 className="font-serif text-2xl font-bold text-brand-text-main mb-6">Arquivos Processados</h2>
          
          <div className="bg-brand-bg rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm mb-6">
            <div className="mb-6">
              <ProgressBar 
                current={arquivosProcessadosCount} 
                total={arquivosTotalCount} 
                label={`${arquivosProcessadosCount} de ${arquivosTotalCount} arquivos processados`}
              />
            </div>

            {loadingArquivos ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : arquivos.length > 0 ? (
              <div className="space-y-3">
                {arquivos.map(arq => (
                  <ArquivoCard key={arq.id} arquivo={arq} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Nenhum arquivo encontrado para este projeto.</div>
            )}
          </div>
        </section>

        {/* Seção: Projeto Executivo */}
        {showExecutivo && (
          <section>
            <h2 className="font-serif text-2xl font-bold text-brand-text-main mb-6">Projeto Executivo</h2>
            <div className="bg-brand-bg rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-brand-text-main mb-1">Documento Executivo</h3>
                <p className="text-sm text-gray-600">
                  {projeto.drive_executivo_url 
                    ? 'O projeto executivo foi gerado com sucesso.' 
                    : 'Sendo gerado... aguarde.'}
                </p>
              </div>
              
              {projeto.drive_executivo_url ? (
                <a 
                  href={projeto.drive_executivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-hover text-brand-text-main font-bold rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Projeto Executivo
                </a>
              ) : (
                <div className="px-5 py-2.5 bg-brand-bg-badge border border-brand-primary/30 text-amber-800 font-medium rounded-lg flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando
                </div>
              )}
            </div>
          </section>
        )}

        {/* Seção: Sumários */}
        {showSumarios && (
          <section>
            <h2 className="font-serif text-2xl font-bold text-brand-text-main mb-6">Sumários</h2>
            
            {loadingSumarios ? (
              <div className="bg-brand-bg rounded-2xl p-8 border border-gray-200 shadow-sm flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : sumarios.length > 0 ? (
              <div className="space-y-4">
                {sumarios.map(sumario => (
                  <SumarioCard 
                    key={sumario.id} 
                    sumario={sumario} 
                    onSelecionar={selecionarSumario} 
                  />
                ))}
              </div>
            ) : (
              <div className="bg-brand-bg rounded-2xl p-8 border border-gray-200 shadow-sm text-center text-gray-500 flex flex-col items-center">
                <Loader2 className="w-6 h-6 animate-spin text-brand-primary mb-3" />
                Sumários sendo gerados...
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};
