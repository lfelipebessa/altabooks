import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo-alta-books.png';
import { ArrowLeft } from 'lucide-react';

export const Conta: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error('updateUser failed:', error);
        setError('Não foi possível alterar a senha. Tente novamente.');
        return;
      }
      setSuccess(true);
      setPassword('');
      setConfirm('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <header className="fixed top-0 left-0 right-0 h-[80px] bg-[#111111] z-40 flex items-center justify-between px-[32px] shadow-md">
        <div className="flex items-center">
          <img src={logo} alt="Alta Books" className="h-[48px] w-auto brightness-0 invert" />
        </div>
      </header>

      <div className="pt-[80px] flex items-start justify-center p-8">
        <div className="bg-white rounded-2xl shadow-md p-10 w-full max-w-md mt-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-[#333333] hover:text-[#111111] mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <h1 className="text-2xl font-bold text-[#111111] mb-1" style={{ fontFamily: 'DM Serif Display, serif' }}>
            Minha conta
          </h1>
          <p className="text-sm text-[#333333] mb-8">{user?.email}</p>

          <h2 className="text-base font-semibold text-[#111111] mb-4">Alterar senha</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#333333]" htmlFor="new-password">
                Nova senha
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setSuccess(false); }}
                required
                minLength={6}
                autoComplete="new-password"
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#F5C518] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#333333]" htmlFor="confirm-password">
                Confirmar nova senha
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setSuccess(false); }}
                required
                minLength={6}
                autoComplete="new-password"
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#F5C518] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p role="alert" className="text-red-600 text-sm">{error}</p>
            )}
            {success && (
              <p role="status" className="text-green-600 text-sm">Senha alterada com sucesso!</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-[#F5C518] hover:bg-[#E0B400] disabled:opacity-60 text-[#111111] font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
            >
              {loading ? 'Salvando...' : 'Alterar senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
