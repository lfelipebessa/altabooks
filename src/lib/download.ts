export function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function filename(
  projetoNome: string,
  kind: string,
  ext: 'docx' | 'pdf',
  date: Date = new Date(),
): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${slug(projetoNome)}-${kind}-${yyyy}${mm}${dd}.${ext}`
}

const wrapDocxHtml = (html: string): string => `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Calibri, sans-serif; font-size: 12pt; line-height: 1.5; }
      h1 { font-size: 18pt; } h2 { font-size: 14pt; } h3 { font-size: 13pt; }
    </style>
  </head>
  <body>${html}</body>
</html>`

export function downloadDocx(html: string, filenameFull: string): void {
  const blob = new Blob(['﻿', wrapDocxHtml(html)], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filenameFull
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

export async function downloadPdf(html: string, filenameFull: string): Promise<void> {
  const [pdfMakeMod, vfsModule, htmlToPdfmakeMod] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
    import('html-to-pdfmake'),
  ])

  type PdfMakeLib = {
    addVirtualFileSystem: (vfs: Record<string, string>) => void
    createPdf: (def: unknown) => { download: (name: string) => Promise<void> }
  }
  type HtmlToPdfmakeFn = (html: string, options?: { window?: unknown }) => unknown

  const pdfMake = ((pdfMakeMod as { default?: PdfMakeLib }).default ?? pdfMakeMod) as PdfMakeLib
  const htmlToPdfmake = ((htmlToPdfmakeMod as { default?: HtmlToPdfmakeFn }).default ?? htmlToPdfmakeMod) as HtmlToPdfmakeFn

  const vfs = (vfsModule as unknown as { default?: Record<string, string> }).default ?? (vfsModule as unknown as Record<string, string>)
  pdfMake.addVirtualFileSystem(vfs)

  const content = htmlToPdfmake(html, { window })

  const docDefinition = {
    content,
    pageMargins: [60, 60, 60, 60] as [number, number, number, number],
    defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.4 },
  }

  await pdfMake.createPdf(docDefinition).download(filenameFull)
}

