import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo-alta-books.png';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError('Email ou senha incorretos.');
        return;
      }
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
      <div className="bg-white rounded-2xl shadow-md p-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Alta Books" className="h-12 w-auto" />
        </div>

        <h1 className="text-2xl font-bold text-[#111111] mb-6 text-center" style={{ fontFamily: 'DM Serif Display, serif' }}>
          Entrar
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#333333]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#F5C518] focus:border-transparent"
              placeholder="seu@email.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#333333]" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#F5C518] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-[#F5C518] hover:bg-[#E0B400] disabled:opacity-60 text-[#111111] font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
