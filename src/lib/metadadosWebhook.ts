const BASE = 'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/metadados';

async function postJson(path: string, body: unknown): Promise<unknown> {
  const resp = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`Webhook ${path} respondeu ${resp.status}`);
  }
  const text = await resp.text();
  return text ? JSON.parse(text) : {};
}

export async function dispararGeracao(jobId: string): Promise<void> {
  await postJson('gerar', { job_id: jobId });
}

export async function regerarXlsx(jobId: string): Promise<string> {
  const r = await postJson('regerar-xlsx', { job_id: jobId }) as { url?: string };
  if (!r.url) throw new Error('Webhook regerar-xlsx não retornou url');
  return r.url;
}
