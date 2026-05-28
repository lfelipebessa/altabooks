import { useState, useEffect, useMemo } from 'react';
import type { MetadadosJSON, AlertaMetadados } from '../../types/metadados';
import { setByPath } from '../../lib/metadadosFlatten';
import { SECOES, larguraDoCampo, type DefinicaoCampo } from '../../lib/metadadosCampos';
import { CampoComAlerta } from './CampoComAlerta';
import { Tabs } from '../ui';

interface Props {
  jsonInicial: MetadadosJSON;
  alertas: AlertaMetadados[];
  onChange: (json: MetadadosJSON, dirty: boolean) => void;
}

function contarErrosDaSecao(alertas: AlertaMetadados[], prefixo: string): number {
  return alertas.filter(a => a.severidade === 'erro' && a.campo.startsWith(prefixo)).length;
}

export function FormMetadados({ jsonInicial, alertas, onChange }: Props) {
  const [local, setLocal] = useState<MetadadosJSON>(jsonInicial);
  const [tab, setTab] = useState<string>(SECOES[0].id);

  useEffect(() => {
    setLocal(jsonInicial);
  }, [jsonInicial]);

  const handleField = (path: string, valor: unknown) => {
    const novo = setByPath(local as unknown as Record<string, unknown>, path, valor) as unknown as MetadadosJSON;
    setLocal(novo);
    onChange(novo, true);
  };

  const errosPorSecao = useMemo(
    () => Object.fromEntries(SECOES.map(s => [s.id, contarErrosDaSecao(alertas, s.prefixo)])),
    [alertas]
  );

  const renderCampo = (campo: DefinicaoCampo) => {
    const largura = larguraDoCampo(campo);
    return (
      <div key={campo.path} className={largura === 'cheia' ? 'md:col-span-2' : ''}>
        <CampoComAlerta
          campo={campo}
          json={local}
          alertas={alertas}
          onChange={handleField}
        />
      </div>
    );
  };

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <Tabs.List className="sticky top-[80px] z-20 bg-brand-bg-section pt-2">
        {SECOES.map(secao => {
          const erros = errosPorSecao[secao.id];
          return (
            <Tabs.Trigger key={secao.id} value={secao.id}>
              <span className="inline-flex items-center gap-2">
                {secao.label}
                {erros > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                    {erros}
                  </span>
                )}
              </span>
            </Tabs.Trigger>
          );
        })}
      </Tabs.List>

      {SECOES.map(secao => (
        <Tabs.Panel key={secao.id} value={secao.id}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {secao.campos.map(renderCampo)}
          </div>
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
