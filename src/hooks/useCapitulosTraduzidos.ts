import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { CapituloTraducao } from '../types'

export function useCapitulosTraduzidos(traducaoId: string | undefined) {
  const [capitulos, setCapitulos] = useState<CapituloTraducao[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!traducaoId) return
    setLoading(true)
    supabase
      .from('capitulos_traducao')
      .select('*')
      .eq('traducao_id', traducaoId)
      .order('numero', { ascending: true })
      .then(({ data }) => {
        setCapitulos((data as CapituloTraducao[]) || [])
        setLoading(false)
      })
  }, [traducaoId])

  return { capitulos, loading }
}
