import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { dispararGeracao } from '../lib/metadadosWebhook';

const LIMITES = {
  capa: 30 * 1024 * 1024,
  miolo: 80 * 1024 * 1024,
  pcp: 5 * 1024 * 1024,
};

export interface UploadInput {
  capa: File;
  miolo: File;
  pcp: File;
}

export function useUploadMetadados() {
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState({ capa: false, miolo: false, pcp: false });

  const upload = useCallback(async (input: UploadInput): Promise<string> => {
    if (input.capa.size > LIMITES.capa) throw new Error(`Capa excede ${LIMITES.capa / (1024 * 1024)} MB`);
    if (input.miolo.size > LIMITES.miolo) throw new Error(`Miolo excede ${LIMITES.miolo / (1024 * 1024)} MB`);
    if (input.pcp.size > LIMITES.pcp) throw new Error(`PCP excede ${LIMITES.pcp / (1024 * 1024)} MB`);

    setLoading(true);
    setProgresso({ capa: false, miolo: false, pcp: false });

    const jobId = crypto.randomUUID();
    const uploaded: string[] = [];

    try {
      const passos: Array<['capa' | 'miolo' | 'pcp', File]> = [
        ['capa', input.capa],
        ['miolo', input.miolo],
        ['pcp', input.pcp],
      ];

      for (const [slot, f] of passos) {
        const ext = slot === 'pcp' ? 'xlsx' : 'pdf';
        const path = `${jobId}/${slot}.${ext}`;
        const { error } = await supabase.storage.from('metadados').upload(path, f, { upsert: false });
        if (error) throw new Error(error.message);
        uploaded.push(path);
        setProgresso(p => ({ ...p, [slot]: true }));
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { error: insertError } = await supabase.from('metadados_jobs').insert({
        id: jobId,
        capa_path: `${jobId}/capa.pdf`,
        miolo_path: `${jobId}/miolo.pdf`,
        pcp_path: `${jobId}/pcp.xlsx`,
        status: 'aguardando',
        created_by: userId,
      });
      if (insertError) throw new Error(insertError.message);

      await dispararGeracao(jobId);
      return jobId;
    } catch (err) {
      if (uploaded.length > 0) {
        await supabase.storage.from('metadados').remove(uploaded);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { upload, loading, progresso };
}
