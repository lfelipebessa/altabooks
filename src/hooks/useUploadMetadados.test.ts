import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUploadMetadados } from './useUploadMetadados';

const { uploadMock, removeMock, insertMock, dispararMock } = vi.hoisted(() => ({
  uploadMock: vi.fn(),
  removeMock: vi.fn(),
  insertMock: vi.fn(),
  dispararMock: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    storage: { from: () => ({ upload: uploadMock, remove: removeMock }) },
    from: () => ({ insert: insertMock }),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }) },
  },
}));

vi.mock('../lib/metadadosWebhook', () => ({
  dispararGeracao: dispararMock,
}));

function file(name: string, size: number, type: string): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe('useUploadMetadados', () => {
  beforeEach(() => {
    uploadMock.mockReset();
    removeMock.mockReset();
    insertMock.mockReset();
    dispararMock.mockReset();
    insertMock.mockReturnValue(Promise.resolve({ error: null }));
    dispararMock.mockResolvedValue(undefined);
  });

  it('sucesso: sobe 3 arquivos, INSERT job, dispara webhook, retorna jobId', async () => {
    uploadMock.mockResolvedValue({ data: {}, error: null });

    const { result } = renderHook(() => useUploadMetadados());
    let jobId = '';

    await act(async () => {
      jobId = await result.current.upload({
        capa: file('capa.pdf', 100, 'application/pdf'),
        miolo: file('miolo.pdf', 200, 'application/pdf'),
        pcp: file('pcp.xlsx', 50, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      });
    });

    expect(jobId).toMatch(/^[0-9a-f-]{36}$/);
    expect(uploadMock).toHaveBeenCalledTimes(3);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: jobId,
        capa_path: `${jobId}/capa.pdf`,
        miolo_path: `${jobId}/miolo.pdf`,
        pcp_path: `${jobId}/pcp.xlsx`,
        status: 'aguardando',
        created_by: 'user-1',
      })
    );
    expect(dispararMock).toHaveBeenCalledWith(jobId);
  });

  it('falha no 3º upload: remove os 2 anteriores e lança', async () => {
    uploadMock
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } });

    const { result } = renderHook(() => useUploadMetadados());

    await act(async () => {
      await expect(result.current.upload({
        capa: file('capa.pdf', 100, 'application/pdf'),
        miolo: file('miolo.pdf', 200, 'application/pdf'),
        pcp: file('pcp.xlsx', 50, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      })).rejects.toThrow(/boom/);
    });

    expect(removeMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.stringMatching(/\/capa\.pdf$/),
      expect.stringMatching(/\/miolo\.pdf$/),
    ]));
    expect(insertMock).not.toHaveBeenCalled();
    expect(dispararMock).not.toHaveBeenCalled();
  });

  it('valida tamanho: rejeita capa > 30MB sem chamar upload', async () => {
    const { result } = renderHook(() => useUploadMetadados());

    await act(async () => {
      await expect(result.current.upload({
        capa: file('capa.pdf', 31 * 1024 * 1024, 'application/pdf'),
        miolo: file('miolo.pdf', 200, 'application/pdf'),
        pcp: file('pcp.xlsx', 50, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      })).rejects.toThrow(/Capa.*30/);
    });

    expect(uploadMock).not.toHaveBeenCalled();
  });
});
