import { Info, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { AlertaMetadados, SeveridadeAlerta } from '../../types/metadados';
import type { DefinicaoCampo } from '../../lib/metadadosCampos';
import { getByPath } from '../../lib/metadadosFlatten';

interface Props {
  campo: DefinicaoCampo;
  json: unknown;
  alertas: AlertaMetadados[];
  onChange: (path: string, valor: unknown) => void;
  disabled?: boolean;
}

const SEV_STYLES: Record<SeveridadeAlerta, { Icon: typeof Info; cor: string }> = {
  info: { Icon: Info, cor: 'text-blue-700 bg-blue-50 border-blue-200' },
  aviso: { Icon: AlertTriangle, cor: 'text-yellow-800 bg-yellow-50 border-yellow-200' },
  erro: { Icon: AlertOctagon, cor: 'text-red-800 bg-red-50 border-red-200' },
};

export function CampoComAlerta({ campo, json, alertas, onChange, disabled }: Props) {
  const valorAtual = getByPath(json, campo.path);
  const alertasDoCampo = alertas.filter(a => a.campo === campo.path);

  const handleChange = (raw: unknown) => {
    let v: unknown = raw;
    if (campo.tipo === 'numero') {
      v = raw === '' || raw === null ? null : Number(raw);
    } else if (campo.tipo === 'lista_texto') {
      v = typeof raw === 'string' ? raw.split('\n').map(s => s.trim()).filter(Boolean) : raw;
    }
    onChange(campo.path, v);
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-brand-text-main">{campo.label}</label>

      {campo.tipo === 'texto' && (
        <input
          type="text"
          className="w-full px-3 py-2 border rounded text-sm"
          value={(valorAtual as string) ?? ''}
          placeholder={campo.placeholder}
          disabled={disabled}
          onChange={e => handleChange(e.target.value)}
        />
      )}

      {campo.tipo === 'numero' && (
        <input
          type="number"
          className="w-full px-3 py-2 border rounded text-sm"
          value={(valorAtual as number | null) ?? ''}
          disabled={disabled}
          onChange={e => handleChange(e.target.value)}
        />
      )}

      {campo.tipo === 'texto_longo' && (
        <textarea
          rows={4}
          className="w-full px-3 py-2 border rounded text-sm"
          value={(valorAtual as string) ?? ''}
          disabled={disabled}
          onChange={e => handleChange(e.target.value)}
        />
      )}

      {campo.tipo === 'lista_texto' && (
        <textarea
          rows={3}
          className="w-full px-3 py-2 border rounded text-sm font-mono"
          value={Array.isArray(valorAtual) ? (valorAtual as string[]).join('\n') : ''}
          disabled={disabled}
          placeholder="Um item por linha"
          onChange={e => handleChange(e.target.value)}
        />
      )}

      {campo.tipo === 'select' && (
        <select
          className="w-full px-3 py-2 border rounded text-sm"
          value={(valorAtual as string) ?? ''}
          disabled={disabled}
          onChange={e => handleChange(e.target.value)}
        >
          <option value="">—</option>
          {campo.opcoes?.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )}

      {alertasDoCampo.map((a, i) => {
        const { Icon, cor } = SEV_STYLES[a.severidade];
        return (
          <div key={i} className={`flex items-start gap-2 text-xs px-2 py-1 rounded border ${cor}`}>
            <Icon className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{a.mensagem}</span>
          </div>
        );
      })}
    </div>
  );
}
