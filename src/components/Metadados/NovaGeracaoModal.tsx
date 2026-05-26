import { useState } from 'react';
import { X, FileText, FileSpreadsheet } from 'lucide-react';
import { useUploadMetadados } from '../../hooks/useUploadMetadados';

interface Props {
  open: boolean;
  onClose: () => void;
  onSucesso: (jobId: string) => void;
}

export function NovaGeracaoModal({ open, onClose, onSucesso }: Props) {
  const [capa, setCapa] = useState<File | null>(null);
  const [miolo, setMiolo] = useState<File | null>(null);
  const [pcp, setPcp] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { upload, loading, progresso } = useUploadMetadados();

  if (!open) return null;

  const podeEnviar = capa && miolo && pcp && !loading;

  const submit = async () => {
    if (!capa || !miolo || !pcp) return;
    setErro(null);
    try {
      const id = await upload({ capa, miolo, pcp });
      onSucesso(id);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Falha no upload');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold">Nova geração de metadados</h2>
          <button onClick={onClose} disabled={loading}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-4">
          <FileSlot
            label="Capa aberta (PDF, máx 30MB)"
            icon={<FileText className="w-4 h-4" />}
            accept="application/pdf"
            value={capa}
            onChange={setCapa}
            done={progresso.capa}
            disabled={loading}
          />
          <FileSlot
            label="Miolo (PDF, máx 80MB)"
            icon={<FileText className="w-4 h-4" />}
            accept="application/pdf"
            value={miolo}
            onChange={setMiolo}
            done={progresso.miolo}
            disabled={loading}
          />
          <FileSlot
            label="Tabela PCP (.xlsx, máx 5MB)"
            icon={<FileSpreadsheet className="w-4 h-4" />}
            accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            value={pcp}
            onChange={setPcp}
            done={progresso.pcp}
            disabled={loading}
          />

          {erro && <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">{erro}</div>}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <button onClick={onClose} disabled={loading} className="px-3 py-1.5 rounded border">Cancelar</button>
          <button
            onClick={submit}
            disabled={!podeEnviar}
            className="px-3 py-1.5 rounded bg-brand-primary text-black font-medium disabled:opacity-50"
          >
            {loading ? 'Enviando…' : 'Gerar metadados →'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SlotProps {
  label: string;
  icon: React.ReactNode;
  accept: string;
  value: File | null;
  onChange: (f: File | null) => void;
  done: boolean;
  disabled: boolean;
}

function FileSlot({ label, icon, accept, value, onChange, done, disabled }: SlotProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-2 px-3 py-2 border rounded cursor-pointer hover:bg-gray-50">
          {icon}
          <span className="text-sm">Selecionar arquivo</span>
          <input
            type="file"
            className="hidden"
            accept={accept}
            disabled={disabled}
            onChange={e => onChange(e.target.files?.[0] || null)}
          />
        </label>
        {value && <span className="text-sm text-gray-600 truncate">{value.name}</span>}
        {done && <span className="text-xs text-green-700">✓ enviado</span>}
      </div>
    </div>
  );
}
