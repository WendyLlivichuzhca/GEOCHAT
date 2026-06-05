## GEOCHAT - Guia visual base

Esta guia define la direccion visual para GEOCHAT sin tocar la logica del sistema.
El objetivo es unificar modulos, mejorar la presencia del producto y mantener
la identidad real que ya existe en el codigo.

## 1. Direccion de diseno

GEOCHAT debe verse como un:

- CRM premium y moderno
- producto claro, limpio y confiable
- sistema dinamico, pero no recargado
- software comercial serio con energia visual

La identidad dominante del proyecto hoy es:

- base clara
- superficies blancas
- acentos emerald / teal / cyan
- bordes suaves
- titulos con peso alto
- gradientes controlados

No se recomienda mover el producto a una identidad dark global ni a una base
violeta, porque eso hoy no representa el sistema real del codigo.

## 2. ADN visual actual que SI debemos conservar

Referencias buenas del proyecto:

- Contactos.jsx
- Dashboard.jsx
- Sidebar.jsx
- WhalinkList.jsx
- index.css

Tokens actuales mas importantes:

- fondo general: #f0f9ff
- superficie: #ffffff
- borde suave: #d1fae5
- primario: #10b981
- primario hover: #059669
- secundario: #0d9488
- acento dinamico: #0891b2
- texto principal: #134e4a / #0c4a6e
- texto secundario: #64748b / #9ca3af

## 3. Principios de interfaz

### 3.1 Claridad primero

Cada pantalla debe responder rapido:

- donde estoy
- que puedo hacer
- que es lo principal
- que es secundario

### 3.2 Consistencia antes que decoracion

No mezclar estilos por modulo. Si un boton, tabla, card o badge funciona bien,
ese mismo patron debe repetirse.

### 3.3 Dinamismo controlado

La app debe sentirse viva con:

- hover sutil
- sombras ligeras
- estados activos claros
- skeletons buenos
- transiciones suaves

No con efectos exagerados.

### 3.4 Producto premium

La sensacion premium vendra de:

- buena jerarquia
- espaciado coherente
- contrastes limpios
- bordes bien usados
- cards consistentes
- titulos fuertes

## 4. Sistema visual recomendado

### 4.1 Fondos

- fondo app: #f0f9ff
- fondo secundario: #f8fffd
- cards y paneles: #ffffff
- fondos suaves para inputs y zonas de apoyo: #f0fdf9

### 4.2 Colores funcionales

- accion principal: emerald -> teal
- accion secundaria: cyan suave / outline verde
- exito: emerald
- advertencia: amber
- error: rose / red suave
- informacion: cyan / sky

### 4.3 Tipografia

- fuente principal: Plus Jakarta Sans
- H1: muy pesado, compacto, protagonista
- H2: fuerte, limpio
- labels: uppercase pequeno con tracking
- texto secundario: mas aire y menos peso

### 4.4 Bordes y radios

- inputs: rounded-xl
- cards comunes: rounded-2xl
- paneles importantes: rounded-[2rem] o rounded-[2.5rem]
- bordes suaves visibles, nunca grises duros

### 4.5 Sombras

- pocas
- suaves
- con tono emerald/cyan cuando sea CTA o card activa

## 5. Componentes que deben unificarse

Estos deben verse igual en toda la app:

1. Header de modulo
2. Sidebar
3. Boton primario
4. Boton secundario
5. Input de busqueda
6. Cards
7. Tablas
8. Badges de estado
9. Modales
10. Empty states
11. Skeleton loaders
12. Dropdowns
13. Breadcrumbs

## 6. Rol visual por modulo

### Dashboard

Debe sentirse:

- ejecutivo
- limpio
- con lectura rapida
- con enfoque en metricas y estado del sistema

### Contactos

Debe ser el modulo referencia de GEOCHAT.

Debe sentirse:

- CRM premium
- ordenado
- comercial
- muy claro para operar

### Chats

Debe sentirse:

- operativo
- agil
- concentrado
- mas intenso que otros modulos

Pero sin romper la identidad general clara del producto.

### Automatizaciones

Debe sentirse:

- inteligente
- estructurado
- modular
- profesional

No futurista exagerado. Mas bien claro, tecnico y elegante.

### Whalinks

Debe sentirse:

- marketing y conversion
- simple de usar
- visualmente mas comercial

### Tableros

Debe sentirse:

- visual
- dinamico
- facil de escanear

## 7. Lo que NO debemos hacer

- no meter una identidad dark global
- no cambiar a morado como base principal
- no mezclar un modulo claro con otro cyberpunk sin razon
- no usar demasiados colores protagonistas en una sola pantalla
- no sobrecargar con glow o gradientes
- no hacer tarjetas dentro de tarjetas sin necesidad

## 8. Modulo modelo para el rediseño

El modulo modelo debe ser:

- Contactos.jsx

Porque ya tiene:

- mejor coherencia de color
- mejor relacion header / cards / panel lateral
- mejor uso de borders y fondos suaves
- mejor sensacion de producto real

## 9. Orden recomendado de trabajo

### Etapa 1 - sistema visual base

1. Consolidar tokens en index.css
2. Definir botones base
3. Definir cards base
4. Definir tablas base
5. Definir badges base
6. Definir headers base

### Etapa 2 - modulos

1. Contactos
2. Dashboard
3. Chats
4. Automatizaciones
5. Whalinks
6. Tableros

### Etapa 3 - refinamiento

1. modales
2. dropdowns
3. loaders
4. estados vacios
5. iconografia
6. responsive

## 10. Meta final

GEOCHAT debe terminar viendose como:

- un SaaS serio
- moderno
- comercialmente fuerte
- facil de usar
- visualmente consistente
- con identidad propia

No buscamos "mas bonito" solamente.
Buscamos que se vea como un producto solido y listo para vender.
