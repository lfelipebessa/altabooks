import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from './Tabs';

function ExemploTabs({ value = 'a', onValueChange = () => {} }: {
  value?: string;
  onValueChange?: (v: string) => void;
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <Tabs.List>
        <Tabs.Trigger value="a">A</Tabs.Trigger>
        <Tabs.Trigger value="b">B</Tabs.Trigger>
        <Tabs.Trigger value="c">C</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Panel value="a">Panel A</Tabs.Panel>
      <Tabs.Panel value="b">Panel B</Tabs.Panel>
      <Tabs.Panel value="c">Panel C</Tabs.Panel>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('renderiza só o panel ativo', () => {
    render(<ExemploTabs value="b" />);
    expect(screen.getByText('Panel B')).toBeInTheDocument();
    expect(screen.queryByText('Panel A')).toBeNull();
    expect(screen.queryByText('Panel C')).toBeNull();
  });

  it('trigger ativo tem aria-selected=true', () => {
    render(<ExemploTabs value="b" />);
    expect(screen.getByRole('tab', { name: 'A' }).getAttribute('aria-selected')).toBe('false');
    expect(screen.getByRole('tab', { name: 'B' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'C' }).getAttribute('aria-selected')).toBe('false');
  });

  it('click no trigger chama onValueChange', () => {
    const onValueChange = vi.fn();
    render(<ExemploTabs value="a" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'B' }));
    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('Arrow Right move pro próximo (circular)', () => {
    const onValueChange = vi.fn();
    render(<ExemploTabs value="a" onValueChange={onValueChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'A' }), { key: 'ArrowRight' });
    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('Arrow Right no último volta pro primeiro', () => {
    const onValueChange = vi.fn();
    render(<ExemploTabs value="c" onValueChange={onValueChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'C' }), { key: 'ArrowRight' });
    expect(onValueChange).toHaveBeenCalledWith('a');
  });

  it('Arrow Left move pro anterior (circular)', () => {
    const onValueChange = vi.fn();
    render(<ExemploTabs value="b" onValueChange={onValueChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'B' }), { key: 'ArrowLeft' });
    expect(onValueChange).toHaveBeenCalledWith('a');
  });

  it('Arrow Left no primeiro vai pro último', () => {
    const onValueChange = vi.fn();
    render(<ExemploTabs value="a" onValueChange={onValueChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'A' }), { key: 'ArrowLeft' });
    expect(onValueChange).toHaveBeenCalledWith('c');
  });

  it('Home vai pro primeiro', () => {
    const onValueChange = vi.fn();
    render(<ExemploTabs value="c" onValueChange={onValueChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'C' }), { key: 'Home' });
    expect(onValueChange).toHaveBeenCalledWith('a');
  });

  it('End vai pro último', () => {
    const onValueChange = vi.fn();
    render(<ExemploTabs value="a" onValueChange={onValueChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'A' }), { key: 'End' });
    expect(onValueChange).toHaveBeenCalledWith('c');
  });

  it('Arrow Right move foco pro novo trigger', () => {
    render(<ExemploTabs value="a" onValueChange={() => {}} />);
    const triggerA = screen.getByRole('tab', { name: 'A' });
    const triggerB = screen.getByRole('tab', { name: 'B' });
    triggerA.focus();
    fireEvent.keyDown(triggerA, { key: 'ArrowRight' });
    expect(triggerB).toHaveFocus();
  });

  it('tablist tem role correto', () => {
    render(<ExemploTabs />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('panel ativo tem aria-labelledby apontando pro trigger', () => {
    render(<ExemploTabs value="b" />);
    const trigger = screen.getByRole('tab', { name: 'B' });
    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(trigger.getAttribute('id'));
  });
});
