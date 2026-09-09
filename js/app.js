/**
 * ============================================================
 * CINESEARCH — app.js
 * Lógica principal de la aplicación: búsqueda, detalle,
 * paginación e historial.
 * ============================================================
 */

/**
 * API KEY de OMDb.
 * NOTA: Esta key es pública intencionalmente. OMDb free no
 * tiene riesgo financiero (no hay tarjeta asociada, no cobra).
 * En producción real, esta llamada iría a través de un backend
 * proxy para no exponer la key en el cliente.
 * @constant {string}
 */
const API_KEY = "6ff68f35";

/**
 * URL base del endpoint de OMDb. Los parámetros específicos
 * (s=, i=, page=, apikey=) se construyen en cada función con
 * URLSearchParams.
 * @constant {string}
 */
const API_URL = "https://www.omdbapi.com/";

/**
 * Clave usada en localStorage para guardar el historial
 * de búsquedas del usuario.
 * @constant {string}
 */
const STORAGE_KEY = "cinesearch_history";

/**
 * Referencias centralizadas a todos los elementos del DOM
 * que la aplicación necesita leer o modificar.
 * Centralizar los selectores aquí evita repetir
 * document.querySelector en cada función.
 * @constant {Object<string, HTMLElement>}
 */
const dom = {
    // — Búsqueda —
    searchInput: document.querySelector("#search-input"),
    searchBtn: document.querySelector("#search-btn"),
    suggestionsEl: document.querySelector("#search-suggestions"),

    // — Vistas —
    viewHome: document.querySelector("#view-home"),
    viewResults: document.querySelector("#view-results"),
    viewDetail: document.querySelector("#view-detail"),

    // — Estados dentro de view-results —
    stateLoading: document.querySelector("#state-loading"),
    stateError: document.querySelector("#state-error"),
    errorMessage: document.querySelector("#error-message"),
    errorRetryBtn: document.querySelector("#error-retry-btn"),

    // — Grid —
    moviesGrid: document.querySelector("#movies-grid"),
    resultsQuery: document.querySelector("#results-query"),
    resultsCount: document.querySelector("#results-count"),

    // — Paginación —
    pagination: document.querySelector("#pagination"),
    btnPrev: document.querySelector("#btn-prev"),
    btnNext: document.querySelector("#btn-next"),
    pageCurrent: document.querySelector("#page-current"),
    pageTotal: document.querySelector("#page-total"),

    // — Detalle —
    btnBack: document.querySelector("#btn-back"),
    detailLoading: document.querySelector("#detail-loading"),
    detailError: document.querySelector("#detail-error"),
    detailErrorMsg: document.querySelector("#detail-error-message"),
    detailContent: document.querySelector("#detail-content"),
    detailBackdrop: document.querySelector("#detail-backdrop"),
    detailPoster: document.querySelector("#detail-poster"),
    detailGenres: document.querySelector("#detail-genres"),
    detailTitle: document.querySelector("#detail-title"),
    detailYear: document.querySelector("#detail-year"),
    detailRuntime: document.querySelector("#detail-runtime"),
    detailRatingValue: document.querySelector("#detail-rating-value"),
    detailVotes: document.querySelector("#detail-votes"),
    detailPlot: document.querySelector("#detail-plot"),
    detailDirector: document.querySelector("#detail-director"),
    detailActors: document.querySelector("#detail-actors"),
    detailAwards: document.querySelector("#detail-awards"),

    // — Hero suggestions —
    heroSuggestions: document.querySelector("#hero-suggestions"),

    // — Logo / Brand —
    brand: document.querySelector("#brand"),
};

/**
 * Mapa de las tres pantallas principales de la app.
 * Usado por showScreen() para alternar cuál está visible.
 * @constant {Object<string, HTMLElement>}
 */
const screens = {
    home: dom.viewHome,
    results: dom.viewResults,
    detail: dom.viewDetail,
};

/**
 * Estado global de la aplicación — fuente de verdad única.
 * En lugar de leer el DOM para saber qué se buscó o en qué
 * página está el usuario, se lee este objeto.
 * @type {Object}
 * @property {string} currentQuery - Texto de la última búsqueda (exitosa o no).
 * @property {number} currentPage - Página activa en el grid de resultados.
 * @property {number} totalResults - Total de películas que devolvió la API.
 * @property {Object[]} currentMovies - Array de películas de la página actual.
 * @property {number} scrollPosition - Posición de scroll guardada antes de abrir el detalle.
 */
const stateApp = {
    currentQuery: "",
    currentPage: 1,
    totalResults: 0,
    currentMovies: [],
    scrollPosition: 0,
};

