import { useState, useEffect } from 'react';
import type { MetadadosJSON, AlertaMetadados } from '../../types/metadados';
import { setByPath } from '../../lib/metadadosFlatten';
import {
  CAMPOS_DADOS_BASICOS,
  CAMPOS_DADOS_EDITORIAIS,
  CAMPOS_TEXTOS,
  CAMPOS_RELACIONADAS,
  type DefinicaoCampo,
} from '../../lib/metadadosCampos';
import { CampoComAlerta } from './CampoComAlerta';
import { SecaoColapsavel } from './SecaoColapsavel';

interface Props {
  jsonInicial: MetadadosJSON;
  alertas: AlertaMetadados[];
  onChange: (json: MetadadosJSON, dirty: boolean) => void;
}

export function FormMetadados({ jsonInicial, alertas, onChange }: Props) {
  const [local, setLocal] = useState<MetadadosJSON>(jsonInicial);

  useEffect(() => {
    setLocal(jsonInicial);
  }, [jsonInicial]);

  const handleField = (path: string, valor: unknown) => {
    const novo = setByPath(local as unknown as Record<string, unknown>, path, valor) as unknown as MetadadosJSON;
    setLocal(novo);
    onChange(novo, true);
  };

  const renderCampos = (lista: DefinicaoCampo[]) =>
    lista.map(campo => (
      <CampoComAlerta
        key={campo.path}
        campo={campo}
        json={local}
        alertas={alertas}
        onChange={handleField}
      />
    ));

  return (
    <div className="space-y-4">
      <SecaoColapsavel titulo="Dados básicos">{renderCampos(CAMPOS_DADOS_BASICOS)}</SecaoColapsavel>
      <SecaoColapsavel titulo="Dados editoriais">{renderCampos(CAMPOS_DADOS_EDITORIAIS)}</SecaoColapsavel>
      <SecaoColapsavel titulo="Textos">{renderCampos(CAMPOS_TEXTOS)}</SecaoColapsavel>
      <SecaoColapsavel titulo="Relacionadas">{renderCampos(CAMPOS_RELACIONADAS)}</SecaoColapsavel>
    </div>
  );
}
