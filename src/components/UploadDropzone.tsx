import React from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, File as FileIcon, X, Loader2, Check, AlertCircle } from 'lucide-react'
import type { FileUploadState } from '../hooks/useUploadTraducao'
import { MAX_FILES, MAX_FILE_BYTES } from '../hooks/useUploadTraducao'

interface UploadDropzoneProps {
  files: FileUploadState[]
  onAddFiles: (files: File[]) => void
  onRemoveFile: (id: string) => void
  disabled?: boolean
  isUploading?: boolean
  error?: string | null
}

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  files, onAddFiles, onRemoveFile, disabled, isUploading, error,
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    maxSize: MAX_FILE_BYTES,
    disabled: disabled || isUploading || files.length >= MAX_FILES,
    onDrop: (accepted) => {
      if (accepted.length > 0) onAddFiles(accepted)
    },
  })

  const remainingSlots = MAX_FILES - files.length

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl px-6 py-8 text-center transition-colors cursor-pointer
          ${isDragActive ? 'border-brand-primary bg-brand-bg-badge' : 'border-brand-bg-card bg-brand-bg-section hover:border-brand-primary/50'}
          ${(disabled || isUploading || files.length >= MAX_FILES) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${isDragActive ? 'text-brand-primary' : 'text-gray-400'}`} />
        <p className="text-sm font-medium text-brand-text-main">
          {isDragActive ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          PDF ou Word • até {(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB cada • {remainingSlots} de {MAX_FILES} restantes
        </p>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map(f => (
            <li key={f.id} className="bg-brand-bg border border-gray-200 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-3">
                <FileIcon className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text-main truncate">{f.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {f.tipo_arquivo.toUpperCase()} · {formatBytes(f.file.size)}
                    {f.status === 'error' && f.error && (
                      <span className="text-red-600 ml-2">— {f.error}</span>
                    )}
                  </p>
                </div>

                {f.status === 'pending' && !isUploading && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(f.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Remover"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {f.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 animate-spin text-brand-primary shrink-0" />
                )}

                {f.status === 'done' && (
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                )}

                {f.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                )}
              </div>

              {f.status === 'uploading' && (
                <div className="mt-2 h-1 bg-brand-bg-card rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-primary transition-all duration-150"
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
