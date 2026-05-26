import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { TopBar } from '../../components/TopBar';
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

  if (loading) return <div className="min-h-screen"><TopBar /><div className="pt-[96px] p-6">Carregando…</div></div>;
  if (!job) return <div className="min-h-screen"><TopBar /><div className="pt-[96px] p-6">Job não encontrado.</div></div>;

  return (
    <div className="min-h-screen bg-brand-bg-section flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-[96px] pb-6 space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-serif text-brand-text-main">{job.titulo || 'Metadados em processamento'}</h1>
            {job.autor && <p className="text-sm text-brand-text-body">por {job.autor}</p>}
          </div>
          <StatusBadgeMetadados status={job.status} />
        </header>

        {alertaDup && outroJobId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 space-y-2">
            <p className="text-sm text-yellow-900">{alertaDup.mensagem}</p>
            <div className="flex gap-2">
              <button
                onClick={() => apagarDuplicado(outroJobId)}
                className="px-3 py-1.5 text-sm rounded bg-red-600 text-white"
              >
                Apagar versão anterior
              </button>
              <button
                onClick={manterAmbos}
                className="px-3 py-1.5 text-sm rounded border bg-white"
              >
                Manter ambos
              </button>
            </div>
          </div>
        )}

        {(job.status === 'aguardando' || job.status === 'processando') && (
          <div className="bg-white border rounded p-6 text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-sm text-gray-600">
              {job.status === 'aguardando' ? 'Aguardando início do processamento…' : 'Extraindo metadados com o Gemini…'}
            </p>
            {travado && (
              <button onClick={tentarDeNovo} className="inline-flex items-center gap-2 text-sm text-blue-700 underline">
                <RefreshCw className="w-3 h-3" /> Job parece travado há mais de 5min. Reiniciar processamento.
              </button>
            )}
          </div>
        )}

        {job.status === 'erro' && (
          <div className="bg-red-50 border border-red-200 rounded p-4 space-y-2">
            <p className="text-sm text-red-800 font-medium">Falha ao gerar metadados</p>
            {job.erro_mensagem && <p className="text-sm text-red-700">{job.erro_mensagem}</p>}
            <button onClick={tentarDeNovo} className="px-3 py-1.5 rounded bg-red-600 text-white text-sm">
              Tentar de novo
            </button>
          </div>
        )}

        {job.status === 'pronto' && localJson && (
          <FormMetadados
            jsonInicial={localJson}
            alertas={job.alertas || []}
            onChange={(novo, isDirty) => { setLocalJson(novo); setDirty(isDirty); }}
          />
        )}
      </main>

      {job.status === 'pronto' && (
        <BotaoSalvarSticky dirty={dirty} salvando={salvando} baixando={baixando} onSalvar={salvar} onBaixar={baixar} />
      )}
    </div>
  );
}
