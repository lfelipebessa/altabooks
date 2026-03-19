import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Projeto } from '../types';

interface DeleteProjectModalProps {
  projeto: Projeto | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({ projeto, onClose, onSuccess }) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!projeto) return null;

  const isConfirmed = confirmText === projeto.nome_projeto;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setLoading(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('projetos')
      .delete()
      .eq('id', projeto.id);

    if (deleteError) {
      setError('Erro ao deletar o projeto. Tente novamente.');
      setLoading(false);
      return;
    }

    onSuccess();
    onClose();
  };

  const handleClose = () => {
    if (loading) return;
    setConfirmText('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="font-serif text-xl font-bold text-brand-text-main">Deletar Projeto</h2>
          </div>
          <button onClick={handleClose} disabled={loading} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-semibold mb-1">Esta ação não pode ser desfeita.</p>
              <p>Todos os arquivos, transcrições e sumários associados a este projeto serão permanentemente deletados.</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-brand-text-body mb-3">
              Para confirmar, digite o nome do projeto abaixo:
            </p>
            <p className="text-sm font-semibold text-brand-text-main bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 font-mono break-all">
              {projeto.nome_projeto}
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Digite o nome do projeto..."
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-brand-text-main focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 disabled:bg-gray-50 disabled:opacity-70"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-brand-text-body font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deletando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Deletar Projeto
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
