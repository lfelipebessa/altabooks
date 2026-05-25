import { useState, useEffect, useCallback } from 'react'
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

  const atualizarItem = useCallback(async (itemId: string, conteudoHtml: string) => {
    // Captura o conteúdo anterior pra poder reverter se o UPDATE falhar.
    let conteudoAnterior: string | null = null
    setItens(prev => {
      const found = prev.find(i => i.id === itemId)
      conteudoAnterior = found?.conteudo_traduzido ?? null
      return prev.map(i =>
        i.id === itemId ? { ...i, conteudo_traduzido: conteudoHtml } : i
      )
    })
    const { error } = await supabase
      .from('traducoes_arquivo_itens')
      .update({ conteudo_traduzido: conteudoHtml })
      .eq('id', itemId)
    if (error) {
      // Reverte o optimistic update pra refletir o estado real do DB.
      setItens(prev => prev.map(i =>
        i.id === itemId ? { ...i, conteudo_traduzido: conteudoAnterior } : i
      ))
      throw error
    }
  }, [])

  return { itens, loading, atualizarItem }
}
