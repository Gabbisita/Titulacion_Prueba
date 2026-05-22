import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode'; // Importación nativa de la librería
import Navbar from '../components/Navbar';

const DetallePedido = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [qrUrl, setQrUrl] = useState(''); // Estado para guardar la imagen del QR nativo
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  const pedidoId = id || 'PED-2024-0089';

  // 1. Cargar información del pedido
  useEffect(() => {
    const guardados = JSON.parse(localStorage.getItem('historial_pedidos_safe')) || [];
    const encontrado = guardados.find(p => p.id === pedidoId);
    if (encontrado) {
      setPedido(encontrado);
    } else {
      setPedido({
        id: pedidoId,
        fecha: 'Miércoles 19 de marzo, 2025',
        solicitante: 'Alejandro López · 21MT1234',
        detalles: '2× Multímetro Digital · 1× Fuente variadora 24V · 1× Arduino Uno',
        proposito: 'Proyecto final — Robot seguidor de línea para la materia de Robótica Industrial',
        estado: 'En casillero'
      });
    }
  }, [pedidoId]);

  // 2. GENERACIÓN DEL QR NATIVO: Convierte el texto en datos gráficos sin internet
  useEffect(() => {
    const generarCodigoQR = async () => {
      try {
        // Contenido del QR que leerá el escáner del casillero físico
        const textoQR = `CETI-SAFESTOCK-LOCKER07-FOLIO:${pedidoId}`;
        const urlProcesada = await QRCode.toDataURL(textoQR, {
          width: 300,
          margin: 1,
          color: {
            dark: '#1e293b',
            white: '#ffffff'
          }
        });
        setQrUrl(urlProcesada);
      } catch (err) {
        console.error("Error generando el código QR:", err);
      }
    };

    generarCodigoQR();
  }, [pedidoId]);

  // 3. Simulación Profesional de envío al Correo Institucional
  const manejarEnvioCorreo = () => {
    setEnviandoCorreo(true);
    setTimeout(() => {
      setEnviandoCorreo(false);
      alert(`✉ ¡Pase Digital enviado con éxito!\nSe ha enviado el código QR y el vale de resguardo al correo institucional de Kenya G. Frutos.`);
    }, 2000);
  };

  const casilleros = [
    { num: '01', est: 'OCUPADO' }, { num: '02', est: 'LIBRE' }, { num: '03', est: 'OCUPADO' },
    { num: '04', est: 'LIBRE' }, { num: '05', est: 'LIBRE' }, { num: '06', est: 'OCUPADO' },
    { num: '07', est: 'TU PEDIDO' }, { num: '08', est: 'LIBRE' }, { num: '09', est: 'OCUPADO' }
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-700 font-sans pb-12 print:bg-white print:pb-0">
      <div className="print:hidden">
        <Navbar />

        <div className="max-w-[1200px] mx-auto px-6 pt-10 text-left">
          <button 
            onClick={() => navigate('/pedidos')} 
            className="text-slate-400 hover:text-blue-600 text-xs font-black uppercase mb-6 block transition-colors"
          >
            ← Volver a pedidos
          </button>
          
          <h1 className="text-3xl font-black text-[#1a1f2e] tracking-tight mb-1">Tu código de acceso al casillero</h1>
          <p className="text-slate-400 text-xs font-bold">Pedido #{pedidoId} · Casillero 07 · Módulo C — Edificio G</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 items-stretch">
            <div className="bg-white border border-slate-100 rounded-3xl p-10 flex flex-col items-center justify-center shadow-sm">
              <div className="w-56 h-56 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-center p-2 shadow-inner">
                {qrUrl ? (
                  <img 
                    src={qrUrl} 
                    alt="Código QR de Acceso Original" 
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="text-xs text-slate-400 font-bold animate-pulse">Generando matriz QR...</div>
                )}
              </div>
              
              <h3 className="font-black text-lg text-[#1a1f2e] mt-6 mb-1">Código QR del pedido</h3>
              <p className="text-slate-400 text-xs text-center max-w-sm leading-relaxed mb-6">
                Presenta este código en el escáner del casillero #07 para desbloquearlo y recoger tus materiales.
              </p>
              
              {/* Grupo de Botones de Acción */}
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <button 
                  type="button"
                  onClick={manejarEnvioCorreo}
                  disabled={enviandoCorreo}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-black py-3 rounded-xl text-xs uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {enviandoCorreo ? (
                    <>
                      <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      Mandando...
                    </>
                  ) : (
                    <>✉ Mandar al correo</>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={() => window.print()} 
                  className="flex-1 bg-[#111827] text-white font-black py-3 rounded-xl text-xs uppercase flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-md shadow-slate-900/10"
                >
                  📄 Descargar PDF de acceso
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-3 text-center">Disponible para descarga inmediata y respaldo local</p>
            </div>

            {/*RENDERING DE CELDAS */}
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-black text-lg text-[#1a1f2e] mb-1">Estado de casilleros</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-6">Módulo A — Planta baja, Edificio de Mecatrónica</p>
                
                <div className="grid grid-cols-3 gap-4">
                  {casilleros.map((c) => (
                    <div 
                      key={c.num} 
                      className={`border rounded-xl p-4 text-center transition-all shadow-sm ${
                        c.est === 'TU PEDIDO' 
                          ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20' 
                          : c.est === 'LIBRE' 
                          ? 'border-green-200 bg-green-50/20' 
                          : 'border-slate-200 bg-slate-50/50 opacity-60'
                      }`}
                    >
                      <span className="text-xl font-black block text-slate-800">{c.num}</span>
                      <span className={`text-[9px] font-black tracking-wide block mt-1 ${
                        c.est === 'TU PEDIDO' ? 'text-blue-600' : c.est === 'LIBRE' ? 'text-green-600' : 'text-slate-400'
                      }`}>{c.est}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-4 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">⏳ El código expira en: <span className="font-mono font-black text-slate-800">23:47:12</span></span>
                <p className="text-[10px] text-slate-400 text-right max-w-xs font-medium">Si no recoges a tiempo, el pedido regresará al almacén y deberás solicitar una nueva fecha.</p>
              </div>
            </div>

          </div>
        </div>
      </div>


      {/* FORMATO DE IMPRESIÓN */}
      <div className="hidden print:block max-w-[800px] mx-auto p-4 text-left bg-white text-black">
        
        {/* Encabezado del vale institucional */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">CETI — División de Ingeniería</h2>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-0.5">Control de Almacén e Inventario General (SafeStock)</p>
            <p className="text-[11px] text-slate-400">Campus Guadalajara / Tonalá</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-black border-2 border-black px-3 py-1 bg-slate-100 rounded">
              FOLIO: {pedidoId}
            </span>
            <p className="text-[10px] font-bold text-slate-500 mt-2">ESTADO: COMPROBANTE DE RECOGIDA</p>
          </div>
        </div>

        <div className="text-center my-6">
          <h1 className="text-2xl font-black uppercase tracking-tight text-black">VALE DIGITAL DE ACCESO A CASILLERO</h1>
          <p className="text-xs text-slate-600 font-medium">Presente este pase impreso o digital ante la celda de almacenamiento inteligente</p>
        </div>

        {/* Bloque de datos */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Usuario Solicitante</span>
            <p className="text-sm font-black text-slate-900">{pedido ? pedido.solicitante : 'Cargando...'}</p>
            <p className="text-xs text-slate-500">Ingeniería en Mecatrónica</p>
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Casillero Asignado</span>
            <p className="text-sm font-black text-blue-600">Casillero #07 (Módulo A)</p>
            <p className="text-xs text-slate-500">Recogida: {pedido ? pedido.fecha : 'Cargando...'}</p>
          </div>
        </div>

        {/* Destino */}
        <div className="mb-6">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Propósito / Destino Académico</span>
          <div className="border-l-4 border-black pl-4 py-1 bg-slate-50 rounded-r-lg">
            <p className="text-xs text-slate-800 font-bold italic">"{pedido ? pedido.proposito : ''}"</p>
          </div>
        </div>

        {/* Lista de materiales completa */}
        <div className="mb-8">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">Lista de Materiales Vinculados</span>
          <table className="w-full text-left border border-slate-300 rounded-lg overflow-hidden border-collapse">
            <thead>
              <tr className="bg-slate-100 text-black text-[11px] font-black uppercase border-b border-slate-300">
                <th className="p-2.5 pl-4">Descripción del Material</th>
                <th className="p-2.5 text-center w-24">Cantidad</th>
                <th className="p-2.5 text-right pr-4">Ubicación</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-200 font-medium text-slate-700">
              {pedido && pedido.detalles.split(' · ').map((item, index) => {
                const partes = item.split('× ');
                const cant = partes[0] || '1';
                const nombre = partes[1] || item;
                return (
                  <tr key={index}>
                    <td className="p-2.5 pl-4 text-black font-bold">{nombre}</td>
                    <td className="p-2.5 text-center font-mono font-black">{cant} ud(s)</td>
                    <td className="p-2.5 text-right pr-4 text-slate-400 italic">Celda 07</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* QR e Instrucciones */}
        <div className="grid grid-cols-3 gap-6 items-center border-t border-slate-200 pt-6 mt-8">
          <div className="col-span-1 flex justify-center">
            {qrUrl && <img src={qrUrl} alt="QR Impresión Vale" className="w-36 h-36 border border-slate-200 p-1 rounded-lg" />}
          </div>
          <div className="col-span-2 text-left">
            <h4 className="text-xs font-black uppercase text-black mb-1">Instrucciones de Retiro:</h4>
            <ul className="text-[11px] text-slate-600 list-disc pl-4 space-y-1 font-medium">
              <li>Diríjase al Módulo A de lockers en la planta baja del Edificio de Mecatrónica.</li>
              <li>Coloque este código QR frente al lector óptico inferior de la pantalla central.</li>
              <li>La puerta del compartimento <span className="font-bold text-black">07</span> se abrirá automáticamente.</li>
              <li>Retire sus materiales y asegúrese de dejar el casillero completamente cerrado.</li>
            </ul>
          </div>
        </div>

        {/* Bloque de firmas */}
        <div className="grid grid-cols-2 gap-12 mt-12 text-center text-xs">
          <div>
            <div className="w-40 border-b border-slate-400 mx-auto mb-1.5 h-8"></div>
            <p className="font-black text-slate-800 uppercase text-[10px]">Firma de Recogida Alumno</p>
          </div>
          <div>
            <div className="w-40 border-b border-slate-400 mx-auto mb-1.5 h-8 flex items-center justify-center">
              <span className="text-[8px] font-mono font-black border border-green-300 text-green-700 px-1 bg-green-50 rounded">VALE VERIFICADO</span>
            </div>
            <p className="font-black text-slate-800 uppercase text-[10px]">Sello Autorizado Almacén</p>
          </div>
        </div>

      </div>

      {/* ESTILOS DE IMPRESIÓN */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .hidden { display: block !important; }
          body { background-color: #ffffff !important; color: #000000 !important; }
          @page { size: letter; margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
};

export default DetallePedido;