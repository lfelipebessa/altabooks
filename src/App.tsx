import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ListagemProjetos } from './pages/ListagemProjetos';
import { DetalheProjeto } from './pages/DetalheProjeto';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ListagemProjetos />} />
        <Route path="/projetos/:id" element={<DetalheProjeto />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
