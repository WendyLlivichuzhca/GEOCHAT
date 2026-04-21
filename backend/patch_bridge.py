import os

file_path = r"c:\Users\Wendy Llivichuzhca\Documents\GEOINFORMATICA\GEO-CHAT\backend\whatsapp-bridge\bridge.js"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Localizamos upsertChat por el contexto de los argumentos que ya modifiqué
# Buscamos la línea que tiene 'safeLastType' (línea 867-868 aprox)
for i in range(800, 900):
    if "safeLastType," in lines[i] and i + 4 < len(lines):
        if "return true;" in lines[i+4]:
            print(f"Found insertion point at line {i+5}")
            insertion_point = i + 4
            lines.insert(insertion_point, "  notifyWhatsappWebhook('chat-update', {\n")
            lines.insert(insertion_point + 1, "    jid: normalizedJid,\n")
            lines.insert(insertion_point + 2, "    type,\n")
            lines.insert(insertion_point + 3, "    name: safeName,\n")
            lines.insert(insertion_point + 4, "    last_message: safeLastMessage,\n")
            lines.insert(insertion_point + 5, "    last_type: safeLastType,\n")
            lines.insert(insertion_point + 6, "    last_time: lastSeenMysql,\n")
            lines.insert(insertion_point + 7, "    last_timestamp: lastSeenTimestamp,\n")
            lines.insert(insertion_point + 8, "    unread_count: unreadCount ?? 0,\n")
            lines.insert(insertion_point + 9, "  });\n\n")
            break

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Patch applied.")
