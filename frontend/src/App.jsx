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
import AsignarCasillero from './pages/AsignarCasillero';
import InventarioAdmin from './pages/InventarioAdmin';
import UsuariosAdmin from './pages/UsuariosAdmin';
import CasillerosAdmin from './pages/CasillerosAdmin';
import EstadisticasAdmin from './pages/EstadisticasAdmin';
import FallasAdmin from './pages/FallasAdmin';
import VerificarQR from './pages/VerificarQR';
import BitacoraAdmin from './pages/BitacoraAdmin';
import ActualizarCiclo from './components/ActualizarCiclo';
import Toaster from './components/Toast';
import RutaProtegida from './components/RutaProtegida';
import useInactividad from './hooks/useInactividad';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function VigilanteSesion() {
  useInactividad();
  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Toaster />
      <VigilanteSesion />
      <ActualizarCiclo />
      <Routes>

        <Route path="/" element={<Login />} />
        {/* Atrapa al "fantasma" que manda a /login */}
        <Route path="/login" element={<Login />} />
        
        <Route path="/inicio" element={<RutaProtegida rol="alumno"><Inicio /></RutaProtegida>} />
        <Route path="/inventario" element={<RutaProtegida rol="alumno"><Inventario /></RutaProtegida>} />
        <Route path="/material/:id" element={<RutaProtegida rol="alumno"><DetalleMaterial /></RutaProtegida>} />
        <Route path="/carrito" element={<RutaProtegida rol="alumno"><Carrito /></RutaProtegida>} />
        <Route path="/solicitud" element={<RutaProtegida rol="alumno"><Solicitud /></RutaProtegida>} />
        <Route path="/pedidos" element={<RutaProtegida rol="alumno"><Pedidos /></RutaProtegida>} />
        <Route path="/pedido/:id" element={<RutaProtegida rol="alumno"><DetallePedido /></RutaProtegida>} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/inicioadmin" element={<RutaProtegida rol="admin"><InicioAdmin/></RutaProtegida>} />
        <Route path="/pedidosadmin" element={<RutaProtegida rol="admin"><PedidosAdmin/></RutaProtegida>} />
        <Route path="/admin/asignar-casillero" element={<RutaProtegida rol="admin"><AsignarCasillero /></RutaProtegida>} />
        <Route path="/admin/inventario" element={<RutaProtegida rol="admin"><InventarioAdmin /></RutaProtegida>} />
        <Route path="/admin/usuarios" element={<RutaProtegida rol="admin"><UsuariosAdmin /></RutaProtegida>} />
        <Route path="/admin/casilleros" element={<RutaProtegida rol="admin"><CasillerosAdmin /></RutaProtegida>} />
        <Route path="/admin/estadisticas" element={<RutaProtegida rol="admin"><EstadisticasAdmin /></RutaProtegida>} />
        <Route path="/admin/fallas" element={<RutaProtegida rol="admin"><FallasAdmin /></RutaProtegida>} />
        <Route path="/admin/bitacora" element={<RutaProtegida rol="admin"><BitacoraAdmin /></RutaProtegida>} />
        <Route path="/admin/verificar-qr" element={<RutaProtegida rol="admin"><VerificarQR /></RutaProtegida>} />
      </Routes>
    </Router>
  );
}

export default App;