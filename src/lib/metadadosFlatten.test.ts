import { describe, it, expect } from 'vitest';
import { getByPath, setByPath } from './metadadosFlatten';

describe('getByPath', () => {
  const obj = {
    dados_basicos: { titulo: 'X', coautores: ['A', 'B'] },
    dados_editoriais: { dimensoes_cm: { largura: 14 } },
  };

  it('lê path simples', () => {
    expect(getByPath(obj, 'dados_basicos.titulo')).toBe('X');
  });

  it('lê path aninhado', () => {
    expect(getByPath(obj, 'dados_editoriais.dimensoes_cm.largura')).toBe(14);
  });

  it('retorna undefined para path inexistente', () => {
    expect(getByPath(obj, 'dados_basicos.nao_existe')).toBeUndefined();
  });

  it('retorna undefined para objeto null no meio do path', () => {
    expect(getByPath({ a: null }, 'a.b')).toBeUndefined();
  });

  it('lê array inteiro', () => {
    expect(getByPath(obj, 'dados_basicos.coautores')).toEqual(['A', 'B']);
  });
});

describe('setByPath', () => {
  it('seta valor primitivo em path simples retornando nova ref', () => {
    const obj = { dados_basicos: { titulo: 'X' } };
    const r = setByPath(obj, 'dados_basicos.titulo', 'Y');
    expect(r).not.toBe(obj);
    expect(r.dados_basicos).not.toBe(obj.dados_basicos);
    expect(r.dados_basicos.titulo).toBe('Y');
    expect(obj.dados_basicos.titulo).toBe('X');
  });

  it('seta valor em path aninhado', () => {
    const obj = { a: { b: { c: 1 } } };
    const r = setByPath(obj, 'a.b.c', 99);
    expect(r.a.b.c).toBe(99);
    expect(obj.a.b.c).toBe(1);
  });

  it('cria estrutura intermediária se faltar', () => {
    const obj = { a: {} };
    const r = setByPath(obj, 'a.b.c', 5);
    expect((r.a as Record<string, unknown>).b).toBeDefined();
    expect(((r.a as Record<string, unknown>).b as Record<string, unknown>).c).toBe(5);
  });

  it('seta array', () => {
    const obj = { a: { b: [1, 2] } };
    const r = setByPath(obj, 'a.b', [3, 4, 5]);
    expect(r.a.b).toEqual([3, 4, 5]);
  });
});