/**
 * Muestra una de las tres pantallas principales (home, results,
 * detail) y oculta las otras dos.
 * @param {"home"|"results"|"detail"} state - Nombre de la pantalla a mostrar.
 */
function showScreen(state) {
    Object.values(screens).forEach((screen) => (screen.hidden = true));
    screens[state].hidden = false;
}

/**
 * Alterna los sub-estados dentro de view-results: loading,
 * error o grid. Solo uno está visible a la vez.
 * @param {"loading"|"error"|"grid"} visible - Sub-estado a mostrar.
 */
function showResultState(visible) {
    dom.stateLoading.hidden = visible !== "loading";
    dom.stateError.hidden = visible !== "error";
    dom.moviesGrid.hidden = visible !== "grid";
}

/**
 * Alterna los sub-estados dentro de view-detail: loading,
 * error o content. Solo uno está visible a la vez.
 * @param {"loading"|"error"|"content"} visible - Sub-estado a mostrar.
 */
function showDetailState(visible) {
    dom.detailLoading.hidden = visible !== "loading";
    dom.detailError.hidden = visible !== "error";
    dom.detailContent.hidden = visible !== "content";
}

/**
 * Determina si una URL de póster es válida.
 * OMDb devuelve el string "N/A" cuando la película no tiene
 * póster registrado.
 * @param {string} posterUrl - Valor del campo Poster de la API.
 * @returns {boolean} true si hay una URL real, false si no.
 */
function hasPoster(posterUrl) {
    return posterUrl && posterUrl !== "N/A";
}

/**
 * Calcula el número total de páginas a partir del total de
 * resultados. OMDb siempre devuelve 10 resultados por página.
 * @param {number} totalResults - Total de resultados de la búsqueda.
 * @returns {number} Número total de páginas.
 */
function calculateTotalPages(totalResults) {
    return Math.ceil(totalResults / 10);
}

/**
 * Formatea el número de votos de IMDb a una versión legible
 * y abreviada (ej: "1.5M votos", "45.7K votos").
 * @param {string} votes - Valor del campo imdbVotes de la API (con comas).
 * @returns {string} Texto formateado, o cadena vacía si votes es "N/A".
 */
function formatVotes(votes) {
    if (votes === "N/A") return "";

    const numVotes = Number(votes.replace(/,/g, ""));

    if (numVotes >= 1000000) {
        const formatted = (numVotes / 1000000).toFixed(1);
        return `${formatted}M votos`;
    } else if (numVotes >= 1000) {
        const formatted = (numVotes / 1000).toFixed(1);
        return `${formatted}K votos`;
    } else {
        return `${numVotes} votos`;
    }
}

/**
 * Busca películas por título en OMDb (endpoint &s=) y actualiza
 * el grid de resultados, la paginación y el historial.
 * No hace nada si el query está vacío.
 * @async
 * @param {string} query - Título a buscar.
 * @param {number} page - Página de resultados a solicitar.
 * @returns {Promise<void>}
 */
async function searchMovies(query, page) {
    if (query.trim() === "") return;

    showScreen("results");

    try {
        showResultState("loading");

        const params = new URLSearchParams({ s: query, page, apikey: API_KEY });
        const url = `${API_URL}?${params}`;
        const response = await fetch(url);
        const data = await response.json();

        // Se guarda el query aunque la búsqueda falle, para que
        // el botón de "reintentar" siempre use el término correcto.
        stateApp.currentQuery = query;

        if (data.Response === "True") {
            stateApp.currentMovies = data.Search;
            stateApp.totalResults = Number(data.totalResults);
            stateApp.currentPage = page;

            dom.resultsQuery.textContent = query;
            dom.resultsCount.textContent = `— ${stateApp.totalResults} resultados`;

            showResultState("grid");
            renderMovies(stateApp.currentMovies);
            updatePagination(page, stateApp.totalResults);
            saveToHistory(query);
        } else {
            dom.errorMessage.textContent = data.Error;
            dom.pagination.hidden = true;
            showResultState("error");
        }
    } catch (error) {
        dom.errorMessage.textContent = "Sin conexión. Verifica tu internet.";
        showResultState("error");
    }
}

/**
 * Renderiza el grid de películas a partir de un array de
 * resultados de búsqueda. Limpia el grid antes de insertar
 * las nuevas cards. Cada card muestra el póster (o un
 * placeholder si no existe o falla al cargar), el título y
 * el año, con un overlay que aparece en hover.
 * @param {Object[]} movies - Array de películas (data.Search de la API).
 */
