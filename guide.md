# Guía de desarrollo · app.js

> Esta guía **no te da el código**. Te da el mapa.  
> Cada sección te dice **qué construir**, **por qué** existe esa pieza,  
> y **qué preguntas hacerte** antes de escribir.

---

## Flujo completo de la app

```
Usuario abre la app
        │
        ▼
  showViewHome()
  (pantalla de bienvenida)
        │
        ▼
  Usuario escribe título + Enter/btn
        │
        ▼
  ¿Input vacío?
        │
   ┌────┴────┐
  SÍ        NO
   │         │
   ▼         ▼
 no hacer  searchMovies(query, page=1)
  nada           │
            ┌────┴────┐
           OK        Error de red
            │             │
            ▼             ▼
     ¿Response === "True"?   showError("Sin conexión")
            │
       ┌────┴────┐
      SÍ        NO
       │         │
       ▼         ▼
  renderMovies()  showError(data.Error)
  updatePagination()
  saveToHistory()
  showGrid()
       │
       ▼
  Usuario hace clic en una card
       │
       ▼
  fetchMovieDetail(imdbID)
       │
  ┌────┴────┐
 OK        Error
  │             │
  ▼             ▼
renderDetail()  mostrar detail-error
  │             (sin romper los resultados)
  ▼
Usuario hace clic en "Volver"
  │
  ▼
showViewResults()
(sin nuevo fetch — resultados ya en el DOM)
```

---



## Paso 1 — Configuración inicial



### Qué hacer

Al inicio del archivo van tres bloques antes de cualquier función:

**1a. La API key y la URL base** — variables sueltas, bien comentadas  
**1b. Las referencias al DOM** — todos los elementos que vas a tocar, guardados en constantes  
**1c. El objeto de estado** — guarda la información que la app necesita recordar entre acciones

### Por qué importa

Si esparces `document.getElementById(...)` por todo el archivo, cuando el HTML cambie tendrás que buscar en 20 lugares. Centralizar las referencias al inicio es mantenimiento fácil.

El objeto de estado es la "fuente de verdad". En lugar de leer el DOM para saber qué búsqueda está activa o en qué página estás, lees el estado.

### Qué debes tener al terminar este paso

```js
const API_KEY = 'tu_key_aqui';
const API_URL = 'https://www.omdbapi.com/';

// — Búsqueda —
const searchInput   = document.getElementById('search-input');
const searchBtn     = document.querySelector('.search__btn');
const suggestionsEl = document.getElementById('search-suggestions');

// — Vistas —
const viewHome    = document.getElementById('view-home');
const viewResults = document.getElementById('view-results');
const viewDetail  = document.getElementById('view-detail');

// — Estados dentro de view-results —
const stateLoading  = document.getElementById('state-loading');
const stateError    = document.getElementById('state-error');
const errorMessage  = document.getElementById('error-message');
const errorRetryBtn = document.getElementById('error-retry-btn');

// — Grid —
const moviesGrid  = document.getElementById('movies-grid');
const resultsQuery = document.getElementById('results-query');
const resultsCount = document.getElementById('results-count');

// — Paginación —
const pagination  = document.getElementById('pagination');
const btnPrev     = document.getElementById('btn-prev');
const btnNext     = document.getElementById('btn-next');
const pageCurrent = document.getElementById('page-current');
const pageTotal   = document.getElementById('page-total');

// — Detalle —
const btnBack           = document.getElementById('btn-back');
const detailLoading     = document.getElementById('detail-loading');
const detailError       = document.getElementById('detail-error');
const detailContent     = document.getElementById('detail-content');
const detailBackdrop    = document.getElementById('detail-backdrop');
const detailPoster      = document.getElementById('detail-poster');
const detailGenres      = document.getElementById('detail-genres');
const detailTitle       = document.getElementById('detail-title');
const detailYear        = document.getElementById('detail-year');
const detailRuntime     = document.getElementById('detail-runtime');
const detailRatingValue = document.getElementById('detail-rating-value');
const detailVotes       = document.getElementById('detail-votes');
const detailPlot        = document.getElementById('detail-plot');
const detailDirector    = document.getElementById('detail-director');
const detailActors      = document.getElementById('detail-actors');

const state = {
  currentQuery:  '',    // texto de la última búsqueda exitosa
  currentPage:   1,     // página activa en el grid
  totalResults:  0,     // total de películas que devolvió la API
  currentMovies: [],    // array de películas de la página actual
  isLoading:     false, // ¿hay una petición en curso?
};
```

