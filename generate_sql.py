import csv
import re
import os

csv_file = r"C:\Users\gruiz\OneDrive\Documentos\sistema_decor\productos\Full Furniture and Accessories Catalog Table - Table 1 (2).csv"
sql_file = r"C:\Users\gruiz\OneDrive\Documentos\sistema_decor\export_definitivo_catalogo.sql"

if not os.path.exists(csv_file):
    print(f"Error: CSV no encontrado en {csv_file}")
    exit(1)

with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader) # skip header

    count = 0
    values = []
    
    for row in reader:
        if not row or not row[0].strip():
            continue
            
        name = row[0].strip()
        price_raw = row[1].strip() if len(row) > 1 else ""
        
        price_str = re.sub(r'[^\d.]', '', price_raw)
        price = float(price_str) if price_str else 0.00
        
        words = name.split()
        prefix = ""
        for w in words[:2]:
            w_clean = re.sub(r'[^A-Za-z]', '', w)
            prefix += w_clean[:3].upper()
            
        sku = f"{prefix}-{str(count + 1).zfill(4)}"
        
        name_escaped = name.replace("'", "''")
        precio_venta = price * 1.5
        
        values.append(f"('{sku}', '{name_escaped}', {price:.2f}, {precio_venta:.2f}, 'taller')")
        count += 1

with open(sql_file, 'w', encoding='utf-8') as out:
    out.write("-- Export Definitivo de Catálogo de Productos\n")
    out.write(f"-- Total de productos generados: {count}\n\n")
    out.write("INSERT INTO productos (codigo_sku, nombre, precio_costo_base, precio_venta_base, origen) VALUES \n")
    out.write(",\n".join(values) + ";\n")

print(f"Archivo SQL generado en {sql_file} con {count} productos.")
