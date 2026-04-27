import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Traducao } from '../types'

export function useTraducoes(projetoId: string | undefined) {
  const [traducoes, setTraducoes] = useState<Traducao[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projetoId) return

    async function fetchTraducoes() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('traducoes')
          .select('*')
          .eq('projeto_id', projetoId)
          .order('created_at', { ascending: true })
        setTraducoes((data as Traducao[]) || [])
      } finally {
        setLoading(false)
      }
    }

    fetchTraducoes()

    const channel = supabase
      .channel(`traducoes-${projetoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'traducoes', filter: `projeto_id=eq.${projetoId}` },
        () => { fetchTraducoes() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projetoId])

  const iniciarTraducao = useCallback(async (idioma: string) => {
    if (!projetoId) return
    const response = await fetch(
      'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/traduzir-livro',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projetoId, idioma }),
      }
    )
    if (!response.ok) throw new Error('Falha ao iniciar tradução.')
  }, [projetoId])

  return { traducoes, loading, iniciarTraducao }
}