> 💡 **Pregunta clave antes de escribir:** ¿Por qué guardar `currentMovies` en el estado en lugar de solo dejarlo en el DOM? Piénsalo: cuando el usuario abre el detalle y luego vuelve, ¿cómo evitas hacer un nuevo fetch?

---



## Paso 2 — Las funciones de vista



### Qué hacer

Un conjunto de funciones que controlan qué "pantalla" ve el usuario y qué sub-estado se muestra dentro de la vista de resultados.

La app tiene **tres vistas** (solo una visible a la vez) y **tres sub-estados** dentro de view-results (solo uno visible a la vez):

```
Vistas:        showViewHome()
               showViewResults()
               showViewDetail()

Sub-estados:   showLoading()   → muestra el loader, oculta grid y error
               showError(msg)  → muestra el error, oculta grid y loader
               showGrid()      → muestra el grid, oculta loader y error
```



### Por qué importa

Esta es la pieza más importante de la app. Si no centralizas la visibilidad, terminas con `.hidden = true` y `.hidden = false` esparcidos en 15 lugares y es muy fácil que un estado quede visible cuando no debería.

### La mecánica

El atributo HTML `hidden` oculta un elemento completamente (equivale a `display: none`). Manejarlo es simple:

```js
elemento.hidden = true;   // oculta
elemento.hidden = false;  // muestra
```

Cada función de vista debe:

1. Ocultar **todas** las vistas
2. Mostrar solo la que corresponde
3. Hacer scroll al top

> 💡 **Pregunta clave:** `showViewResults()` también debe ocultar `stateLoading` y `stateError` por defecto. ¿Por qué? Piensa en qué estado podrían estar esos elementos si el usuario busca, le da error, y luego busca de nuevo.

---



## Paso 3 — Funciones de utilidad



### Qué hacer

Tres funciones pequeñas de apoyo que hacen una sola cosa. Escríbelas antes de los fetch porque las vas a necesitar dentro de ellos.

### `hasPoster(posterUrl)`

OMDb devuelve el string `"N/A"` cuando no hay póster. Esta función detecta ese caso.

```js
// Retorna true si hay URL real, false si es "N/A" o está vacío
function hasPoster(posterUrl) { ... }
```



### `calculateTotalPages(totalResults)`

OMDb siempre devuelve 10 resultados por página. Necesitas saber cuántas páginas hay en total para la paginación.

```js
// Ejemplo: 23 resultados → 3 páginas (10, 10, 3)
// Pista: Math.ceil() redondea hacia arriba
function calculateTotalPages(totalResults) { ... }
```



### `formatVotes(votes)`

La API devuelve votos como string con comas: `"1,543,210"`. Esta función lo convierte a `"1.5M votos"` o `"45.7K votos"`.

```js
// Si votes es "N/A" → retorna '' (string vacío)
// Si es >= 1,000,000 → "X.XM votos"
// Si es >= 1,000     → "X.XK votos"
// Si no              → "X votos"
// Pista: primero quita las comas con .replace(/,/g, ''), luego convierte con Number()
function formatVotes(votes) { ... }
```

> 💡 **Pregunta clave:** ¿Por qué `hasPoster` es una función y no una comparación directa `poster !== "N/A"` cada vez que la necesitas? ¿Qué ventaja tiene si OMDb algún día cambia el string que devuelve?

---



## Paso 4 — `searchMovies(query, page)`



### Qué hacer

La función `async` principal. Recibe el texto buscado y el número de página, llama a la API de búsqueda y orquesta todo lo que pasa después.

### El endpoint de búsqueda

```
GET https://www.omdbapi.com/?s=batman&page=2&apikey=TU_KEY

Respuesta exitosa:
{
  "Search": [
    { "Title": "Batman Begins", "Year": "2005", "imdbID": "tt0372784", "Poster": "https://..." },
    ... (hasta 10 items)
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



### Cómo construir la URL de forma segura

```js
// ❌ Concatenación manual — se rompe con caracteres especiales
const url = API_URL + '?s=' + query + '&page=' + page + '&apikey=' + API_KEY;

