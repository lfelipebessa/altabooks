import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { FileDropzone } from '../ui/FileDropzone';
import { useUploadMetadados } from '../../hooks/useUploadMetadados';

interface Props {
  open: boolean;
  onClose: () => void;
  onSucesso: (jobId: string) => void;
}

const PDF_ACCEPT = { 'application/pdf': ['.pdf'] };
const XLSX_ACCEPT = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};

const MAX_CAPA = 30 * 1024 * 1024;
const MAX_MIOLO = 80 * 1024 * 1024;
const MAX_PCP = 5 * 1024 * 1024;

export function NovaGeracaoModal({ open, onClose, onSucesso }: Props) {
  const [capa, setCapa] = useState<File | null>(null);
  const [miolo, setMiolo] = useState<File | null>(null);
  const [pcp, setPcp] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { upload, loading, progresso } = useUploadMetadados();

  const podeEnviar = !!capa && !!miolo && !!pcp && !loading;

  const handleClose = () => {
    if (loading) return;
    setCapa(null);
    setMiolo(null);
    setPcp(null);
    setErro(null);
    onClose();
  };

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
    <Modal
      open={open}
      onClose={handleClose}
      title="Nova geração de metadados"
      size="lg"
      disabled={loading}
      footer={
        <>
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-brand-bg-card text-brand-text-body font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!podeEnviar}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition-all ${
              podeEnviar
                ? 'bg-brand-primary text-brand-text-main hover:bg-brand-hover'
                : 'bg-brand-primary/50 text-brand-text-main/50 cursor-not-allowed'
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Enviando…' : 'Gerar metadados →'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <FileDropzone
          mode="single"
          label="Capa aberta (PDF, máx 30MB)"
          accept={PDF_ACCEPT}
          maxSize={MAX_CAPA}
          value={capa}
          onChange={setCapa}
          uploadStatus={progresso.capa ? 'done' : loading ? 'uploading' : 'idle'}
          disabled={loading}
          expectedNameHint="capa"
        />
        <FileDropzone
          mode="single"
          label="Miolo (PDF, máx 80MB)"
          accept={PDF_ACCEPT}
          maxSize={MAX_MIOLO}
          value={miolo}
          onChange={setMiolo}
          uploadStatus={progresso.miolo ? 'done' : loading ? 'uploading' : 'idle'}
          disabled={loading}
          expectedNameHint="miolo"
        />
        <FileDropzone
          mode="single"
          label="Tabela PCP (.xlsx, máx 5MB)"
          accept={XLSX_ACCEPT}
          maxSize={MAX_PCP}
          value={pcp}
          onChange={setPcp}
          uploadStatus={progresso.pcp ? 'done' : loading ? 'uploading' : 'idle'}
          disabled={loading}
          expectedNameHint="pcp"
        />

        {erro && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            {erro}
          </div>
        )}
      </div>
    </Modal>
  );
}