function renderMovies(movies) {
    dom.moviesGrid.innerHTML = "";

    movies.forEach((movie) => {
        const card = document.createElement("li");
        card.className = "movie-card fade-in-up";
        card.dataset.id = movie.imdbID;

        card.innerHTML = `
            <div class="movie-card__overlay">
                <div class="movie-card__line"></div>
                <h3 class="movie-card__title">${movie.Title}</h3>
                <p class="movie-card__year">${movie.Year}</p>
            </div>
        `;

        if (hasPoster(movie.Poster)) {
            const img = document.createElement("img");
            img.className = "movie-card__poster";
            img.src = movie.Poster;
            img.alt = `Póster de ${movie.Title}`;
            // Maneja el caso en que la URL existe pero el archivo
            // ya no está disponible en el servidor (404).
            img.onerror = function () {
                this.outerHTML = `
                    <div class="movie-card__placeholder">
                        <span class="movie-card__placeholder-icon">🎬</span>
                        <span>Sin póster</span>
                    </div>`;
            };
            card.prepend(img);
        } else {
            card.insertAdjacentHTML(
                "afterbegin",
                `
                <div class="movie-card__placeholder">
                    <span class="movie-card__placeholder-icon">🎬</span>
                    <span>Sin póster</span>
                </div>
            `,
            );
        }

        dom.moviesGrid.appendChild(card);
    });
}

/**
 * Obtiene el detalle completo de una película por su ID de
 * IMDb (endpoint &i=) y renderiza la vista de detalle.
 * Un fallo aquí no afecta los resultados del grid — el usuario
 * siempre puede volver a ellos.
 * @async
 * @param {string} imdbID - ID de IMDb de la película (ej: "tt1375666").
 * @returns {Promise<void>}
 */
async function fetchMovieDetail(imdbID) {
    showDetailState("loading");
    showScreen("detail");

    try {
        const params = new URLSearchParams({ i: imdbID, apikey: API_KEY });
        const url = `${API_URL}?${params}`;
        const response = await fetch(url);
        const data = await response.json();

        showDetailState("content");
        window.scrollTo({ top: 0, behavior: "smooth" });
        renderDetail(data);
    } catch (error) {
        showDetailState("error");
        dom.detailErrorMsg.textContent =
            "No se pudo cargar la información de esta película. Intenta de nuevo.";
    }
}

/**
 * Llena la vista de detalle con los datos completos de una
 * película: backdrop, póster, géneros, título, metadatos,
 * sinopsis, director, actores y premios.
 * @param {Object} movie - Objeto de película devuelto por el endpoint &i=.
 */
function renderDetail(movie) {
    const genres = movie.Genre.split(", ");
    dom.detailGenres.innerHTML = genres
        .map((genre) => `<span class="detail__genre-tag">${genre}</span>`)
        .join("");

    dom.detailTitle.textContent = movie.Title;
    dom.detailYear.textContent = movie.Year;
    dom.detailRuntime.textContent = movie.Runtime;
    dom.detailActors.textContent = movie.Actors;
    dom.detailDirector.textContent = movie.Director;
    dom.detailRatingValue.textContent = movie.imdbRating;
    dom.detailVotes.textContent = formatVotes(movie.imdbVotes);
    dom.detailPlot.textContent = movie.Plot;
    dom.detailBackdrop.style.backgroundImage = `url(${movie.Poster})`;
    dom.detailAwards.textContent = movie.Awards;

    dom.detailPoster.src = movie.Poster;
    // Igual que en las cards: si la URL da 404, se reemplaza
    // por el placeholder visual.
    dom.detailPoster.onerror = function () {
        this.outerHTML = `
            <div class="movie-card__placeholder">
                <span class="movie-card__placeholder-icon">🎬</span>
                <span>Sin póster</span>
            </div>
        `;
    };

    dom.detailContent.hidden = false;
    dom.detailLoading.hidden = true;
}

/**
 * Actualiza los controles de paginación: el indicador de
 * página actual/total y el estado habilitado/deshabilitado
 * de los botones anterior/siguiente. Oculta la paginación
 * por completo si solo hay una página de resultados.
 * @param {number} currentPage - Página actualmente mostrada.
 * @param {number} totalResults - Total de resultados de la búsqueda.
 */
function updatePagination(currentPage, totalResults) {
    const totalPages = calculateTotalPages(totalResults);

    dom.pageCurrent.textContent = currentPage;
    dom.pageTotal.textContent = totalPages;

    dom.btnPrev.disabled = currentPage === 1;
    dom.btnNext.disabled = currentPage === totalPages;

    dom.pagination.hidden = totalPages <= 1;
}