// ✅ URLSearchParams — maneja encoding automáticamente
// "The Dark Knight" → "The+Dark+Knight"
const params = new URLSearchParams({ s: query, page, apikey: API_KEY });
const url = `${API_URL}?${params}`;
```



### El flujo dentro de la función

```
searchMovies(query, page)
        │
        ├─ ¿query.trim() está vacío? → return (no hacer nada)
        │
        ├─ Actualizar estado:
        │   state.currentQuery = query
        │   state.currentPage  = page
        │
        ├─ showViewResults()
        ├─ showLoading()
        │
        ▼
     fetch(url)
        │
        ├─ catch → showError("Sin conexión. Verifica tu internet.")
        │
        ▼
     data = await response.json()
        │
        ├─ data.Response === "False"
        │   └─ showError(data.Error)
        │   └─ return
        │
        └─ data.Response === "True"
               ├─ state.currentMovies = data.Search
               ├─ state.totalResults  = Number(data.totalResults)
               ├─ renderMovies(data.Search)
               ├─ updatePagination(page, state.totalResults)
               ├─ saveToHistory(query)
               └─ showGrid()
```



### Errores que debes manejar


| Situación                   | Lo que pasa               | Mensaje al usuario                    |
| --------------------------- | ------------------------- | ------------------------------------- |
| Película no encontrada      | `Response: "False"`       | El texto de `data.Error`              |
| Input vacío o solo espacios | — (no se llama)           | No hacer fetch                        |
| Sin conexión                | `fetch` lanza `TypeError` | "Sin conexión. Verifica tu internet." |


> 💡 **Pregunta clave:** `fetch` no lanza un error cuando la API responde con `Response: "False"` — eso sigue siendo HTTP 200. ¿Dónde exactamente en el código detectas si la búsqueda falló o tuvo éxito?

---



## Paso 5 — `renderMovies(movies)`



### Qué hacer

Recibe el array `data.Search` y crea dinámicamente las cards en el grid del DOM.

### Estructura de cada card

```html
<!-- El <li> lleva data-id para capturar el imdbID al hacer clic -->
<li class="movie-card fade-in-up" data-id="tt0372784">

  <!-- Si hay póster: -->
  <img class="movie-card__poster" src="https://..." alt="Póster de Batman Begins" />

  <!-- Si NO hay póster (poster === "N/A"): -->
  <div class="movie-card__placeholder">
    <span class="movie-card__placeholder-icon">🎬</span>
    <span>Sin póster</span>
  </div>

  <!-- Siempre: el overlay con efecto cortina -->
  <div class="movie-card__overlay">
    <div class="movie-card__line"></div>
    <h3 class="movie-card__title">Batman Begins</h3>
    <p class="movie-card__year">2005</p>
  </div>

</li>
```



### Lo que debes hacer antes de insertar

```js
// Limpia el grid antes de cada render — si no, las cards se acumulan
moviesGrid.innerHTML = '';

// Actualiza la cabecera de resultados
resultsQuery.textContent = state.currentQuery;
resultsCount.textContent = `— ${state.totalResults} resultados`;
```



### La delegación de eventos en el grid

En lugar de agregar un listener a cada card (se destruyen y recrean en cada búsqueda), agrega **un solo listener al contenedor**. El evento "burbujea" hasta el grid:

```js
moviesGrid.addEventListener('click', (event) => {
  const card = event.target.closest('.movie-card');
  if (!card) return; // clic en el fondo, no en una card
  fetchMovieDetail(card.dataset.id);
});
```

> 💡 **Pregunta clave:** ¿Por qué usar `event.target.closest('.movie-card')` en lugar de `event.target`? Piensa en qué elemento recibe el clic si el usuario hace clic exactamente sobre el texto del título.

---



## Paso 6 — `fetchMovieDetail(imdbID)`



### Qué hacer

La función `async` del segundo tipo de fetch. Recibe un IMDb ID, llama al endpoint de detalle y orquesta la vista de detalle.

### El endpoint de detalle

```
GET https://www.omdbapi.com/?i=tt0372784&apikey=TU_KEY

