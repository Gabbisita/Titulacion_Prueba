-- =======================================================
-- TABLA DE REPORTES DE FALLA DE EQUIPO (SafeStock)
-- Ejecutar UNA sola vez en la base de datos antes de cambiar USAR_MOCK a false.
-- =======================================================

CREATE TABLE IF NOT EXISTS reporte_falla (
    ID_Falla        INT AUTO_INCREMENT PRIMARY KEY,
    FK_Material     INT NOT NULL,
    Cantidad        INT NOT NULL DEFAULT 1,
    Tipo_Falla      VARCHAR(40) NOT NULL,      -- Daño físico, Falla eléctrica, Falla mecánica, ...
    Severidad       VARCHAR(20) NOT NULL,      -- Leve, Moderada, Grave
    Estado          VARCHAR(20) NOT NULL DEFAULT 'Pendiente', -- Pendiente, En reparación, Reparado, Dado de baja
    FK_Pedido       VARCHAR(50) NULL,          -- Opcional: pedido en el que se detectó la falla
    FK_Matricula    VARCHAR(20) NULL,          -- Opcional: alumno que tenía el equipo
    Descripcion     TEXT NOT NULL,
    Reportado_Por   VARCHAR(100) NOT NULL,
    Fecha_Reporte   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Si marca error aquí, revisa que FK_Material sea del mismo tipo que material.ID_Material
    CONSTRAINT fk_falla_material FOREIGN KEY (FK_Material) REFERENCES material(ID_Material)
);
