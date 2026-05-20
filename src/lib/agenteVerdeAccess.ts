import { useAuth } from '../contexts/AuthContext'

export const AGENTE_VERDE_ALLOWED_EMAILS: string[] = [
  'bessalfs@gmail.com',
  'cristiane@altabooks.com.br',
  'anderson@altabooks.com.br',
  'gorki@altabooks.com.br',
]

export function hasAgenteVerdeAccess(email: string | null | undefined): boolean {
  if (!email) return false
  return AGENTE_VERDE_ALLOWED_EMAILS.includes(email.toLowerCase())
}

export function useAgenteVerdeAccess(): boolean {
  const { user } = useAuth()
  return hasAgenteVerdeAccess(user?.email)
}
