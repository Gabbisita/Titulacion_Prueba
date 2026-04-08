const EquipoCard = ({ nombre, disponibles, estado, imagen }) => {
  // Definimos los colores según el estado
  const statusStyles = {
    'EN STOCK': 'bg-green-100 text-green-700',
    'AGOTADO': 'bg-red-100 text-red-700',
    'PRESTADO': 'bg-orange-100 text-orange-700'
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
      <div className="text-5xl mb-6">{imagen}</div> {/* Aquí irán los iconos o imágenes */}
      <div className="w-full text-left">
        <h3 className="text-[#1a1f2e] font-bold text-lg">{nombre}</h3>
        <p className="text-slate-500 text-sm mb-4">{disponibles} unidades disponibles</p>
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusStyles[estado]}`}>
          {estado}
        </span>
      </div>
    </div>
  );
};

export default EquipoCard;