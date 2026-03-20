import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Projeto } from '../types'

export function useProjetos() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('projetos')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setProjetos(data || [])
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? 'Erro ao carregar projetos'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()

    const channel = supabase
      .channel('projetos-lista')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projetos' }, () => {
        refetch()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetch])

  return { projetos, loading, error, refetch }
}
