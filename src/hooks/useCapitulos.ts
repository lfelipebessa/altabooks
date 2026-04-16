import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { CapituloLivro } from '../types'

export function useCapitulos(projetoId: string | undefined) {
  const [capitulos, setCapitulos] = useState<CapituloLivro[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!projetoId) return
    setLoading(true)
    const { data } = await supabase
      .from('capitulos')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('numero', { ascending: true })
    setCapitulos((data as CapituloLivro[]) || [])
    setLoading(false)
  }, [projetoId])

  useEffect(() => {
    if (projetoId) load()
  }, [load, projetoId])

  const atualizarCapitulo = useCallback(async (id: string, html: string) => {
    const { error } = await supabase
      .from('capitulos')
      .update({ conteudo: html })
      .eq('id', id)
    if (error) throw error
    setCapitulos(prev => prev.map(c => c.id === id ? { ...c, conteudo: html } : c))
  }, [])

  return { capitulos, loading, refetch: load, atualizarCapitulo }
}
