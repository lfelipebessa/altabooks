import React, { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { ChevronDown, ChevronUp, Pencil, X, Loader2 } from 'lucide-react';
import type { TraducaoArquivoItem, Projeto } from '../types';
import { StatusBadge } from './StatusBadge';
import { DownloadButton } from './DownloadButton';
import { buildTraducaoArquivoItemHtml } from '../lib/buildHtml';

const TiptapEditor = React.lazy(() =>
  import('./TiptapEditor').then(m => ({ default: m.TiptapEditor }))
);

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const applyInline = (t: string) =>
  t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

const toHtml = (text: string): string => {
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map(block => {
      const b = block.trim();
      if (/^### /.test(b)) return `<h3>${applyInline(b.replace(/^### /, ''))}</h3>`;
      if (/^## /.test(b))  return `<h2>${applyInline(b.replace(/^## /, ''))}</h2>`;
      if (/^# /.test(b))   return `<h1>${applyInline(b.replace(/^# /, ''))}</h1>`;
      return `<p>${applyInline(b.replace(/\n/g, '<br />'))}</p>`;
    })
    .join('');
};

const itemStatusToBadge = (s: TraducaoArquivoItem['status']): 'traduzindo' | 'concluido' | 'erro' =>
  s === 'concluido' ? 'concluido' : s === 'erro' ? 'erro' : 'traduzindo';

interface TraducaoArquivoItemPanelProps {
  item: TraducaoArquivoItem;
  projeto: Projeto;
  onSave: (id: string, html: string) => Promise<void>;
}

const slugifyArquivo = (nome: string) =>
  nome
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'arquivo';

export const TraducaoArquivoItemPanel: React.FC<TraducaoArquivoItemPanelProps> = ({ item, projeto, onSave }) => {
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Congela o conteúdo enquanto está em editMode: Realtime refetches (próprio autosave
  // ou n8n em outros items) NÃO devem mudar a prop `content` do Tiptap mid-edit, senão
  // o editor faria setContent() e perderia cursor/seleção.
  const [stableConteudo, setStableConteudo] = useState<string | null>(item.conteudo_traduzido);
  useEffect(() => {
    if (!editMode) setStableConteudo(item.conteudo_traduzido);
  }, [item.conteudo_traduzido, editMode]);

  const conteudoHtml = stableConteudo ? toHtml(stableConteudo) : '';
  const temConteudo = !!item.conteudo_traduzido;
  const isConcluido = item.status === 'concluido';

  const handleChange = useCallback((html: string) => {
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await onSave(item.id, html);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 2000);
  }, [onSave, item.id]);

  const handleExitEdit = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setEditMode(false);
    setSaveStatus('idle');
  };

  return (
    <div className="bg-brand-bg rounded-2xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="px-2 py-0.5 rounded-md bg-brand-bg-card text-[10px] font-bold text-gray-600 shrink-0">
            {item.tipo_arquivo.toUpperCase()}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-brand-text-main truncate">{item.nome_arquivo}</h3>
            {item.status === 'erro' && item.mensagem_erro && (
              <p className="text-xs text-red-600 mt-0.5 truncate">{item.mensagem_erro}</p>
            )}
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

          {!isConcluido && <StatusBadge status={itemStatusToBadge(item.status)} />}

          {isConcluido && temConteudo && (
            <DownloadButton
              projetoNome={projeto.nome_projeto}
              kind={`traducao-${slugifyArquivo(item.nome_arquivo)}-${item.idioma.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              getHtml={() => buildTraducaoArquivoItemHtml(projeto, item)}
            />
          )}

          {expanded && temConteudo && (
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
          )}

          {isConcluido && temConteudo && (
            <button
              onClick={() => {
                if (expanded) handleExitEdit();
                setExpanded(v => !v);
              }}
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-brand-primary text-brand-text-main hover:bg-brand-hover transition-colors"
            >
              {expanded
                ? <><ChevronUp className="w-4 h-4" /> Ocultar</>
                : <><ChevronDown className="w-4 h-4" /> Ler</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {expanded && temConteudo && (
        <div className="border-t border-gray-100 p-6">
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
