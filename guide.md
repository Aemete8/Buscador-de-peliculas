# 📐 Guía de Desarrollo — CineSearch

> Flujo completo de la aplicación, arquitectura de decisiones  
> y mapa visual de cómo se conectan todas las piezas.

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [El sistema de vistas](#2-el-sistema-de-vistas)
3. [Flujo completo del usuario](#3-flujo-completo-del-usuario)
4. [Flujo de datos: búsqueda](#4-flujo-de-datos-búsqueda)
5. [Flujo de datos: detalle](#5-flujo-de-datos-detalle)
6. [El objeto de estado](#6-el-objeto-de-estado)
7. [localStorage y el historial](#7-localstorage-y-el-historial)
8. [La API de OMDb](#8-la-api-de-omdb)
9. [Árbol de componentes HTML](#9-árbol-de-componentes-html)
10. [Mapa de event listeners](#10-mapa-de-event-listeners)
11. [Casos borde a manejar](#11-casos-borde-a-manejar)
12. [Orden de implementación recomendado](#12-orden-de-implementación-recomendado)

---

## 1. Arquitectura general

CineSearch es una **SPA (Single Page Application)** sin router ni framework. Todo el HTML existe desde el inicio — JavaScript controla qué sección es visible en cada momento.

```
┌─────────────────────────────────────────────────────────┐
│                        index.html                       │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  <header>  Logo + Barra de búsqueda + Historial  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  <main>                                          │   │
│  │                                                  │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  │   │
│  │  │ #view-home │  │#view-result│  │#view-detail│  │   │
│  │  │  (visible) │  │  (hidden)  │  │  (hidden)  │  │   │
│  │  └────────────┘  └────────────┘  └────────────┘  │   │
│  │        ↑               ↑               ↑          │   │
│  │        └───────────────┴───────────────┘          │   │
│  │           Solo una visible a la vez               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  <footer>  Créditos OMDb                         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Archivos y responsabilidades:**

```
index.html   →  Estructura y semántica. No tiene lógica.
styles.css   →  Presentación. No tiene lógica.
app.js       →  Toda la lógica. Lee el DOM, hace fetch, actualiza UI.
```

---

## 2. El sistema de vistas

Hay exactamente **tres vistas**. El atributo HTML `hidden` las alterna:

```
Vista activa:   hidden = false  →  display: block  (visible)
Vista inactiva: hidden = true   →  display: none   (invisible)
```

```
                    ┌─────────────┐
         INICIO     │  view-home  │
                    │             │
                    │  🎬 Hero    │
                    │  Chips      │
                    └──────┬──────┘
                           │  Usuario busca
                           ▼
                    ┌─────────────────────┐
         BÚSQUEDA   │   view-results      │
                    │                     │
                    │  ┌──────────────┐   │
                    │  │state-loading │   │  ← mientras fetch carga
                    │  └──────────────┘   │
                    │  ┌──────────────┐   │
                    │  │ state-error  │   │  ← si la API falla
                    │  └──────────────┘   │
                    │  ┌──────────────┐   │
                    │  │ movies-grid  │   │  ← si hay resultados
                    │  └──────────────┘   │
                    │  ┌──────────────┐   │
                    │  │  pagination  │   │  ← si hay > 10 resultados
                    │  └──────────────┘   │
                    └──────────┬──────────┘
                               │  Usuario hace clic en una card
                               ▼
                    ┌─────────────────────┐
         DETALLE    │   view-detail       │
                    │                     │
                    │  ┌──────────────┐   │
                    │  │detail-loading│   │  ← mientras fetch carga
                    │  └──────────────┘   │
                    │  ┌──────────────┐   │
                    │  │ detail-error │   │  ← si el fetch falla
                    │  └──────────────┘   │
                    │  ┌──────────────┐   │
                    │  │detail-content│   │  ← si hay datos
                    │  └──────────────┘   │
                    └──────────┬──────────┘
                               │  Usuario hace clic en "Volver"
                               ▼
                    ┌─────────────────────┐
                    │   view-results      │  ← mismos resultados,
                    │   (sin nuevo fetch) │    sin nuevo fetch
                    └─────────────────────┘
```

**Regla importante:** Dentro de `view-results` hay sub-estados. En cada momento, exactamente uno de estos tres debe estar visible:

```
view-results contiene:
  ├── state-loading   (animación de carga)
  ├── state-error     (mensaje de error)
  └── movies-grid     (las cards)
```

---

## 3. Flujo completo del usuario

### Camino feliz (todo sale bien)

```
1. Usuario abre la app
   → showViewHome()
   → Se ve el hero animado

2. Usuario escribe "Inception" en el input
   → Puede hacer clic en "Buscar" o presionar Enter

3. searchMovies("Inception", 1) se ejecuta
   → showViewResults()
   → showLoading()          ← aparece el loader
   → fetch() a la API       ← petición de red

4. La API responde con 10 películas
   → renderMovies(data.Search)  ← se crean las cards
   → updatePagination(1, 25)    ← "Página 1 de 3"
   → saveToHistory("Inception") ← se guarda en localStorage
   → showGrid()                 ← desaparece el loader

5. Usuario hace clic en "Inception (2010)"
   → showViewDetail()
   → fetchMovieDetail("tt1375666")
   → detailLoading aparece

6. La API responde con el detalle completo
   → renderDetail(data)       ← se llena el artículo
   → detailLoading desaparece
   → detailContent aparece

7. Usuario hace clic en "Volver"
   → showViewResults()
   → Los resultados ya están en el DOM — no hay fetch
```

### Camino de error (búsqueda sin resultados)

```
1. Usuario escribe "xkjhqwerty289" y busca

2. searchMovies("xkjhqwerty289", 1)
   → fetch() a la API

3. La API responde con { Response: "False", Error: "Movie not found!" }
   → showError("Movie not found!")
   → Aparece el estado de error con el mensaje
   → NO se guarda en historial (búsqueda fallida)
```

### Camino de error (sin conexión)

```
1. Usuario busca con internet cortado

2. fetch() lanza una excepción (TypeError: Failed to fetch)
   → catch(error) captura la excepción
   → showError("Sin conexión. Verifica tu internet.")
```

---

## 4. Flujo de datos: búsqueda

```
Usuario escribe "Batman" y presiona Enter
            │
            ▼
    searchMovies("Batman", 1)
            │
            ├─ ¿Input vacío?
            │   └─ SÍ → return (no hace nada)
            │   └─ NO → continúa
            │
            ├─ Actualiza estado:
            │   state.currentQuery = "Batman"
            │   state.currentPage  = 1
            │   state.isLoading    = true
            │
            ├─ showViewResults()
            ├─ showLoading()
            │
            ▼
    fetch("https://www.omdbapi.com/?s=Batman&page=1&apikey=...")
            │
            ├─ ¿Error de red? (catch)
            │   └─ showError("Sin conexión. Verifica tu internet.")
            │
            ▼
    data = await response.json()
            │
            ├─ data.Response === "False"?
            │   └─ showError(data.Error)
            │   └─ return
            │
            ├─ data.Response === "True"
            │   ├─ state.currentMovies  = data.Search
            │   ├─ state.totalResults   = Number(data.totalResults)
            │   ├─ state.isLoading      = false
            │   │
            │   ├─ renderMovies(data.Search)
            │   ├─ updatePagination(1, state.totalResults)
            │   ├─ saveToHistory("Batman")
            │   └─ showGrid()
            │
            ▼
    Usuario ve 10 cards de películas de Batman
```

---

## 5. Flujo de datos: detalle

```
Usuario hace clic en la card "Batman Begins"
            │
            ▼
    fetchMovieDetail("tt0372784")
            │
            ├─ showViewDetail()
            ├─ detailLoading.hidden = false
            ├─ detailContent.hidden = true
            │
            ▼
    fetch("https://www.omdbapi.com/?i=tt0372784&apikey=...")
            │
            ├─ ¿Error de red? (catch)
            │   ├─ detailLoading.hidden = true
            │   ├─ detailError.hidden   = false
            │   └─ detailErrorMsg.textContent = "No se pudo cargar..."
            │
            ▼
    data = await response.json()
            │
            ├─ data.Response === "False"?
            │   └─ muestra detailError
            │
            ├─ data.Response === "True"
            │   └─ renderDetail(data)
            │          │
            │          ├─ Llena backdrop con el póster
            │          ├─ Llena título, año, runtime
            │          ├─ Crea chips de géneros
            │          ├─ Llena rating y votos
            │          ├─ Llena sinopsis
            │          ├─ Llena director y actores
            │          ├─ detailLoading.hidden = true
            │          └─ detailContent.hidden = false
            │
            ▼
    Usuario ve la ficha completa de la película
```

---

## 6. El objeto de estado

El estado centraliza toda la información que la app necesita recordar:

```javascript
const state = {
  currentQuery:   '',    // "Batman"
  currentPage:    1,     // 2
  totalResults:   0,     // 47
  currentMovies:  [],    // [{Title, Year, imdbID, Poster}, ...]
  isLoading:      false, // true mientras hay un fetch activo
};
```

**¿Por qué un objeto de estado y no variables sueltas?**

```javascript
// ❌ Mal — variables sueltas, difícil de depurar
let query = '';
let page = 1;
let total = 0;

// ✅ Bien — un solo lugar para mirar en el debugger
const state = { currentQuery: '', currentPage: 1, totalResults: 0 };
// En DevTools puedes escribir: console.log(state) y ver todo de un vistazo
```

**Diagrama de quién lee y quién escribe el estado:**

```
ESCRIBE estado:          LEE estado:
searchMovies()           updatePagination()  → lee totalResults, currentPage
renderMovies()           btnPrev listener    → lee currentPage
fetchMovieDetail()       btnNext listener    → lee currentPage
                         errorRetryBtn       → lee currentQuery
```

---

## 7. localStorage y el historial

```
┌─────────────────────────────────────────────────┐
│  localStorage["cinesearch_history"]             │
│                                                 │
│  '["Inception","Batman","Parasite","Dune","Her"]'│
│       ↑ más reciente                  más vieja ↑│
└─────────────────────────────────────────────────┘
```

**Flujo del historial:**

```
Usuario busca "Arrival"
        │
        ▼
getHistory()
→ ["Inception", "Batman", "Parasite", "Dune", "Her"]
        │
        ▼
Filtrar "Arrival" si ya existía (no duplicar)
→ ["Inception", "Batman", "Parasite", "Dune", "Her"]
        │
        ▼
Insertar al inicio
→ ["Arrival", "Inception", "Batman", "Parasite", "Dune", "Her"]
        │
        ▼
Cortar a 5 elementos
→ ["Arrival", "Inception", "Batman", "Parasite", "Dune"]
        │
        ▼
localStorage.setItem("cinesearch_history", JSON.stringify([...]))
```

**Flujo del dropdown:**

```
Usuario hace clic en el input
        │
        ▼
renderSuggestions()
        │
        ├─ getHistory() → []  →  suggestionsEl.hidden = true
        │
        └─ getHistory() → ["Arrival", ...]
               │
               ▼
           Crea <li> por cada ítem
           suggestionsEl.hidden = false
           aria-expanded = "true"
               │
               ▼
           Usuario hace clic en "Arrival"
               │
               ▼
           searchInput.value = "Arrival"
           hideSuggestions()
           searchMovies("Arrival")
```

---

## 8. La API de OMDb

### Endpoint de búsqueda

```
GET https://www.omdbapi.com/?s=batman&page=1&apikey=TU_KEY

Respuesta exitosa:
{
  "Search": [
    {
      "Title": "Batman Begins",
      "Year": "2005",
      "imdbID": "tt0372784",
      "Type": "movie",
      "Poster": "https://m.media-amazon.com/images/..."
    },
    ... (10 items)
  ],
  "totalResults": "47",
  "Response": "True"
}

Respuesta de error:
{
  "Response": "False",
  "Error": "Movie not found!"
}
```

### Endpoint de detalle

```
GET https://www.omdbapi.com/?i=tt0372784&apikey=TU_KEY

Respuesta:
{
  "Title": "Batman Begins",
  "Year": "2005",
  "Rated": "PG-13",
  "Released": "15 Jun 2005",
  "Runtime": "140 min",
  "Genre": "Action, Adventure",
  "Director": "Christopher Nolan",
  "Writer": "Bob Kane, David S. Goyer, Christopher Nolan",
  "Actors": "Christian Bale, Michael Caine, Ken Watanabe",
  "Plot": "After witnessing his parents' murder...",
  "Poster": "https://m.media-amazon.com/images/...",
  "imdbRating": "8.2",
  "imdbVotes": "1,543,210",
  "imdbID": "tt0372784",
  "Type": "movie",
  "Response": "True"
}
```

### Construir la URL de forma segura

```javascript
// ❌ Concatenación manual — propenso a errores con caracteres especiales
const url = API_URL + '?s=' + query + '&page=' + page + '&apikey=' + API_KEY;

// ✅ URLSearchParams — maneja encoding automáticamente
// (ej: "The Dark Knight" → "The+Dark+Knight")
const params = new URLSearchParams({
  s:      query,
  page:   page,
  apikey: API_KEY
});
const url = `${API_URL}?${params}`;
```

### Campos que pueden ser "N/A"

La API devuelve el string `"N/A"` cuando un campo no tiene datos.  
Siempre verifica antes de mostrar:

```javascript
// Campos que frecuentemente son "N/A":
movie.Poster    // → usa hasPoster() para detectarlo
movie.Runtime   // → "N/A" si no hay dato
movie.Plot      // → "N/A" para títulos muy viejos
movie.Director  // → "N/A" para algunos documentales
movie.imdbRating // → "N/A" si tiene pocos votos
```

---

## 9. Árbol de componentes HTML

```
<body>
│
├── <header class="header">
│   └── <div class="header__inner">
│       ├── <a class="header__brand">          ← Logo
│       └── <div class="search">               ← Búsqueda
│           ├── <div class="search__wrapper">
│           │   ├── <input class="search__input">
│           │   ├── <svg class="search__icon">
│           │   └── <ul class="search__suggestions">
│           │       └── <li class="search__suggestion-item"> × N
│           └── <button class="search__btn">
│
├── <main class="main">
│   │
│   ├── <section id="view-home">              ← VISTA 1
│   │   └── <div class="hero">
│   │       ├── <h1 class="hero__title">
│   │       ├── <p class="hero__subtitle">
│   │       └── <div class="hero__suggestions">
│   │           └── <button class="chip"> × 4
│   │
│   ├── <section id="view-results">           ← VISTA 2
│   │   ├── <div class="results-header">
│   │   ├── <div id="state-loading">          ← sub-estado
│   │   │   └── <div class="loader">
│   │   │       └── <span class="loader__dot"> × 3
│   │   ├── <div id="state-error">            ← sub-estado
│   │   ├── <ul id="movies-grid">             ← sub-estado
│   │   │   └── <li class="movie-card"> × 10
│   │   │       ├── <img class="movie-card__poster">
│   │   │       └── <div class="movie-card__overlay">
│   │   │           ├── <div class="movie-card__line">
│   │   │           ├── <h3 class="movie-card__title">
│   │   │           └── <p class="movie-card__year">
│   │   └── <nav id="pagination">
│   │       ├── <button id="btn-prev">
│   │       ├── <span class="pagination__info">
│   │       └── <button id="btn-next">
│   │
│   └── <section id="view-detail">            ← VISTA 3
│       ├── <button id="btn-back">
│       ├── <div id="detail-loading">
│       ├── <div id="detail-error">
│       └── <article id="detail-content">
│           ├── <div class="detail__backdrop">
│           └── <div class="detail__inner">
│               ├── <div class="detail__poster-col">
│               │   └── <img id="detail-poster">
│               └── <div class="detail__info-col">
│                   ├── <div id="detail-genres">
│                   ├── <h2 id="detail-title">
│                   ├── <div class="detail__meta">
│                   ├── [sección sinopsis]
│                   ├── [sección director]
│                   └── [sección reparto]
│
└── <footer class="footer">
```

---

## 10. Mapa de event listeners

```
ELEMENTO                  EVENTO      FUNCIÓN LLAMADA
─────────────────────────────────────────────────────────────────
searchBtn                 click     → searchMovies(input.value.trim())
searchInput               keydown   → if Enter → searchMovies(...)
searchInput               focus     → renderSuggestions()
document                  click     → if fuera del wrapper → hideSuggestions()
btnPrev                   click     → searchMovies(query, currentPage - 1)
btnNext                   click     → searchMovies(query, currentPage + 1)
btnBack                   click     → showViewResults()
errorRetryBtn             click     → searchMovies(currentQuery, currentPage)
homeChips (×4)            click     → searchMovies(chip.dataset.query)
moviesGrid (delegación)   click     → fetchMovieDetail(card.dataset.id)
```

> **Delegación de eventos en el grid:**  
> En lugar de agregar un listener a cada card (que se destruyen y recrean en cada búsqueda), se agrega **un solo listener al contenedor** `#movies-grid`. Cuando el usuario hace clic, el evento "burbujea" hasta el grid y puedes usar `event.target.closest('.movie-card')` para identificar cuál card fue clickeada.

```javascript
// ✅ Delegación — un solo listener, funciona con cards dinámicas
moviesGrid.addEventListener('click', (event) => {
  const card = event.target.closest('.movie-card');
  if (!card) return; // clic en el fondo del grid, no en una card
  const imdbID = card.dataset.id;
  fetchMovieDetail(imdbID);
});
```

---

## 11. Casos borde a manejar

| Situación | Qué hace la API | Qué debe hacer tu app |
|-----------|-----------------|----------------------|
| Búsqueda vacía `""` | — (no se llama) | Validar antes del fetch, no hacer nada |
| Búsqueda solo espacios `"   "` | — (no se llama) | `query.trim()` antes de validar |
| Película no encontrada | `Response: "False"` | Mostrar mensaje amigable del campo `Error` |
| Sin conexión a internet | fetch lanza `TypeError` | catch → mostrar "Sin conexión" |
| Película sin póster | `Poster: "N/A"` | Mostrar placeholder con emoji y texto |
| Campo del detalle sin datos | `Runtime: "N/A"` | Mostrar texto alternativo o no mostrar |
| Solo 1 página de resultados | `totalResults: "7"` | Ocultar la paginación (`hidden = true`) |
| Error en el detalle | `Response: "False"` | Mostrar `detail-error` sin romper los resultados |
| El usuario busca de nuevo | — | Limpiar el grid y hacer nuevo fetch |

---

## 12. Orden de implementación recomendado

Sigue este orden para tener siempre algo funcionando en el navegador:

```
FASE 1 — Ver algo en pantalla (1-2 horas)
  1. Completa hasPoster() y calculateTotalPages()
  2. Implementa showViewHome / Results / Detail
  3. Implementa showLoading / showError / showGrid
  4. Añade el listener del botón de búsqueda y Enter
  5. En searchMovies(), por ahora solo haz console.log(data)
  ✓ PRUEBA: busca algo y verifica la respuesta en la consola

FASE 2 — Resultados en pantalla (1-2 horas)
  6. Implementa renderMovies() con innerHTML
  7. Agrega el listener de clic al grid (delegación)
  8. En fetchMovieDetail(), por ahora solo console.log(data)
  ✓ PRUEBA: se ven las cards, al hacer clic ves el JSON en consola

FASE 3 — Vista de detalle (1-2 horas)
  9. Implementa renderDetail() campo por campo
  10. Implementa el botón Volver
  ✓ PRUEBA: flujo completo home → results → detail → volver

FASE 4 — Paginación (1 hora)
  11. Implementa updatePagination()
  12. Añade listeners de btnPrev y btnNext
  ✓ PRUEBA: busca "batman", navega entre las páginas

FASE 5 — Pulido y extras (2-3 horas)
  13. Implementa getHistory / saveToHistory / renderSuggestions
  14. Añade listeners de focus y click-fuera para el dropdown
  15. Implementa formatVotes()
  16. Conecta los chips de la pantalla home
  17. Agrega el listener de error-retry

  ✓ PRUEBA FINAL: flujo completo con historial, paginación,
    errores y todos los casos borde
```

---

## Tips de debugging

```javascript
// Agrega esto al inicio de cada función mientras desarrollas
function searchMovies(query, page) {
  console.log('[searchMovies]', { query, page, state });
  // ...
}

// Para inspeccionar el localStorage en DevTools:
// Pestaña Application → Local Storage → tu dominio

// Para limpiar el historial manualmente en consola:
localStorage.removeItem('cinesearch_history');

// Para simular sin conexión:
// DevTools → Network → Throttling → Offline
```

---

*Última actualización: inicio del proyecto*  
*Autor: en construcción 🚧*