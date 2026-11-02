// Colores de las gráficas en pantalla (el PDF usa su propia paleta en escala de grises)
// Series de una sola magnitud usan el azul del sitio.
export const AZUL = '#2563eb';
export const AZUL_CLARO = '#bfdbfe';
export const TEXTO = '#1a1f2e';

// Paleta para categorías (validada para daltonismo). Se asigna en este orden, nunca se repite:
// a partir de la 6.ª categoría se agrupan en "Otros".
export const CATEGORICOS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
export const COLOR_OTROS = '#94a3b8';

// Deja como máximo 5 categorías y agrupa el resto en "Otros"
export const agruparOtros = (lista, maximo = CATEGORICOS.length) => {
  if (lista.length <= maximo) return lista.map((item, i) => ({ ...item, color: CATEGORICOS[i] }));
  const principales = lista.slice(0, maximo - 1).map((item, i) => ({ ...item, color: CATEGORICOS[i] }));
  const resto = lista.slice(maximo - 1).reduce((suma, item) => suma + item.valor, 0);
  return [...principales, { etiqueta: 'Otros', valor: resto, color: COLOR_OTROS }];
};
