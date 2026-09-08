with open('api/ventas/caja.php', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "$ins->execute([$tienda_id, $fondo, $user['id']]);",
    "$ins->execute([$tienda_id, $fondo, $fondo, $user['id']]);"
)

with open('api/ventas/caja.php', 'w', encoding='utf-8') as f:
    f.write(content)
