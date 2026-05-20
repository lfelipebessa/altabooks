import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../contexts/AuthContext'

export interface Module {
  slug: string
  label: string
}

export const MODULES: readonly Module[] = [
  { slug: 'ghostwriter',  label: 'Projetos (Livros)' },
  { slug: 'agente_verde', label: 'Agente Verde' },
  { slug: 'admin',        label: 'Administrador' },
] as const

export interface UserModulesState {
  modules: Set<string>
  loading: boolean
  error: string | null
}

export function useUserModules(): UserModulesState {
  const { user, loading: authLoading } = useAuth()
  const [modules, setModules] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (authLoading) return
    if (!user) {
      setModules(new Set())
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    supabase
      .from('user_modules')
      .select('module_slug')
      .eq('user_id', user.id)
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          setError(err.message)
          setModules(new Set())
        } else {
          setModules(new Set((data ?? []).map(r => r.module_slug)))
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, authLoading])

  return { modules, loading: loading || authLoading, error }
}

export function useHasModule(slug: string): boolean {
  const { modules } = useUserModules()
  return modules.has(slug)
}

// Admin-only: lista todos os usuarios e seus modulos
export interface UserWithModules {
  id: string
  email: string
  display_name: string | null
  modules: Set<string>
}

export interface AllUsersState {
  users: UserWithModules[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAllUsersWithModules(): AllUsersState {
  const [users, setUsers] = useState<UserWithModules[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const refetch = useCallback(() => setVersion(v => v + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      supabase.from('profiles').select('id, email, display_name').order('email'),
      supabase.from('user_modules').select('user_id, module_slug'),
    ]).then(([profilesRes, modulesRes]) => {
      if (cancelled) return
      if (profilesRes.error) { setError(profilesRes.error.message); setLoading(false); return }
      if (modulesRes.error)  { setError(modulesRes.error.message);  setLoading(false); return }

      const modulesByUser = new Map<string, Set<string>>()
      for (const row of modulesRes.data ?? []) {
        const set = modulesByUser.get(row.user_id) ?? new Set<string>()
        set.add(row.module_slug)
        modulesByUser.set(row.user_id, set)
      }

      setUsers((profilesRes.data ?? []).map(p => ({
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        modules: modulesByUser.get(p.id) ?? new Set<string>(),
      })))
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [version])

  return { users, loading, error, refetch }
}

// Admin-only: grant/revoke a module
export async function grantModule(userId: string, slug: string, grantedBy: string): Promise<void> {
  const { error } = await supabase
    .from('user_modules')
    .insert({ user_id: userId, module_slug: slug, granted_by: grantedBy })
  if (error) throw new Error(error.message)
}

export async function revokeModule(userId: string, slug: string): Promise<void> {
  const { error } = await supabase
    .from('user_modules')
    .delete()
    .eq('user_id', userId)
    .eq('module_slug', slug)
  if (error) throw new Error(error.message)
}
