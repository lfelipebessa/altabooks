import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { CapituloTraducao } from '../types';

const applyInline = (t: string) =>
  t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

const markdownToHtml = (text: string): string => {
  if (/<[a-z][\s\S]*>/i.test(text)) return text;

  return text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map(block => {
      const b = block.trim();
      if (/^### /.test(b)) return `<h3>${applyInline(b.replace(/^### /, ''))}</h3>`;
      if (/^## /.test(b))  return `<h2>${applyInline(b.replace(/^## /, ''))}</h2>`;
      if (/^# /.test(b))   return `<h1>${applyInline(b.replace(/^# /, ''))}</h1>`;
      const lines = b.split('\n');
      if (lines.every(l => /^- /.test(l.trim()))) {
        const items = lines.map(l => `<li>${applyInline(l.trim().replace(/^- /, ''))}</li>`).join('');
        return `<ul>${items}</ul>`;
      }
      return `<p>${applyInline(b.replace(/\n/g, '<br />'))}</p>`;
    })
    .join('');
};

interface CapituloTraducaoPanelProps {
  capitulo: CapituloTraducao;
}

export const CapituloTraducaoPanel: React.FC<CapituloTraducaoPanelProps> = ({ capitulo }) => {
  const [expanded, setExpanded] = useState(false);
  const conteudoHtml = markdownToHtml(capitulo.conteudo);

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
