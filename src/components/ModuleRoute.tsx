import React from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { ProtectedRoute } from './ProtectedRoute'
import { useUserModules } from '../lib/permissions'

interface ModuleRouteProps {
  slug: string
  children: React.ReactNode
}

export const ModuleRoute: React.FC<ModuleRouteProps> = ({ slug, children }) => {
  return (
    <ProtectedRoute>
      <ModuleGuard slug={slug}>{children}</ModuleGuard>
    </ProtectedRoute>
  )
}

const ModuleGuard: React.FC<ModuleRouteProps> = ({ slug, children }) => {
  const { modules, loading } = useUserModules()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <Loader2 className="w-8 h-8 text-[#F5C518] animate-spin" />
      </div>
    )
  }

  if (!modules.has(slug)) {
    return <Navigate to="/sem-acesso" replace />
  }

  return <>{children}</>
}
