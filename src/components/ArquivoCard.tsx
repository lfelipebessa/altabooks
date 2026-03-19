import React, { useState } from 'react';
import { Video, Music, FileText, File, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import type { ArquivoComTranscricao } from '../hooks/useArquivos';

interface ArquivoCardProps {
  arquivo: ArquivoComTranscricao;
}

export const ArquivoCard: React.FC<ArquivoCardProps> = ({ arquivo }) => {
  const [expanded, setExpanded] = useState(false);
  const canExpand = arquivo.transcricao != null;

  const getIcon = () => {
    switch (arquivo.tipo_arquivo) {
      case 'video': return <Video className="w-5 h-5 text-gray-500" />;
      case 'audio': return <Music className="w-5 h-5 text-gray-500" />;
      case 'texto': return <FileText className="w-5 h-5 text-gray-500" />;
      case 'imagem': return <ImageIcon className="w-5 h-5 text-gray-500" />;
      default: return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadgeClass = () => {
    switch (arquivo.status) {
      case 'pendente': return 'bg-gray-100 text-gray-800';
      case 'processado': return 'bg-green-100 text-green-800';
      case 'erro': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-brand-bg border border-gray-200 rounded-xl overflow-hidden ${canExpand ? 'cursor-pointer hover:border-gray-300 transition-colors' : ''}`} onClick={() => canExpand && setExpanded(!expanded)}>
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {getIcon()}
          <span className="font-medium text-brand-text-main text-sm truncate">{arquivo.nome_arquivo}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeClass()}`}>
            {arquivo.status.charAt(0).toUpperCase() + arquivo.status.slice(1)}
          </span>
          {canExpand && (
            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {expanded && arquivo.transcricao && (
        <div className="p-4 border-t border-gray-100 bg-brand-bg-section/50 text-sm">
          {arquivo.transcricao.resumo && (
            <div className="mb-4">
              <h4 className="font-semibold text-brand-text-main mb-1">Resumo</h4>
              <p className="text-gray-700 leading-relaxed">{arquivo.transcricao.resumo}</p>
            </div>
          )}

          {arquivo.transcricao.topicos && arquivo.transcricao.topicos.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-brand-text-main mb-2">Tópicos</h4>
              <div className="flex flex-wrap gap-2">
                {arquivo.transcricao.topicos.map((topico, i) => (
                  <span key={i} className="px-2 py-1 bg-brand-primary/20 text-yellow-900 border border-brand-primary/30 rounded-full text-xs font-medium">
                    {topico}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
              <ul className="space-y-1">
                {arquivo.transcricao.argumentos_principais.map((arg, i) => (
                  <li key={i} className="flex gap-2 text-gray-700">
                    <span className="text-brand-primary mt-1">•</span>
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
