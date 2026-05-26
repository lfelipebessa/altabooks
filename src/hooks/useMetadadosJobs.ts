import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { MetadadosJob } from '../types/metadados';

export function useMetadadosJobs() {
  const [jobs, setJobs] = useState<MetadadosJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    const { data, error } = await supabase
      .from('metadados_jobs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setJobs((data || []) as MetadadosJob[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('metadados_jobs:list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metadados_jobs' }, () => { fetchAll(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { jobs, loading, error, refetch: fetchAll };
}