Respuesta:
{
  "Title": "Batman Begins",
  "Year": "2005",
  "Runtime": "140 min",
  "Genre": "Action, Adventure",
  "Director": "Christopher Nolan",
  "Actors": "Christian Bale, Michael Caine, Ken Watanabe",
  "Plot": "After witnessing his parents' murder...",
  "Poster": "https://...",
  "imdbRating": "8.2",
  "imdbVotes": "1,543,210",
  "imdbID": "tt0372784",
  "Response": "True"
}
```



### Diferencia clave con el fetch de búsqueda


|           | Búsqueda (`&s=`)              | Detalle (`&i=`)                                              |
| --------- | ----------------------------- | ------------------------------------------------------------ |
| Parámetro | `s=batman`                    | `i=tt0372784`                                                |
| Devuelve  | Array de resultados parciales | Objeto con todos los campos                                  |
| Campos    | Title, Year, imdbID, Poster   | Todo lo anterior + Runtime, Genre, Director, Plot, Rating... |




### El flujo dentro de la función

```
fetchMovieDetail("tt0372784")
        │
        ├─ showViewDetail()
        ├─ detailLoading.hidden = false
        ├─ detailContent.hidden = true
        ├─ detailError.hidden   = true
        │
        ▼
     fetch(url con &i=)
        │
        ├─ catch → mostrar detailError, NO romper los resultados
        │
        ▼
     data = await response.json()
        │
        ├─ data.Response === "False" → mostrar detailError
        │
        └─ data.Response === "True"  → renderDetail(data)
```

> 💡 **Pregunta clave:** Si el detalle falla, el usuario debe poder hacer clic en "Volver" y ver sus resultados intactos. ¿Por qué `showViewDetail()` antes del fetch garantiza eso aunque falle?

---



## Paso 7 — `renderDetail(movie)`



### Qué hacer

Recibe el objeto completo de la película y llena cada elemento de la vista de detalle.

### Campos a completar y cómo

```js
// Backdrop (imagen desenfocada de fondo)
detailBackdrop.style.backgroundImage = `url(${movie.Poster})`;

// Póster
detailPoster.src = hasPoster(movie.Poster) ? movie.Poster : ''; // o un placeholder
detailPoster.alt = `Póster de ${movie.Title}`;

// Géneros — vienen como "Action, Adventure, Sci-Fi"
// Necesitas crear un chip por cada uno:
// "Action, Adventure".split(', ') → ["Action", "Adventure"]

// Título y año
detailTitle.textContent = movie.Title;
detailYear.textContent  = movie.Year;

// Runtime, rating, votos, sinopsis, director, actores
// Algunos pueden ser "N/A" — decide qué mostrar en ese caso
```



### Campos que pueden valer "N/A"


| Campo        | Si es "N/A" muestra...   |
| ------------ | ------------------------ |
| `Runtime`    | "Duración desconocida"   |
| `imdbRating` | "Sin calificación"       |
| `imdbVotes`  | (ocultar el elemento)    |
| `Plot`       | "Sinopsis no disponible" |
| `Director`   | "Director desconocido"   |




### Al terminar de llenar todo

```js
detailLoading.hidden = true;
detailContent.hidden = false;
```

> 💡 **Pregunta clave:** Los géneros vienen como un string separado por comas. ¿Qué método de string usas para convertir `"Action, Adventure, Sci-Fi"` en el array `["Action", "Adventure", "Sci-Fi"]`?

---



## Paso 8 — `updatePagination(currentPage, totalResults)`



### Qué hacer

Calcula el total de páginas y actualiza los controles de paginación: el indicador de página actual, y el estado habilitado/deshabilitado de los botones.

### La lógica

```js
const total = calculateTotalPages(totalResults);

// Actualizar el indicador
pageCurrent.textContent = currentPage;
pageTotal.textContent   = total;

// Deshabilitar botones según la página
btnPrev.disabled = currentPage === 1;
btnNext.disabled = currentPage === total;

