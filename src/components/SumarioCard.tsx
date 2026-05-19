import React, { useState, useEffect } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Check, Loader2, Pencil, X } from 'lucide-react';
import type { Sumario, Capitulo, Projeto } from '../types';
import { DownloadButton } from './DownloadButton';
import { buildSumarioHtml } from '../lib/buildHtml';

interface SumarioCardProps {
  sumario: Sumario;
  projeto: Projeto;
  onSelecionar: (id: string) => Promise<void>;
  onAtualizar: (id: string, campos: { titulo_sumario?: string; capitulos?: Capitulo[] }) => Promise<void>;
}

const ABORDAGEM_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  cronologica: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   label: 'Cronológica' },
  tematica:    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', label: 'Temática' },
  narrativa:   { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',label: 'Narrativa' },
};

export const SumarioCard: React.FC<SumarioCardProps> = ({ sumario, projeto, onSelecionar, onAtualizar }) => {
  const [expanded, setExpanded] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitulo, setEditTitulo] = useState(sumario.titulo_sumario ?? '');
  const [editCapitulos, setEditCapitulos] = useState<Capitulo[]>(sumario.capitulos ?? []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!editMode) {
      setEditTitulo(sumario.titulo_sumario ?? '');
      setEditCapitulos(sumario.capitulos ?? []);
    }
  }, [sumario, editMode]);

  const handleSelecionar = async () => {
    setSelecting(true);
    try {
      await onSelecionar(sumario.id);
    } finally {
      setSelecting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitulo(sumario.titulo_sumario ?? '');
    setEditCapitulos(sumario.capitulos ?? []);
    setSaveError(null);
    setEditMode(false);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onAtualizar(sumario.id, {
        titulo_sumario: editTitulo,
        capitulos: editCapitulos,
      });
      setEditMode(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const updateCapitulo = (index: number, campo: Partial<Capitulo>) => {
    setEditCapitulos(prev => prev.map((cap, i) => i === index ? { ...cap, ...campo } : cap));
  };

  const abordagem = ABORDAGEM_STYLES[sumario.abordagem] ?? {
    bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', label: sumario.abordagem,
  };

  return (
    <div
      className={`rounded-xl overflow-hidden border transition-all duration-200 ${
        sumario.selecionado
          ? 'border-brand-primary shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {sumario.selecionado && <div className="h-0.5 bg-brand-primary" />}

      <div className={`p-5 ${sumario.selecionado ? 'bg-brand-bg-badge' : 'bg-brand-bg'}`}>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="font-serif text-xl font-bold text-brand-text-main">
                Opção {sumario.opcao}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${abordagem.bg} ${abordagem.text} ${abordagem.border}`}
              >
                {abordagem.label}
              </span>
              {sumario.selecionado && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-brand-primary text-[#111] rounded-full text-xs font-bold">
                  <Check className="w-3 h-3" strokeWidth={3} />
                  Selecionado
                </span>
              )}
            </div>

            {editMode ? (
              <input
                value={editTitulo}
                onChange={e => setEditTitulo(e.target.value)}
                className="w-full font-medium text-brand-text-body text-base border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 bg-white"
                placeholder="Título do sumário"
              />
            ) : (
              <p className="font-medium text-brand-text-body text-base leading-snug">
                {sumario.titulo_sumario || 'Sem título'}
              </p>
            )}

            {!editMode && (
              <span className="text-xs text-gray-400 mt-1 block">
                {sumario.capitulos ? sumario.capitulos.length : 0} capítulos
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!editMode && (
              <DownloadButton
                projetoNome={projeto.nome_projeto}
                kind={`sumario-${sumario.opcao}-${sumario.abordagem}`}
                getHtml={() => buildSumarioHtml(sumario, projeto)}
              />
            )}
            {sumario.drive_url && !editMode && (
              <a
                href={sumario.drive_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-brand-primary font-medium hover:bg-brand-primary/10 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver no Drive
              </a>
            )}
            <button
              onClick={() => editMode ? handleCancelEdit() : setEditMode(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                editMode
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-brand-bg-card text-gray-600 hover:bg-brand-primary hover:text-brand-text-main'
              }`}
            >
              {editMode
                ? <><X className="w-3.5 h-3.5" /> Cancelar</>
                : <><Pencil className="w-3.5 h-3.5" /> Editar</>
              }
            </button>
            {!sumario.selecionado && !editMode && (
              <button
                onClick={handleSelecionar}
                disabled={selecting}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm ${
                  selecting
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#111] text-[#F5C518] hover:bg-[#222] cursor-pointer'
                }`}
              >
                {selecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Selecionando...
                  </>
                ) : (
                  'Selecionar'
                )}
              </button>
            )}
          </div>
        </div>

        {sumario.capitulos && sumario.capitulos.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200/60">
            {!editMode && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand-text-main transition-colors focus:outline-none"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {expanded ? 'Ocultar capítulos' : `Ver ${sumario.capitulos.length} capítulos`}
              </button>
            )}

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                expanded || editMode ? 'max-h-[5000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
              }`}
            >
              {editMode ? (
                <div className="space-y-4">
                  {editCapitulos.map((cap, index) => (
                    <div key={cap.numero} className="pl-4 border-l-2 border-brand-primary/35 space-y-2">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                        Capítulo {cap.numero}
                      </div>
                      <input
                        value={cap.titulo}
                        onChange={e => updateCapitulo(index, { titulo: e.target.value })}
                        className="w-full text-sm font-bold border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 bg-white"
                        placeholder="Título do capítulo"
                      />
                      <textarea
                        value={cap.descricao}
                        onChange={e => updateCapitulo(index, { descricao: e.target.value })}
                        rows={3}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 resize-y bg-white"
                        placeholder="Descrição do capítulo"
                      />
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                          Subassuntos (um por linha)
                        </div>
                        <textarea
                          value={(cap.subassuntos ?? []).join('\n')}
                          onChange={e => updateCapitulo(index, {
                            subassuntos: e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                          })}
                          rows={3}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 resize-y bg-white"
                          placeholder={"Subassunto 1\nSubassunto 2"}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                    {saveError && (
                      <span className="text-sm text-red-500">{saveError}</span>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="px-4 py-1.5 text-sm font-bold bg-[#111] text-[#F5C518] hover:bg-[#222] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {saving ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
                        ) : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {sumario.capitulos.map((cap) => (
                    <div key={cap.numero} className="pl-4 border-l-2 border-brand-primary/35 text-sm">
                      <h4 className="font-bold text-brand-text-main">
                        Capítulo {cap.numero}: {cap.titulo}
                      </h4>
                      <p className="text-gray-600 mt-1 leading-relaxed">{cap.descricao}</p>
                      {cap.subassuntos && cap.subassuntos.length > 0 && (
                        <div className="mt-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            Subassuntos
                          </span>
                          <ul className="mt-1 space-y-1">
                            {cap.subassuntos.map((sub, i) => (
                              <li key={i} className="flex items-start gap-2 text-gray-500">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-brand-primary/60 shrink-0" />
                                {sub}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
