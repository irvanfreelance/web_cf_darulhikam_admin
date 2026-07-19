
import re

def parse_xndit(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Split by bank names - they seem to be on their own line followed by blank or category
    # Or just search for the specific ones we want
    banks_to_find = ['BCA', 'Mandiri', 'BRI', 'BNI', 'BJB', 'BNC', 'BSI', 'CIMB', 'Muamalat', 'Permata', 'Alfamart', 'Indomaret']
    results = []
    
    bank_map = {
        'BCA': 2,
        'Mandiri': 3,
        'BSI': 4
    }

    # Find indices of bank names
    indices = []
    for bank in banks_to_find:
        # Match bank name at start of file or after newline
        matches = re.finditer(f'(?:^|\\n)({bank})\\s*(?:\\n|$)', content, re.IGNORECASE)
        for m in matches:
            indices.append((m.start(1), m.group(1)))
    
    indices.sort()
    
    for i in range(len(indices)):
        start_idx = indices[i][0]
        end_idx = indices[i+1][0] if i+1 < len(indices) else len(content)
        
        bank_name_orig = indices[i][1]
        bank_name = next((b for b in bank_map if b.lower() == bank_name_orig.lower()), None)
        if not bank_name:
            continue
        pm_id = bank_map[bank_name]
        
        bank_block = content[start_idx:end_idx]
        lines = [l.strip() for l in bank_block.strip().split('\n') if l.strip()]
        
        # Skip the bank name line
        current_cat = None
        current_steps = []
        
        for line in lines[1:]:
            # Category title
            if line.lower() in ['mbanking', 'ibanking', 'atm', 'livin', 'brimo', 'mobile', 'byond', 'antarbank']:
                if current_cat:
                    html_content = '<ol>' + ''.join([f'<li>{s}</li>' for s in current_steps]) + '</ol>'
                    results.append({
                        'pm_id': pm_id,
                        'title': f'Pembayaran via {current_cat.capitalize()}',
                        'content': html_content
                    })
                current_cat = line
                current_steps = []
            else:
                current_steps.append(line)
        
        if current_cat:
            html_content = '<ol>' + ''.join([f'<li>{s}</li>' for s in current_steps]) + '</ol>'
            results.append({
                'pm_id': pm_id,
                'title': f'Pembayaran via {current_cat.capitalize()}',
                'content': html_content
            })
            
    return results

instructions = parse_xndit('/Users/muhammadirvan/Documents/projects/lenteradonasi_admin/refs/xndit.txt')

# Add generic ones for others
# 1: GOPAY, 5: QRIS, 6: SHOPEEPAY, 7: DANA, 8: LINKAJA
generic_e_wallet = [
    (1, 'GOPAY', 'Gojek / GoPay'),
    (6, 'SHOPEEPAY', 'Shopee'),
    (7, 'DANA', 'DANA'),
    (8, 'LINKAJA', 'LinkAja')
]

for pm_id, code, name in generic_e_wallet:
    instructions.append({
        'pm_id': pm_id,
        'title': f'Pembayaran via {name}',
        'content': f'<ol><li>Buka aplikasi {name} Anda.</li><li>Pilih menu <strong>Bayar / Scan</strong>.</li><li>Scan QR Code yang tampil di layar atau upload dari galeri.</li></ol>'
    })

instructions.append({
    'pm_id': 5,
    'title': 'Pembayaran via QRIS',
    'content': '<ol><li>Buka aplikasi pembayaran pilihan Anda (GoPay, OVO, DANA, LinkAja, BCA Mobile, dll).</li><li>Pilih menu <strong>Scan / Bayar</strong>.</li><li>Scan QR Code yang tampil di layar.</li><li>Konfirmasi pembayaran dan masukkan PIN Anda.</li></ol>'
})

sql = "INSERT INTO payment_instructions (payment_method_id, title, content, sort_order) VALUES\n"
inserts = []
for i, ins in enumerate(instructions):
    content_escaped = ins['content'].replace("'", "''")
    inserts.append(f"({ins['pm_id']}, '{ins['title']}', '{content_escaped}', {i+1})")

sql += ",\n".join(inserts) + ";"
print(sql)
