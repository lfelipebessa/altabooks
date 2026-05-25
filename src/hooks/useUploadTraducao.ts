import { useState, useRef, useCallback, useMemo } from 'react'
import type { UploadedFileMeta } from '../types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const BUCKET = 'traducao-uploads'

const MIME_TO_TIPO: Record<string, 'pdf' | 'docx'> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

const EXT_TO_TIPO: Record<string, 'pdf' | 'docx'> = {
  pdf: 'pdf',
  docx: 'docx',
}

export const MAX_FILE_BYTES = 200 * 1024 * 1024 // 200 MB
export const MAX_FILES = 10

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error'

export interface FileUploadState {
  id: string
  file: File
  progress: number
  status: UploadStatus
  error?: string
  storage_path?: string
  tipo_arquivo: 'pdf' | 'docx'
}

function detectTipo(file: File): 'pdf' | 'docx' | null {
  const fromMime = MIME_TO_TIPO[file.type]
  if (fromMime) return fromMime
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_TO_TIPO[ext] ?? null
}

function sanitizeFilename(name: string): string {
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  const cleanStem = stem
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'arquivo'
  return cleanStem + ext.toLowerCase()
}

function uploadWithProgress(
  path: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`

    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.setRequestHeader('Cache-Control', 'max-age=3600')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText || 'Falha no upload'}`))
    }
    xhr.onerror = () => reject(new Error('Falha de rede no upload'))
    xhr.onabort = () => reject(new Error('Upload cancelado'))

    xhr.send(file)
  })
}

interface UseUploadTraducaoReturn {
  files: FileUploadState[]
  batchId: string
  addFiles: (newFiles: File[]) => { added: number; rejected: { file: File; reason: string }[] }
  removeFile: (id: string) => void
  startUpload: () => Promise<UploadedFileMeta[]>
  reset: () => void
  isUploading: boolean
  totalSize: number
  errorAcumulado: string | null
}

export function useUploadTraducao(): UseUploadTraducaoReturn {
  const [files, setFiles] = useState<FileUploadState[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [errorAcumulado, setErrorAcumulado] = useState<string | null>(null)
  const batchIdRef = useRef<string>(crypto.randomUUID())

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const rejected: { file: File; reason: string }[] = []
      const accepted: FileUploadState[] = []

      setFiles(prev => {
        const slotsLeft = MAX_FILES - prev.length
        for (const file of newFiles) {
          if (accepted.length >= slotsLeft) {
            rejected.push({ file, reason: `Limite de ${MAX_FILES} arquivos por projeto.` })
            continue
          }
          const tipo = detectTipo(file)
          if (!tipo) {
            rejected.push({ file, reason: 'Apenas PDF ou Word (.docx).' })
            continue
          }
          if (file.size > MAX_FILE_BYTES) {
            rejected.push({ file, reason: `Arquivo maior que ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB.` })
            continue
          }
          accepted.push({
            id: crypto.randomUUID(),
            file,
            progress: 0,
            status: 'pending',
            tipo_arquivo: tipo,
          })
        }
        return [...prev, ...accepted]
      })

      if (rejected.length > 0) {
        const msg = rejected.map(r => `${r.file.name}: ${r.reason}`).join(' • ')
        setErrorAcumulado(msg)
      } else {
        setErrorAcumulado(null)
      }

      return { added: accepted.length, rejected }
    },
    [],
  )

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
    setErrorAcumulado(null)
  }, [])

  const reset = useCallback(() => {
    setFiles([])
    setIsUploading(false)
    setErrorAcumulado(null)
    batchIdRef.current = crypto.randomUUID()
  }, [])

  const updateFile = (id: string, patch: Partial<FileUploadState>) => {
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)))
  }

  const startUpload = useCallback(async (): Promise<UploadedFileMeta[]> => {
    setIsUploading(true)
    setErrorAcumulado(null)

    // Snapshot atual; trabalha sobre ele pra evitar race
    const snapshot = await new Promise<FileUploadState[]>(resolve => {
      setFiles(prev => {
        resolve(prev)
        return prev
      })
    })

    const pending = snapshot.filter(f => f.status !== 'done')
    const batchId = batchIdRef.current
    const CONCURRENCY = 2
    const results: UploadedFileMeta[] = []

    // Já preserva resultados de uploads concluídos antes (em caso de retry)
    for (const f of snapshot.filter(f => f.status === 'done' && f.storage_path)) {
      results.push({
        name: f.file.name,
        storage_path: f.storage_path!,
        tipo_arquivo: f.tipo_arquivo,
        size: f.file.size,
      })
    }

    let cursor = 0
    const workers: Promise<void>[] = []
    let hasError = false

    const next = async () => {
      while (cursor < pending.length) {
        const idx = cursor++
        const f = pending[idx]
        const path = `${batchId}/${sanitizeFilename(f.file.name)}`
        updateFile(f.id, { status: 'uploading', progress: 0, error: undefined })
        try {
          await uploadWithProgress(path, f.file, p => updateFile(f.id, { progress: p }))
          updateFile(f.id, { status: 'done', progress: 100, storage_path: path })
          results.push({
            name: f.file.name,
            storage_path: path,
            tipo_arquivo: f.tipo_arquivo,
            size: f.file.size,
          })
        } catch (err) {
          hasError = true
          updateFile(f.id, {
            status: 'error',
            error: err instanceof Error ? err.message : 'Erro desconhecido',
          })
        }
      }
    }

    for (let i = 0; i < Math.min(CONCURRENCY, pending.length); i++) workers.push(next())
    await Promise.all(workers)

    setIsUploading(false)

    if (hasError) {
      setErrorAcumulado('Algum arquivo falhou. Verifique a lista e tente novamente.')
      throw new Error('Upload parcial — verifique a lista.')
    }

    return results
  }, [])

  const totalSize = useMemo(() => files.reduce((acc, f) => acc + f.file.size, 0), [files])

  return {
    files,
    batchId: batchIdRef.current,
    addFiles,
    removeFile,
    startUpload,
    reset,
    isUploading,
    totalSize,
    errorAcumulado,
  }
}
