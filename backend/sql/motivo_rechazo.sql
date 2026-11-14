-- Guarda la razón por la que el administrador rechazó un pedido.
-- Se muestra al alumno en "Mis pedidos" y se le envía por correo.
ALTER TABLE pedido ADD COLUMN Motivo_Rechazo VARCHAR(500) NULL;
