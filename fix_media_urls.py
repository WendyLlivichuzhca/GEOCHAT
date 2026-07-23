import re

filepath = r'frontend/src/components/AutomationBuilder.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_api = "const API_URL = import.meta.env.VITE_API_URL || '';"
new_api = """const API_URL = import.meta.env.VITE_API_URL || '';

// Resuelve URLs relativas de media a la URL absoluta del backend
const resolveMediaUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const clean = url.startsWith('/') ? url : '/' + url;
  return API_URL + clean;
};"""
content = content.replace(old_api, new_api, 1)

# Fix img src
content = content.replace(
    '<img src={blk.url} alt="Preview" className="w-full max-h-48 object-cover" />',
    '<img src={resolveMediaUrl(blk.url)} alt="Preview" className="w-full max-h-48 object-cover" onError={(e) => { e.target.onerror = null; e.target.style.display="none"; }} />'
)

# Fix video src
content = content.replace(
    '<video src={blk.url} controls className="w-full max-h-48" />',
    '<video src={resolveMediaUrl(blk.url)} controls className="w-full max-h-48" />'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done! resolveMediaUrl applied.')
