import React, { useRef, useState, useEffect } from 'react';
import { Plus, User, UserCircle, LogOut } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo-alta-books.png';
import { useAuth } from '../contexts/AuthContext';
import { useUserModules } from '../lib/permissions';

interface TopBarProps {
  onNewProject?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onNewProject }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { modules } = useUserModules();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
        {modules.has('ghostwriter') && (
          <Link
            to="/"
            className="flex items-center gap-2 text-white/70 hover:text-[#F5C518] transition-colors text-sm font-medium px-3 py-1.5 rounded"
          >
            Projetos
          </Link>
        )}
        {modules.has('agente_verde') && (
          <Link
            to="/agente-verde"
            className="flex items-center gap-2 text-white/70 hover:text-[#F5C518] transition-colors text-sm font-medium px-3 py-1.5 rounded"
          >
            Agente Verde
          </Link>
        )}
        {modules.has('metadados') && (
          <Link
            to="/metadados"
            className="flex items-center gap-2 text-white/70 hover:text-[#F5C518] transition-colors text-sm font-medium px-3 py-1.5 rounded"
          >
            Metadados
          </Link>
        )}
        {modules.has('admin') && (
          <Link
            to="/admin/permissoes"
            className="flex items-center gap-2 text-white/70 hover:text-[#F5C518] transition-colors text-sm font-medium px-3 py-1.5 rounded"
          >
            Admin
          </Link>
        )}
        {modules.has('ghostwriter') && onNewProject && (
          <button
            onClick={onNewProject}
            className="flex items-center gap-2 bg-[#F5C518] hover:bg-[#E0B400] text-[#111111] font-bold py-1.5 px-4 rounded transition-colors text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Projeto
          </button>
        )}

        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setOpen(prev => !prev)}
            title="Minha conta"
            aria-label="Minha conta"
            aria-haspopup="true"
            aria-expanded={open}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm cursor-pointer"
          >
            <UserCircle className="w-5 h-5" />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50">
              <button
                onClick={() => { setOpen(false); navigate('/conta'); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[#111111] hover:bg-[#F8F9FB] cursor-pointer"
              >
                <User className="w-4 h-4 text-[#333333]" />
                Minha conta
              </button>
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[#111111] hover:bg-[#F8F9FB] cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-[#333333]" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
