import { useState, useCallback } from 'react'

const WEBHOOK_URL = 'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/revisar-traducao'

export interface IniciarRevisaoParams {
  projeto_id: string
  idioma: string
  escopo: 'tudo' | 'item'
  item_id?: string
}

export function useRevisaoTraducao() {
  const [iniciando, setIniciando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const iniciarRevisao = useCallback(async (params: IniciarRevisaoParams) => {
    setIniciando(true)
    setErro(null)
    try {
      const resp = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!resp.ok) {
        throw new Error(`Falha ao iniciar revisão (HTTP ${resp.status})`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      setErro(msg)
      throw e
    } finally {
      setIniciando(false)
    }
  }, [])

  return { iniciarRevisao, iniciando, erro }
}
