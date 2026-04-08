import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Inventario from './pages/Inventario';

function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTo(0, 0);
    }, 10);
    return () => clearTimeout(timer);
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
      </Routes>
    </Router>
  );
}

export default App;