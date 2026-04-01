import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';

function App() {
  return (
    <Router>
      <Routes>
        {/* La página principal será el Login */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        {/* Aquí agregaremos las demás rutas después */}
      </Routes>
    </Router>
  );
}

export default App;