# backend/con_embeddings.py
import os
import json
import math
import requests

def get_db_logger():
    try:
        from main import logger
        return logger
    except ImportError:
        import logging
        return logging.getLogger("con_embeddings")

logger = get_db_logger()

_table_checked = False

def ensure_chunks_table():
    """
    Crea la tabla MySQL para almacenar los chunks y sus embeddings si no existe.
    """
    global _table_checked
    if _table_checked:
        return
    try:
        from main import get_connection
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS `agente_conocimiento_chunks` (
              `id` int(11) NOT NULL AUTO_INCREMENT,
              `agente_id` int(11) NOT NULL,
              `conocimiento_id` int(11) NOT NULL,
              `chunk_text` text NOT NULL,
              `embedding_json` longtext NOT NULL,
              PRIMARY KEY (`id`),
              KEY `idx_agente_id` (`agente_id`),
              KEY `idx_conocimiento_id` (`conocimiento_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        conn.commit()
        cursor.close()
        conn.close()
        _table_checked = True
        
        # Ejecutar backfill de documentos antiguos en segundo plano
        backfill_existing_knowledge()
    except Exception as e:
        logger.error(f"Error al asegurar tabla de chunks: {e}")


def backfill_existing_knowledge():
    """
    Backfills embeddings para cualquier entrenamiento previo que no tenga chunks.
    """
    try:
        from main import get_connection
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Obtener conocimiento_id ya chunkificados
        cursor.execute("SELECT DISTINCT conocimiento_id FROM agente_conocimiento_chunks")
        indexed_ids = {row["conocimiento_id"] for row in cursor.fetchall()}
        
        # Obtener conocimiento general
        cursor.execute("SELECT id, agente_id, contenido, url FROM agente_conocimiento")
        all_rows = cursor.fetchall()
        
        to_index = [row for row in all_rows if row["id"] not in indexed_ids]
        cursor.close()
        conn.close()
        
        if to_index:
            logger.info(f"Detectados {len(to_index)} documentos antiguos sin embeddings. Iniciando backfill en segundo plano...")
            import threading
            def run_backfill():
                try:
                    # Nueva conexion para el hilo
                    t_conn = get_connection()
                    t_cursor = t_conn.cursor(dictionary=True)
                    openai_key = os.getenv("OPENAI_API_KEY")
                    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
                    
                    for row in to_index:
                        try:
                            sync_conocimiento_chunks(
                                t_cursor, t_conn, row["agente_id"], row["id"], row["contenido"], 
                                url=row["url"], gemini_key=gemini_key, openai_key=openai_key
                            )
                        except Exception as row_err:
                            logger.error(f"Error en backfill de fila {row['id']}: {row_err}")
                    t_cursor.close()
                    t_conn.close()
                    logger.info("Backfill de embeddings completado con éxito.")
                except Exception as thread_err:
                    logger.error(f"Error en hilo de backfill: {thread_err}")
                
            t = threading.Thread(target=run_backfill)
            t.daemon = True
            t.start()
    except Exception as e:
        logger.error(f"Error al verificar backfill de embeddings: {e}")


def chunk_text(text, size=500):
    """
    Divide un texto en bloques (chunks) de longitud aproximada, intentando respetar párrafos y líneas.
    """
    if not text:
        return []
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    chunks = []
    current_chunk = ""
    for p in paragraphs:
        if len(current_chunk) + len(p) < size:
            current_chunk += "\n" + p if current_chunk else p
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = p
    if current_chunk:
        chunks.append(current_chunk)
    return chunks


def get_embedding(text, gemini_key=None, openai_key=None):
    """
    Obtiene el vector de embedding para un texto usando Gemini o OpenAI como fallback.
    """
    if not gemini_key:
        gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not openai_key:
        openai_key = os.getenv("OPENAI_API_KEY")

    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={gemini_key}"
            payload = {
                "model": "models/text-embedding-004",
                "content": {
                    "parts": [{"text": text}]
                }
            }
            r = requests.post(url, json=payload, timeout=15)
            if r.status_code == 200:
                values = r.json().get("embedding", {}).get("values")
                if values:
                    return values
        except Exception as e:
            logger.warning(f"Fallo al obtener embedding de Gemini: {e}. Intentando OpenAI...")

    if openai_key:
        try:
            url = "https://api.openai.com/v1/embeddings"
            headers = {
                "Authorization": f"Bearer {openai_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "input": text,
                "model": "text-embedding-3-small"
            }
            r = requests.post(url, json=payload, headers=headers, timeout=15)
            if r.status_code == 200:
                return r.json().get("data", [{}])[0].get("embedding")
        except Exception as e:
            logger.error(f"Fallo al obtener embedding de OpenAI: {e}")

    return None


def crawl_website(base_url, max_pages=50):
    """
    Crawlea un sitio web usando BFS y extrae texto de las subpáginas pertenecientes al mismo dominio.
    """
    from urllib.parse import urljoin, urlparse
    from bs4 import BeautifulSoup
    import time
    
    visited = set()
    queue = [base_url]
    parsed_base = urlparse(base_url)
    base_domain = parsed_base.netloc
    
    scraped_data = []
    
    while queue and len(visited) < max_pages:
        current_url = queue.pop(0)
        parsed_current = urlparse(current_url)
        clean_url = parsed_current._replace(fragment="").geturl()
        
        if clean_url in visited:
            continue
            
        visited.add(clean_url)
        logger.info(f"Crawling URL: {clean_url}")
        
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            r = requests.get(clean_url, headers=headers, timeout=10)
            if r.status_code != 200:
                continue
                
            soup = BeautifulSoup(r.text, 'html.parser')
            
            # Remover partes irrelevantes para concentrarse en el contenido útil
            for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
                element.decompose()
                
            raw_text = soup.get_text(separator="\n")
            lines = (line.strip() for line in raw_text.splitlines())
            chunks_lines = (phrase for line in lines for phrase in line.split("  "))
            clean_text = "\n".join(chunk for chunk in chunks_lines if chunk)
            
            if clean_text:
                scraped_data.append(f"--- Página: {clean_url} ---\n{clean_text}")
                
            # Buscar enlaces si aún no alcanzamos el límite de páginas
            if len(visited) < max_pages:
                for a_tag in soup.find_all('a', href=True):
                    href = a_tag['href']
                    absolute_url = urljoin(clean_url, href)
                    parsed_absolute = urlparse(absolute_url)
                    
                    if parsed_absolute.netloc == base_domain and parsed_absolute.scheme in ('http', 'https'):
                        link_to_add = parsed_absolute._replace(fragment="").geturl()
                        if link_to_add not in visited and link_to_add not in queue:
                            queue.append(link_to_add)
            
            time.sleep(0.1)  # Respetar servidor
        except Exception as e:
            logger.error(f"Error raspando subpágina {clean_url}: {e}")
            
    return "\n\n".join(scraped_data)


def extract_youtube_video_id(url):
    """
    Extrae el ID de 11 caracteres de un enlace de YouTube.
    """
    import re
    regexes = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'youtu\.be\/([0-9A-Za-z_-]{11})',
        r'embed\/([0-9A-Za-z_-]{11})'
    ]
    for r in regexes:
        match = re.search(r, str(url))
        if match:
            return match.group(1)
    return None


def get_youtube_transcript(video_id, language='es'):
    """
    Descarga y compila la transcripción de un video de YouTube.
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        lang_code = str(language).strip().lower()
        if 'es' in lang_code or 'spa' in lang_code:
            lang_code = 'es'
        elif 'en' in lang_code or 'ing' in lang_code:
            lang_code = 'en'
        elif 'fr' in lang_code or 'fran' in lang_code:
            lang_code = 'fr'
        elif 'de' in lang_code or 'alem' in lang_code:
            lang_code = 'de'
        elif 'pt' in lang_code or 'port' in lang_code:
            lang_code = 'pt'
        else:
            lang_code = 'es'
        
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        # Intentar obtener el idioma solicitado o traducido
        langs_to_try = [lang_code, 'es', 'en']
        transcript = None
        for l in langs_to_try:
            try:
                transcript = transcript_list.find_transcript([l])
                break
            except Exception:
                continue
                
        if not transcript:
            try:
                transcript = transcript_list.find_generated_transcript(['es', 'en'])
            except Exception:
                transcript = next(iter(transcript_list._manually_created_transcripts.values()))
                
        if transcript:
            if transcript.language_code != lang_code:
                try:
                    transcript = transcript.translate(lang_code)
                except Exception:
                    pass
            data = transcript.fetch()
            return " ".join([item['text'] for item in data])
    except Exception as e:
        logger.error(f"Error extrayendo transcripción de YouTube {video_id}: {e}")
    return ""


def sync_conocimiento_chunks(cursor, conn, agente_id, conocimiento_id, contenido, url=None, gemini_key=None, openai_key=None):
    """
    Divide un contenido en chunks, genera sus embeddings y los sincroniza en la tabla de chunks.
    Si contenido está vacío pero hay una URL o ruta de archivo, intenta extraer el texto.
    """
    # 1. Asegurar tabla creada
    ensure_chunks_table()
    
    # 2. Borrar chunks anteriores para este conocimiento_id
    cursor.execute("DELETE FROM agente_conocimiento_chunks WHERE conocimiento_id = %s", (conocimiento_id,))
    conn.commit()
    
    text_content = str(contenido or "").strip()
    
    # Si hay una URL de archivo o web, intentamos obtener el contenido de texto
    if not text_content and url:
        logger.info(f"Conocimiento vacio pero url provisto. Intentando extraer texto de: {url}")
        try:
            # Obtener folder y helper del main
            from main import MEDIA_FOLDER, resolve_media_local_path
            local_path = resolve_media_local_path(url)
            if local_path and os.path.exists(local_path):
                text_content = extract_text_from_file(local_path)
        except Exception as resolve_err:
            logger.error(f"Error resolviendo ruta local de url {url}: {resolve_err}")
            
        if not text_content and str(url).startswith(("http://", "https://")):
            try:
                yt_id = extract_youtube_video_id(url)
                if yt_id:
                    text_content = get_youtube_transcript(yt_id, 'es')
                else:
                    text_content = crawl_website(url, 1)
            except Exception as scrap_err:
                logger.error(f"Error scraping url {url}: {scrap_err}")

    if not text_content:
        return
        
    # 3. Generar nuevos chunks
    chunks = chunk_text(text_content)
    if not chunks:
        return
        
    logger.info(f"Sincronizando {len(chunks)} chunks para conocimiento_id {conocimiento_id}...")
    
    # 4. Insertar cada chunk con su vector
    for chunk in chunks:
        vector = get_embedding(chunk, gemini_key, openai_key)
        if vector:
            cursor.execute("""
                INSERT INTO agente_conocimiento_chunks (agente_id, conocimiento_id, chunk_text, embedding_json)
                VALUES (%s, %s, %s, %s)
            """, (agente_id, conocimiento_id, chunk, json.dumps(vector)))
    conn.commit()


def extract_text_from_file(file_path):
    ext = file_path.rsplit('.', 1)[1].lower() if '.' in file_path else ''
    if ext in ('txt', 'csv'):
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error leyendo archivo de texto {file_path}: {e}")
    elif ext == 'pdf':
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text
        except ImportError:
            logger.warning("Libreria pypdf no instalada. No se pudo extraer texto del PDF.")
        except Exception as e:
            logger.error(f"Error extrayendo texto de PDF {file_path}: {e}")
    elif ext in ('doc', 'docx'):
        try:
            import docx
            doc = docx.Document(file_path)
            return "\n".join([p.text for p in doc.paragraphs])
        except ImportError:
            logger.warning("Libreria python-docx no instalada. No se pudo extraer texto del DOCX.")
        except Exception as e:
            logger.error(f"Error extrayendo texto de DOCX {file_path}: {e}")
    elif ext in ('xls', 'xlsx'):
        try:
            import pandas as pd
            xl = pd.ExcelFile(file_path)
            text_parts = []
            for sheet_name in xl.sheet_names:
                df = xl.parse(sheet_name)
                df = df.dropna(how='all')
                if not df.empty:
                    text_parts.append(f"--- Hoja: {sheet_name} ---")
                    text_parts.append(df.to_string(index=False))
            return "\n\n".join(text_parts)
        except Exception as e:
            logger.error(f"Error extrayendo texto de Excel {file_path}: {e}")
    return ""


def dot_product(v1, v2):
    return sum(x * y for x, y in zip(v1, v2))


def magnitude(v):
    return math.sqrt(sum(x * x for x in v))


def cosine_similarity(v1, v2):
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    mag1 = magnitude(v1)
    mag2 = magnitude(v2)
    if mag1 == 0.0 or mag2 == 0.0:
        return 0.0
    return dot_product(v1, v2) / (mag1 * mag2)


def search_relevant_chunks(cursor, agente_id, query_text, top_n=5, gemini_key=None, openai_key=None):
    """
    Realiza una búsqueda de similitud coseno de los chunks más afines a un query_text.
    """
    ensure_chunks_table()
    query_vector = get_embedding(query_text, gemini_key, openai_key)
    if not query_vector:
        logger.warning(f"No se pudo generar embedding para la query: '{query_text}'. Retornando vacio.")
        return []
        
    cursor.execute(
        "SELECT chunk_text, embedding_json FROM agente_conocimiento_chunks WHERE agente_id = %s",
        (agente_id,)
    )
    rows = cursor.fetchall()
    
    scored_chunks = []
    for row in rows:
        chunk_text = row["chunk_text"]
        try:
            chunk_vector = json.loads(row["embedding_json"])
            score = cosine_similarity(query_vector, chunk_vector)
            scored_chunks.append((chunk_text, score))
        except Exception as e:
            logger.error(f"Error procesando vector de chunk: {e}")
            
    # Ordenar por puntaje descendente
    scored_chunks.sort(key=lambda x: x[1], reverse=True)
    
    # Retornar top N
    return [chunk for chunk, score in scored_chunks[:top_n]]
