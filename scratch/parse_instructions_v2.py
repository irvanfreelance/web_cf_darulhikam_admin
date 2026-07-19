
import re

def parse_xndit(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    banks_to_find = [
        'BCA', 'Mandiri', 'BRI', 'BNI', 'BJB', 'BNC', 'BSI', 
        'CIMB', 'Muamalat', 'Permata', 'Alfamart', 'Indomaret'
    ]
    
    bank_config = {
        'BCA': {'id': 2, 'code': 'BCA', 'name': 'BCA Virtual Account', 'logo': 'https://upload.wikimedia.org/wikipedia/id/e/e0/BCA_logo.svg', 'type': 'Bank Transfer', 'fee': 4000, 'sort': 4},
        'Mandiri': {'id': 3, 'code': 'MANDIRI', 'name': 'Mandiri Virtual Account', 'logo': 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_of_Bank_Mandiri.svg', 'type': 'Bank Transfer', 'fee': 4000, 'sort': 5},
        'BSI': {'id': 4, 'code': 'BSI', 'name': 'BSI Virtual Account', 'logo': 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Bank_Syariah_Indonesia.svg', 'type': 'Bank Transfer', 'fee': 4000, 'sort': 2},
        'BRI': {'id': 9, 'code': 'BRI', 'name': 'BRI Virtual Account', 'logo': 'https://upload.wikimedia.org/wikipedia/commons/2/2e/BRI_Logo.svg', 'type': 'Bank Transfer', 'fee': 4000, 'sort': 9},
        'BNI': {'id': 10, 'code': 'BNI', 'name': 'BNI Virtual Account', 'logo': 'https://upload.wikimedia.org/wikipedia/id/5/55/BNI_logo.svg', 'type': 'Bank Transfer', 'fee': 4000, 'sort': 10},
        'BJB': {'id': 11, 'code': 'BJB', 'name': 'BJB Virtual Account', 'logo': 'https://upload.wikimedia.org/wikipedia/id/8/8a/Logo_Bank_BJB.svg', 'type': 'Bank Transfer', 'fee': 4000, 'sort': 11},
        'BNC': {'id': 12, 'code': 'BNC', 'name': 'BNC Virtual Account', 'logo': 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_Bank_Neo_Commerce.svg', 'type': 'Bank Transfer', 'fee': 4000, 'sort': 12},
        'CIMB': {'id': 13, 'code': 'CIMB', 'name': 'CIMB Niaga Virtual Account', 'logo': 'https://upload.wikimedia.org/wikipedia/commons/e/e0/CIMB_Niaga_logo.svg', 'type': 'Bank Transfer', 'fee': 4000, 'sort': 13},
        'Muamalat': {'id': 14, 'code': 'MUAMALAT', 'name': 'Muamalat Virtual Account', 'logo': 'https://upload.wikimedia.org/wikipedia/id/5/52/Logo_Bank_Muamalat.svg', 'type': 'Bank Transfer', 'fee': 4000, 'sort': 14},
        'Permata': {'id': 15, 'code': 'PERMATA', 'name': 'Permata Virtual Account', 'logo': 'https://upload.wikimedia.org/wikipedia/id/a/af/Bank_Permata_logo.svg', 'type': 'Bank Transfer', 'fee': 4000, 'sort': 15},
        'Alfamart': {'id': 16, 'code': 'ALFAMART', 'name': 'Alfamart', 'logo': 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Alfamart_logo.svg', 'type': 'Over-the-Counter', 'fee': 5000, 'sort': 16},
        'Indomaret': {'id': 17, 'code': 'INDOMARET', 'name': 'Indomaret', 'logo': 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Logo_Indomaret.svg', 'type': 'Over-the-Counter', 'fee': 5000, 'sort': 17},
    }

    # Original 8 methods check (to ensure they are included)
    # 1: GOPAY, 5: QRIS, 6: SHOPEEPAY, 7: DANA, 8: LINKAJA
    # We already have 2, 3, 4, 5 in bank_config above.
    
    other_methods = {
        'GOPAY': {'id': 1, 'code': 'GOPAY', 'name': 'GoPay', 'logo': 'https://upload.wikimedia.org/wikipedia/commons/8/86/Gopay_logo.svg', 'type': 'E-Wallet', 'fee': 0, 'sort': 3},
        'QR_CODE': {'id': 5, 'code': 'QR_CODE', 'name': 'QRIS Dynamic', 'logo': 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg', 'type': 'qr_code', 'fee': 0, 'sort': 1},
        'SHOPEEPAY': {'id': 6, 'code': 'SHOPEEPAY', 'name': 'ShopeePay', 'logo': 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg', 'type': 'E-Wallet', 'fee': 0, 'sort': 6},
        'DANA': {'id': 7, 'code': 'DANA', 'name': 'DANA', 'logo': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg', 'type': 'E-Wallet', 'fee': 0, 'sort': 7},
        'LINKAJA': {'id': 8, 'code': 'LINKAJA', 'name': 'LinkAja', 'logo': 'https://upload.wikimedia.org/wikipedia/commons/8/83/LinkAja.svg', 'type': 'E-Wallet', 'fee': 0, 'sort': 8},
    }

    results_instructions = []
    
    # Find indices of bank names
    indices = []
    for bank in banks_to_find:
        matches = re.finditer(f'(?:^|\\n)({bank})\\s*(?:\\n|$)', content, re.IGNORECASE)
        for m in matches:
            indices.append((m.start(1), m.group(1)))
    
    indices.sort()
    
    for i in range(len(indices)):
        start_idx = indices[i][0]
        end_idx = indices[i+1][0] if i+1 < len(indices) else len(content)
        
        bank_name_orig = indices[i][1]
        bank_name = next((b for b in bank_config if b.lower() == bank_name_orig.lower()), None)
        if not bank_name:
            continue
        pm_id = bank_config[bank_name]['id']
        
        bank_block = content[start_idx:end_idx]
        lines = [l.strip() for l in bank_block.strip().split('\n') if l.strip()]
        
        current_cat = None
        current_steps = []
        
        cat_keywords = ['mbanking', 'ibanking', 'atm', 'livin', 'brimo', 'mobile', 'byond', 'antarbank', 'octo', 'mdin', 'note']
        
        for line in lines[1:]:
            if line.lower() in cat_keywords:
                if current_cat:
                    html_content = '<ol>' + ''.join([f'<li>{s}</li>' for s in current_steps]) + '</ol>'
                    results_instructions.append({'pm_id': pm_id, 'title': f'Pembayaran via {current_cat.capitalize()}', 'content': html_content})
                current_cat = line
                current_steps = []
            else:
                current_steps.append(line)
        
        if current_cat:
            html_content = '<ol>' + ''.join([f'<li>{s}</li>' for s in current_steps]) + '</ol>'
            results_instructions.append({'pm_id': pm_id, 'title': f'Pembayaran via {current_cat.capitalize()}', 'content': html_content})
            
    # Add generic instructions
    generic_e_wallet = [
        (1, 'GOPAY', 'Gojek / GoPay'),
        (6, 'SHOPEEPAY', 'Shopee'),
        (7, 'DANA', 'DANA'),
        (8, 'LINKAJA', 'LinkAja')
    ]
    for pm_id, code, name in generic_e_wallet:
        results_instructions.append({
            'pm_id': pm_id,
            'title': f'Pembayaran via {name}',
            'content': f'<ol><li>Buka aplikasi {name} Anda.</li><li>Pilih menu <strong>Bayar / Scan</strong>.</li><li>Scan QR Code yang tampil di layar atau upload dari galeri.</li></ol>'
        })

    results_instructions.append({
        'pm_id': 5,
        'title': 'Pembayaran via QRIS',
        'content': '<ol><li>Buka aplikasi pembayaran pilihan Anda (GoPay, OVO, DANA, LinkAja, BCA Mobile, dll).</li><li>Pilih menu <strong>Scan / Bayar</strong>.</li><li>Scan QR Code yang tampil di layar.</li><li>Konfirmasi pembayaran dan masukkan PIN Anda.</li></ol>'
    })

    # Generate Payment Methods SQL
    pm_sql = "INSERT INTO payment_methods (id, code, name, logo_url, type, provider, admin_fee_flat, admin_fee_pct, is_active, is_redirect, sort_order) VALUES\n"
    pm_rows = []
    
    # Combine and sort by ID
    all_methods = {**bank_config, **{m['code']: m for m in other_methods.values()}}
    sorted_methods = sorted(all_methods.values(), key=lambda x: x['id'])
    
    for m in sorted_methods:
        provider = 'Midtrans' if m['code'] == 'GOPAY' else 'Xendit'
        pm_rows.append(f"({m['id']}, '{m['code']}', '{m['name']}', '{m['logo']}', '{m['type']}', '{provider}', {m['fee']}, 0.00, 't', 'f', {m['sort']})")
    
    pm_sql += ",\n".join(pm_rows) + ";"

    # Generate Instructions SQL
    ins_sql = "INSERT INTO payment_instructions (payment_method_id, title, content, sort_order) VALUES\n"
    ins_rows = []
    for i, ins in enumerate(results_instructions):
        content_escaped = ins['content'].replace("'", "''")
        ins_rows.append(f"({ins['pm_id']}, '{ins['title']}', '{content_escaped}', {i+1})")
    
    ins_sql += ",\n".join(ins_rows) + ";"
    
    return pm_sql, ins_sql

pm_sql, ins_sql = parse_xndit('/Users/muhammadirvan/Documents/projects/lenteradonasi_admin/refs/xndit.txt')
print("--- PAYMENT METHODS ---")
print(pm_sql)
print("\n--- PAYMENT INSTRUCTIONS ---")
print(ins_sql)
