import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field } from './Field';

describe('Field', () => {
  it('renderiza label', () => {
    render(<Field label="Título"><input /></Field>);
    expect(screen.getByText('Título')).toBeInTheDocument();
  });

  it('associa htmlFor ao input filho via id', () => {
    render(
      <Field label="Título" htmlFor="titulo-input">
        <input id="titulo-input" />
      </Field>
    );
    const label = screen.getByText('Título');
    expect(label.getAttribute('for')).toBe('titulo-input');
  });

  it('renderiza description quando passada', () => {
    render(<Field label="X" description="exemplo: abc"><input /></Field>);
    expect(screen.getByText('exemplo: abc')).toBeInTheDocument();
  });

  it('renderiza alerta info com ícone azul', () => {
    render(
      <Field
        label="X"
        alerts={[{ severidade: 'info', mensagem: 'Sugestão.' }]}
      >
        <input />
      </Field>
    );
    expect(screen.getByText('Sugestão.')).toBeInTheDocument();
  });

  it('renderiza múltiplos alertas com severidades diferentes', () => {
    render(
      <Field
        label="X"
        alerts={[
          { severidade: 'info', mensagem: 'A.' },
          { severidade: 'aviso', mensagem: 'B.' },
          { severidade: 'erro', mensagem: 'C.' },
        ]}
      >
        <input />
      </Field>
    );
    expect(screen.getByText('A.')).toBeInTheDocument();
    expect(screen.getByText('B.')).toBeInTheDocument();
    expect(screen.getByText('C.')).toBeInTheDocument();
  });

  it('não renderiza bloco de alertas quando array vazio', () => {
    const { container } = render(<Field label="X" alerts={[]}><input /></Field>);
    expect(container.querySelector('svg.lucide-info')).toBeNull();
  });
});