// Si solo hay una página, ocultar toda la paginación
pagination.hidden = total <= 1;
```



### Cuándo se llama

Siempre después de un fetch exitoso de búsqueda, dentro de `searchMovies()`.

> 💡 **Pregunta clave:** OMDb empieza a paginar desde `page=1`, no desde `page=0`. ¿Qué valor inicial tiene `state.currentPage` en el objeto de estado? ¿Coincide?

---



## Paso 9 — `localStorage` (historial de búsquedas)



### Qué hacer

Dos funciones que persisten el historial de las últimas 5 búsquedas y una tercera que renderiza el dropdown.

```js
getHistory()           // devuelve el array guardado (o [] si no hay nada)
saveToHistory(query)   // agrega al inicio, elimina duplicados, corta a 5
renderSuggestions()    // crea los <li> y muestra/oculta el dropdown
```



### Cómo guardar correctamente

```js
// localStorage solo guarda strings — siempre usa JSON
localStorage.setItem('cinesearch_history', JSON.stringify(array));
JSON.parse(localStorage.getItem('cinesearch_history') || '[]');
```



### El flujo de `saveToHistory(query)`

```
getHistory()
→ ["Inception", "Batman", "Parasite", "Dune", "Her"]

Filtrar duplicados (por si "Batman" ya existía)
→ Array.filter(item => item !== query)

Insertar al inicio
→ [query, ...filtered]

Cortar a 5 elementos
→ .slice(0, 5)

Guardar
→ localStorage.setItem(...)
```



### El dropdown de sugerencias

Cada ítem es un `<li>` que al hacer clic debe:

1. Escribir el texto en el input
2. Llamar a `searchMovies()` con ese texto
3. Cerrar el dropdown

```js
function hideSuggestions() {
  suggestionsEl.hidden = true;
  searchInput.setAttribute('aria-expanded', 'false');
}
```

> 💡 **Pregunta clave:** `localStorage.getItem()` retorna `null` si la clave no existe todavía. ¿Qué pasa si intentas hacer `JSON.parse(null)`? ¿Cómo lo evitas?

---



## Paso 10 — Event listeners



### Qué hacer

Conectar todos los eventos con sus funciones. Se escriben al final, cuando ya tienes todas las funciones implementadas.

### Mapa completo de eventos


| Elemento        | Evento    | Acción                                                |
| --------------- | --------- | ----------------------------------------------------- |
| `searchBtn`     | `click`   | `searchMovies(input.value.trim())`                    |
| `searchInput`   | `keydown` | Si `Enter` → `searchMovies(...)`                      |
| `searchInput`   | `focus`   | `renderSuggestions()`                                 |
| `document`      | `click`   | Si clic fuera del wrapper → `hideSuggestions()`       |
| `moviesGrid`    | `click`   | Delegación → `fetchMovieDetail(card.dataset.id)`      |
| `btnBack`       | `click`   | `showViewResults()` — sin nuevo fetch                 |
| `btnPrev`       | `click`   | `searchMovies(query, currentPage - 1)`                |
| `btnNext`       | `click`   | `searchMovies(query, currentPage + 1)`                |
| `errorRetryBtn` | `click`   | `searchMovies(state.currentQuery, state.currentPage)` |
| `.chip` (×4)    | `click`   | `searchMovies(chip.dataset.query)`                    |




### Cómo detectar clic fuera del dropdown

```js
document.addEventListener('click', (event) => {
  // .closest() sube por el árbol del DOM buscando el selector
  // Si el clic fue dentro del wrapper, retorna el elemento
  // Si fue fuera, retorna null
  if (!event.target.closest('.search__wrapper')) {
    hideSuggestions();
  }
});
```

> 💡 **Pregunta clave:** ¿Por qué el listener de paginación lee `state.currentPage` en lugar de leer el texto de `pageCurrent.textContent`? ¿Qué tipo de dato devuelve `textContent`?

---



## Paso 11 — `init()`



### Qué hacer

La función de arranque. Se llama una sola vez al cargar la página y es el punto de entrada de toda la app.

```js
function init() {
  // 1. Registra todos los event listeners
  // 2. Muestra la pantalla de inicio
  showViewHome();
}

init();
```



### Por qué va al final

Los event listeners deben registrarse después de que todas las funciones estén declaradas. Ponerlos en `init()` y llamar `init()` al final del archivo garantiza ese orden.

> 💡 **Pregunta clave:** ¿Hay algo que debas leer o preparar en `init()` además de registrar listeners y mostrar la vista inicial? Piensa en el historial...

---



## Orden de desarrollo recomendado

Desarrolla en este orden. Cada checkpoint es algo que puedes probar en el navegador.

```
[ ] 1. Config + DOM refs + estado (sin probar aún, es solo declaraciones)

