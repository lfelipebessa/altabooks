import React from 'react';
import { Info, AlertTriangle, AlertOctagon } from 'lucide-react';

export type Severidade = 'info' | 'aviso' | 'erro';

interface AlertaField {
  severidade: Severidade;
  mensagem: string;
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  description?: string;
  alerts?: AlertaField[];
  children: React.ReactNode;
}

const SEV_STYLES: Record<Severidade, { Icon: typeof Info; cor: string }> = {
  info: { Icon: Info, cor: 'text-blue-700 bg-blue-50 border-blue-200' },
  aviso: { Icon: AlertTriangle, cor: 'text-yellow-800 bg-yellow-50 border-yellow-200' },
  erro: { Icon: AlertOctagon, cor: 'text-red-800 bg-red-50 border-red-200' },
};

export const Field: React.FC<FieldProps> = ({
  label,
  htmlFor,
  description,
  alerts,
  children,
}) => {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-brand-text-main">
        {label}
      </label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      {children}
      {alerts && alerts.length > 0 && (
        <div className="space-y-1 pt-1">
          {alerts.map((a, i) => {
            const { Icon, cor } = SEV_STYLES[a.severidade];
            return (
              <div
                key={i}
                className={`flex items-start gap-2 text-xs px-2 py-1 rounded border ${cor}`}
              >
                <Icon className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{a.mensagem}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
