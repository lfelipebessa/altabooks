import React, { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { ChevronDown, ChevronUp, Pencil, X, Loader2, Wand2 } from 'lucide-react';
import type { TraducaoArquivoItem, Projeto } from '../types';
import { StatusBadge } from './StatusBadge';
import { DownloadButton } from './DownloadButton';
import { buildTraducaoArquivoItemHtml } from '../lib/buildHtml';

const TiptapEditor = React.lazy(() =>
  import('./TiptapEditor').then(m => ({ default: m.TiptapEditor }))
);

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type Versao = 'traducao' | 'revisao';

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

const formatDataRevisao = (iso: string | null): string => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

const itemStatusToBadge = (s: TraducaoArquivoItem['status']): 'traduzindo' | 'concluido' | 'erro' =>
  s === 'concluido' ? 'concluido' : s === 'erro' ? 'erro' : 'traduzindo';

interface TraducaoArquivoItemPanelProps {
  item: TraducaoArquivoItem;
  projeto: Projeto;
  onSave: (id: string, html: string, versao: Versao) => Promise<void>;
  onRevisar: () => void;
}

const slugifyArquivo = (nome: string) =>
  nome
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'arquivo';

export const TraducaoArquivoItemPanel: React.FC<TraducaoArquivoItemPanelProps> = ({ item, projeto, onSave, onRevisar }) => {
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const podeMostrarRevisao = item.status_revisao === 'revisado' && !!item.conteudo_revisado;
  const podeRevisar = !!item.conteudo_original;
  const [versao, setVersao] = useState<Versao>(podeMostrarRevisao ? 'revisao' : 'traducao');

  // Re-sincroniza quando a revisão completa via Realtime
  useEffect(() => {
    if (podeMostrarRevisao && versao === 'traducao' && item.status_revisao === 'revisado') {
      setVersao('revisao')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.status_revisao])

  const conteudoAtual = versao === 'revisao' && item.conteudo_revisado
    ? item.conteudo_revisado
    : item.conteudo_traduzido;

  // Congela enquanto edita pra evitar reset do cursor do Tiptap (Realtime refetches)
  const [stableConteudo, setStableConteudo] = useState<string | null>(conteudoAtual);
  useEffect(() => {
    if (!editMode) setStableConteudo(conteudoAtual);
  }, [conteudoAtual, editMode]);

  const conteudoHtml = stableConteudo ? toHtml(stableConteudo) : '';
  const temConteudo = !!item.conteudo_traduzido;
  const isConcluido = item.status === 'concluido';

  const handleChange = useCallback((html: string) => {
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await onSave(item.id, html, versao);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 2000);
  }, [onSave, item.id, versao]);

  const handleExitEdit = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setEditMode(false);
    setSaveStatus('idle');
  };

  return (
    <div className="bg-brand-bg rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="w-8 h-8 rounded-full bg-[#111] text-brand-primary text-[10px] font-bold flex items-center justify-center shrink-0">
            {item.tipo_arquivo === 'pdf' ? 'PDF' : 'DOC'}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-brand-text-main truncate">{item.nome_arquivo}</h3>
            {item.status === 'erro' && item.mensagem_erro && (
              <p className="text-xs text-red-600 mt-0.5 truncate">{item.mensagem_erro}</p>
            )}
            {isConcluido && !podeRevisar && (
              <p className="text-xs text-gray-400 mt-0.5">Revisão indisponível para arquivos antigos</p>
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

          {item.status_revisao === 'revisando' && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Revisando...
            </span>
          )}
          {item.status_revisao === 'revisado' && !expanded && (
            <span className="text-xs text-emerald-600">· Revisado</span>
          )}
          {item.status_revisao === 'erro' && !expanded && (
            <span className="text-xs text-red-600">· Erro na revisão</span>
          )}

          {!isConcluido && <StatusBadge status={itemStatusToBadge(item.status)} />}

          {isConcluido && temConteudo && (
            <DownloadButton
              projetoNome={projeto.nome_projeto}
              kind={`traducao-${slugifyArquivo(item.nome_arquivo)}-${item.idioma.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              getHtml={() => buildTraducaoArquivoItemHtml(projeto, item)}
            />
          )}

          {expanded && temConteudo && podeRevisar && (
            <button
              onClick={onRevisar}
              disabled={item.status_revisao === 'revisando'}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium bg-brand-bg-card text-gray-600 hover:bg-brand-primary hover:text-brand-text-main transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {item.status_revisao === 'revisando' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Revisando...</>
              ) : item.status_revisao === 'revisado' ? (
                <><Wand2 className="w-4 h-4" /> Revisar de novo</>
              ) : (
                <><Wand2 className="w-4 h-4" /> Revisar com IA</>
              )}
            </button>
          )}

          {expanded && temConteudo && (
            <button
              onClick={() => editMode ? handleExitEdit() : setEditMode(true)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
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
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-brand-bg-card text-gray-600 hover:bg-brand-primary hover:text-brand-text-main transition-all cursor-pointer"
            >
              {expanded
                ? <><ChevronUp className="w-4 h-4" /> Ocultar</>
                : <><ChevronDown className="w-4 h-4" /> Ler</>
              }
            </button>
          )}
        </div>
      </div>

      {expanded && temConteudo && (
        <div className="border-t border-gray-100 p-6">
          {item.status_revisao === 'erro' && item.mensagem_erro_revisao && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              Erro na revisão: {item.mensagem_erro_revisao}
            </div>
          )}

          {podeRevisar && (
            <div className="flex gap-2 mb-4" role="tablist">
              <button
                role="tab"
                aria-selected={versao === 'traducao'}
                onClick={() => { handleExitEdit(); setVersao('traducao'); }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  versao === 'traducao' ? 'bg-[#111] text-white' : 'bg-brand-bg-card text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tradução
              </button>
              <button
                role="tab"
                aria-selected={versao === 'revisao'}
                disabled={!podeMostrarRevisao}
                onClick={() => { handleExitEdit(); setVersao('revisao'); }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center ${
                  versao === 'revisao' ? 'bg-[#111] text-white' : 'bg-brand-bg-card text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Wand2 className="w-3 h-3 inline mr-1" /> Revisão
              </button>
            </div>
          )}

          {versao === 'revisao' && item.revisado_em && (
            <p className="text-xs text-gray-400 mb-4">
              Revisada por {item.modelo_revisao || 'IA'} em {formatDataRevisao(item.revisado_em)}
            </p>
          )}

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
