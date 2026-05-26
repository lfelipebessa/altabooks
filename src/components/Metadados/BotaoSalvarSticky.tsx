import { Save, Download } from 'lucide-react';

interface Props {
  dirty: boolean;
  salvando: boolean;
  baixando: boolean;
  onSalvar: () => void;
  onBaixar: () => void;
}

export function BotaoSalvarSticky({ dirty, salvando, baixando, onSalvar, onBaixar }: Props) {
  return (
    <div className="sticky bottom-0 bg-white border-t shadow-md px-4 py-3 flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onSalvar}
        disabled={!dirty || salvando}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors ${
          dirty
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Save className="w-4 h-4" />
        {salvando ? 'Salvando…' : dirty ? 'Salvar alterações' : 'Tudo salvo'}
      </button>
      <button
        type="button"
        onClick={onBaixar}
        disabled={baixando}
        className="inline-flex items-center gap-2 px-4 py-2 rounded font-medium bg-brand-primary text-black hover:bg-brand-hover disabled:opacity-60"
      >
        <Download className="w-4 h-4" />
        {baixando ? 'Gerando xlsx…' : 'Baixar BookInfo'}
      </button>
    </div>
  );
}
