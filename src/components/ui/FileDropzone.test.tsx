import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileDropzone } from './FileDropzone';

const PDF = { 'application/pdf': ['.pdf'] };

function makeFile(name: string, sizeBytes: number, type = 'application/pdf'): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe('FileDropzone — single', () => {
  it('renderiza label quando passada', () => {
    render(
      <FileDropzone
        mode="single"
        label="Capa aberta"
        accept={PDF}
        maxSize={1_000_000}
        value={null}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Capa aberta')).toBeInTheDocument();
  });

  it('mostra zona de drop com call-to-action quando value=null', () => {
    render(
      <FileDropzone
        mode="single"
        accept={PDF}
        maxSize={1_000_000}
        value={null}
        onChange={() => {}}
      />
    );
    expect(screen.getByText(/Arraste|clique/i)).toBeInTheDocument();
  });

  it('mostra chip com nome do arquivo quando value definido', () => {
    const file = makeFile('capa.pdf', 1000);
    render(
      <FileDropzone
        mode="single"
        accept={PDF}
        maxSize={1_000_000}
        value={file}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('capa.pdf')).toBeInTheDocument();
  });

  it('botão remover chama onChange(null)', () => {
    const file = makeFile('capa.pdf', 1000);
    const onChange = vi.fn();
    render(
      <FileDropzone
        mode="single"
        accept={PDF}
        maxSize={1_000_000}
        value={file}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByLabelText('Remover arquivo'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('mostra warning heurístico quando nome contém token oposto', () => {
    const file = makeFile('9786560991095_miolo_tecendo_prata.pdf', 1000);
    render(
      <FileDropzone
        mode="single"
        accept={PDF}
        maxSize={1_000_000}
        value={file}
        onChange={() => {}}
        expectedNameHint="capa"
      />
    );
    expect(screen.getByText(/miolo.*capa/i)).toBeInTheDocument();
  });

  it('não mostra warning quando nome bate com o hint', () => {
    const file = makeFile('capa_tecendo_prata.pdf', 1000);
    render(
      <FileDropzone
        mode="single"
        accept={PDF}
        maxSize={1_000_000}
        value={file}
        onChange={() => {}}
        expectedNameHint="capa"
      />
    );
    expect(screen.queryByText(/parece ser/i)).toBeNull();
  });

  it('mostra mensagem de erro quando errorMessage definido', () => {
    render(
      <FileDropzone
        mode="single"
        accept={PDF}
        maxSize={1_000_000}
        value={null}
        onChange={() => {}}
        errorMessage="Arquivo grande demais"
      />
    );
    expect(screen.getByText('Arquivo grande demais')).toBeInTheDocument();
  });

  it('mostra ícone "enviado" quando uploadStatus=done', () => {
    const file = makeFile('capa.pdf', 1000);
    render(
      <FileDropzone
        mode="single"
        accept={PDF}
        maxSize={1_000_000}
        value={file}
        onChange={() => {}}
        uploadStatus="done"
      />
    );
    expect(screen.getByLabelText('Enviado')).toBeInTheDocument();
  });
});

describe('FileDropzone — multiple', () => {
  it('mostra lista vazia inicial', () => {
    render(
      <FileDropzone
        mode="multiple"
        accept={PDF}
        maxSize={1_000_000}
        value={[]}
        onChange={() => {}}
      />
    );
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('renderiza cada arquivo da lista com botão remover', () => {
    const f1 = makeFile('a.pdf', 100);
    const f2 = makeFile('b.pdf', 200);
    render(
      <FileDropzone
        mode="multiple"
        accept={PDF}
        maxSize={1_000_000}
        value={[f1, f2]}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('a.pdf')).toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Remover arquivo')).toHaveLength(2);
  });

  it('botão remover chama onChange com a lista filtrada', () => {
    const f1 = makeFile('a.pdf', 100);
    const f2 = makeFile('b.pdf', 200);
    const onChange = vi.fn();
    render(
      <FileDropzone
        mode="multiple"
        accept={PDF}
        maxSize={1_000_000}
        value={[f1, f2]}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getAllByLabelText('Remover arquivo')[0]);
    expect(onChange).toHaveBeenCalledWith([f2]);
  });
});
