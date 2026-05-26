export function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

export function setByPath<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const last = keys.pop();
  if (!last) return obj;

  const clone = { ...obj } as Record<string, unknown>;
  let cursor: Record<string, unknown> = clone;
  for (const k of keys) {
    const next = cursor[k];
    const nextClone: Record<string, unknown> =
      next && typeof next === 'object' && !Array.isArray(next) ? { ...(next as Record<string, unknown>) } : {};
    cursor[k] = nextClone;
    cursor = nextClone;
  }
  cursor[last] = value;
  return clone as T;
}
