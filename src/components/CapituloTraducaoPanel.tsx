import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { CapituloTraducao } from '../types';

const toHtml = (text: string): string => {
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('');
};

interface CapituloTraducaoPanelProps {
  capitulo: CapituloTraducao;
}

export const CapituloTraducaoPanel: React.FC<CapituloTraducaoPanelProps> = ({ capitulo }) => {
  const [expanded, setExpanded] = useState(false);
  const conteudoHtml = toHtml(capitulo.conteudo);

  return (
    <div className="bg-brand-bg rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 h-8 rounded-full bg-[#111] text-brand-primary text-xs font-bold flex items-center justify-center shrink-0">
            {capitulo.numero}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-brand-text-main truncate">{capitulo.titulo}</h3>
          </div>
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-brand-bg-card text-gray-600 hover:bg-brand-primary hover:text-brand-text-main transition-all shrink-0"
        >
          {expanded
            ? <><ChevronUp className="w-4 h-4" /> Ocultar</>
            : <><ChevronDown className="w-4 h-4" /> Ler</>}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-6">
          <div
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: conteudoHtml }}
          />
        </div>
      )}
    </div>
  );
};
