import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AgenteVerdeRoute } from './components/AgenteVerdeRoute';
import { Login } from './pages/Login';
import { ListagemProjetos } from './pages/ListagemProjetos';
import { DetalheProjeto } from './pages/DetalheProjeto';
import { ResetPassword } from './pages/ResetPassword';
import { Conta } from './pages/Conta';
import { Listagem as AgenteVerdeListagem } from './pages/AgenteVerde/Listagem';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ListagemProjetos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projetos/:id"
            element={
              <ProtectedRoute>
                <DetalheProjeto />
              </ProtectedRoute>
            }
          />
          <Route
            path="/conta"
            element={
              <ProtectedRoute>
                <Conta />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agente-verde"
            element={
              <AgenteVerdeRoute>
                <AgenteVerdeListagem />
              </AgenteVerdeRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
