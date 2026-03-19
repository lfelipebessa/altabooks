import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Projeto } from '../types'

export function useProjeto(id: string | undefined) {
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    async function fetchProjeto() {
      try {
        setLoading(true)
        setError(null)
        const { data, error: fetchError } = await supabase
          .from('projetos')
          .select('*')
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError
        setProjeto(data as Projeto)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar projeto')
      } finally {
        setLoading(false)
      }
    }

    fetchProjeto()

    const channel = supabase
      .channel(`projeto-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projetos', filter: `id=eq.${id}` },
        (payload) => {
          setProjeto(payload.new as Projeto)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  return { projeto, loading, error }
}
