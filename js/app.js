/**
 * API KEY
 */

const API_KEY = "6ff68f35";
const API_URL = "https://www.omdbapi.com/";

/**
 * LOCAL STORAGE KEY
 */

const STORAGE_KEY = "cinesearch_history";

/**
 * DOM
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

    //— Hero suggestions —
    heroSuggestions: document.querySelector("#hero-suggestions"),

    //— Logo / Brand —
    brand: document.querySelector("#brand"),
};

const screens = {
    home: dom.viewHome,
    results: dom.viewResults,
    detail: dom.viewDetail,
};

const stateApp = {
    currentQuery: "", // texto de la última búsqueda exitosa
    currentPage: 1, // página activa en el grid
    totalResults: 0, // total de películas que devolvió la API
    currentMovies: [], // array de películas de la página actual
    isLoading: false, // ¿hay una petición en curso?
};

function showScreen(state) {
    Object.values(screens).forEach((screen) => (screen.hidden = true));
    screens[state].hidden = false;
}

function showResultState(visible) {
    dom.stateLoading.hidden = visible !== "loading";
    dom.stateError.hidden = visible !== "error";
    dom.moviesGrid.hidden = visible !== "grid";
}

function showDetailState(visible) {
    dom.detailLoading.hidden = visible !== "loading";
    dom.detailError.hidden = visible !== "error";
    dom.detailContent.hidden = visible !== "content";
}

function hasPoster(posterUrl) {
    return posterUrl && posterUrl !== "N/A";
}

function calculateTotalPages(totalResults) {
    return Math.ceil(totalResults / 10);
}

function formatVotes(votes) {
    if (votes === "N/A") return;
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

async function searchMovies(query, page) {
    if (query.trim() === "") return;

    showScreen("results");
    try {
        showResultState("loading");
        const params = new URLSearchParams({ s: query, page, apikey: API_KEY });
        const url = `${API_URL}?${params}`;
        const response = await fetch(url);
        const data = await response.json();

        stateApp.currentQuery = query;

        if (data.Response === "True") {
            stateApp.currentMovies = data.Search;
            stateApp.totalResults = Number(data.totalResults);
            stateApp.currentPage = page;
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

        // Póster o placeholder
        if (hasPoster(movie.Poster)) {
            const img = document.createElement("img");
            img.className = "movie-card__poster";
            img.src = movie.Poster;
            img.alt = `Póster de ${movie.Title}`;
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

async function fetchMovieDetail(imdbID) {
    showDetailState("loading");
    showScreen("detail");

    try {
        const params = new URLSearchParams({ i: imdbID, apikey: API_KEY });
        const url = `${API_URL}?${params}`;
        const response = await fetch(url);
        const data = await response.json();
        showDetailState("content");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        renderDetail(data);
    } catch (error) {
        showDetailState("error");
        dom.detailError.textContent =
            "No se pudo cargar la información de esta película. Intenta de nuevo.";
    }
}

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

function updatePagination(currentPage, totalResults) {
    const totalPages = calculateTotalPages(totalResults);

    dom.pageCurrent.textContent = currentPage;
    dom.pageTotal.textContent = totalPages;

    // Deshabilitar botones según la página
    dom.btnPrev.disabled = currentPage === 1;
    dom.btnNext.disabled = currentPage === totalPages;

    dom.pagination.hidden = totalPages <= 1;
}

function getHistory() {
    const dataRaw = localStorage.getItem(STORAGE_KEY);
    const queries = dataRaw ? JSON.parse(dataRaw) : [];
    return queries;
}

function saveToHistory(query) {
    const queries = getHistory();

    const filtered = queries.filter((search) => search !== query);
    filtered.unshift(query);
    const final = filtered.slice(0, 5);

    const dataToString = JSON.stringify(final);
    localStorage.setItem(STORAGE_KEY, dataToString);
}

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

function hideSuggestions() {
    dom.suggestionsEl.hidden = true;
    dom.searchInput.setAttribute("aria-expanded", "false");
}

function init() {
    dom.searchBtn.addEventListener("click", () => {
        const textSearch = dom.searchInput.value.trim();
        searchMovies(textSearch, 1);
        hideSuggestions();
    });

    dom.searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            searchMovies(dom.searchInput.value.trim(), 1);
            hideSuggestions();
        }
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".search__wrapper")) {
            hideSuggestions();
        }
    });

    dom.searchInput.addEventListener("focus", renderSuggestions);

    dom.btnPrev.addEventListener("click", () => {
        searchMovies(stateApp.currentQuery, stateApp.currentPage - 1);
    });

    dom.btnNext.addEventListener("click", () => {
        searchMovies(stateApp.currentQuery, stateApp.currentPage + 1);
    });

    dom.btnBack.addEventListener("click", () => {
        showScreen("results");
    });

    dom.moviesGrid.addEventListener("click", (event) => {
        const card = event.target.closest(".movie-card");
        if (!card) return;
        fetchMovieDetail(card.dataset.id);
    });

    dom.heroSuggestions.addEventListener("click", (event) => {
        const chip = event.target.closest(".chip");
        if (!chip) return;
        const query = chip.dataset.query;
        searchMovies(query, 1);
    });

    dom.errorRetryBtn.addEventListener("click", () => {
        searchMovies(stateApp.currentQuery, stateApp.currentPage);
    });

    dom.suggestionsEl.addEventListener("click", (event) => {
        const suggestionItem = event.target.closest(".search__suggestion-item");
        if (!suggestionItem) return;
        searchMovies(suggestionItem.textContent, 1);
        hideSuggestions();
    });

    dom.brand.addEventListener("click", (e) => {
        e.preventDefault();
        showScreen("home");
    });

    showScreen("home");
}

init();
