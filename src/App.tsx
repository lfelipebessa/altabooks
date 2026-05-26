import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ModuleRoute } from './components/ModuleRoute';
import { Login } from './pages/Login';
import { ListagemProjetos } from './pages/ListagemProjetos';
import { DetalheProjeto } from './pages/DetalheProjeto';
import { ResetPassword } from './pages/ResetPassword';
import { Conta } from './pages/Conta';
import { SemAcesso } from './pages/SemAcesso';
import { Listagem as AgenteVerdeListagem } from './pages/AgenteVerde/Listagem';
import { Revisao as AgenteVerdeRevisao } from './pages/AgenteVerde/Revisao';
import { Permissoes as AdminPermissoes } from './pages/Admin/Permissoes';
import { MetadadosListagem } from './pages/Metadados/Listagem';
import { MetadadosDetalhe } from './pages/Metadados/Detalhe';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/sem-acesso" element={
            <ProtectedRoute><SemAcesso /></ProtectedRoute>
          } />
          <Route path="/conta" element={
            <ProtectedRoute><Conta /></ProtectedRoute>
          } />
          <Route path="/" element={
            <ModuleRoute slug="ghostwriter"><ListagemProjetos /></ModuleRoute>
          } />
          <Route path="/projetos/:id" element={
            <ModuleRoute slug="ghostwriter"><DetalheProjeto /></ModuleRoute>
          } />
          <Route path="/agente-verde" element={
            <ModuleRoute slug="agente_verde"><AgenteVerdeListagem /></ModuleRoute>
          } />
          <Route path="/agente-verde/lote/:id" element={
            <ModuleRoute slug="agente_verde"><AgenteVerdeRevisao /></ModuleRoute>
          } />
          <Route path="/metadados" element={
            <ModuleRoute slug="metadados"><MetadadosListagem /></ModuleRoute>
          } />
          <Route path="/metadados/:id" element={
            <ModuleRoute slug="metadados"><MetadadosDetalhe /></ModuleRoute>
          } />
          <Route path="/admin/permissoes" element={
            <ModuleRoute slug="admin"><AdminPermissoes /></ModuleRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
