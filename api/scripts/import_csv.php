<?php
// api/scripts/import_csv.php
require_once __DIR__ . '/../config/db.php';

$csvFile = __DIR__ . '/../../productos/Full Furniture and Accessories Catalog Table - Table 1 (2).csv';

if (!file_exists($csvFile)) {
    die("Error: Archivo CSV no encontrado en $csvFile\n");
}

try {
    $db = getDB();
    echo "Conectado a la base de datos...\n";

    // Opcional: Limpiar productos existentes si deseas un fresh start
    // $db->exec("DELETE FROM productos");
    // $db->exec("ALTER TABLE productos AUTO_INCREMENT = 1");

    $file = fopen($csvFile, 'r');
    $header = fgetcsv($file); // Saltar cabecera: NAME, PRICE (cost)

    $count = 0;
    $errors = 0;

    while (($row = fgetcsv($file)) !== FALSE) {
        if (empty($row[0])) continue;

        $name = trim($row[0]);
        $priceRaw = isset($row[1]) ? trim($row[1]) : '';
        
        // Limpiar precio (quitar $, comas, guiones)
        $price = preg_replace('/[^\d.]/', '', $priceRaw);
        $price = empty($price) ? 0.00 : (float)$price;

        // Generar SKU simple: 3 primeras letras de las primeras 2 palabras + número secuencial
        $words = explode(' ', $name);
        $prefix = '';
        foreach (array_slice($words, 0, 2) as $w) {
            $prefix .= strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $w), 0, 3));
        }
        $sku = $prefix . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);

        try {
            $stmt = $db->prepare("INSERT INTO productos (codigo_sku, nombre, precio_costo_base, precio_venta_base, origen) VALUES (?, ?, ?, ?, 'taller')");
            $stmt->execute([
                $sku,
                $name,
                $price,
                $price * 1.5, // Precio venta sugerido (ej. 50% de margen)
            ]);
            $count++;
        } catch (Exception $e) {
            echo "Error insertando $name ($sku): " . $e->getMessage() . "\n";
            $errors++;
        }
    }

    fclose($file);
    echo "\nImportación finalizada:\n";
    echo "- Éxitos: $count\n";
    echo "- Errores: $errors\n";

} catch (Exception $e) {
    die("Error de base de datos: " . $e->getMessage() . "\n");
}
