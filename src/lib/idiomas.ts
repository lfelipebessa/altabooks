export interface IdiomaOption {
  code: string
  label: string
}

export const IDIOMAS_TRADUCAO: IdiomaOption[] = [
  { code: 'EN-US', label: 'Inglês (EUA)' },
  { code: 'EN-GB', label: 'Inglês (Reino Unido)' },
  { code: 'ES',    label: 'Espanhol' },
  { code: 'FR',    label: 'Francês' },
  { code: 'DE',    label: 'Alemão' },
  { code: 'IT',    label: 'Italiano' },
  { code: 'JA',    label: 'Japonês' },
]

const LABELS_LEGADOS: Record<string, string> = {
  en: 'Inglês',
  es: 'Espanhol',
  fr: 'Francês',
  de: 'Alemão',
  it: 'Italiano',
  ja: 'Japonês',
}

export function labelIdioma(code: string): string {
  const novo = IDIOMAS_TRADUCAO.find(i => i.code === code)
  if (novo) return novo.label
  return LABELS_LEGADOS[code.toLowerCase()] ?? code
}
