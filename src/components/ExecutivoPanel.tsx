import React, { useState, useCallback, useRef, Suspense } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Pencil, X, Loader2, Printer } from 'lucide-react';

const TiptapEditor = React.lazy(() =>
  import('./TiptapEditor').then(m => ({ default: m.TiptapEditor }))
);

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ExecutivoPanelProps {
  conteudo: string | null;
  driveUrl: string | null;
  isReady: boolean;
  onSave: (html: string) => Promise<void>;
}

export const ExecutivoPanel: React.FC<ExecutivoPanelProps> = ({
  conteudo,
  driveUrl,
  isReady,
  onSave,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((html: string) => {
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await onSave(html);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 2000);
  }, [onSave]);

  const handleExitEdit = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setEditMode(false);
    setSaveStatus('idle');
  };

  if (!isReady) {
    return (
      <div className="bg-brand-bg rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-brand-text-main mb-1">Documento Executivo</h3>
          <p className="text-sm text-gray-500">Sendo gerado... aguarde.</p>
        </div>
        <div className="px-5 py-2.5 bg-brand-bg-badge border border-brand-primary/30 text-amber-800 font-medium rounded-lg flex items-center gap-2 shrink-0">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processando
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-bg rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-brand-text-main">Documento Executivo</h3>
          {driveUrl && (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-brand-primary transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Drive
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
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

          {expanded && conteudo && (
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
              : <><ChevronDown className="w-4 h-4" /> Mostrar</>
            }
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="border-t border-gray-100 p-6 print-target">
          {conteudo ? (
            editMode ? (
              <Suspense
                fallback={
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                }
              >
                <TiptapEditor content={conteudo} onChange={handleChange} />
              </Suspense>
            ) : (
              <div
                className="prose-content"
                dangerouslySetInnerHTML={{ __html: conteudo }}
              />
            )
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p className="mb-3">Conteúdo ainda não disponível na plataforma.</p>
              {driveUrl && (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-brand-primary font-medium hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir no Drive
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
