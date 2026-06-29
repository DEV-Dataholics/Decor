-- db/import_catalogo.sql
-- Generado para importar el catálogo CSV
-- Total de productos: 550 aprox.

-- Opcional: Limpiar catálogo previo
-- DELETE FROM productos;
-- ALTER TABLE productos AUTO_INCREMENT = 1;

INSERT INTO productos (codigo_sku, nombre, precio_costo_base, precio_venta_base, origen) VALUES 
('IRO-BAS-0001', '2-DWR IRON BASE NIGHTSTAND', 250.00, 375.00, 'taller'),
('DWR-NIG-0002', '2-DWR NIGHTSTAND', 0.00, 0.00, 'taller'),
('DWR-NIG-0003', '3-DWR NIGHTSTAND', 350.00, 525.00, 'taller'),
('DWR-NIG-0004', '4-DWRS NIGHTSTAND 2-SM 2-LG', 450.00, 675.00, 'taller'),
('KAC-NIG-0005', 'KACHINA NIGHTSTAND', 300.00, 450.00, 'taller'),
('CHI-NIG-0006', 'CHIHUAHUA NIGHTSTAND', 250.00, 375.00, 'taller'),
('HAC-NIG-0007', 'HACIENDA NIGHTSTAND', 550.00, 825.00, 'taller'),
('COW-HID-0008', 'COW HIDE NIGHTSTAND', 0.00, 0.00, 'taller'),
('CRO-NIG-0009', 'CROSS NIGHTSTAND', 0.00, 0.00, 'taller'),
('CRO-NIG-0010', 'CROSS NIGHTSTAND 1-DWR', 300.00, 450.00, 'taller'),
('DEN-MOU-0011', 'DENTAL MOULDING NIGHTSTAND', 0.00, 0.00, 'taller'),
('FAN-TIN-0012', 'FANCY TIN NIGHTSTAND', 250.00, 375.00, 'taller'),
('FAN-TIN-0013', 'FANCY TIN NIGHTSTAND 3 DRWS.', 350.00, 525.00, 'taller'),
('FAN-TIN-0014', 'FANCY TIN NIGHTSTAND 6 DRWS.', 450.00, 675.00, 'taller'),
('GLA-SLA-0015', 'GLASS & SLATTE NIGHTSTAND', 300.00, 450.00, 'taller'),
('GLA-TIL-0016', 'GLASS & TILE NIGHTSTAND', 0.00, 0.00, 'taller'),
('GLA-NIG-0017', 'GLASS NIGHTSTAND', 250.00, 375.00, 'taller'),
('HON-NIG-0018', 'HONDO NIGHTSTAND', 550.00, 825.00, 'taller'),
('MAR-NIG-0019', 'MARIO\'S NIGHTSTAND', 200.00, 300.00, 'taller'),
('MUL-NIG-0020', 'MULTIPANEL NIGHTSTAND', 0.00, 0.00, 'taller'),
('NAI-NIG-0021', 'NAIL NIGHTSTAND', 300.00, 450.00, 'taller');
-- ... (He generado los primeros 20 como muestra, puedo generar el resto si lo deseas o puedes usar el script PHP que ya te creé).
