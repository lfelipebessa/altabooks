import React, { useState, useEffect } from 'react';
import { X, Loader2, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Projeto } from '../types';

interface ConfiguracoesProjetoModalProps {
  projeto: Projeto;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void; // fecha o modal; dados atualizam via Realtime automaticamente
}

export const ConfiguracoesProjetoModal: React.FC<ConfiguracoesProjetoModalProps> = ({
  projeto,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [qtdCapitulos, setQtdCapitulos] = useState(String(projeto.qtd_capitulos));
  const [subcapitulosMin, setSubcapitulosMin] = useState(String(projeto.qtd_subcapitulos_min));
  const [subcapitulosMax, setSubcapitulosMax] = useState(String(projeto.qtd_subcapitulos_max));
  const [paginasMin, setPaginasMin] = useState(String(projeto.paginas_min));
  const [paginasMax, setPaginasMax] = useState(String(projeto.paginas_max));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQtdCapitulos(String(projeto.qtd_capitulos));
    setSubcapitulosMin(String(projeto.qtd_subcapitulos_min));
    setSubcapitulosMax(String(projeto.qtd_subcapitulos_max));
    setPaginasMin(String(projeto.paginas_min));
    setPaginasMax(String(projeto.paginas_max));
    setError(null);
  }, [projeto.id, projeto.qtd_capitulos, projeto.qtd_subcapitulos_min, projeto.qtd_subcapitulos_max, projeto.paginas_min, projeto.paginas_max]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const cap = parseInt(qtdCapitulos, 10);
    const subMin = parseInt(subcapitulosMin, 10);
    const subMax = parseInt(subcapitulosMax, 10);
    const pagMin = parseInt(paginasMin, 10);
    const pagMax = parseInt(paginasMax, 10);

    if (!cap || !subMin || !subMax || !pagMin || !pagMax) {
      setError('Preencha todos os campos com valores válidos.');
      return;
    }
    if (subMax < subMin) {
      setError('Subcapítulos máximo deve ser maior ou igual ao mínimo.');
      return;
    }
    if (pagMax < pagMin) {
      setError('Páginas máximo deve ser maior ou igual ao mínimo.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('projetos')
        .update({
          qtd_capitulos: cap,
          qtd_subcapitulos_min: subMin,
          qtd_subcapitulos_max: subMax,
          paginas_min: pagMin,
          paginas_max: pagMax,
        })
        .eq('id', projeto.id);

      if (updateError) throw updateError;
      onSaved(); // fecha modal; Realtime atualiza os dados na tela
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main disabled:opacity-50';

  return (
    <div
      className="fixed inset-0 bg-brand-text-main/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={() => !loading && onClose()}
    >
      <div
        className="bg-brand-bg rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-brand-primary" />
            <h2 className="font-serif text-xl font-bold text-brand-text-main">
              Configurações do Livro
            </h2>
          </div>
          <button
            onClick={() => !loading && onClose()}
            disabled={loading}
            className="text-gray-400 hover:text-brand-text-main transition-colors p-1 disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Capítulos */}
          <div>
            <label className="block text-sm font-medium text-brand-text-main mb-1">
              Número de Capítulos
            </label>
            <input
              type="text" inputMode="numeric" disabled={loading}
              className={inputClass}
              value={qtdCapitulos}
              onChange={(e) => setQtdCapitulos(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          {/* Subcapítulos */}
          <div>
            <label className="block text-sm font-medium text-brand-text-main mb-1">
              Subcapítulos por Capítulo
            </label>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <span className="text-xs text-gray-500 mb-1 block">Mínimo</span>
                <input
                  type="text" inputMode="numeric" disabled={loading}
                  className={inputClass}
                  value={subcapitulosMin}
                  onChange={(e) => setSubcapitulosMin(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <span className="text-gray-400 pt-5">–</span>
              <div className="flex-1">
                <span className="text-xs text-gray-500 mb-1 block">Máximo</span>
                <input
                  type="text" inputMode="numeric" disabled={loading}
                  className={inputClass}
                  value={subcapitulosMax}
                  onChange={(e) => setSubcapitulosMax(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
          </div>

          {/* Páginas */}
          <div>
            <label className="block text-sm font-medium text-brand-text-main mb-1">
              Número de Páginas
            </label>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <span className="text-xs text-gray-500 mb-1 block">Mínimo</span>
                <input
                  type="text" inputMode="numeric" disabled={loading}
                  className={inputClass}
                  value={paginasMin}
                  onChange={(e) => setPaginasMin(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <span className="text-gray-400 pt-5">–</span>
              <div className="flex-1">
                <span className="text-xs text-gray-500 mb-1 block">Máximo</span>
                <input
                  type="text" inputMode="numeric" disabled={loading}
                  className={inputClass}
                  value={paginasMax}
                  onChange={(e) => setPaginasMax(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 pb-6">
          <button
            type="button"
            onClick={() => !loading && onClose()}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-brand-bg-card text-brand-text-body font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-brand-text-main font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};
