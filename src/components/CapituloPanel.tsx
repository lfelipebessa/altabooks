import React, { useState, useCallback, useRef, Suspense } from 'react';
import { ChevronDown, ChevronUp, Pencil, X, Loader2, Printer } from 'lucide-react';
import type { CapituloLivro } from '../types';

const TiptapEditor = React.lazy(() =>
  import('./TiptapEditor').then(m => ({ default: m.TiptapEditor }))
);

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const toHtml = (text: string): string => {
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('');
};

interface CapituloPanelProps {
  capitulo: CapituloLivro;
  onSave: (id: string, html: string) => Promise<void>;
}

export const CapituloPanel: React.FC<CapituloPanelProps> = ({ capitulo, onSave }) => {
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conteudoHtml = toHtml(capitulo.conteudo);

  const handleChange = useCallback((html: string) => {
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await onSave(capitulo.id, html);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 2000);
  }, [onSave, capitulo.id]);

  const handleExitEdit = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setEditMode(false);
    setSaveStatus('idle');
  };

  return (
    <div className="bg-brand-bg rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 h-8 rounded-full bg-[#111] text-brand-primary text-xs font-bold flex items-center justify-center shrink-0">
            {capitulo.numero}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-brand-text-main truncate">{capitulo.titulo}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{capitulo.palavras.toLocaleString('pt-BR')} palavras</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {saveStatus === 'saving' && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-emerald-600">✓ Salvo</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-500">Erro ao salvar</span>
          )}

          {expanded && (
            <>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-brand-bg-card text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <Printer className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={() => editMode ? handleExitEdit() : setEditMode(true)}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-all ${
                  editMode
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-brand-bg-card text-gray-600 hover:bg-brand-primary hover:text-brand-text-main'
                }`}
              >
                {editMode
                  ? <><X className="w-4 h-4" /> Sair da edição</>
                  : <><Pencil className="w-4 h-4" /> Editar</>
                }
              </button>
            </>
          )}

          <button
            onClick={() => {
              if (expanded) handleExitEdit();
              setExpanded(v => !v);
            }}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-brand-bg-card text-gray-600 hover:bg-brand-primary hover:text-brand-text-main transition-all"
          >
            {expanded
              ? <><ChevronUp className="w-4 h-4" /> Ocultar</>
              : <><ChevronDown className="w-4 h-4" /> Ler</>
            }
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="border-t border-gray-100 p-6 print-target">
          {editMode ? (
            <Suspense
              fallback={
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              }
            >
              <TiptapEditor content={conteudoHtml} onChange={handleChange} />
            </Suspense>
          ) : (
            <div
              className="prose-content"
              dangerouslySetInnerHTML={{ __html: conteudoHtml }}
            />
          )}
        </div>
      )}
    </div>
  );
};
