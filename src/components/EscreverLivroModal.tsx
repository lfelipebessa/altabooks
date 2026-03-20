import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface EscreverLivroModalProps {
  projetoId: string;
  isOpen: boolean;
  onClose: () => void;
}

const WEBHOOK_URL = 'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/escrever-livro';

const CHECKLIST = [
  'O autor revisou e aprovou o Projeto Executivo',
  'As edições no Google Docs foram salvas',
  'Entendo que esta ação não pode ser desfeita',
];

export const EscreverLivroModal: React.FC<EscreverLivroModalProps> = ({
  projetoId,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projeto_id: projetoId }),
      });
      if (!response.ok) throw new Error('Falha ao iniciar a escrita do livro.');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-[440px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header âmbar */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-[#fde68a]"
          style={{ background: 'linear-gradient(135deg, #fffdf0 0%, #fefce8 100%)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">✍️</span>
            <div>
              <h2 className="font-serif text-lg font-bold text-brand-text-main leading-tight">
                Escrever Livro
              </h2>
              <p className="text-xs text-amber-700 font-medium">Confirme antes de continuar</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Checklist visual */}
          <ul className="space-y-3">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-brand-text-body font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 px-5 py-2.5 bg-[#111] text-[#F5C518] font-bold rounded-lg hover:bg-[#222] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[160px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                'Confirmar e Escrever'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
