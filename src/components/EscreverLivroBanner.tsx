import React, { useState } from 'react';
import { EscreverLivroModal } from './EscreverLivroModal';

interface EscreverLivroBannerProps {
  projetoId: string;
  driveExecutivoUrl: string | null;
}

export const EscreverLivroBanner: React.FC<EscreverLivroBannerProps> = ({
  projetoId,
  driveExecutivoUrl,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div>
        <div
          className="rounded-[14px] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{
            background: 'linear-gradient(135deg, #fffdf0 0%, #fefce8 100%)',
            border: '1.5px solid #F5C518',
            boxShadow: '0 2px 16px rgba(245,197,24,0.14)',
          }}
        >
          {/* Dot + texto */}
          <div className="flex items-center gap-4">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: '#b45309', boxShadow: '0 0 0 3px #fef9c3' }}
            />
            <div>
              <p className="font-bold text-[#111] text-sm leading-snug">
                Projeto Executivo pronto para revisão
              </p>
              <p className="text-xs text-amber-800 mt-0.5 opacity-80">
                Revise o documento com o autor e inicie a escrita quando estiver pronto.
              </p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 flex-shrink-0 pl-6 sm:pl-0">
            <a
              href={driveExecutivoUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!driveExecutivoUrl}
              onClick={!driveExecutivoUrl ? (e) => e.preventDefault() : undefined}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                driveExecutivoUrl
                  ? 'border-amber-600 text-amber-800 hover:bg-amber-50 cursor-pointer'
                  : 'border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
              }`}
            >
              ↗ Google Docs
            </a>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-[#111] text-[#F5C518] text-sm font-bold rounded-lg hover:bg-[#222] transition-colors cursor-pointer"
            >
              Escrever Livro
            </button>
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
