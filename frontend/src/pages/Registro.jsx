import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Registro = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    correo: '',
    matricula: '',
    carrera: 'Ingeniería en Mecatrónica',
    nivel: 'Ingeniero',
    semestre: '5° Semestre',
    telefono: '',
    contrasena: '',
    confirmarContrasena: '',
    aceptarTerminos: true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const procesarRegistro = (e) => {
    e.preventDefault();
    if (!formData.aceptarTerminos) {
      alert("Debes aceptar los términos y condiciones del sistema.");
      return;
    }
    if (formData.contrasena !== formData.confirmarContrasena) {
      alert("Las contraseñas no coinciden. Por favor verifica.");
      return;
    }
    
    alert("¡Cuenta creada con éxito! Bienvenido a SafeStock.");
    navigate('/'); // Redirige al login listo para entrar
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#f8f9fc] font-sans flex flex-col md:flex-row text-left text-slate-700"
    >
      
      <div className="w-full md:w-[35%] bg-[#0a0f1d] text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden min-h-[250px] md:min-h-screen flex-shrink-0">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="flex items-center gap-3 z-10">
          <div className="bg-blue-600 text-white w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg shadow-md shadow-blue-600/20">C</div>
          <div>
            <p className="text-white font-black text-[11px] leading-none uppercase tracking-tight">
              CETI División de Ingeniería
            </p>
            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-0.5">
              Mecatrónica
            </p>
          </div>
        </div>

        <div className="my-auto z-10 pt-6 md:pt-0">
          <h1 className="text-3xl font-black italic tracking-tight uppercase mb-3 text-slate-100">
            Crea tu cuenta
          </h1>
          <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
            Regístrate con tus datos institucionales para acceder al sistema de préstamos de la Bodega de Mecatrónica.
          </p>

          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-5 max-w-xs">
            <h4 className="text-blue-400 text-[11px] font-black uppercase tracking-wider mb-3">¿Qué necesitas?</h4>
            <ul className="space-y-2 text-xs font-medium text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-blue-500 font-black">•</span> Correo institucional @ceti.mx
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500 font-black">•</span> Matrícula de control
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500 font-black">•</span> Datos académicos actuales
              </li>
            </ul>
          </div>
        </div>

        <div className="flex gap-1.5 mt-6 md:mt-0 z-10">
          <div className="h-1.5 w-4 rounded-full bg-blue-600"></div>
          <div className="h-1.5 w-1.5 rounded-full bg-slate-700"></div>
          <div className="h-1.5 w-1.5 rounded-full bg-slate-700"></div>
        </div>
      </div>

      <div className="flex-1 p-6 md:p-12 lg:p-16 flex items-center justify-center bg-white overflow-y-auto">
        <div className="w-full max-w-2xl">
          
          <header className="mb-6 text-left">
            <h2 className="text-xl font-black text-[#1a1f2e] tracking-tight mb-0.5">Información de cuenta</h2>
            <p className="text-slate-400 font-bold text-[11px] uppercase tracking-wide">Todos los campos son obligatorios</p>
          </header>

          {/* Listón de navegación superior estético */}
          <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl gap-1 mb-8 text-center text-[10px] font-black uppercase tracking-tight">
            <div className="py-2 bg-blue-600 text-white rounded-lg shadow-sm">1. Datos personales</div>
            <div className="py-2 text-slate-400">2. Datos académicos</div>
            <div className="py-2 text-slate-400">3. Confirmación</div>
          </div>

          {/* Formulario unificado */}
          <form onSubmit={procesarRegistro} className="space-y-5 text-left">
            
            {/* Fila 1: Correo y Matrícula */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Correo institucional</label>
                <input 
                  type="email" 
                  name="correo"
                  value={formData.correo}
                  onChange={handleChange}
                  required
                  placeholder="nombre@ceti.mx"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Matrícula / No. control</label>
                <input 
                  type="text" 
                  name="matricula"
                  value={formData.matricula}
                  onChange={handleChange}
                  required
                  placeholder="ej. 21MT1234"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none uppercase focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Fila 2: Selector de Carrera */}
            <div>
              <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Carrera que cursa</label>
              <select 
                name="carrera"
                value={formData.carrera}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none text-slate-800 focus:border-blue-500 focus:bg-white transition-all"
              >
                <option value="Ingeniería en Mecatrónica">Ingeniería en Mecatrónica</option>
                <option value="Ingeniería en Automatización">Ingeniería en Automatización</option>
                <option value="Ingeniería en Diseño Mecánico">Ingeniería en Diseño Mecánico</option>
              </select>
            </div>

            {/* Fila 3: Nivel de estudios y Semestre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Nivel de estudios</label>
                <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl gap-1 text-center font-bold text-xs">
                  <button 
                    type="button" 
                    onClick={() => setFormData(prev => ({...prev, nivel: 'Ingeniero'}))}
                    className={`py-2 rounded-lg transition-all ${formData.nivel === 'Ingeniero' ? 'bg-white text-blue-600 border border-blue-100 shadow-sm font-black' : 'text-slate-400'}`}
                  >
                    Ingeniero
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setFormData(prev => ({...prev, nivel: 'Tecnólogo'}))}
                    className={`py-2 rounded-lg transition-all ${formData.nivel === 'Tecnólogo' ? 'bg-white text-blue-600 border border-blue-100 shadow-sm font-black' : 'text-slate-400'}`}
                  >
                    Tecnólogo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Semestre actual</label>
                <select 
                  name="semestre"
                  value={formData.semestre}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none text-slate-800 focus:border-blue-500 focus:bg-white transition-all"
                >
                  <option value="1° Semestre">1° Semestre</option>
                  <option value="3° Semestre">3° Semestre</option>
                  <option value="5° Semestre">5° Semestre</option>
                  <option value="7° Semestre">7° Semestre</option>
                  <option value="9° Semestre">9° Semestre</option>
                </select>
              </div>
            </div>

            {/* Fila 4: Teléfono */}
            <div>
              <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Número de teléfono</label>
              <input 
                type="tel" 
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                required
                placeholder="ej. 33 1234 5678"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
              />
            </div>

            {/* Fila 5: Contraseñas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Contraseña</label>
                <input 
                  type="password" 
                  name="contrasena"
                  value={formData.contrasena}
                  onChange={handleChange}
                  required
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">Confirmar contraseña</label>
                <input 
                  type="password" 
                  name="confirmarContrasena"
                  value={formData.confirmarContrasena}
                  onChange={handleChange}
                  required
                  placeholder="Repite tu contraseña"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Fila 6: Checkbox de términos */}
            <div className="flex items-start gap-2.5 pt-2">
              <input 
                type="checkbox" 
                name="aceptarTerminos"
                id="term"
                checked={formData.aceptarTerminos}
                onChange={handleChange}
                className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="term" className="text-[11px] font-bold text-slate-500 cursor-pointer select-none leading-normal">
                Acepto los términos y condiciones del sistema de préstamos de la Bodega de Mecatrónica del CETI
              </label>
            </div>

            {/* Botonazo de Envío */}
            <div className="pt-2">
              <button 
                type="submit"
                className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-black py-3.5 rounded-xl uppercase tracking-tight text-xs shadow-md shadow-blue-500/15 transition-all transform active:scale-[0.99]"
              >
                Continuar → Datos académicos
              </button>
              
              <p className="text-center text-xs text-slate-400 font-bold mt-4">
                ¿Ya tienes cuenta?{' '}
                <Link to="/" className="text-blue-500 hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </div>

          </form>
        </div>
      </div>

    </motion.div>
  );
};

export default Registro;