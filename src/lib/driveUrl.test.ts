import { describe, it, expect } from 'vitest'
import { detectDriveUrl } from './driveUrl'

describe('detectDriveUrl', () => {
  it('reconhece URL de arquivo /file/d/{id}', () => {
    expect(detectDriveUrl('https://drive.google.com/file/d/1ABCdef1234567890XYZuvwXYZuvw/view'))
      .toEqual({ kind: 'file', id: '1ABCdef1234567890XYZuvwXYZuvw' })
  })

  it('reconhece URL de arquivo com query string', () => {
    expect(detectDriveUrl('https://drive.google.com/file/d/1ABCdef1234567890XYZuvwXYZuvw/view?usp=sharing'))
      .toEqual({ kind: 'file', id: '1ABCdef1234567890XYZuvwXYZuvw' })
  })

  it('reconhece URL de pasta /drive/folders/{id}', () => {
    expect(detectDriveUrl('https://drive.google.com/drive/folders/1Ix0ii5GBCwGZEsLaMdxiAL1kvpFpHV08'))
      .toEqual({ kind: 'folder', id: '1Ix0ii5GBCwGZEsLaMdxiAL1kvpFpHV08' })
  })

  it('reconhece URL de pasta com query string', () => {
    expect(detectDriveUrl('https://drive.google.com/drive/folders/1Ix0ii5GBCwGZEsLaMdxiAL1kvpFpHV08?usp=sharing'))
      .toEqual({ kind: 'folder', id: '1Ix0ii5GBCwGZEsLaMdxiAL1kvpFpHV08' })
  })

  it('reconhece URL de pasta com user index /drive/u/0/folders/{id}', () => {
    expect(detectDriveUrl('https://drive.google.com/drive/u/0/folders/1Ix0ii5GBCwGZEsLaMdxiAL1kvpFpHV08'))
      .toEqual({ kind: 'folder', id: '1Ix0ii5GBCwGZEsLaMdxiAL1kvpFpHV08' })
  })

  it('retorna null pra URL não-Drive', () => {
    expect(detectDriveUrl('https://dropbox.com/foo/bar')).toBeNull()
  })

  it('retorna null pra string vazia', () => {
    expect(detectDriveUrl('')).toBeNull()
  })

  it('retorna null pra URL do Drive sem ID válido', () => {
    expect(detectDriveUrl('https://drive.google.com/drive/my-drive')).toBeNull()
  })
})
