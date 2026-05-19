import type { Projeto, Sumario, SumarioAbordagem, CapituloLivro, Traducao, CapituloTraducao } from '../types'
import { labelIdioma } from './idiomas'

export function buildExecutivoHtml(projeto: Projeto): string {
  const conteudo = projeto.conteudo_executivo ?? ''
  return `<h1>${escapeHtml(projeto.nome_projeto)}</h1>
<p><em>por ${escapeHtml(projeto.autor_nome)}</em></p>
${conteudo}`
}

const ABORDAGEM_LABEL: Record<SumarioAbordagem, string> = {
  cronologica: 'Cronológica',
  tematica: 'Temática',
  narrativa: 'Narrativa',
}

export function buildSumarioHtml(sumario: Sumario, projeto: Projeto): string {
  const abordagemLabel = ABORDAGEM_LABEL[sumario.abordagem] ?? sumario.abordagem
  const capitulosHtml = (sumario.capitulos ?? [])
    .map(cap => {
      const subassuntosHtml = cap.subassuntos && cap.subassuntos.length > 0
        ? `<ul>${cap.subassuntos.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
        : ''
      return `<h2>Capítulo ${cap.numero}: ${escapeHtml(cap.titulo)}</h2>
<p>${escapeHtml(cap.descricao)}</p>
${subassuntosHtml}`
    })
    .join('\n')

  return `<h1>${escapeHtml(projeto.nome_projeto)}</h1>
<h2>Sumário — Opção ${sumario.opcao} (${abordagemLabel})</h2>
${sumario.titulo_sumario ? `<h3>${escapeHtml(sumario.titulo_sumario)}</h3>` : ''}
${capitulosHtml}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toHtml(text: string): string {
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  return text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('')
}

export function buildLivroHtml(projeto: Projeto, capitulos: CapituloLivro[]): string {
  const ordenados = [...capitulos].sort((a, b) => a.numero - b.numero)
  const capsHtml = ordenados
    .map(cap => `<h1 style="page-break-before:always">Capítulo ${cap.numero}<br/>${escapeHtml(cap.titulo)}</h1>
${toHtml(cap.conteudo)}`)
    .join('\n')

  return `<h1 style="text-align:center">${escapeHtml(projeto.nome_projeto)}</h1>
<p style="text-align:center"><em>por ${escapeHtml(projeto.autor_nome)}</em></p>
${capsHtml}`
}

export function buildTraducaoHtml(
  projeto: Projeto,
  traducao: Traducao,
  capitulos: CapituloTraducao[],
): string {
  const ordenados = [...capitulos].sort((a, b) => a.numero - b.numero)
  const capsHtml = ordenados
    .map(cap => `<h1 style="page-break-before:always">Capítulo ${cap.numero}<br/>${escapeHtml(cap.titulo)}</h1>
${toHtml(cap.conteudo)}`)
    .join('\n')

  return `<h1 style="text-align:center">${escapeHtml(projeto.nome_projeto)}</h1>
<p style="text-align:center"><em>por ${escapeHtml(projeto.autor_nome)} — Tradução: ${escapeHtml(labelIdioma(traducao.idioma))}</em></p>
${capsHtml}`
}
