import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { CapituloTraducao } from '../types'

export function useCapitulosTraduzidos(traducaoId: string | undefined) {
  const [capitulos, setCapitulos] = useState<CapituloTraducao[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!traducaoId) return

    async function fetchCapitulos() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('capitulos_traducao')
          .select('*')
          .eq('traducao_id', traducaoId)
          .order('numero', { ascending: true })
        setCapitulos((data as CapituloTraducao[]) || [])
      } finally {
        setLoading(false)
      }
    }

    fetchCapitulos()

    const channel = supabase
      .channel(`capitulos-traducao-${traducaoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'capitulos_traducao', filter: `traducao_id=eq.${traducaoId}` },
        () => { fetchCapitulos() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [traducaoId])

  return { capitulos, loading }
}