[ ] 2. showViewHome / Results / Detail + showLoading / Error / Grid
        PRUEBA: llama estas funciones en la consola y verifica que las
        vistas cambian visualmente

[ ] 3. hasPoster() + calculateTotalPages() + formatVotes()
        PRUEBA: prueba cada función en la consola con valores fijos

[ ] 4. searchMovies() — por ahora solo console.log(data) al final
        PRUEBA: busca "batman", verifica el objeto en la consola

[ ] 5. renderMovies() + delegación de clic en el grid
        PRUEBA: ya ves las cards, el clic en una card hace console.log(imdbID)

[ ] 6. fetchMovieDetail() — por ahora solo console.log(data)
        PRUEBA: el clic en una card muestra el objeto de detalle en consola

[ ] 7. renderDetail()
        PRUEBA: flujo completo home → results → detail → volver

[ ] 8. updatePagination() + listeners de btnPrev / btnNext
        PRUEBA: busca "batman" (47 resultados), navega entre páginas

[ ] 9. getHistory() + saveToHistory() + renderSuggestions()
        PRUEBA: busca 3 películas, haz clic en el input, ves el historial

[ ] 10. Conectar todos los event listeners restantes (chips, retry, etc.)

[ ] 11. Casos borde — prueba cada uno de la tabla de abajo
```

---



## Casos borde que debes probar antes de dar por terminado


| Situación            | Cómo probarla                                       | Resultado esperado                     |
| -------------------- | --------------------------------------------------- | -------------------------------------- |
| Input vacío          | Haz clic en "Buscar" sin escribir nada              | No pasa nada                           |
| Solo espacios        | Escribe `" "` y busca                               | No pasa nada                           |
| Película inexistente | Busca `"xkjhqwerty289"`                             | Mensaje de error claro                 |
| Sin internet         | DevTools → Network → Offline, luego busca           | Mensaje de "sin conexión"              |
| Película sin póster  | Busca títulos muy viejos (ej: `"Nosferatu 1922"`)   | Se ve el placeholder visual            |
| Solo 1 página        | Busca algo con pocos resultados (ej: `"Nosferatu"`) | La paginación se oculta                |
| Error en detalle     | Manipula el imdbID en la consola con uno inválido   | Error en detalle sin romper el grid    |
| Volver al grid       | Abre detalle → "Volver"                             | Los mismos resultados, sin nuevo fetch |


---



## Herramientas de desarrollo que te van a salvar

**Para ver la respuesta completa de la API:**

```js
// Dentro de searchMovies() o fetchMovieDetail(), antes de renderizar:
console.log(JSON.stringify(data, null, 2));
```

**Para simular una búsqueda fallida:**
Escribe `"xkjhqwerty289"` — OMDb responde con `Response: "False"`.

**Para ver y limpiar el localStorage:**
DevTools → Application → Local Storage → localhost

**Para testear funciones aisladas desde la consola:**

```js
// Prueba hasPoster con distintos valores:
hasPoster("N/A")        // → false
hasPoster("https://...") // → true

// Prueba formatVotes:
formatVotes("1,543,210") // → "1.5M votos"
formatVotes("N/A")       // → ""
```

---



## Errores comunes que vas a cometer (y está bien)

1. **Olvidar** `await` en el fetch → obtienes una `Promise`, no los datos
2. **Usar** `&i=` **en lugar de** `&s=` en la búsqueda → obtienes un objeto de una sola película, no un array
3. **No hacer** `.trim()` al input → `"  "` pasa la validación como búsqueda válida
4. **No limpiar el grid** antes de renderizar → las cards se acumulan sobre las anteriores
5. **Leer** `pageCurrent.textContent` para la paginación → es un string, no un número; usa `state.currentPage`
6. **No manejar el** `catch` del fetch → si el usuario no tiene internet, la app se rompe en silencio

---

*Cuando termines un paso y no sepas cómo seguir, muéstrame el código que escribiste y lo resolvemos juntos.*