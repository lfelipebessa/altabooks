import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, Search, Check, X as XIcon } from 'lucide-react'
import { TopBar } from '../../components/TopBar'
import { useAuth } from '../../contexts/AuthContext'
import {
  MODULES,
  useAllUsersWithModules,
  grantModule,
  revokeModule,
  type UserWithModules,
} from '../../lib/permissions'

export const Permissoes: React.FC = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const { users, loading, error, refetch } = useAllUsersWithModules()
  const [busca, setBusca] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const usersFiltrados = users.filter(u =>
    u.email.toLowerCase().includes(busca.toLowerCase()) ||
    (u.display_name?.toLowerCase().includes(busca.toLowerCase()) ?? false)
  )

  const toggle = async (user: UserWithModules, slug: string) => {
    if (!currentUser) return
    const key = `${user.id}:${slug}`
    setBusy(key)
    try {
      if (user.modules.has(slug)) {
        await revokeModule(user.id, slug)
      } else {
        await grantModule(user.id, slug, currentUser.id)
      }
      refetch()
    } catch (err) {
      console.error('Erro ao alterar modulo:', err)
      alert(`Falha ao salvar: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-brand-bg-section min-h-screen pb-20">
      <TopBar onNewProject={() => navigate('/')} />

      <main className="max-w-5xl mx-auto px-8 pt-[100px] space-y-6">
        <section>
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Administração</div>
          <h1 className="font-serif text-4xl text-brand-text-main">Permissões</h1>
          <p className="text-sm text-gray-500 mt-2">
            Liberar ou revogar módulos por usuário. Mudanças são salvas imediatamente.
          </p>
        </section>

        <section className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por email ou nome..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>
          <span className="text-sm text-gray-500 ml-auto">
            {usersFiltrados.length} de {users.length} usuários
          </span>
        </section>

        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-900">Erro ao carregar usuários</p>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-1 bg-brand-primary" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-bg-card">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500">
                      Usuário
                    </th>
                    {MODULES.map(m => (
                      <th key={m.slug} className="text-center px-3 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usersFiltrados.map(user => {
                    const isSelf = user.id === currentUser?.id
                    return (
                      <tr key={user.id} className={isSelf ? 'bg-brand-bg-section/50' : ''}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-brand-text-main">
                            {user.display_name || user.email}
                            {isSelf && <span className="ml-2 text-xs text-gray-400">(você)</span>}
                          </p>
                          {user.display_name && (
                            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                          )}
                        </td>
                        {MODULES.map(m => {
                          const granted = user.modules.has(m.slug)
                          const key = `${user.id}:${m.slug}`
                          const isBusy = busy === key
                          const disabled = isSelf || isBusy
                          return (
                            <td key={m.slug} className="px-3 py-3 text-center">
                              <button
                                type="button"
                                disabled={disabled}
                                onClick={() => toggle(user, m.slug)}
                                title={isSelf ? 'Não pode editar a si mesmo' : granted ? 'Revogar' : 'Liberar'}
                                className={
                                  'inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ' +
                                  (granted
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200')
                                }
                              >
                                {isBusy
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : granted
                                    ? <Check className="w-4 h-4" strokeWidth={3} />
                                    : <XIcon className="w-4 h-4" />}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                  {usersFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={MODULES.length + 1} className="px-5 py-12 text-center text-gray-400">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
