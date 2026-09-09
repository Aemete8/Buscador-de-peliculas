# 🎬 CineSearch

> Buscador de películas con detalle completo, paginación e historial de búsquedas.  
> Proyecto de portafolio — Fase 2 · JavaScript Vanilla · OMDb API

---

## Vista previa

```
┌─────────────────────────────────────────┐
│  🎬 CineSearch   [Buscar película...] [Buscar] │
├─────────────────────────────────────────┤
│                                         │
│    🎬  Descubre el cine                 │
│    Busca cualquier película...          │
│                                         │
│    Prueba con: [Inception] [Interstellar] │
└─────────────────────────────────────────┘
```

---



## ¿Qué hace esta app?

- **Búsqueda en tiempo real** — escribe un título y obtén resultados al instante
- **Grid de resultados** con pósters, títulos y año, con efecto hover de "cortina de cine"
- **Vista de detalle** completa: sinopsis, director, reparto, duración, géneros, calificación IMDb
- **Paginación** — navega entre páginas de 10 resultados sin recargar la página
- **Historial de búsquedas** — las últimas 5 búsquedas se guardan y aparecen como sugerencias
- **Manejo de errores** — mensajes claros cuando no hay resultados o falla la red
- **Placeholder visual** cuando una película no tiene póster disponible

---



## Tecnologías


| Tecnología                   | Uso                                         |
| ---------------------------- | ------------------------------------------- |
| HTML5 semántico              | Estructura y accesibilidad (landmarks ARIA) |
| CSS3 (BEM, Mobile-first)     | Estilos, glassmorphism, animaciones         |
| JavaScript Vanilla (ES2020+) | Lógica, fetch, DOM, localStorage            |
| OMDb API                     | Fuente de datos de películas                |
| Google Fonts                 | Outfit + Inter                              |


Sin frameworks. Sin dependencias. Solo el lenguaje.

---



## Estructura del proyecto

```
cineSearch/
├── index.html      # Estructura semántica — tres vistas en un solo HTML
├── css
|   └── styles.css      # BEM · Mobile-first · Design tokens con CSS custom properties
├── js
|   └── app.js          # Lógica completa de la aplicación
├── .gitignore      # Archivos excluidos del repositorio
└── README.md       # Este archivo
```

---



## Instalación y uso

Este proyecto no tiene dependencias ni proceso de build.

### 1. Clona el repositorio

```bash
git clone https://github.com/Aemete8/Buscador-de-peliculas.git
cd cineSearch
```



### 2. Obtén tu API key de OMDb

1. Ve a [https://www.omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx)
2. Elige el plan **Free** (1,000 peticiones/día)
3. Revisa tu correo y activa la key



### 3. Configura la API key

Abre `app.js` y reemplaza en la línea 1:

```js
// ANTES
const API_KEY = 'TU_API_KEY_AQUI';

// DESPUÉS
const API_KEY = 'a1b2c3d4';  // tu key real
```

> ⚠️ **Nunca subas tu API key a GitHub.** El `.gitignore` ya excluye `.env`.  
> Para producción, mueve la key a una variable de entorno.



### 4. Abre en el navegador

```bash
# Opción A — Abrir directamente
open index.html

# Opción B — Servidor local (recomendado para evitar problemas de CORS)
npx serve .
# o
python3 -m http.server 3000
```

---



## Cómo funciona

La app usa **dos endpoints distintos** de OMDb:

```
# Búsqueda — devuelve array de resultados parciales
GET https://www.omdbapi.com/?s=inception&page=1&apikey=KEY

# Detalle — devuelve objeto con información completa
GET https://www.omdbapi.com/?i=tt1375666&apikey=KEY
```

El flujo de estado sigue un patrón simple de **tres vistas**:

```
[Home] → búsqueda → [Results] → clic en card → [Detail]
                        ↑                           |
                        └───────── volver ──────────┘
```

Al volver del detalle, los resultados se muestran desde el estado en memoria — sin un nuevo fetch.

---



## Decisiones de diseño

**¿Por qué tres vistas en un solo HTML?**  
Para simular navegación sin router ni framework. Es el patrón más común en proyectos vanilla y muestra comprensión del DOM. Cada vista se alterna con el atributo `hidden`.

**¿Por qué no usar** `fetch` **al hacer clic en "Volver"?**  
Los resultados ya están en `state.currentMovies`. Mostrarlos de nuevo no requiere red — solo re-renderizar lo que ya existe. Es más rápido y consume menos cuota de la API.

**¿Por qué** `localStorage` **para el historial?**  
Persiste entre sesiones. El usuario cierra el navegador, vuelve al día siguiente y sus búsquedas siguen ahí. `sessionStorage` se perdería al cerrar la pestaña.

**¿Por qué BEM?**  
En proyectos sin framework, BEM previene colisiones de estilos y hace que el CSS sea predecible. Cada clase describe exactamente qué es (bloque), de qué forma parte (elemento) y en qué variante está (modificador).

---



## Características destacadas para portafolio

- ✅ Dos tipos de `fetch` distintos con manejo de errores independiente
- ✅ Paginación real (no simulada) usando el parámetro `page` de la API
- ✅ Historial persistente con `localStorage` + dropdown tipo Google
- ✅ Accesibilidad: landmarks ARIA, `role`, `aria-live`, foco visible con teclado
- ✅ CSS custom properties como design tokens — cambiar el acento requiere editar una línea
- ✅ Efecto "cortina de cine" en hover con CSS puro — sin JavaScript para animaciones
- ✅ Placeholder visual cuando la API no devuelve póster
- ✅ Estado de la app en un objeto centralizado (`state`) — fácil de debuggear

---



## Limitaciones conocidas

- La API key está en el cliente — visible en el código fuente. Para producción, se necesita un backend proxy o variables de entorno en un servicio como Netlify/Vercel.
- OMDb limita a 1,000 peticiones diarias en el plan gratuito.
- Algunos títulos tienen información incompleta ("N/A") — la app lo maneja mostrando texto alternativo.

---



## Posibles mejoras futuras

- [ ] Filtro por tipo (película / serie / episodio)
- [ ] Filtro por año
- [ ] Lista de favoritos con `localStorage`
- [ ] Skeleton loading (placeholders animados mientras carga)
- [ ] PWA (Progressive Web App) para uso offline
- [ ] Backend proxy para proteger la API key

---



## Créditos

- Datos: [OMDb API](https://www.omdbapi.com/) — The Open Movie Database
- Tipografía: [Outfit](https://fonts.google.com/specimen/Outfit) + [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts
- Iconos: SVG inline propios

---



## Licencia

MIT — libre para usar, modificar y distribuir.