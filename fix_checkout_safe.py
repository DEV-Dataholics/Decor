import ftplib

FTP_HOST = 'ftp.dataholics.com.mx'
FTP_USER = 'noodles@decor.dataholics.com.mx'
FTP_PASS = 'KztSSA-MuMEU'
ftp = ftplib.FTP(FTP_HOST)
ftp.login(FTP_USER, FTP_PASS)

with open('api/ventas/checkout.php', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "echo json_encode(['error' => 'Error interno al procesar la venta']);",
    "echo json_encode(['error' => 'Error interno al procesar la venta: ' . \->getMessage()]);"
)

with open('api/ventas/checkout.php', 'w', encoding='utf-8') as f:
    f.write(content)

with open('api/ventas/checkout.php', 'rb') as f:
    ftp.storbinary('STOR api/ventas/checkout.php', f)

ftp.quit()
