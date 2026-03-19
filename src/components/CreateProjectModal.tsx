import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [name, setName] = useState('');
    const [author, setAuthor] = useState('');
    const [driveLink, setDriveLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const isFormValid = name.trim() !== '' && author.trim() !== '' && driveLink.trim() !== '';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (isFormValid) {
            setLoading(true);
            try {
                const response = await fetch('https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/processar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectName: name, authorName: author, driveLink }),
                });
                
                if (!response.ok) {
                    throw new Error('Falha ao processar o webhook.');
                }
                
                setName('');
                setAuthor('');
                setDriveLink('');
                onSuccess();
                onClose();
            } catch (err: any) {
                console.error('Webhook error:', err);
                setError(err.message || 'Erro ao criar o projeto. Tente novamente.');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-brand-text-main/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div
                className="bg-brand-bg rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="font-serif text-2xl font-bold text-brand-text-main">
                        Novo Projeto
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="text-gray-400 hover:text-brand-text-main transition-colors p-1"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-brand-text-main mb-1">
                                Nome do Projeto *
                            </label>
                            <input
                                type="text"
                                id="name"
                                required
                                disabled={loading}
                                className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                placeholder="Ex: Café com Teu Pai"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label htmlFor="author" className="block text-sm font-medium text-brand-text-main mb-1">
                                Nome do Autor *
                            </label>
                            <input
                                type="text"
                                id="author"
                                required
                                disabled={loading}
                                className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                placeholder="Ex: Breno Leonardi"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                            />
                        </div>

                        <div>
                            <label htmlFor="driveLink" className="block text-sm font-medium text-brand-text-main mb-1">
                                Link do Google Drive *
                            </label>
                            <input
                                type="url"
                                id="driveLink"
                                required
                                disabled={loading}
                                className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                placeholder="https://drive.google.com/..."
                                value={driveLink}
                                onChange={(e) => setDriveLink(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-5 py-2.5 rounded-lg bg-brand-bg-card text-brand-text-body font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!isFormValid || loading}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition-all ${isFormValid && !loading
                                    ? 'bg-brand-primary text-brand-text-main hover:bg-brand-hover'
                                    : 'bg-brand-primary/50 text-brand-text-main/50 cursor-not-allowed'
                                }`}
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? 'Criando...' : 'Criar Projeto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
