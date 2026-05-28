import React, { useId, useMemo, useState } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X, Loader2, Check, AlertCircle, AlertTriangle } from 'lucide-react';

type Mode = 'single' | 'multiple';
type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

type Value<M extends Mode> = M extends 'single' ? File | null : File[];

interface FileDropzoneProps<M extends Mode> {
  label?: string;
  accept: Accept;
  maxSize: number;
  mode: M;
  value: Value<M>;
  onChange: (v: Value<M>) => void;
  disabled?: boolean;
  uploadStatus?: UploadStatus;
  progress?: number;
  errorMessage?: string;
  expectedNameHint?: 'capa' | 'miolo' | 'pcp' | string;
  maxFiles?: number;
}

const HINT_OPPOSITES: Record<string, string[]> = {
  capa: ['miolo', 'pcp'],
  miolo: ['capa', 'pcp'],
  pcp: ['capa', 'miolo'],
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function detectMismatch(fileName: string, hint?: string): string | null {
  if (!hint) return null;
  const opposites = HINT_OPPOSITES[hint] ?? [];
  const lower = fileName.toLowerCase();
  const conflict = opposites.find((token) => lower.includes(token));
  if (!conflict) return null;
  return `Este arquivo parece ser de "${conflict}" mas você o pôs em "${hint}". Confirmar?`;
}

export function FileDropzone<M extends Mode>(props: FileDropzoneProps<M>) {
  const {
    label,
    accept,
    maxSize,
    mode,
    value,
    onChange,
    disabled,
    uploadStatus = 'idle',
    progress,
    errorMessage,
    expectedNameHint,
    maxFiles,
  } = props;

  const inputId = useId();
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  const currentFiles: File[] = useMemo(() => {
    if (mode === 'single') return value ? [value as File] : [];
    return value as File[];
  }, [mode, value]);

  const remainingSlots = mode === 'multiple' && maxFiles
    ? Math.max(0, maxFiles - currentFiles.length)
    : Infinity;

  const dropDisabled = disabled || uploadStatus === 'uploading' || (mode === 'single' && currentFiles.length > 0) || remainingSlots === 0;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxSize,
    multiple: mode === 'multiple',
    disabled: dropDisabled,
    onDrop: (accepted) => {
      setRejectionMessage(null);
      if (accepted.length === 0) return;
      if (mode === 'single') {
        onChange(accepted[0] as Value<M>);
      } else {
        const merged = [...currentFiles, ...accepted];
        const sliced = maxFiles ? merged.slice(0, maxFiles) : merged;
        onChange(sliced as Value<M>);
      }
    },
    onDropRejected: (rejections) => {
      const first = rejections[0]?.errors[0];
      if (first?.code === 'file-too-large') {
        setRejectionMessage(`Arquivo muito grande (máx ${formatBytes(maxSize)})`);
      } else if (first?.code === 'file-invalid-type') {
        setRejectionMessage('Tipo de arquivo não aceito');
      } else {
        setRejectionMessage(first?.message || 'Arquivo rejeitado');
      }
    },
  });

  const removeFile = (index: number) => {
    if (mode === 'single') {
      onChange(null as Value<M>);
    } else {
      const next = currentFiles.filter((_, i) => i !== index);
      onChange(next as Value<M>);
    }
  };

  const mismatchWarning = mode === 'single' && currentFiles[0]
    ? detectMismatch(currentFiles[0].name, expectedNameHint)
    : null;

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-brand-text-main">{label}</label>
      )}

      {(mode === 'multiple' || currentFiles.length === 0) && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl px-6 py-8 text-center transition-colors cursor-pointer
            ${isDragActive ? 'border-brand-primary bg-brand-bg-badge' : 'border-brand-bg-card bg-brand-bg-section hover:border-brand-primary/50'}
            ${dropDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
        >
          <input {...getInputProps()} id={inputId} />
          <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${isDragActive ? 'text-brand-primary' : 'text-gray-400'}`} />
          <p className="text-sm font-medium text-brand-text-main">
            {isDragActive ? 'Solte aqui' : 'Arraste o arquivo ou clique pra selecionar'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            até {formatBytes(maxSize)}
            {mode === 'multiple' && maxFiles && ` · ${remainingSlots} de ${maxFiles} restantes`}
          </p>
        </div>
      )}

      {(errorMessage || rejectionMessage) && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {errorMessage || rejectionMessage}
        </div>
      )}

      {mismatchWarning && (
        <div className="flex items-start gap-2 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{mismatchWarning}</span>
        </div>
      )}

      {currentFiles.length > 0 && (
        <ul className="space-y-2">
          {currentFiles.map((f, i) => (
            <li key={`${f.name}-${i}`} className="bg-brand-bg border border-gray-200 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-3">
                <FileIcon className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text-main truncate">{f.name}</p>
                  <p className="text-xs text-gray-500">{formatBytes(f.size)}</p>
                </div>

                {uploadStatus === 'uploading' && (
                  <Loader2 className="w-4 h-4 animate-spin text-brand-primary shrink-0" aria-label="Enviando" />
                )}
                {uploadStatus === 'done' && (
                  <Check className="w-4 h-4 text-green-500 shrink-0" aria-label="Enviado" />
                )}
                {uploadStatus === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" aria-label="Erro" />
                )}
                {uploadStatus !== 'uploading' && !disabled && (
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    aria-label="Remover arquivo"
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {uploadStatus === 'uploading' && typeof progress === 'number' && (
                <div className="mt-2 h-1 bg-brand-bg-card rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-primary transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
