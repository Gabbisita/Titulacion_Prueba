import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Inventario from './pages/Inventario';
import DetalleMaterial from './pages/DetalleMaterial'; // Asegúrate de que este archivo exista


function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/inventario" element={<Inventario />} />
        {/* ESTA ES LA PIEZA QUE FALTA: */}
        <Route path="/material/:id" element={<DetalleMaterial />} />
      </Routes>
    </Router>
  );
}

export default App;