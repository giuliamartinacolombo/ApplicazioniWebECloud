(() => {
  // ====== DOM: Generi ======
  const root = document.getElementById("genreMulti");
  const btn = root?.querySelector(".multi-btn");
  const panel = root?.querySelector(".multi-panel");
  const tags = root?.querySelector(".multi-tags");
  const hiddenGenres = document.getElementById("genresHidden");

  // ====== DOM: Form ======
  const form = document.getElementById("registerForm");
  const errorBox = document.getElementById("errorBox");

  // ====== DOM: Artisti Spotify ======
  const artistQuery = document.getElementById("artistQuery");
  const artistSearchBtn = document.getElementById("artistSearchBtn");
  const artistResults = document.getElementById("artistResults");
  const artistTags = document.getElementById("artistTags");
  const artistsHidden = document.getElementById("artistsHidden");

  // Se mancano elementi chiave, non rompere tutto
  if (!form || !errorBox) return;

  // ========= LocalStorage helpers =========
  function getUsers() {
    try {
      const u = JSON.parse(localStorage.getItem("users"));
      return Array.isArray(u) ? u : [];
    } catch {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ========= GENERI: multi-select =========
  function getCheckedGenreValues() {
    if (!panel) return [];
    return Array.from(panel.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
  }

  function renderGenreTags(values) {
    if (!tags) return;
    tags.innerHTML = values
      .map(v => `
        <span class="tag">
          ${escapeHtml(v)}
          <button type="button" data-v="${escapeHtml(v)}" aria-label="Rimuovi ${escapeHtml(v)}">×</button>
        </span>
      `)
      .join("");
  }

  function syncGenres() {
    const checked = getCheckedGenreValues();
    renderGenreTags(checked);
    if (hiddenGenres) hiddenGenres.value = checked.join(",");
    if (btn) btn.setAttribute("aria-expanded", panel?.classList.contains("open") ? "true" : "false");
  }

  function openGenrePanel() {
    panel?.classList.add("open");
    btn?.setAttribute("aria-expanded", "true");
  }

  function closeGenrePanel() {
    panel?.classList.remove("open");
    btn?.setAttribute("aria-expanded", "false");
  }

  if (btn && panel) {
    btn.addEventListener("click", () => {
      panel.classList.toggle("open");
      syncGenres();
    });

    panel.addEventListener("change", syncGenres);

    tags?.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-v]");
      if (!b) return;
      const v = b.getAttribute("data-v");
      const input = Array.from(panel.querySelectorAll('input[type="checkbox"]')).find(i => i.value === v);
      if (input) input.checked = false;
      syncGenres();
    });

    document.addEventListener("click", (e) => {
      if (!root?.contains(e.target)) closeGenrePanel();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeGenrePanel();
    });

    syncGenres();
  }

  // ========= ARTISTI: selezione da Spotify =========
  // ⚠️ Inserisci le credenziali Spotify
  const SPOTIFY_CLIENT_ID = "YOUR_SPOTIFY_CLIENT_ID";
  const SPOTIFY_CLIENT_SECRET = "YOUR_SPOTIFY_CLIENT_SECRET";

  const SPOTIFY_TOKEN_KEY = "sn4m_spotify_token";
  const SPOTIFY_TOKEN_EXP_KEY = "sn4m_spotify_token_exp";

  let selectedArtists = []; // [{id, name}]

  function syncArtistsHidden() {
    if (artistsHidden) {
      artistsHidden.value = selectedArtists.map(a => a.name).join(", ");
    }
  }

  function renderArtistTags() {
    if (!artistTags) return;
    artistTags.innerHTML = "";

    selectedArtists.forEach((a) => {
      const chip = document.createElement("div");
      chip.className = "artist-tag";
      chip.innerHTML = `
        <span>${escapeHtml(a.name)}</span>
        <button type="button" aria-label="Rimuovi ${escapeHtml(a.name)}">×</button>
      `;

      chip.querySelector("button").addEventListener("click", () => {
        selectedArtists = selectedArtists.filter(x => x.id !== a.id);
        renderArtistTags();
        syncArtistsHidden();
      });

      artistTags.appendChild(chip);
    });
  }

  function isArtistSelected(id) {
  return selectedArtists.some(a => a.id === id);
  }

  function addArtist(artist) {
    if (isArtistSelected(artist.id)) return;
    selectedArtists.push({ id: artist.id, name: artist.name });
    renderArtistTags();
    syncArtistsHidden();
  }

  function removeArtistById(id) {
    selectedArtists = selectedArtists.filter(a => a.id !== id);
    renderArtistTags();
    syncArtistsHidden();
  }

  function toggleArtist(artist) {
    if (isArtistSelected(artist.id)) {
      removeArtistById(artist.id);
    } else {
      addArtist(artist);
    }
  }

  function getStoredSpotifyToken() {
    const token = localStorage.getItem(SPOTIFY_TOKEN_KEY);
    const exp = parseInt(localStorage.getItem(SPOTIFY_TOKEN_EXP_KEY) || "0", 10);
    if (!token || !exp) return null;
    if (Date.now() > exp - 60_000) return null;
    return token;
  }

  async function fetchSpotifyToken() {
    const url = "https://accounts.spotify.com/api/token";
    const auth = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Token Spotify fallito (${res.status}). ${t}`);
    }

    const data = await res.json();
    const expMs = Date.now() + data.expires_in * 1000;
    localStorage.setItem(SPOTIFY_TOKEN_KEY, data.access_token);
    localStorage.setItem(SPOTIFY_TOKEN_EXP_KEY, String(expMs));
    return data.access_token;
  }

  async function getSpotifyToken() {
    return getStoredSpotifyToken() || fetchSpotifyToken();
  }

  async function searchArtists(q) {
    const token = await getSpotifyToken();
    const url = `https://api.spotify.com/v1/search?type=artist&limit=8&q=${encodeURIComponent(q)}`;

    const res = await fetch(url, {
      headers: { Authorization: "Bearer " + token },
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Ricerca artisti fallita (${res.status}). ${t}`);
    }

    const data = await res.json();
    return data?.artists?.items || [];
  }

  function renderArtistResults(items) {
    if (!artistResults) return;
    artistResults.innerHTML = "";

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "hint";
      empty.textContent = "Nessun artista trovato.";
      artistResults.appendChild(empty);
      return;
    }

    items.forEach((a) => {
  const row = document.createElement("div");
  row.className = "artist-result";
  row.setAttribute("role", "button");
  row.setAttribute("tabindex", "0");

  const imgUrl = a.images?.[2]?.url || a.images?.[1]?.url || a.images?.[0]?.url || "";

  const left = document.createElement(imgUrl ? "img" : "div");
  if (imgUrl) {
    left.className = "artist-result__img";
    left.src = imgUrl;
    left.alt = a.name;
  } else {
    left.className = "artist-result__img--ph";
    left.setAttribute("aria-hidden", "true");
  }

  const meta = document.createElement("div");
  meta.className = "artist-result__meta";

  const name = document.createElement("div");
  name.className = "artist-result__name";
  name.textContent = a.name;

  const sub = document.createElement("div");
  sub.className = "artist-result__sub";
  sub.textContent = a.followers?.total
    ? `${a.followers.total.toLocaleString("it-IT")} follower`
    : "Follower: —";

  meta.appendChild(name);
  meta.appendChild(sub);

  // check a destra
  const check = document.createElement("div");
  check.className = "artist-result__check";
  check.setAttribute("aria-hidden", "true");
  check.textContent = "✓";

  // stato iniziale
  const selected = isArtistSelected(a.id);
  if (selected) row.classList.add("is-selected");
  row.setAttribute("aria-pressed", selected ? "true" : "false");

  row.appendChild(left);
  row.appendChild(meta);
  row.appendChild(check);

  function updateRowSelectedUI() {
    const nowSelected = isArtistSelected(a.id);
    row.classList.toggle("is-selected", nowSelected);
    row.setAttribute("aria-pressed", nowSelected ? "true" : "false");
  }

  function pick() {
    toggleArtist({ id: a.id, name: a.name });
    updateRowSelectedUI();
  }

  row.addEventListener("click", pick);
  row.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick();
    }
  });

  artistResults.appendChild(row);
});
  }

  async function runArtistSearch() {
    if (!artistQuery || !artistResults) return;

    const q = artistQuery.value.trim();
    if (!q) return;

    artistResults.innerHTML = "";
    const loading = document.createElement("div");
    loading.className = "hint";
    loading.textContent = "Ricerca in corso…";
    artistResults.appendChild(loading);

    try {
      const items = await searchArtists(q);
      renderArtistResults(items);
    } catch (err) {
      console.error(err);
      artistResults.innerHTML = "";
      const msg = document.createElement("div");
      msg.className = "error";
      msg.textContent = `Errore: ${err?.message || "impossibile cercare artisti"}`;
      artistResults.appendChild(msg);
    }
  }

  if (artistSearchBtn) {
    artistSearchBtn.addEventListener("click", runArtistSearch);
  }
  if (artistQuery) {
    artistQuery.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runArtistSearch();
      }
    });
  }

  // ========= SUBMIT: validazione + salvataggio =========
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorBox.textContent = "";

    const username = form.elements["username"]?.value?.trim() || "";
    const email = form.elements["email"]?.value?.trim()?.toLowerCase() || "";
    const password = form.elements["password"]?.value || "";

    // Generi
    const selectedGenres = (hiddenGenres?.value || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    if (selectedGenres.length === 0) {
      errorBox.textContent = "Seleziona almeno un genere musicale.";
      openGenrePanel();
      return;
    }

    // Artisti (selezionati da Spotify)
    if (selectedArtists.length === 0) {
      errorBox.textContent = "Seleziona almeno un cantante o gruppo dalla ricerca Spotify.";
      return;
    }

    const users = getUsers();

    if (users.some(u => (u.email || "").toLowerCase() === email)) {
      errorBox.textContent = "Email già registrata. Prova a fare login.";
      return;
    }
    if (users.some(u => (u.username || "").toLowerCase() === username.toLowerCase())) {
      errorBox.textContent = "Username già utilizzato. Scegline un altro.";
      return;
    }

    const newUser = {
      id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
      username,
      email,
      password,
      genres: selectedGenres,
      favoriteArtists: selectedArtists.map(a => a.name), // derivati dalla Spotify API
      createdAt: new Date().toISOString(),
      avatar: ""
    };

    users.push(newUser);
    saveUsers(users);
    localStorage.setItem("currentUser", JSON.stringify(newUser));

    window.location.href = "homepage.html";
  });

  // init artist hidden
  syncArtistsHidden();
})();