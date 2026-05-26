import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { MetadadosJob } from '../types/metadados';

interface State {
  job: MetadadosJob | null;
  loading: boolean;
  error: string | null;
}

export function useMetadadosJob(jobId: string | undefined): State & { refetch: () => Promise<void> } {
  const [state, setState] = useState<State>({ job: null, loading: true, error: null });

  const fetchJob = async () => {
    if (!jobId) return;
    const { data, error } = await supabase
      .from('metadados_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    if (error) {
      setState({ job: null, loading: false, error: error.message });
    } else {
      setState({ job: data as MetadadosJob, loading: false, error: null });
    }
  };

  useEffect(() => {
    if (!jobId) {
      setState({ job: null, loading: false, error: null });
      return;
    }
    setState(s => ({ ...s, loading: true }));
    fetchJob();

    const channel = supabase
      .channel(`metadados_job:${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'metadados_jobs', filter: `id=eq.${jobId}` },
        () => { fetchJob(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  return { ...state, refetch: fetchJob };
}
