import React, { useState } from 'react';
import { Video, Music, FileText, File, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import type { ArquivoComTranscricao } from '../hooks/useArquivos';

interface ArquivoCardProps {
  arquivo: ArquivoComTranscricao;
}

export const ArquivoCard: React.FC<ArquivoCardProps> = ({ arquivo }) => {
  const [expanded, setExpanded] = useState(false);
  const canExpand = arquivo.transcricao != null;

  const getIconContent = () => {
    const configs: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
      video:  { bg: 'bg-blue-50',   color: 'text-blue-500',   icon: <Video className="w-4 h-4" /> },
      audio:  { bg: 'bg-purple-50', color: 'text-purple-500', icon: <Music className="w-4 h-4" /> },
      texto:  { bg: 'bg-amber-50',  color: 'text-amber-600',  icon: <FileText className="w-4 h-4" /> },
      pdf:    { bg: 'bg-red-50',    color: 'text-red-500',    icon: <FileText className="w-4 h-4" /> },
      imagem: { bg: 'bg-green-50',  color: 'text-green-600',  icon: <ImageIcon className="w-4 h-4" /> },
    };
    const c = configs[arquivo.tipo_arquivo] ?? { bg: 'bg-gray-50', color: 'text-gray-500', icon: <File className="w-4 h-4" /> };
    return (
      <div className={`w-9 h-9 rounded-lg ${c.bg} ${c.color} flex items-center justify-center shrink-0`}>
        {c.icon}
      </div>
    );
  };

  const getStatusBadge = () => {
    switch (arquivo.status) {
      case 'processado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            Processado
          </span>
        );
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
            Pendente
          </span>
        );
      case 'erro':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            Erro
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`bg-brand-bg border rounded-xl overflow-hidden transition-all duration-200 ${
        canExpand
          ? 'cursor-pointer hover:border-gray-300 hover:shadow-sm'
          : ''
      } ${expanded ? 'border-gray-300 shadow-sm' : 'border-gray-200'}`}
      onClick={() => canExpand && setExpanded(!expanded)}
    >
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {getIconContent()}
          <div className="min-w-0">
            <span className="font-medium text-brand-text-main text-sm block truncate">
              {arquivo.nome_arquivo}
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wide text-gray-400">
              {arquivo.tipo_arquivo}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {getStatusBadge()}
          {canExpand && (
            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {expanded && arquivo.transcricao && (
        <div className="px-5 pb-5 pt-4 border-t border-gray-100 bg-brand-bg-section/60 text-sm space-y-4">
          {arquivo.transcricao.resumo && (
            <div>
              <h4 className="font-semibold text-brand-text-main mb-1.5">Resumo</h4>
              <p className="text-gray-700 leading-relaxed">{arquivo.transcricao.resumo}</p>
            </div>
          )}

          {arquivo.transcricao.topicos && arquivo.transcricao.topicos.length > 0 && (
            <div>
              <h4 className="font-semibold text-brand-text-main mb-2">Tópicos</h4>
              <div className="flex flex-wrap gap-1.5">
                {arquivo.transcricao.topicos.map((topico, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-brand-primary/15 text-yellow-900 border border-brand-primary/25 rounded-full text-xs font-medium"
                  >
                    {topico}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {arquivo.transcricao.tom && (
              <div>
                <h4 className="font-semibold text-brand-text-main mb-1">Tom de Voz</h4>
                <p className="text-gray-700">{arquivo.transcricao.tom}</p>
              </div>
            )}
            {arquivo.transcricao.publico_alvo && (
              <div>
                <h4 className="font-semibold text-brand-text-main mb-1">Público-alvo</h4>
                <p className="text-gray-700">{arquivo.transcricao.publico_alvo}</p>
              </div>
            )}
          </div>

          {arquivo.transcricao.argumentos_principais && arquivo.transcricao.argumentos_principais.length > 0 && (
            <div>
              <h4 className="font-semibold text-brand-text-main mb-2">Argumentos Principais</h4>
              <ul className="space-y-1.5">
                {arquivo.transcricao.argumentos_principais.map((arg, i) => (
                  <li key={i} className="flex gap-2 text-gray-700">
                    <span className="text-brand-primary mt-0.5 shrink-0">•</span>
                    <span>{arg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
