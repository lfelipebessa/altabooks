import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import logo from '../assets/logo-alta-books.png'

export const SemAcesso: React.FC = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-brand-bg-section flex flex-col">
      <header className="h-[80px] bg-[#111111] flex items-center px-8 shadow-md">
        <img src={logo} alt="Alta Books" className="h-[48px] w-auto brightness-0 invert" />
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm max-w-md w-full overflow-hidden">
          <div className="h-1 bg-brand-primary" />
          <div className="p-8 text-center space-y-5">
            <h1 className="font-serif text-3xl text-brand-text-main">Bem-vindo à Alta Books</h1>

            <p className="text-sm text-gray-600 leading-relaxed">
              Você ainda não tem acesso a nenhum módulo da plataforma.
              Aguarde um administrador liberar seu acesso.
            </p>

            {user?.email && (
              <p className="text-xs text-gray-500">
                Logado como <span className="font-medium text-gray-700">{user.email}</span>
              </p>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <a
                href="mailto:bessalfs@gmail.com"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-bg-card hover:bg-brand-primary hover:text-brand-text-main text-gray-700 font-medium rounded-lg text-sm transition-colors"
              >
                <Mail className="w-4 h-4" />
                Falar com o administrador
              </a>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-gray-500 hover:text-brand-text-main text-sm transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
