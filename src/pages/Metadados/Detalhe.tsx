import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { PageLayout, LoadingState, ErrorState } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useMetadadosJob } from '../../hooks/useMetadadosJob';
import { dispararGeracao, regerarXlsx } from '../../lib/metadadosWebhook';
import { FormMetadados } from '../../components/Metadados/FormMetadados';
import { BotaoSalvarSticky } from '../../components/Metadados/BotaoSalvarSticky';
import { StatusBadgeMetadados } from '../../components/Metadados/StatusBadgeMetadados';
import type { MetadadosJSON } from '../../types/metadados';

function extrairOutroJobId(msg: string | undefined): string | null {
  if (!msg) return null;
  const m = msg.match(/job ([0-9a-f-]{36})/i);
  return m?.[1] ?? null;
}

export function MetadadosDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { job, loading, refetch } = useMetadadosJob(id);
  const [localJson, setLocalJson] = useState<MetadadosJSON | null>(null);
  const [dirty, setDirty] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    if (job?.metadados_json) {
      setLocalJson(job.metadados_json);
      setDirty(false);
    }
  }, [job?.metadados_json]);

  const errosPendentes = useMemo(
    () => (job?.alertas ?? []).filter(a => a.severidade === 'erro').length,
    [job?.alertas]
  );

  const avisosPendentes = useMemo(
    () => (job?.alertas ?? []).filter(a => a.severidade === 'aviso').length,
    [job?.alertas]
  );

  const minutosProcessando =
    job?.status === 'processando' ? (Date.now() - new Date(job.updated_at).getTime()) / 60000 : 0;
  const travado = minutosProcessando > 5;

  const salvar = useCallback(async () => {
    if (!id || !localJson) return;
    setSalvando(true);
    try {
      await supabase.from('metadados_jobs').update({ metadados_json: localJson }).eq('id', id);
      setDirty(false);
    } finally {
      setSalvando(false);
    }
  }, [id, localJson]);

  const baixar = useCallback(async () => {
    if (!id) return;
    setBaixando(true);
    try {
      if (dirty) await salvar();
      const url = await regerarXlsx(id);
      window.open(url, '_blank');
    } finally {
      setBaixando(false);
    }
  }, [id, dirty, salvar]);

  const tentarDeNovo = useCallback(async () => {
    if (!id) return;
    await supabase.from('metadados_jobs').update({ status: 'aguardando', erro_mensagem: null }).eq('id', id);
    await dispararGeracao(id);
    await refetch();
  }, [id, refetch]);

  const alertaDup = job?.alertas?.find(
    a => a.campo === 'dados_basicos.isbn' && a.mensagem.includes('outra geração')
  );
  const outroJobId = extrairOutroJobId(alertaDup?.mensagem);

  const apagarDuplicado = useCallback(async (outroId: string) => {
    const paths = [
      `${outroId}/capa.pdf`,
      `${outroId}/miolo.pdf`,
      `${outroId}/pcp.xlsx`,
      `${outroId}/bookinfo.xlsx`,
    ];
    await supabase.storage.from('metadados').remove(paths);
    await supabase.from('metadados_jobs').delete().eq('id', outroId);
    if (job) {
      const novosAlertas = (job.alertas || []).filter(
        a => !(a.campo === 'dados_basicos.isbn' && a.mensagem.includes('outra geração'))
      );
      await supabase.from('metadados_jobs').update({ alertas: novosAlertas }).eq('id', job.id);
    }
    await refetch();
  }, [job, refetch]);

  const manterAmbos = useCallback(async () => {
    if (!job) return;
    const novosAlertas = (job.alertas || []).filter(
      a => !(a.campo === 'dados_basicos.isbn' && a.mensagem.includes('outra geração'))
    );
    await supabase.from('metadados_jobs').update({ alertas: novosAlertas }).eq('id', job.id);
    await refetch();
  }, [job, refetch]);

  if (loading) {
    return <PageLayout><LoadingState /></PageLayout>;
  }
  if (!job) {
    return <PageLayout><ErrorState message="Job não encontrado." /></PageLayout>;
  }

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header sticky abaixo do TopBar */}
        <header className="sticky top-[80px] z-30 bg-white border-b border-gray-200 -mx-6 px-6 py-4 mb-4">
          <div className="max-w-5xl mx-auto flex items-start justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl font-bold text-brand-text-main">
                {job.titulo || 'Metadados em processamento'}
              </h1>
              {job.autor && <p className="text-sm text-gray-600">por {job.autor}</p>}
              {(errosPendentes > 0 || avisosPendentes > 0) && (
                <p className="text-sm text-yellow-700 mt-1">
                  {errosPendentes > 0 && <>{'⚠'} {errosPendentes} {errosPendentes === 1 ? 'erro' : 'erros'}</>}
                  {errosPendentes > 0 && avisosPendentes > 0 && ' · '}
                  {avisosPendentes > 0 && <>{avisosPendentes} {avisosPendentes === 1 ? 'aviso' : 'avisos'}</>}
                </p>
              )}
            </div>
            <StatusBadgeMetadados status={job.status} />
          </div>
        </header>

        <div className="space-y-4">
          {alertaDup && outroJobId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
              <p className="text-sm text-yellow-900">{alertaDup.mensagem}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => apagarDuplicado(outroJobId)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
                >
                  Apagar versão anterior
                </button>
                <button
                  onClick={manterAmbos}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white hover:bg-brand-bg-card"
                >
                  Manter ambos
                </button>
              </div>
            </div>
          )}

          {(job.status === 'aguardando' || job.status === 'processando') && (
            <LoadingState
              message={job.status === 'aguardando' ? 'Aguardando início do processamento…' : 'Extraindo metadados com o Gemini…'}
              action={
                travado ? (
                  <button
                    onClick={tentarDeNovo}
                    className="inline-flex items-center gap-2 text-sm text-blue-700 underline hover:text-blue-800"
                  >
                    <RefreshCw className="w-3 h-3" /> Job parece travado há mais de 5min. Reiniciar processamento.
                  </button>
                ) : undefined
              }
            />
          )}

          {job.status === 'erro' && (
            <ErrorState
              message={job.erro_mensagem || 'Falha ao gerar metadados'}
              onRetry={tentarDeNovo}
            />
          )}

          {job.status === 'pronto' && localJson && (
            <FormMetadados
              jsonInicial={localJson}
              alertas={job.alertas || []}
              onChange={(novo, isDirty) => { setLocalJson(novo); setDirty(isDirty); }}
            />
          )}
        </div>
      </div>

      {job.status === 'pronto' && (
        <BotaoSalvarSticky
          dirty={dirty}
          salvando={salvando}
          baixando={baixando}
          errosPendentes={errosPendentes}
          onSalvar={salvar}
          onBaixar={baixar}
        />
      )}
    </PageLayout>
  );
}
