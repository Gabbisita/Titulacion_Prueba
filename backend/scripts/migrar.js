// Prepara la base de datos para la versión con seguridad y semestres 1–8.
// Uso:  cd backend && npm run migrar
// Se puede correr varias veces: cada paso revisa primero si ya está hecho.
const { consultar, transaccion, cerrar } = require('../db');

const existeColumna = async (tabla, columna) =>
  (await consultar(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [tabla, columna])).length > 0;

(async () => {
  // 1. Bitácora de seguridad
  await consultar(`
    CREATE TABLE IF NOT EXISTS bitacora_seguridad (
      ID BIGINT AUTO_INCREMENT PRIMARY KEY,
      Fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      Nivel VARCHAR(10) NOT NULL DEFAULT 'info',
      Evento VARCHAR(40) NOT NULL,
      IP VARCHAR(45) NULL,
      Usuario VARCHAR(120) NULL,
      Rol VARCHAR(10) NULL,
      Metodo VARCHAR(8) NULL,
      Ruta VARCHAR(200) NULL,
      Detalle VARCHAR(500) NULL,
      Agente VARCHAR(200) NULL,
      INDEX idx_bitacora_fecha (Fecha),
      INDEX idx_bitacora_nivel (Nivel)
    )`);
  console.log('✔ Tabla bitacora_seguridad lista');

  // 2. Ciclo en el que el alumno confirmó su semestre
  if (await existeColumna('alumno', 'Ciclo_Semestre')) {
    console.log('✔ alumno.Ciclo_Semestre ya existía');
  } else {
    await consultar('ALTER TABLE alumno ADD COLUMN Ciclo_Semestre VARCHAR(6) NULL');
    console.log('✔ Columna alumno.Ciclo_Semestre agregada');
  }

  // 3. Semestres de 1° a 8°, con ID = número de semestre
  const antes = await consultar('SELECT ID_Semestre, Nombre_Semestre FROM semestre ORDER BY ID_Semestre');
  console.log('  Semestres antes:', antes.map((s) => `${s.ID_Semestre}=${s.Nombre_Semestre}`).join(', ') || '(vacío)');

  await transaccion(async (q) => {
    // a) Asegura que existan los ID 1..8 (sin tocar todavía los nombres actuales)
    for (let n = 1; n <= 8; n++) {
      await q('INSERT IGNORE INTO semestre (ID_Semestre, Nombre_Semestre) VALUES (?, ?)', [n, `${n}° Semestre`]);
    }
    // b) Mueve a cada alumno al ID que corresponde al NÚMERO de su semestre actual
    //    (se lee del nombre: "5° Semestre" → 5; 9° o más → 8). Si el nombre no trae número, no se toca.
    //    Se hace en UNA sola instrucción para que los cambios no se encadenen (2→3 y luego 3→5).
    const cambios = antes
      .map((s) => ({ de: s.ID_Semestre, a: Math.min(parseInt(s.Nombre_Semestre, 10) || 0, 8) }))
      .filter((c) => c.a > 0 && c.a !== c.de);
    if (cambios.length > 0) {
      const casos = cambios.map(() => 'WHEN ? THEN ?').join(' ');
      const movidos = await q(
        `UPDATE alumno SET FK_Semestre = CASE FK_Semestre ${casos} END WHERE FK_Semestre IN (?)`,
        [...cambios.flatMap((c) => [c.de, c.a]), cambios.map((c) => c.de)]);
      console.log(`✔ Alumnos reubicados de semestre: ${movidos.affectedRows}`);
    }
    // c) Alumnos que quedaron en un ID fuera de 1..8 pasan a 8°
    const fuera = await q('UPDATE alumno SET FK_Semestre = 8 WHERE FK_Semestre > 8');
    if (fuera.affectedRows) console.log(`✔ Alumnos con semestre mayor a 8° pasados a 8°: ${fuera.affectedRows}`);
    // d) Nombres definitivos y limpieza
    for (let n = 1; n <= 8; n++) {
      await q('UPDATE semestre SET Nombre_Semestre = ? WHERE ID_Semestre = ?', [`${n}° Semestre`, n]);
    }
    await q('DELETE FROM semestre WHERE ID_Semestre NOT BETWEEN 1 AND 8');
  });
  console.log('✔ Catálogo de semestres: 1° a 8°');

  console.log('\nMigración terminada.');
  await cerrar();
})().catch(async (err) => {
  console.error('\n❌ La migración falló:', err.code || '', err.message);
  await cerrar().catch(() => {});
  process.exit(1);
});
