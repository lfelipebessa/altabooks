import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { SearchBar } from '../components/SearchBar';
import { ProjectCard } from '../components/ProjectCard';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { DeleteProjectModal } from '../components/DeleteProjectModal';
import { TraduzirModal } from '../components/TraduzirModal';
import { useProjetos } from '../hooks/useProjetos';
import { Loader2 } from 'lucide-react';
import type { Projeto } from '../types';

export const ListagemProjetos: React.FC = () => {
    const navigate = useNavigate();
    const { projetos, loading, error, refetch } = useProjetos();
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [projetoParaDeletar, setProjetoParaDeletar] = useState<Projeto | null>(null);
    const [projetoParaTraduzir, setProjetoParaTraduzir] = useState<Projeto | null>(null);

    const handleIniciarAnalise = async (projeto: Projeto) => {
        try {
            await fetch('https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/iniciar-analise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projetoId: projeto.id }),
            });
            setTimeout(refetch, 2000);
        } catch (e) {
            console.error('Erro ao iniciar análise', e);
        }
    };

    const filteredProjetos = useMemo(() => {
        if (!searchQuery.trim()) return projetos;
        const query = searchQuery.toLowerCase();
        return projetos.filter(p => 
            p.nome_projeto.toLowerCase().includes(query) || 
            p.autor_nome.toLowerCase().includes(query)
        );
    }, [projetos, searchQuery]);

    return (
        <div className="min-h-screen bg-brand-bg-section pb-12">
            <TopBar onNewProject={() => setIsCreateModalOpen(true)} />
            
            <main className="max-w-7xl mx-auto px-6 pt-32">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <h1 className="font-serif text-3xl font-bold text-brand-text-main">
                        Projetos
                    </h1>
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-brand-text-body">
                        <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-4" />
                        <p>Carregando projetos...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-100 text-center">
                        <p className="font-semibold mb-2">Erro ao carregar projetos</p>
                        <p className="text-sm">{error}</p>
                        <button 
                            onClick={refetch}
                            className="mt-4 px-4 py-2 bg-white text-red-700 font-medium rounded border border-red-200 hover:bg-red-50 cursor-pointer"
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : projetos.length === 0 ? (
                    <div className="text-center py-20 bg-brand-bg rounded-xl border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-700 mb-2">Nenhum projeto criado ainda</h2>
                        <p className="text-gray-500 mb-6">Comece criando seu primeiro projeto para o Autobooks.</p>
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-brand-primary hover:bg-brand-hover text-brand-text-main font-bold py-2 px-6 rounded-lg transition-colors cursor-pointer"
                        >
                            Criar Primeiro Projeto
                        </button>
                    </div>
                ) : filteredProjetos.length === 0 ? (
                    <div className="text-center py-20 bg-brand-bg rounded-xl border border-gray-200">
                        <p className="text-gray-500 text-lg">Nenhum resultado para "{searchQuery}"</p>
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="mt-4 text-brand-primary font-medium hover:underline cursor-pointer"
                        >
                            Limpar busca
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProjetos.map(projeto => {
                            // Simulando a contagem de arquivos processados/totais do hook para a listagem
                            // Apenas para renderizar a ProgressBar visualmente como estava no template 
                            // O useProjetos atual não retorna esses campos. Se a API não os enviar, 
                            // o card usará apenas a UI limpa sem a barra provisoriamente.
                            return (
                                <ProjectCard
                                    key={projeto.id}
                                    project={projeto}
                                    onClick={() => navigate(`/projetos/${projeto.id}`)}
                                    onDelete={setProjetoParaDeletar}
                                    onIniciarAnalise={() => handleIniciarAnalise(projeto)}
                                    onTraduzir={() => setProjetoParaTraduzir(projeto)}
                                />
                            );
                        })}
                    </div>
                )}
            </main>

            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => { setTimeout(refetch, 2000); }}
            />

            <DeleteProjectModal
                projeto={projetoParaDeletar}
                onClose={() => setProjetoParaDeletar(null)}
                onSuccess={() => { refetch(); }}
            />

            <TraduzirModal
                projeto={projetoParaTraduzir}
                onClose={() => setProjetoParaTraduzir(null)}
                onSuccess={() => { setTimeout(refetch, 2000); }}
            />
        </div>
    );
};
