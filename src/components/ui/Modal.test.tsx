import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('não renderiza quando open=false', () => {
    render(<Modal open={false} onClose={() => {}} title="Título">corpo</Modal>);
    expect(screen.queryByText('Título')).toBeNull();
  });

  it('renderiza title e children quando open=true', () => {
    render(<Modal open onClose={() => {}} title="Título">corpo</Modal>);
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('corpo')).toBeInTheDocument();
  });

  it('renderiza footer slot quando passado', () => {
    render(
      <Modal open onClose={() => {}} title="T" footer={<button>OK</button>}>
        corpo
      </Modal>
    );
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });

  it('ESC chama onClose quando não disabled', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="T">corpo</Modal>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ESC não chama onClose quando disabled', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="T" disabled>corpo</Modal>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('click no backdrop chama onClose quando não disabled', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="T">corpo</Modal>);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('click no backdrop não chama onClose quando disabled', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="T" disabled>corpo</Modal>);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('click no container não propaga pro backdrop', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="T">corpo</Modal>);
    fireEvent.click(screen.getByTestId('modal-container'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('botão X chama onClose quando não disabled', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="T">corpo</Modal>);
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
