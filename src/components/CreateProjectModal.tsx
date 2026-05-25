import React, { useState } from 'react';
import { X, Loader2, ChevronDown, Link2, UploadCloud } from 'lucide-react';
import type { ProjetoTipo } from '../types';
import { IDIOMAS_TRADUCAO } from '../lib/idiomas';
import { detectDriveUrl } from '../lib/driveUrl';
import { useUploadTraducao } from '../hooks/useUploadTraducao';
import { UploadDropzone } from './UploadDropzone';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const WEBHOOK_URL = 'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/processar';

const TYPE_OPTIONS: { value: ProjetoTipo; label: string; description: string }[] = [
    { value: 'livro', label: 'Novo Livro', description: 'Gera livro a partir de materiais do autor' },
    { value: 'do_executivo', label: 'Do Executivo', description: 'Gera livro a partir de um projeto executivo pronto' },
    { value: 'traducao_arquivo', label: 'Traduzir Arquivo', description: 'Traduz PDF ou Word mantendo o formato' },
];

type TraducaoOrigem = 'drive' | 'upload';

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [tipo, setTipo] = useState<ProjetoTipo>('livro');
    const [name, setName] = useState('');
    const [author, setAuthor] = useState('');
    const [driveLink, setDriveLink] = useState('');
    const [driveExecutivoLink, setDriveExecutivoLink] = useState('');
    const [autoStart, setAutoStart] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const [qtdCapitulos, setQtdCapitulos] = useState('12');
    const [subcapitulosMin, setSubcapitulosMin] = useState('6');
    const [subcapitulosMax, setSubcapitulosMax] = useState('8');
    const [paginasMin, setPaginasMin] = useState('180');
    const [paginasMax, setPaginasMax] = useState('205');
    const [idioma, setIdioma] = useState<string>('EN-US');
    const [origemTraducao, setOrigemTraducao] = useState<TraducaoOrigem>('drive');
    const upload = useUploadTraducao();

    if (!isOpen) return null;

    const isFormValid = (() => {
        const base = name.trim() !== '' && author.trim() !== '';
        if (tipo === 'do_executivo') return base && driveExecutivoLink.trim() !== '';
        if (tipo === 'traducao_arquivo') {
            if (origemTraducao === 'drive') return base && driveLink.trim() !== '';
            return base && upload.files.length > 0;
        }
        return base && driveLink.trim() !== '';
    })();

    const resetForm = () => {
        setName(''); setAuthor(''); setDriveLink(''); setDriveExecutivoLink('');
        setAutoStart(true); setShowConfig(false);
        setQtdCapitulos('12'); setSubcapitulosMin('6'); setSubcapitulosMax('8');
        setPaginasMin('180'); setPaginasMax('205');
        setIdioma('EN-US');
        setOrigemTraducao('drive');
        upload.reset();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const cap = parseInt(qtdCapitulos, 10);
        const subMin = parseInt(subcapitulosMin, 10);
        const subMax = parseInt(subcapitulosMax, 10);
        const pagMin = parseInt(paginasMin, 10);
        const pagMax = parseInt(paginasMax, 10);

        const hasBookConfig = tipo === 'livro' || tipo === 'do_executivo';
        if (hasBookConfig) {
            if (!cap || !subMin || !subMax || !pagMin || !pagMax) {
                setError('Preencha todos os campos de configuração com valores válidos.');
                return;
            }
            if (subMax < subMin) { setError('Subcapítulos máximo deve ser maior ou igual ao mínimo.'); return; }
            if (pagMax < pagMin) { setError('Páginas máximo deve ser maior ou igual ao mínimo.'); return; }
        }

        if (tipo === 'traducao_arquivo' && origemTraducao === 'drive') {
            const match = detectDriveUrl(driveLink);
            if (!match) {
                setError('Use um link de arquivo (/file/d/) ou pasta (/drive/folders/) do Google Drive.');
                return;
            }
        }

        if (tipo === 'traducao_arquivo' && origemTraducao === 'upload' && upload.files.length === 0) {
            setError('Adicione ao menos um arquivo pra tradução.');
            return;
        }

        if (!isFormValid) return;
        setLoading(true);

        try {
            const base = { projectName: name, authorName: author };

            // Upload primeiro (se aplicável); só dispara webhook após todos arquivos prontos
            let uploadedFiles: { name: string; storage_path: string; tipo_arquivo: 'pdf' | 'docx'; size: number }[] | undefined;
            if (tipo === 'traducao_arquivo' && origemTraducao === 'upload') {
                uploadedFiles = await upload.startUpload();
            }

            const payload =
                tipo === 'livro'
                    ? { ...base, driveLink, autoStart, qtdCapitulos: cap, qtdSubcapitulosMin: subMin, qtdSubcapitulosMax: subMax, paginasMin: pagMin, paginasMax: pagMax }
                    : tipo === 'do_executivo'
                    ? { ...base, driveExecutivoLink, tipo: 'do_executivo', qtdCapitulos: cap, qtdSubcapitulosMin: subMin, qtdSubcapitulosMax: subMax, paginasMin: pagMin, paginasMax: pagMax }
                    : origemTraducao === 'drive'
                    ? { ...base, driveLink, tipo: 'traducao_arquivo', idioma }
                    : { ...base, tipo: 'traducao_arquivo', idioma, uploadedFiles };

            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Falha ao processar o webhook.');
            resetForm();
            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error('Webhook error:', err);
            setError(err instanceof Error ? err.message : 'Erro ao criar o projeto. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const showBookConfig = tipo === 'livro' || tipo === 'do_executivo';

    return (
        <div className="fixed inset-0 bg-brand-text-main/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-brand-bg rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="font-serif text-2xl font-bold text-brand-text-main">Novo Projeto</h2>
                    <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-brand-text-main transition-colors p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Seletor de tipo */}
                <div className="px-6 pt-5 pb-1">
                    <div className="flex gap-1 bg-brand-bg-section rounded-xl p-1">
                        {TYPE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { setTipo(opt.value); setError(null); }}
                                disabled={loading}
                                className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all leading-tight text-center
                                    ${tipo === opt.value ? 'bg-brand-bg text-brand-text-main shadow-sm' : 'text-gray-500 hover:text-brand-text-main'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                        {TYPE_OPTIONS.find(o => o.value === tipo)?.description}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 pt-4">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-brand-text-main mb-1">Nome do Projeto *</label>
                            <input
                                type="text" required disabled={loading}
                                className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                placeholder="Ex: Café com Teu Pai"
                                value={name} onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-brand-text-main mb-1">Nome do Autor *</label>
                            <input
                                type="text" required disabled={loading}
                                className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                placeholder="Ex: Breno Leonardi"
                                value={author} onChange={(e) => setAuthor(e.target.value)}
                            />
                        </div>

                        {tipo === 'do_executivo' && (
                            <div>
                                <label className="block text-sm font-medium text-brand-text-main mb-1">Link do Google Doc (Executivo) *</label>
                                <input
                                    type="url" required disabled={loading}
                                    className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                    placeholder="https://docs.google.com/..."
                                    value={driveExecutivoLink} onChange={(e) => setDriveExecutivoLink(e.target.value)}
                                />
                            </div>
                        )}

                        {tipo === 'livro' && (
                            <div>
                                <label className="block text-sm font-medium text-brand-text-main mb-1">Link do Google Drive *</label>
                                <input
                                    type="url" required disabled={loading}
                                    className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                    placeholder="https://drive.google.com/..."
                                    value={driveLink} onChange={(e) => setDriveLink(e.target.value)}
                                />
                            </div>
                        )}

                        {tipo === 'traducao_arquivo' && (
                            <div className="space-y-3">
                                <div className="flex gap-1 bg-brand-bg-section rounded-xl p-1">
                                    <button
                                        type="button"
                                        onClick={() => setOrigemTraducao('drive')}
                                        disabled={loading}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                            origemTraducao === 'drive' ? 'bg-brand-bg text-brand-text-main shadow-sm' : 'text-gray-500 hover:text-brand-text-main'
                                        }`}
                                    >
                                        <Link2 className="w-3.5 h-3.5" />
                                        Pasta no Drive
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOrigemTraducao('upload')}
                                        disabled={loading}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                            origemTraducao === 'upload' ? 'bg-brand-bg text-brand-text-main shadow-sm' : 'text-gray-500 hover:text-brand-text-main'
                                        }`}
                                    >
                                        <UploadCloud className="w-3.5 h-3.5" />
                                        Upload de arquivos
                                    </button>
                                </div>

                                {origemTraducao === 'drive' ? (
                                    <div>
                                        <input
                                            type="url" required disabled={loading}
                                            className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                            placeholder="https://drive.google.com/..."
                                            value={driveLink} onChange={(e) => setDriveLink(e.target.value)}
                                        />
                                        {detectDriveUrl(driveLink)?.kind === 'folder' && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Pasta detectada — todos os PDFs e Word dentro serão traduzidos.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <UploadDropzone
                                        files={upload.files}
                                        onAddFiles={(fs) => upload.addFiles(fs)}
                                        onRemoveFile={upload.removeFile}
                                        disabled={loading}
                                        isUploading={upload.isUploading}
                                        error={upload.errorAcumulado}
                                    />
                                )}
                            </div>
                        )}

                        {tipo === 'traducao_arquivo' && (
                            <div>
                                <label className="block text-sm font-medium text-brand-text-main mb-1">Idioma da tradução *</label>
                                <select
                                    value={idioma}
                                    onChange={(e) => setIdioma(e.target.value)}
                                    disabled={loading}
                                    className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                >
                                    {IDIOMAS_TRADUCAO.map(({ code, label }) => (
                                        <option key={code} value={code}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {tipo === 'livro' && (
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={autoStart}
                                    onChange={(e) => setAutoStart(e.target.checked)}
                                    disabled={loading}
                                    className="w-4 h-4 accent-brand-primary"
                                />
                                <span className="text-sm text-brand-text-body">Iniciar análise dos materiais automaticamente</span>
                            </label>
                        )}
                    </div>

                    {showBookConfig && (
                        <div className="border-t border-gray-100 pt-4 mt-4">
                            <button
                                type="button"
                                onClick={() => setShowConfig(v => !v)}
                                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-text-main transition-colors w-full text-left"
                            >
                                <ChevronDown className={`w-4 h-4 transition-transform ${showConfig ? 'rotate-180' : ''}`} />
                                Configurações do Livro
                                <span className="ml-auto text-xs text-gray-400 font-normal">
                                    {qtdCapitulos} cap · {subcapitulosMin}–{subcapitulosMax} subcap · {paginasMin}–{paginasMax} pág
                                </span>
                            </button>

                            {showConfig && (
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-brand-text-main mb-1">Número de Capítulos</label>
                                        <input type="text" inputMode="numeric" disabled={loading}
                                            className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                            value={qtdCapitulos} onChange={(e) => setQtdCapitulos(e.target.value.replace(/\D/g, ''))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-brand-text-main mb-1">Subcapítulos por Capítulo</label>
                                        <div className="flex gap-3 items-center">
                                            <div className="flex-1">
                                                <span className="text-xs text-gray-500 mb-1 block">Mínimo</span>
                                                <input type="text" inputMode="numeric" disabled={loading}
                                                    className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                                    value={subcapitulosMin} onChange={(e) => setSubcapitulosMin(e.target.value.replace(/\D/g, ''))} />
                                            </div>
                                            <span className="text-gray-400 pt-5">–</span>
                                            <div className="flex-1">
                                                <span className="text-xs text-gray-500 mb-1 block">Máximo</span>
                                                <input type="text" inputMode="numeric" disabled={loading}
                                                    className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                                    value={subcapitulosMax} onChange={(e) => setSubcapitulosMax(e.target.value.replace(/\D/g, ''))} />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-brand-text-main mb-1">Número de Páginas</label>
                                        <div className="flex gap-3 items-center">
                                            <div className="flex-1">
                                                <span className="text-xs text-gray-500 mb-1 block">Mínimo</span>
                                                <input type="text" inputMode="numeric" disabled={loading}
                                                    className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                                    value={paginasMin} onChange={(e) => setPaginasMin(e.target.value.replace(/\D/g, ''))} />
                                            </div>
                                            <span className="text-gray-400 pt-5">–</span>
                                            <div className="flex-1">
                                                <span className="text-xs text-gray-500 mb-1 block">Máximo</span>
                                                <input type="text" inputMode="numeric" disabled={loading}
                                                    className="w-full px-4 py-2 bg-brand-bg border border-brand-bg-card rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-brand-text-main"
                                                    value={paginasMax} onChange={(e) => setPaginasMax(e.target.value.replace(/\D/g, ''))} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-8 flex gap-3 justify-end">
                        <button type="button" onClick={onClose} disabled={loading}
                            className="px-5 py-2.5 rounded-lg bg-brand-bg-card text-brand-text-body font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={!isFormValid || loading}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition-all ${
                                isFormValid && !loading
                                    ? 'bg-brand-primary text-brand-text-main hover:bg-brand-hover'
                                    : 'bg-brand-primary/50 text-brand-text-main/50 cursor-not-allowed'
                            }`}>
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading
                                ? (upload.isUploading ? 'Subindo arquivos...' : 'Criando...')
                                : 'Criar Projeto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
