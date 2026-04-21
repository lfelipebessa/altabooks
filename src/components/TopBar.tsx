import React from 'react';
import { Plus, LogOut } from 'lucide-react';
import logo from '../assets/logo-alta-books.png';
import { useAuth } from '../contexts/AuthContext';

interface TopBarProps {
    onNewProject: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onNewProject }) => {
    const { signOut } = useAuth();

    return (
        <header className="fixed top-0 left-0 right-0 h-[80px] bg-[#111111] z-40 flex items-center justify-between px-[32px] shadow-md">
            <div className="flex items-center">
                <img
                    src={logo}
                    alt="Alta Books"
                    className="h-[48px] w-auto brightness-0 invert"
                />
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={onNewProject}
                    className="flex items-center gap-2 bg-[#F5C518] hover:bg-[#E0B400] text-[#111111] font-bold py-1.5 px-4 rounded transition-colors text-sm cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    Novo Projeto
                </button>

                <button
                    onClick={signOut}
                    title="Sair"
                    aria-label="Sair"
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm cursor-pointer"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
};
