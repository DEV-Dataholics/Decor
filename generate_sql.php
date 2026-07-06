<?php
// Script para generar export_definitivo_catalogo.sql
$csvFile = __DIR__ . '/productos/Full Furniture and Accessories Catalog Table - Table 1 (2).csv';
$sqlFile = __DIR__ . '/export_definitivo_catalogo.sql';

if (!file_exists($csvFile)) {
    die("Error: Archivo CSV no encontrado en $csvFile\n");
}

$file = fopen($csvFile, 'r');
$header = fgetcsv($file);

$count = 0;
$sql = "-- Export Definitivo de Catálogo de Productos\n";
$sql .= "-- Total de productos generados: {count_placeholder}\n\n";
$sql .= "INSERT INTO productos (codigo_sku, nombre, precio_costo_base, precio_venta_base, origen) VALUES \n";

$values = [];

while (($row = fgetcsv($file)) !== FALSE) {
    if (empty($row[0])) continue;

    $name = trim($row[0]);
    $priceRaw = isset($row[1]) ? trim($row[1]) : '';
    
    $price = preg_replace('/[^\d.]/', '', $priceRaw);
    $price = empty($price) ? 0.00 : (float)$price;

    $words = explode(' ', $name);
    $prefix = '';
    foreach (array_slice($words, 0, 2) as $w) {
        $prefix .= strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $w), 0, 3));
    }
    $sku = $prefix . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);

    // Escape single quotes in name
    $name_escaped = str_replace("'", "''", $name);
    $precio_venta = $price * 1.5;

    $values[] = "('$sku', '$name_escaped', $price, $precio_venta, 'taller')";
    $count++;
}

fclose($file);

$sql .= implode(",\n", $values) . ";\n";
$sql = str_replace('{count_placeholder}', $count, $sql);

file_put_contents($sqlFile, $sql);
echo "Archivo SQL generado en $sqlFile con $count productos.\n";
