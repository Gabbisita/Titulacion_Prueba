import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// IMPORTACIÓN ÚNICA DE COMPONENTES
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Inventario from './pages/Inventario';
import DetalleMaterial from './pages/DetalleMaterial';
import Solicitud from './pages/Solicitud';
import Pedidos from './pages/Pedidos';
import DetallePedido from './pages/DetallePedido';
import Registro from './pages/Registro';
import Carrito from './components/Carrito';
import InicioAdmin from './pages/InicioAdmin';
import PedidosAdmin from './pages/PedidosAdmin'; 

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
        <Route path="/material/:id" element={<DetalleMaterial />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/solicitud" element={<Solicitud />} />
        <Route path="/pedidos" element={<Pedidos />} />
        <Route path="/pedido/:id" element={<DetallePedido />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/inicioadmin" element={<InicioAdmin/>}/>
        <Route path="/pedidosadmin" element={<PedidosAdmin/>}/>
      </Routes>
    </Router>
  );
}

export default App;