/**
 * Lee el historial de búsquedas guardado en localStorage.
 * @returns {string[]} Array de términos buscados (más reciente primero).
 *   Array vacío si no hay historial guardado todavía.
 */
function getHistory() {
    const dataRaw = localStorage.getItem(STORAGE_KEY);
    const queries = dataRaw ? JSON.parse(dataRaw) : [];
    return queries;
}

/**
 * Guarda un nuevo término de búsqueda en el historial.
 * Elimina duplicados, inserta el nuevo término al inicio y
 * limita el historial a un máximo de 5 entradas.
 * @param {string} query - Término de búsqueda a guardar.
 */
function saveToHistory(query) {
    const queries = getHistory();

    const filtered = queries.filter((search) => search !== query);
    filtered.unshift(query);
    const final = filtered.slice(0, 5);

    const dataToString = JSON.stringify(final);
    localStorage.setItem(STORAGE_KEY, dataToString);
}

/**
 * Renderiza el dropdown de sugerencias (historial de búsquedas)
 * debajo del input. Oculta el dropdown si no hay historial.
 * Se llama cuando el input recibe foco.
 */
function renderSuggestions() {
    const history = getHistory();

    if (history.length === 0) {
        dom.suggestionsEl.hidden = true;
        dom.searchInput.setAttribute("aria-expanded", "false");
        return;
    }

    dom.suggestionsEl.innerHTML = "";
    history.forEach((search) => {
        dom.suggestionsEl.innerHTML += `<li class="search__suggestion-item">${search}</li>`;
    });
    dom.suggestionsEl.hidden = false;
}

/**
 * Oculta el dropdown de sugerencias y actualiza el atributo
 * aria-expanded del input para accesibilidad.
 */
function hideSuggestions() {
    dom.suggestionsEl.hidden = true;
    dom.searchInput.setAttribute("aria-expanded", "false");
}

/**
 * Punto de entrada de la aplicación. Registra todos los
 * event listeners y muestra la pantalla inicial (home).
 * Se ejecuta una sola vez al cargar la página.
 */
function init() {
    // Buscar con el botón
    dom.searchBtn.addEventListener("click", () => {
        const textSearch = dom.searchInput.value.trim();
        searchMovies(textSearch, 1);
        hideSuggestions();
    });

    // Buscar con Enter
    dom.searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            searchMovies(dom.searchInput.value.trim(), 1);
            hideSuggestions();
        }
    });

    // Cerrar el dropdown de historial al hacer clic fuera
    document.addEventListener("click", (event) => {
        if (!event.target.closest(".search__wrapper")) {
            hideSuggestions();
        }
    });

    // Mostrar el historial al enfocar el input
    dom.searchInput.addEventListener("focus", renderSuggestions);

    // Paginación
    dom.btnPrev.addEventListener("click", () => {
        searchMovies(stateApp.currentQuery, stateApp.currentPage - 1);
    });

    dom.btnNext.addEventListener("click", () => {
        searchMovies(stateApp.currentQuery, stateApp.currentPage + 1);
    });

    // Volver del detalle al grid — sin nuevo fetch, restaura el scroll
    dom.btnBack.addEventListener("click", () => {
        showScreen("results");
        window.scrollTo({ top: stateApp.scrollPosition, behavior: "smooth" });
    });

    // Delegación de eventos: clic en cualquier card del grid
    dom.moviesGrid.addEventListener("click", (event) => {
        const card = event.target.closest(".movie-card");
        if (!card) return;
        stateApp.scrollPosition = window.scrollY;
        fetchMovieDetail(card.dataset.id);
    });

    // Chips de búsqueda rápida en el home
    dom.heroSuggestions.addEventListener("click", (event) => {
        const chip = event.target.closest(".chip");
        if (!chip) return;
        const query = chip.dataset.query;
        searchMovies(query, 1);
    });

    // Reintentar búsqueda tras un error
    dom.errorRetryBtn.addEventListener("click", () => {
        searchMovies(stateApp.currentQuery, stateApp.currentPage);
    });

    // Clic en un ítem del historial de sugerencias
    dom.suggestionsEl.addEventListener("click", (event) => {
        const suggestionItem = event.target.closest(".search__suggestion-item");
        if (!suggestionItem) return;
        searchMovies(suggestionItem.textContent, 1);
        hideSuggestions();
    });

    // Logo — vuelve al home
    dom.brand.addEventListener("click", (e) => {
        e.preventDefault();
        showScreen("home");
    });

    showScreen("home");
}

init();