import React, { useState } from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { EscreverLivroModal } from './EscreverLivroModal';

interface EscreverLivroBannerProps {
  projetoId: string;
  temSumarioSelecionado: boolean;
}

export const EscreverLivroBanner: React.FC<EscreverLivroBannerProps> = ({
  projetoId,
  temSumarioSelecionado,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl overflow-hidden bg-[#111]">
        <div className="h-1 bg-brand-primary" />

        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse shrink-0" />
                <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
                  Próximo passo
                </span>
              </div>

              <h3 className="font-serif text-2xl font-bold text-white mb-2">
                Iniciar escrita do livro
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Revise o projeto executivo com o autor e inicie a escrita quando estiver pronto.
              </p>

              {!temSumarioSelecionado && (
                <p className="flex items-center gap-1.5 text-brand-primary text-xs font-semibold mt-3">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Selecione um sumário nos cards acima antes de continuar.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => temSumarioSelecionado && setModalOpen(true)}
                disabled={!temSumarioSelecionado}
                title={!temSumarioSelecionado ? 'Selecione um sumário antes de continuar' : undefined}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  temSumarioSelecionado
                    ? 'bg-brand-primary text-[#111] hover:bg-brand-hover cursor-pointer'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                Escrever Livro
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <EscreverLivroModal
        projetoId={projetoId}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};
