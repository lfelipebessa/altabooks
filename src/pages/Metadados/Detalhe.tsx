import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { RefreshCw, ChevronRight, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { PageLayout, LoadingState, ErrorState } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useMetadadosJob } from '../../hooks/useMetadadosJob';
import { dispararGeracao, regerarXlsx } from '../../lib/metadadosWebhook';
import { FormMetadados } from '../../components/Metadados/FormMetadados';
import { BotaoSalvarSticky } from '../../components/Metadados/BotaoSalvarSticky';
import { StatusBadgeMetadados } from '../../components/Metadados/StatusBadgeMetadados';
import { SECOES } from '../../lib/metadadosCampos';
import type { MetadadosJSON, AlertaMetadados } from '../../types/metadados';

function extrairOutroJobId(msg: string | undefined): string | null {
  if (!msg) return null;
  const m = msg.match(/job ([0-9a-f-]{36})/i);
  return m?.[1] ?? null;
}

const PATHS_CONHECIDOS = new Set<string>(
  SECOES.flatMap(s => s.campos.map(c => c.path))
);

const GRUPO_LABEL: Record<string, string> = {
  pcp: 'PCP',
  dados_basicos: 'Dados básicos',
  dados_editoriais: 'Dados editoriais',
  textos: 'Textos',
  relacionadas: 'Relacionadas',
};

function ehAlertaIsbnDuplicado(a: AlertaMetadados): boolean {
  return a.campo === 'dados_basicos.isbn' && a.mensagem.includes('outra geração');
}

function ehAlertaCobertoPeloForm(a: AlertaMetadados): boolean {
  if (PATHS_CONHECIDOS.has(a.campo)) return true;
  // sub-paths de arrays (ex.: "dados_editoriais.bisac[0]") são cobertos
  // pelo input do array pai (ex.: "dados_editoriais.bisac")
  const pathBase = a.campo.replace(/\[\d+\]$/, '');
  return pathBase !== a.campo && PATHS_CONHECIDOS.has(pathBase);
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

  const alertasOrfaosPorGrupo = useMemo(() => {
    const orfaos = (job?.alertas ?? []).filter(
      a => !ehAlertaIsbnDuplicado(a) && !ehAlertaCobertoPeloForm(a)
    );
    const grupos: Record<string, AlertaMetadados[]> = {};
    for (const a of orfaos) {
      const chave = a.campo.split('.')[0] || 'outros';
      (grupos[chave] ??= []).push(a);
    }
    return grupos;
  }, [job?.alertas]);

  const totalOrfaos = useMemo(
    () => Object.values(alertasOrfaosPorGrupo).reduce((acc, arr) => acc + arr.length, 0),
    [alertasOrfaosPorGrupo]
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
    // pcp_path pode ser .xlsx ou .docx — busca o real do outro job pra não deixar órfão
    const { data: outro } = await supabase
      .from('metadados_jobs')
      .select('pcp_path')
      .eq('id', outroId)
      .maybeSingle();
    const paths = [
      `${outroId}/capa.pdf`,
      `${outroId}/miolo.pdf`,
      outro?.pcp_path ?? `${outroId}/pcp.xlsx`,
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
        {/* Header normal (rola junto com a página); Tabs.List que fica sticky */}
        <header className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl font-bold text-brand-text-main">
                {job.titulo || 'Metadados em processamento'}
              </h1>
              {job.autor && <p className="text-sm text-gray-600">por {job.autor}</p>}
              {(errosPendentes > 0 || avisosPendentes > 0) && (
                <p className="text-sm mt-1">
                  {errosPendentes > 0 && (
                    <span className="text-red-700">
                      {'⚠'} {errosPendentes} {errosPendentes === 1 ? 'erro' : 'erros'}
                    </span>
                  )}
                  {errosPendentes > 0 && avisosPendentes > 0 && <span className="text-gray-400"> · </span>}
                  {avisosPendentes > 0 && (
                    <span className="text-yellow-700">
                      {avisosPendentes} {avisosPendentes === 1 ? 'aviso' : 'avisos'}
                    </span>
                  )}
                </p>
              )}
            </div>
            <StatusBadgeMetadados status={job.status} />
          </div>
        </header>

        <div className="space-y-4 pb-24">
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

          {totalOrfaos > 0 && (
            <details className="group bg-white border border-gray-200 rounded-lg overflow-hidden">
              <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-2 text-sm font-medium text-brand-text-main hover:bg-brand-bg-card/40">
                <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
                Outros alertas
                <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                  {totalOrfaos}
                </span>
                <span className="text-xs font-normal text-gray-500 ml-1">
                  · não estão ligados a nenhum campo do formulário
                </span>
              </summary>
              <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-100">
                {Object.entries(alertasOrfaosPorGrupo).map(([grupo, alertas]) => (
                  <div key={grupo}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">
                      {GRUPO_LABEL[grupo] ?? grupo} ({alertas.length})
                    </p>
                    <ul className="space-y-1.5">
                      {alertas.map((a, i) => {
                        const Icon = a.severidade === 'erro' ? AlertCircle : a.severidade === 'aviso' ? AlertTriangle : Info;
                        const cor = a.severidade === 'erro' ? 'text-red-600' : a.severidade === 'aviso' ? 'text-yellow-700' : 'text-blue-700';
                        return (
                          <li key={`${a.campo}-${i}`} className="text-sm flex items-start gap-2">
                            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cor}`} />
                            <span className="text-gray-700">{a.mensagem}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
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
