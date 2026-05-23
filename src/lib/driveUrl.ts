export type DriveUrlKind = 'file' | 'folder'

export interface DriveUrlMatch {
  kind: DriveUrlKind
  id: string
}

const FILE_RE = /\/file\/d\/([-\w]{20,})/
const FOLDER_RE = /\/drive\/(?:u\/\d+\/)?folders\/([-\w]{20,})/

export function detectDriveUrl(url: string): DriveUrlMatch | null {
  if (!url) return null
  const folder = url.match(FOLDER_RE)
  if (folder) return { kind: 'folder', id: folder[1] }
  const file = url.match(FILE_RE)
  if (file) return { kind: 'file', id: file[1] }
  return null
}
