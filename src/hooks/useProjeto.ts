import { useState, useEffect, useCallback } from 'react'
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

  const salvarExecutivo = useCallback(async (html: string) => {
    if (!id) return
    const { error } = await supabase
      .from('projetos')
      .update({ conteudo_executivo: html })
      .eq('id', id)
    if (error) throw error
    setProjeto(prev => prev ? { ...prev, conteudo_executivo: html } : prev)
  }, [id])

  const confirmarRevisado = useCallback(async (html: string) => {
    if (!id) return
    const { error } = await supabase
      .from('projetos')
      .update({ conteudo_executivo: html, status: 'gerando_sumarios' })
      .eq('id', id)
    if (error) throw error
    setProjeto(prev => prev ? { ...prev, conteudo_executivo: html, status: 'gerando_sumarios' } : prev)
    // fire-and-forget — Fluxo 3 é longo, não aguardamos resposta
    fetch('https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/gerar-sumarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projeto_id: id }),
    }).catch(console.error)
  }, [id])

  const iniciarAnalise = useCallback(async () => {
    if (!id) return
    const { error } = await supabase
      .from('projetos')
      .update({ status: 'analisando_materiais' })
      .eq('id', id)
    if (error) throw error
    setProjeto(prev => prev ? { ...prev, status: 'analisando_materiais' } : prev)
    fetch('https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/iniciar-analise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projetoId: id }),
    }).catch(console.error)
  }, [id])

  return { projeto, loading, error, salvarExecutivo, confirmarRevisado, iniciarAnalise }
}
