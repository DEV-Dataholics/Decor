with open('api/ventas/checkout.php', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "echo json_encode(['error' => 'Error interno al procesar la venta']);",
    "echo json_encode(['error' => 'Error interno al procesar la venta: ' . $e->getMessage()]);"
)

with open('api/ventas/checkout.php', 'w', encoding='utf-8') as f:
    f.write(content)
