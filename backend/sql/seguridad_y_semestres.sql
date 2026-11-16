-- =======================================================
-- SEGURIDAD Y SEMESTRES (Safe Stock CETI)
-- Se aplica con:  cd backend && npm run migrar
-- (el script revisa qué falta, así que se puede correr más de una vez sin dañar nada).
-- Este archivo documenta lo que hace ese script.
-- =======================================================

-- 1. Bitácora de seguridad: inicios de sesión, accesos negados, acciones del administrador...
CREATE TABLE IF NOT EXISTS bitacora_seguridad (
    ID        BIGINT AUTO_INCREMENT PRIMARY KEY,
    Fecha     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Nivel     VARCHAR(10)  NOT NULL DEFAULT 'info',   -- info | alerta | critico
    Evento    VARCHAR(40)  NOT NULL,
    IP        VARCHAR(45)  NULL,
    Usuario   VARCHAR(120) NULL,
    Rol       VARCHAR(10)  NULL,
    Metodo    VARCHAR(8)   NULL,
    Ruta      VARCHAR(200) NULL,
    Detalle   VARCHAR(500) NULL,
    Agente    VARCHAR(200) NULL,
    INDEX idx_bitacora_fecha (Fecha),
    INDEX idx_bitacora_nivel (Nivel)
);

-- 2. Ciclo escolar en el que el alumno confirmó su semestre (ej. '2026-B').
--    NULL = todavía no lo confirma; se le pedirá la próxima vez que entre.
ALTER TABLE alumno ADD COLUMN Ciclo_Semestre VARCHAR(6) NULL;

-- 3. Catálogo de semestres de 1° a 8° (ID = número de semestre).
--    El script además reubica a los alumnos que estaban en un semestre con otro ID
--    (por ejemplo "9° Semestre" pasa a 8°) y borra los semestres fuera de 1–8.
INSERT INTO semestre (ID_Semestre, Nombre_Semestre) VALUES
    (1, '1° Semestre'), (2, '2° Semestre'), (3, '3° Semestre'), (4, '4° Semestre'),
    (5, '5° Semestre'), (6, '6° Semestre'), (7, '7° Semestre'), (8, '8° Semestre')
ON DUPLICATE KEY UPDATE Nombre_Semestre = VALUES(Nombre_Semestre);
