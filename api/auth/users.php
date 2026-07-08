<?php
// api/auth/users.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin']);

$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("SELECT id, nombre, email, rol, activo, empleado_id, creado_en FROM usuarios ORDER BY nombre ASC");
        json_ok($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
        json_error('Error al obtener usuarios: ' . $e->getMessage(), 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = get_body();
    $id = isset($data['id']) ? (int)$data['id'] : null;
    $action = $data['action'] ?? '';

    $nombre = trim($data['nombre'] ?? '');
    $email = trim($data['email'] ?? '');
    $rol = $data['rol'] ?? '';
    $password = $data['password'] ?? '';
    $activo = isset($data['activo']) ? (int)$data['activo'] : 1;
    $empleado_id = isset($data['empleado_id']) && $data['empleado_id'] !== '' ? (int)$data['empleado_id'] : null;

    if ($action === 'delete') {
        if (!$id) {
            json_error('ID requerido para eliminar', 422);
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = ?");
            $stmt->execute([$id]);
            json_ok(['mensaje' => 'Usuario eliminado correctamente']);
        } catch (PDOException $e) {
            json_error('Error al eliminar usuario: ' . $e->getMessage(), 500);
        }
        exit;
    }

    if (!$nombre || !$email || !$rol) {
        json_error('Nombre, email y rol son requeridos', 422);
    }

    if ($id) {
        // Editar
        try {
            $sql = "UPDATE usuarios SET nombre = ?, email = ?, rol = ?, activo = ?, empleado_id = ?";
            $params = [$nombre, $email, $rol, $activo, $empleado_id];
            
            if (!empty($password)) {
                $sql .= ", password_hash = ?";
                $params[] = password_hash($password, PASSWORD_DEFAULT);
            }
            
            $sql .= " WHERE id = ?";
            $params[] = $id;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            json_ok(['mensaje' => 'Usuario actualizado correctamente']);
        } catch (PDOException $e) {
            json_error('Error al actualizar usuario: ' . $e->getMessage(), 500);
        }
    } else {
        // Crear nuevo
        if (empty($password)) {
            json_error('Contraseña requerida para nuevo usuario', 422);
        }
        try {
            $pass_hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("
                INSERT INTO usuarios (nombre, email, password_hash, rol, activo, empleado_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$nombre, $email, $pass_hash, $rol, $activo, $empleado_id]);
            json_ok(['mensaje' => 'Usuario creado correctamente', 'id' => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            json_error('Error al crear usuario: ' . $e->getMessage(), 500);
        }
    }
}
