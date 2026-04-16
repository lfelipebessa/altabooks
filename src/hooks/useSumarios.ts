import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Sumario, Capitulo } from '../types'

export function useSumarios(projetoId: string | undefined) {
  const [sumarios, setSumarios] = useState<Sumario[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSumarios = useCallback(async () => {
    if (!projetoId) return

    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('sumarios')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('opcao', { ascending: true })

      if (fetchError) throw fetchError
      setSumarios(data as Sumario[] || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar sumários')
    } finally {
      setLoading(false)
    }
  }, [projetoId])

  useEffect(() => {
    if (projetoId) loadSumarios()
  }, [loadSumarios, projetoId])

  const selecionarSumario = useCallback(async (id: string) => {
    if (!projetoId) return

    try {
      const { error: err1 } = await supabase
        .from('sumarios')
        .update({ selecionado: false })
        .eq('projeto_id', projetoId)

      if (err1) throw err1

      const { error: err2 } = await supabase
        .from('sumarios')
        .update({ selecionado: true })
        .eq('id', id)

      if (err2) throw err2

      setSumarios(prev => prev.map(s => ({
        ...s,
        selecionado: s.id === id
      })))

    } catch (err) {
      console.error('Erro ao selecionar sumário:', err instanceof Error ? err.message : err)
      loadSumarios()
    }
  }, [projetoId, loadSumarios])

  const atualizarSumario = useCallback(async (
    id: string,
    campos: { titulo_sumario?: string; capitulos?: Capitulo[] }
  ) => {
    const { error } = await supabase
      .from('sumarios')
      .update(campos)
      .eq('id', id)
    if (error) throw error
    setSumarios(prev => prev.map(s => s.id === id ? { ...s, ...campos } : s))
  }, [])

  return { sumarios, loading, error, selecionarSumario, atualizarSumario, refetch: loadSumarios }
}
