import React from 'react';
import { ExternalLink, Trash2, Play, Languages } from 'lucide-react';
import type { Projeto } from '../types';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';

interface ProjectCardProps {
  project: Projeto;
  filesProcessed?: number;
  filesTotal?: number;
  onClick: () => void;
  onDelete: (projeto: Projeto) => void;
  onIniciarAnalise?: () => void;
  onTraduzir?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  filesProcessed,
  filesTotal,
  onClick,
  onDelete,
  onIniciarAnalise,
  onTraduzir,
}) => {
  const isProcessingStatus = [
    'analisando_materiais',
    'gerando_executivo',
    'gerando_sumarios',
    'escrevendo_livro',
    'traduzindo',
  ].includes(project.status);

  const showIniciarAnalise = project.status === 'aguardando' && !project.auto_start;
  const showTraduzir = project.status === 'concluido' && project.tipo === 'livro';

  const formattedDate = new Date(project.created_at).toLocaleDateString('pt-BR');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onClick();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="bg-brand-bg border border-gray-200 rounded-xl p-5 hover:border-brand-primary hover:shadow-md transition-all text-left cursor-pointer group flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-3">
        <StatusBadge status={project.status} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{formattedDate}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(project); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"
            title="Deletar projeto"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h3 className="font-serif text-xl font-bold text-brand-text-main mb-1 truncate">
        {project.nome_projeto}
      </h3>
      <p className="text-sm text-brand-text-body mb-4 truncate text-gray-600">
        Autor: {project.autor_nome}
      </p>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        {showIniciarAnalise && (
          <button
            onClick={(e) => { e.stopPropagation(); onIniciarAnalise?.(); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary hover:bg-brand-hover text-brand-text-main text-sm font-bold rounded-lg transition-colors w-full justify-center cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            Iniciar Análise
          </button>
        )}

        {showTraduzir && (
          <button
            onClick={(e) => { e.stopPropagation(); onTraduzir?.(); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-brand-primary text-gray-600 hover:text-brand-text-main text-sm font-medium rounded-lg transition-colors w-full justify-center cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5" />
            Traduzir Livro
          </button>
        )}

        {project.drive_url && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={project.drive_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-sm text-brand-primary font-medium hover:text-brand-hover transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ver no Drive
            </a>
          </div>
        )}

        {isProcessingStatus && filesTotal !== undefined && filesTotal > 0 && filesProcessed !== undefined && (
          <ProgressBar current={filesProcessed} total={filesTotal} />
        )}
      </div>
    </div>
  );
};
