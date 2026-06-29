<?php
/**
 * Script de importación de catálogos y listas de precios desde CSV.
 * Este script asume que la base de datos está creada y las tablas de Grupo 1 existen.
 */

// Configuración de la base de datos
$host = 'localhost';
$db   = 'decor_muebleria'; // Corregido para que coincida con HeidiSQL
$user = 'root';
$pass = ''; // Contraseña por defecto de Laragon

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Error de conexión: " . $e->getMessage() . "\nAsegúrate de que la base de datos '$db' exista y Laragon esté encendido.\n");
}

$rutaCsvCostos = __DIR__ . '/../../productos/Full Furniture and Accessories Catalog Table - Table 1 (2).csv';
$rutaCsvPrecios = __DIR__ . '/../../productos/Listas de productos y precios por cliente - Hoja 1 (1).csv';

echo "Iniciando importación...\n";

// Función auxiliar para limpiar precios: "$1.169,00" o "$1,100" -> 1169.00
function limpiarPrecio($precioStr) {
    if (empty($precioStr)) return 0.00;
    
    // Quitar signo de dolar, espacios y comillas
    $clean = str_replace(['$', '"', ' '], '', $precioStr);
    
    // Si tiene coma para los centavos (ej: 133,00 o 1.169,00)
    if (preg_match('/,\d{2}$/', $clean)) {
        // Quitar el punto de miles si existe
        $clean = str_replace('.', '', $clean);
        // Cambiar la coma decimal por punto
        $clean = str_replace(',', '.', $clean);
    } else {
        // Formato gringo (ej: 1,100.00 o 1,100)
        $clean = str_replace(',', '', $clean);
    }
    
    return is_numeric($clean) ? (float)$clean : 0.00;
}

// 1. Obtener o crear categoría "Sin Categoría" por defecto
$stmtCat = $pdo->prepare("SELECT id FROM categorias_mueble WHERE nombre = ?");
$stmtInsertCat = $pdo->prepare("INSERT INTO categorias_mueble (nombre) VALUES (?)");

function getCategoriaId($nombre, $pdo, $stmtCat, $stmtInsertCat) {
    if (empty($nombre)) $nombre = 'General';
    $stmtCat->execute([$nombre]);
    $cat = $stmtCat->fetchColumn();
    if (!$cat) {
        $stmtInsertCat->execute([$nombre]);
        $cat = $pdo->lastInsertId();
    }
    return $cat;
}

$catGeneralId = getCategoriaId('General', $pdo, $stmtCat, $stmtInsertCat);

// Preparar sentencias de productos
$stmtProd = $pdo->prepare("SELECT id FROM productos WHERE nombre = ?");
$stmtInsertProd = $pdo->prepare("INSERT INTO productos (nombre, categoria_id, precio_costo_base) VALUES (?, ?, ?)");
$stmtUpdateProdCost = $pdo->prepare("UPDATE productos SET precio_costo_base = ? WHERE id = ?");

// 2. Procesar CSV de Costos (Full Furniture)
if (file_exists($rutaCsvCostos)) {
    echo "Procesando Costos...\n";
    $handle = fopen($rutaCsvCostos, "r");
    $headers = fgetcsv($handle); // NAME,PRICE (cost)
    
    while (($data = fgetcsv($handle)) !== FALSE) {
        if (count($data) < 2) continue;
        
        $nombre = trim($data[0]);
        $costo = limpiarPrecio($data[1]);
        
        if (empty($nombre)) continue;
        
        $stmtProd->execute([$nombre]);
        $prodId = $stmtProd->fetchColumn();
        
        if (!$prodId) {
            $stmtInsertProd->execute([$nombre, $catGeneralId, $costo]);
        } else {
            $stmtUpdateProdCost->execute([$costo, $prodId]);
        }
    }
    fclose($handle);
} else {
    echo "No se encontró el archivo de costos: $rutaCsvCostos\n";
}

// 3. Procesar CSV de Precios por Cliente
// Headers: Name,Price,Last update,Type,Client
if (file_exists($rutaCsvPrecios)) {
    echo "Procesando Precios por Cliente...\n";
    $handle = fopen($rutaCsvPrecios, "r");
    $headers = fgetcsv($handle);
    
    $stmtCliente = $pdo->prepare("SELECT id FROM clientes WHERE nombre = ?");
    $stmtInsertCliente = $pdo->prepare("INSERT INTO clientes (nombre, tipo) VALUES (?, 'mayorista')");
    $stmtUpdateProdCat = $pdo->prepare("UPDATE productos SET categoria_id = ? WHERE id = ?");
    $stmtListaPrecio = $pdo->prepare("SELECT id FROM listas_precios_clientes WHERE cliente_id = ? AND producto_id = ?");
    $stmtInsertListaPrecio = $pdo->prepare("INSERT INTO listas_precios_clientes (cliente_id, producto_id, precio_acordado) VALUES (?, ?, ?)");
    $stmtUpdateListaPrecio = $pdo->prepare("UPDATE listas_precios_clientes SET precio_acordado = ? WHERE id = ?");

    while (($data = fgetcsv($handle)) !== FALSE) {
        if (count($data) < 5) continue;
        
        $nombreProd = trim($data[0]);
        $precio = limpiarPrecio($data[1]);
        $tipoStr = trim($data[3]);
        $clienteStr = trim($data[4]);
        
        if (empty($nombreProd) || empty($clienteStr)) continue;
        
        // Registrar o buscar categoría
        $catId = getCategoriaId($tipoStr, $pdo, $stmtCat, $stmtInsertCat);
        
        // Registrar o buscar producto
        $stmtProd->execute([$nombreProd]);
        $prodId = $stmtProd->fetchColumn();
        if (!$prodId) {
            $stmtInsertProd->execute([$nombreProd, $catId, 0.00]); // Costo 0 por ahora si no estaba en el otro CSV
            $prodId = $pdo->lastInsertId();
        } else {
            // Actualizar categoría si la encontró
            $stmtUpdateProdCat->execute([$catId, $prodId]);
        }
        
        // Registrar o buscar cliente
        $stmtCliente->execute([$clienteStr]);
        $clienteId = $stmtCliente->fetchColumn();
        if (!$clienteId) {
            $stmtInsertCliente->execute([$clienteStr]);
            $clienteId = $pdo->lastInsertId();
        }
        
        // Insertar en lista_precios_clientes
        $stmtListaPrecio->execute([$clienteId, $prodId]);
        $listaId = $stmtListaPrecio->fetchColumn();
        
        if (!$listaId) {
            $stmtInsertListaPrecio->execute([$clienteId, $prodId, $precio]);
        } else {
            $stmtUpdateListaPrecio->execute([$precio, $listaId]);
        }
    }
    fclose($handle);
} else {
    echo "No se encontró el archivo de precios por cliente: $rutaCsvPrecios\n";
}

echo "Migración de catálogos completada exitosamente.\n";
?>
