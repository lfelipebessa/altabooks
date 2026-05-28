import { Save, Download, Check, Loader2 } from 'lucide-react';

interface Props {
  dirty: boolean;
  salvando: boolean;
  baixando: boolean;
  errosPendentes?: number;
  onSalvar: () => void;
  onBaixar: () => void;
}

export function BotaoSalvarSticky({
  dirty,
  salvando,
  baixando,
  errosPendentes = 0,
  onSalvar,
  onBaixar,
}: Props) {
  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-md px-6 py-3 flex items-center justify-end gap-4">
      {dirty || salvando ? (
        <button
          type="button"
          onClick={onSalvar}
          disabled={salvando}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-white border border-brand-bg-card text-brand-text-main hover:bg-brand-bg-card transition-colors disabled:opacity-60"
        >
          {salvando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar alterações
            </>
          )}
        </button>
      ) : (
        <span className="inline-flex items-center gap-2 text-sm text-gray-500">
          <Check className="w-4 h-4 text-green-600" />
          Tudo salvo
        </span>
      )}

      {errosPendentes > 0 && (
        <span className="text-xs text-red-700">
          {errosPendentes} {errosPendentes === 1 ? 'erro pendente' : 'erros pendentes'}
        </span>
      )}

      <button
        type="button"
        onClick={onBaixar}
        disabled={baixando}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold bg-brand-primary text-brand-text-main hover:bg-brand-hover transition-colors disabled:opacity-60"
      >
        {baixando ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Gerando xlsx…
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Baixar BookInfo
          </>
        )}
      </button>
    </div>
  );
}
