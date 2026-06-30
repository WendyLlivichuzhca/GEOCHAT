# create_recursos_table.py
import sys
import os

# Añadir el directorio actual al path para importar main
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import get_connection

def migrate():
    print("Iniciando migración para crear la tabla agente_recursos...")
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Crear tabla agente_recursos
        ddl = """
        CREATE TABLE IF NOT EXISTS `agente_recursos` (
          `id` int(11) NOT NULL AUTO_INCREMENT,
          `agente_id` int(11) NOT NULL,
          `tipo` enum('Imagen', 'Audio', 'Video') NOT NULL,
          `archivo_url` varchar(500) NOT NULL,
          `nombre_archivo` varchar(255) NOT NULL,
          `descripcion` text DEFAULT NULL,
          `notas_uso` text DEFAULT NULL,
          `creado_en` datetime DEFAULT current_timestamp(),
          PRIMARY KEY (`id`),
          CONSTRAINT `agente_recursos_ibfk_1` FOREIGN KEY (`agente_id`) REFERENCES `agentes_ia` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        cursor.execute(ddl)
        conn.commit()
        print("Tabla `agente_recursos` creada o ya existente de forma exitosa.")
    except Exception as e:
        print(f"Error durante la migración: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
