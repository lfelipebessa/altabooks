import React, { useState, useCallback, useRef, Suspense } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Pencil, X, Loader2, Printer, Upload, ArrowRight } from 'lucide-react';
import type { Projeto } from '../types';
import { DownloadButton } from './DownloadButton';
import { buildExecutivoHtml } from '../lib/buildHtml';

const TiptapEditor = React.lazy(() =>
  import('./TiptapEditor').then(m => ({ default: m.TiptapEditor }))
);

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ExecutivoPanelProps {
  projeto: Projeto;
  onSave: (html: string) => Promise<void>;
  onConfirmarRevisado: (html: string) => Promise<void>;
}

export const ExecutivoPanel: React.FC<ExecutivoPanelProps> = ({
  projeto, onSave, onConfirmarRevisado,
}) => {
  const conteudo = projeto.conteudo_executivo;
  const driveUrl = projeto.drive_executivo_url;
  const isReady = !!(projeto.drive_executivo_url || projeto.conteudo_executivo);
  const projetoStatus = projeto.status;
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(false);
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      await onConfirmarRevisado(result.value);
    } catch (err) {
      console.error('Erro ao processar DOCX:', err);
      setUploadError(true);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
          {conteudo && (
            <DownloadButton
              projetoNome={projeto.nome_projeto}
              kind="executivo"
              getHtml={() => buildExecutivoHtml(projeto)}
            />
          )}
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
        <div className="border-t border-gray-100 print-target">
          {/* Revision workflow banner */}
          {projetoStatus === 'aguardando_revisao_autor' && conteudo && (
            <div className="mx-6 mt-6 rounded-xl border border-brand-primary/40 bg-brand-bg-badge px-5 py-4">
              <p className="text-sm font-semibold text-amber-900 mb-3">Revisão do autor</p>
              <div className="flex flex-wrap items-center gap-2">
                <DownloadButton
                  projetoNome={projeto.nome_projeto}
                  kind="executivo"
                  getHtml={() => buildExecutivoHtml(projeto)}
                  variant="ghost"
                />
                <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-sm text-amber-800">Enviar ao autor para revisão</span>
                <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc"
                  className="hidden"
                  onChange={handleUpload}
                />
                <button
                  onClick={() => { setUploadError(false); fileInputRef.current?.click(); }}
                  disabled={uploading}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-brand-primary text-brand-text-main font-medium hover:bg-brand-hover transition-colors disabled:opacity-60"
                >
                  {uploading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                    : <><Upload className="w-4 h-4" /> Upload revisado</>
                  }
                </button>
                {uploadError && (
                  <span className="text-xs text-red-600">Erro — salve o arquivo como .docx no Word e tente novamente.</span>
                )}
              </div>
            </div>
          )}

          <div className="p-6">
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
        </div>
      )}
    </div>
  );
};
