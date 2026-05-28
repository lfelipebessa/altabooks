import type { AlertaMetadados } from '../../types/metadados';
import type { DefinicaoCampo } from '../../lib/metadadosCampos';
import { getByPath } from '../../lib/metadadosFlatten';
import { Field, Input, Textarea, Select } from '../ui';

interface Props {
  campo: DefinicaoCampo;
  json: unknown;
  alertas: AlertaMetadados[];
  onChange: (path: string, valor: unknown) => void;
  disabled?: boolean;
}

export function CampoComAlerta({ campo, json, alertas, onChange, disabled }: Props) {
  const valorAtual = getByPath(json, campo.path);
  const alertasDoCampo = alertas.filter(a => a.campo === campo.path);
  const inputId = `campo-${campo.path.replace(/\./g, '-')}`;

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
    <Field
      label={campo.label}
      htmlFor={inputId}
      description={campo.placeholder}
      alerts={alertasDoCampo.map(a => ({ severidade: a.severidade, mensagem: a.mensagem }))}
    >
      {campo.tipo === 'texto' && (
        <Input
          id={inputId}
          type="text"
          value={(valorAtual as string) ?? ''}
          disabled={disabled}
          onChange={e => handleChange(e.target.value)}
        />
      )}
      {campo.tipo === 'numero' && (
        <Input
          id={inputId}
          type="number"
          value={(valorAtual as number | null) ?? ''}
          disabled={disabled}
          onChange={e => handleChange(e.target.value)}
        />
      )}
      {campo.tipo === 'texto_longo' && (
        <Textarea
          id={inputId}
          rows={4}
          value={(valorAtual as string) ?? ''}
          disabled={disabled}
          onChange={e => handleChange(e.target.value)}
        />
      )}
      {campo.tipo === 'lista_texto' && (
        <Textarea
          id={inputId}
          rows={3}
          placeholder="Um item por linha"
          value={Array.isArray(valorAtual) ? (valorAtual as string[]).join('\n') : ''}
          disabled={disabled}
          onChange={e => handleChange(e.target.value)}
        />
      )}
      {campo.tipo === 'select' && (
        <Select
          id={inputId}
          value={(valorAtual as string) ?? ''}
          placeholder="—"
          disabled={disabled}
          onChange={e => handleChange(e.target.value)}
        >
          {campo.opcoes?.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </Select>
      )}
    </Field>
  );
}
