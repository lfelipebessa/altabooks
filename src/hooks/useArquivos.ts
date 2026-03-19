import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Arquivo, TranscricaoResumo } from '../types'

export interface ArquivoComTranscricao extends Arquivo {
  transcricao?: TranscricaoResumo | null
}

export function useArquivos(projetoId: string | undefined) {
  const [arquivos, setArquivos] = useState<ArquivoComTranscricao[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadArquivos = useCallback(async () => {
    if (!projetoId) return

    try {
      setLoading(true)
      setError(null)

      const { data: arquivosData, error: arquivosError } = await supabase
        .from('index_arquivos')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('created_at', { ascending: true })

      if (arquivosError) throw arquivosError

      if (!arquivosData || arquivosData.length === 0) {
        setArquivos([])
        return
      }

      const ids = arquivosData.map((a: any) => a.id)

      const { data: transcricoesData, error: transcricoesError } = await supabase
        .from('transcricoes_resumos')
        .select('*')
        .in('arquivo_id', ids)

      if (transcricoesError) throw transcricoesError

      const transcricoesMap = new Map<string, TranscricaoResumo>()
      if (transcricoesData) {
        transcricoesData.forEach((t: any) => {
          transcricoesMap.set(t.arquivo_id, t as TranscricaoResumo)
        })
      }

      const arquivosComTranscricao: ArquivoComTranscricao[] = arquivosData.map((a: any) => ({
        ...a,
        transcricao: transcricoesMap.get(a.id) || null
      }))

      setArquivos(arquivosComTranscricao)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projetoId])

  useEffect(() => {
    if (projetoId) {
      loadArquivos()
    }
  }, [loadArquivos, projetoId])

  return { arquivos, loading, error, refetch: loadArquivos }
}
