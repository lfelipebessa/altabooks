import React from 'react'
import { Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { useAgenteVerdeAccess } from '../lib/agenteVerdeAccess'

export const AgenteVerdeRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hasAccess = useAgenteVerdeAccess()
  return (
    <ProtectedRoute>
      {hasAccess ? <>{children}</> : <Navigate to="/" replace />}
    </ProtectedRoute>
  )
}
