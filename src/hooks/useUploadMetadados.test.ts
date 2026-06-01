import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUploadMetadados } from './useUploadMetadados';

const { uploadMock, removeMock, insertMock, deleteEqMock, deleteMock, dispararMock } = vi.hoisted(() => {
  const deleteEq = vi.fn().mockResolvedValue({ error: null });
  return {
    uploadMock: vi.fn(),
    removeMock: vi.fn().mockResolvedValue({ data: null, error: null }),
    insertMock: vi.fn(),
    deleteEqMock: deleteEq,
    deleteMock: vi.fn(() => ({ eq: deleteEq })),
    dispararMock: vi.fn(),
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    storage: { from: () => ({ upload: uploadMock, remove: removeMock }) },
    from: () => ({ insert: insertMock, delete: deleteMock }),
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
    removeMock.mockReset().mockResolvedValue({ data: null, error: null });
    insertMock.mockReset().mockReturnValue(Promise.resolve({ error: null }));
    deleteEqMock.mockReset().mockResolvedValue({ error: null });
    deleteMock.mockClear();
    dispararMock.mockReset().mockResolvedValue(undefined);
  });

  it('sucesso: INSERT job, sobe 3 arquivos, dispara webhook, retorna jobId', async () => {
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
    expect(uploadMock).toHaveBeenCalledTimes(3);
    expect(dispararMock).toHaveBeenCalledWith(jobId);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('PCP em .docx: preserva extensão no pcp_path e no upload', async () => {
    uploadMock.mockResolvedValue({ data: {}, error: null });

    const { result } = renderHook(() => useUploadMetadados());
    let jobId = '';

    await act(async () => {
      jobId = await result.current.upload({
        capa: file('capa.pdf', 100, 'application/pdf'),
        miolo: file('miolo.pdf', 200, 'application/pdf'),
        pcp: file('DadosTecnicos.docx', 50, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      });
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ pcp_path: `${jobId}/pcp.docx` })
    );
    expect(uploadMock).toHaveBeenCalledWith(
      `${jobId}/pcp.docx`,
      expect.any(File),
      expect.anything()
    );
  });

  it('falha no 3º upload: remove arquivos já enviados, deleta job, lança', async () => {
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

    expect(insertMock).toHaveBeenCalled();
    expect(removeMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.stringMatching(/\/capa\.pdf$/),
      expect.stringMatching(/\/miolo\.pdf$/),
    ]));
    expect(deleteMock).toHaveBeenCalled();
    expect(deleteEqMock).toHaveBeenCalledWith('id', expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(dispararMock).not.toHaveBeenCalled();
  });

  it('rejeita arquivo vazio (0 byte) sem tocar no banco', async () => {
    const { result } = renderHook(() => useUploadMetadados());

    await act(async () => {
      await expect(result.current.upload({
        capa: file('capa.pdf', 100, 'application/pdf'),
        miolo: file('miolo.pdf', 200, 'application/pdf'),
        pcp: file('pcp.docx', 0, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      })).rejects.toThrow(/vazio ou corrompido.*PCP/);
    });

    expect(insertMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('valida tamanho: rejeita capa > 30MB sem tocar no banco', async () => {
    const { result } = renderHook(() => useUploadMetadados());

    await act(async () => {
      await expect(result.current.upload({
        capa: file('capa.pdf', 31 * 1024 * 1024, 'application/pdf'),
        miolo: file('miolo.pdf', 200, 'application/pdf'),
        pcp: file('pcp.xlsx', 50, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      })).rejects.toThrow(/Capa.*30/);
    });

    expect(insertMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
