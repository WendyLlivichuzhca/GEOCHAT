const fs = require('fs');
const path = require('path');

// 1. Cargar es.json
const esNames = require('../frontend/node_modules/react-phone-input-2/lang/es.json');

// 2. Leer lib.js para extraer la lista de países 'k'
const libContent = fs.readFileSync(path.join(__dirname, '../frontend/node_modules/react-phone-input-2/lib/lib.js'), 'utf8');

// Capturamos desde "var k=" hasta ",E="
const startIdx = libContent.indexOf('var k=');
const endIdx = libContent.indexOf(',E=');

if (startIdx === -1 || endIdx === -1) {
  console.error("No se encontraron los delimitadores correctos en lib.js");
  process.exit(1);
}

const arrayStr = libContent.substring(startIdx + 6, endIdx);

// Convertimos el string del arreglo a un objeto JS usando eval
const rawCountries = eval(arrayStr);

// Función para obtener el flag emoji a partir del código de país ISO 3166-1 alpha-2
function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Mapear los países
const formattedCountries = rawCountries.map(item => {
  const englishName = item[0];
  const isoCode = item[2];
  const dialCode = item[3];
  
  // Buscar nombre en español, si no, usar el nombre en inglés
  const spanishName = esNames[isoCode] || englishName;
  
  return {
    name: spanishName,
    code: isoCode.toUpperCase(),
    prefix: dialCode,
    flag: getFlagEmoji(isoCode)
  };
});

// Ordenar alfabéticamente por nombre en español
formattedCountries.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

// Generar el archivo JS
let jsContent = `// Archivo generado automáticamente a partir de react-phone-input-2\n`;
jsContent += `export const countriesList = [\n`;
formattedCountries.forEach(c => {
  jsContent += `  { name: ${JSON.stringify(c.name)}, code: ${JSON.stringify(c.code)}, prefix: ${JSON.stringify(c.prefix)}, flag: ${JSON.stringify(c.flag)} },\n`;
});
jsContent += `];\n`;

const outputPath = path.join(__dirname, '../frontend/src/utils/countries.js');
fs.writeFileSync(outputPath, jsContent, 'utf8');
console.log(`Generados ${formattedCountries.length} países en ${outputPath}`);
