import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { TraducaoArquivoItem } from '../types'

export function useTraducaoArquivoItens(projetoId: string | undefined) {
  const [itens, setItens] = useState<TraducaoArquivoItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projetoId) return

    async function fetchItens() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('traducoes_arquivo_itens')
          .select('*')
          .eq('projeto_id', projetoId)
          .order('created_at', { ascending: true })
        setItens((data as TraducaoArquivoItem[]) || [])
      } finally {
        setLoading(false)
      }
    }

    fetchItens()

    const channel = supabase
      .channel(`traducao-arquivo-itens-${projetoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'traducoes_arquivo_itens', filter: `projeto_id=eq.${projetoId}` },
        () => { fetchItens() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projetoId])

  return { itens, loading }
}
