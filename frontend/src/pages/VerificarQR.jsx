import { useRef, useState } from 'react';
import NavbarAdmin from '../components/NavbarAdmin';
import AnimatedPage from '../components/AnimatedPage';

// Verifica un QR de acceso. Los QR están cifrados: solo el servidor de Safe Stock CETI
// puede leerlos. Funciona con un lector de QR USB (escribe el código y presiona Enter)
// o pegando el texto del código.
const VerificarQR = () => {
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const entrada = useRef(null);

  const verificar = async (e) => {
    e.preventDefault();
    if (!codigo.trim()) return;
    setCargando(true);
    try {
      const r = await fetch('/backend/api/qr/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigo.trim() }),
      });
      setResultado(await r.json());
    } catch {
      setResultado({ valido: false, message: 'Error de conexión con el servidor.' });
    } finally {
      setCargando(false);
      setCodigo('');
      entrada.current?.focus();
    }
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] font-sans pb-20 text-slate-700">
        <NavbarAdmin />
        <div className="max-w-3xl mx-auto px-6 pt-12 text-left">
          <h1 className="text-4xl font-black text-[#1a1f2e] tracking-tight mb-2 uppercase italic">Verificar QR</h1>
          <p className="text-slate-500 font-medium mb-8">
            Escanea el código del alumno. Solo los QR generados por Safe Stock CETI son válidos.
          </p>

          <form onSubmit={verificar} className="bg-white p-8 rounded-4xl shadow-sm border border-slate-200 mb-8">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Código escaneado</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={entrada}
                autoFocus
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Escanea o pega aquí el código (empieza con SSC2)"
                className="flex-1 border-2 border-slate-200 p-3.5 rounded-xl outline-none focus:border-blue-500 text-sm font-mono bg-white"
              />
              <button
                type="submit"
                disabled={cargando || !codigo.trim()}
                className="bg-[#2563eb] hover:bg-blue-700 text-white font-black px-6 py-3.5 rounded-xl uppercase text-xs disabled:bg-slate-300"
              >
                {cargando ? 'Verificando...' : 'Verificar'}
              </button>
            </div>
          </form>

          {resultado && (
            <div
              className={`rounded-4xl p-8 border-2 ${
                resultado.valido ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <span className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl text-white ${resultado.valido ? 'bg-green-600' : 'bg-red-600'}`}>
                  {resultado.valido ? '✓' : '✕'}
                </span>
                <div>
                  <h2 className={`text-2xl font-black ${resultado.valido ? 'text-green-800' : 'text-red-800'}`}>
                    {resultado.valido ? 'Acceso autorizado' : 'Acceso denegado'}
                  </h2>
                  <p className={`text-sm font-bold ${resultado.valido ? 'text-green-700' : 'text-red-700'}`}>{resultado.message}</p>
                </div>
              </div>

              {resultado.valido && resultado.pedido && (
                <div className="bg-white rounded-2xl p-5 grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedido</p>
                    <p className="font-black text-[#1a1f2e]">{resultado.pedido.id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Casillero</p>
                    <p className="font-black text-blue-600 text-lg">{resultado.pedido.casillero}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solicitante</p>
                    <p className="font-bold">{resultado.pedido.solicitante} · {resultado.pedido.matricula}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recogida</p>
                    <p className="font-bold">{resultado.pedido.fecha} · {resultado.pedido.horario}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Materiales</p>
                    <ul className="font-bold text-slate-700 space-y-0.5">
                      {resultado.pedido.materiales.map((m, i) => (
                        <li key={i}>{m.cantidad}× {m.nombre}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
};

export default VerificarQR;
