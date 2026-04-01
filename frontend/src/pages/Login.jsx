import { useState } from 'react';
import { loginUser } from '../services/authService'; // Importamos el servicio

const Login = () => {
  const [registro, setRegistro] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await loginUser(registro, password);

      if (data.token) {
        localStorage.setItem('token', data.token);
        console.log("Sesión iniciada");
        window.location.href = '/inicio'; 
      }
    } catch (mensajeError) {
      alert(mensajeError); // Muestra el error que viene desde el servicio
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0f1d] overflow-hidden font-sans text-white">
      
      {/* Branding */}
      <div className="hidden md:flex w-1/2 bg-[#0a0f1d] p-20 flex-col justify-center relative border-r border-white/5">
        <div className="absolute w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] -top-20 -left-20"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-16">
            <div className="w-14 h-14 bg-[#2563eb] rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/50">
              <span className="text-white font-black text-3xl">C</span>
            </div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] leading-tight">
              CETI División de Ingeniería<br/>Mecatrónica
            </div>
          </div>

          <h1 className="text-7xl font-bold mb-8 tracking-tighter leading-none italic">
            SAFE<br/>STOCK
          </h1>
          
          <p className="text-slate-400 text-xl max-w-sm leading-relaxed mb-16">
            Solicita préstamos de equipos y materiales para tus proyectos académicos desde cualquier dispositivo.
          </p>

          <div className="flex gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <div className="w-3 h-3 rounded-full bg-slate-800"></div>
            <div className="w-3 h-3 rounded-full bg-slate-800"></div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-12 lg:p-24">
        <div className="w-full max-w-md">
          <div className="mb-12">
            <h2 className="text-[#1a1f2e] text-4xl font-black mb-4 tracking-tight">Iniciar sesión</h2>
            <p className="text-slate-500 text-lg">Bienvenido de nuevo, ingresa tus datos.</p>
          </div>

          <form className="space-y-7" onSubmit={handleLogin}>
            <div>
              <label className="block text-[11px] font-black text-slate-800 uppercase tracking-[0.15em] mb-3">
                Registro
              </label>
              <input 
                type="text" 
                required
                placeholder="23110115" 
                value={registro}
                onChange={(e) => setRegistro(e.target.value)}
                className="w-full p-5 rounded-2xl bg-[#f8f9fc] border border-slate-100 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-lg"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[11px] font-black text-slate-800 uppercase tracking-[0.15em]">
                  Contraseña
                </label>
                <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input 
                type="password" 
                required
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-5 rounded-2xl bg-[#f8f9fc] border border-slate-100 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-lg"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className={`w-full py-5 text-white font-bold rounded-2xl shadow-2xl transition-all transform active:scale-[0.98] text-xl mt-4 
                ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#2563eb] hover:bg-[#1d4ed8] shadow-blue-200'}`}
            >
              {loading ? 'Validando...' : 'Entrar al sistema'}
            </button>

            <div className="text-center mt-12">
              <p className="text-slate-400 text-sm font-medium">
                ¿No tienes una cuenta? <button type="button" className="text-blue-600 font-bold hover:underline">Regístrate aquí</button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;