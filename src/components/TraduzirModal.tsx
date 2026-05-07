import React, { useState } from 'react';
import { X, Languages } from 'lucide-react';
import type { Projeto } from '../types';

interface TraduzirModalProps {
  projeto: Projeto | null;
  onClose: () => void;
  onSuccess: () => void;
}

const IDIOMAS = [
  { value: 'EN-US', label: 'Inglês (EUA)' },
  { value: 'EN-GB', label: 'Inglês (Reino Unido)' },
  { value: 'ES', label: 'Espanhol' },
  { value: 'FR', label: 'Francês' },
  { value: 'DE', label: 'Alemão' },
  { value: 'IT', label: 'Italiano' },
  { value: 'JA', label: 'Japonês' },
];

export const TraduzirModal: React.FC<TraduzirModalProps> = ({ projeto, onClose, onSuccess }) => {
  const [idioma, setIdioma] = useState('EN-US');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!projeto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/traduzir-livro',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projetoId: projeto.id, idioma }),
        }
      );
      if (!response.ok) throw new Error('Resposta inesperada do servidor');
      onSuccess();
      onClose();
    } catch {
      setError('Erro ao iniciar tradução. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-brand-primary" />
            <h2 className="text-lg font-bold text-brand-text-main">Traduzir Livro</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Selecione o idioma para traduzir{' '}
          <span className="font-medium text-brand-text-main">{projeto.nome_projeto}</span>.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-sm font-medium text-brand-text-main mb-2">
              Idioma de destino
            </label>
            <select
              value={idioma}
              onChange={(e) => setIdioma(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-brand-text-main bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              {IDIOMAS.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-hover text-brand-text-main text-sm font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Iniciando...' : 'Traduzir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
