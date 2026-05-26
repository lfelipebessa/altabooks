import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispararGeracao, regerarXlsx } from './metadadosWebhook';

describe('metadadosWebhook', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('dispararGeracao posta job_id no endpoint /gerar', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await dispararGeracao('job-1');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://primary-production-bd3cf.up.railway.app/webhook/ghostwriter/metadados/gerar',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: 'job-1' }),
      })
    );
  });

  it('dispararGeracao lança se resposta não-ok', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response('boom', { status: 500 }));
    await expect(dispararGeracao('job-1')).rejects.toThrow(/500/);
  });

  it('regerarXlsx retorna a url da resposta', async () => {
    const url = 'https://example.com/file.xlsx?token=abc';
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ url }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    await expect(regerarXlsx('job-2')).resolves.toBe(url);
  });

  it('regerarXlsx lança se url não vier no body', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    );
    await expect(regerarXlsx('job-2')).rejects.toThrow(/url/);
  });
});
