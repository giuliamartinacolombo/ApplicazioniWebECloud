(() => {
  const profileImg = document.getElementById("profileImg");
  const profileBox = document.querySelector(".profile");
  const logoBtn = document.getElementById("logoBtn");
  const DEFAULT_AVATAR = "media/default-avatar.jpg";

  function loadAvatar() {
    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
      profileImg.src = (currentUser && currentUser.avatar) ? currentUser.avatar : DEFAULT_AVATAR;
    } catch {
      profileImg.src = DEFAULT_AVATAR;
    }
  }

  profileImg?.addEventListener("error", () => (profileImg.src = DEFAULT_AVATAR));
  profileBox?.addEventListener("click", () => {});
  logoBtn?.addEventListener("click", () => (window.location.href = "landing_page.html"));

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseArtists(str) {
    return String(str || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }

  const backBtn = document.getElementById("backBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  const confirmModal = document.getElementById("confirmModal");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

  const form = document.getElementById("profileForm");
  const inputUsername = document.getElementById("username");
  const inputEmail = document.getElementById("email");

  const genresBtn = document.getElementById("genresBtn");
  const genresBtnText = document.getElementById("genresBtnText");
  const genresPanel = document.getElementById("genresPanel");
  const genresList = document.getElementById("genresList");

  const artistSearch = document.getElementById("artistSearch");
  const artistSearchBtn = document.getElementById("artistSearchBtn");
  const artistResults = document.getElementById("artistResults");

  const resetBtn = document.getElementById("resetBtn");

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch {
      return null;
    }
  }

  function setCurrentUser(u) {
    localStorage.setItem("currentUser", JSON.stringify(u));
  }

  // Se non c'è un utente loggato, fuori dal profilo
  if (!getCurrentUser()) {
    window.location.href = "landing_page.html";
    return;
  }

  loadAvatar();

  // ====== INIT FORM ======
  let selectedGenres = [];
  let selectedArtists = [];

  function fillFormFromUser(u) {
    const currentUser = u || getCurrentUser() || {};
    inputUsername.value = currentUser.username || "";
    inputEmail.value = currentUser.email || "";

    const savedGenres = Array.isArray(currentUser.genres) ? currentUser.genres : [];
    selectedGenres = [...new Set(savedGenres.map(String))];
    renderGenresUI();

    const savedArtists = Array.isArray(currentUser.favoriteArtists)
      ? currentUser.favoriteArtists.map(String)
      : parseArtists(currentUser.favoriteArtists);
    selectedArtists = [...new Set(savedArtists)];
    renderArtistListFromSelected();
  }

  // ====== GENERI ======
  const GENRE_OPTIONS = [
    "Pop","Rock","Rap","Hip-Hop","Indie","R&B","Soul","Jazz","Blues","Classica",
    "EDM","Dance","House","Techno","Trance","Metal","Punk","Alternative","Country",
    "Reggaeton","Latina","K-Pop","J-Pop","Afrobeat","Folk","Disco","Funk","Gospel",
    "Lo-fi","Soundtrack","Cantautorale","Ambient"
  ];

  function toggleGenresPanel(force) {
    const isOpen = !genresPanel.classList.contains("hidden");
    const next = typeof force === "boolean" ? force : !isOpen;
    genresPanel.classList.toggle("hidden", !next);
    genresBtn.setAttribute("aria-expanded", String(next));
  }

  function updateGenresBtnText() {
    if (!selectedGenres.length) {
      genresBtnText.textContent = "Seleziona generi…";
      return;
    }
    genresBtnText.textContent =
      selectedGenres.length <= 3 ? selectedGenres.join(", ") : `${selectedGenres.length} generi selezionati`;
  }

  function renderGenresOptions() {
    genresList.innerHTML = "";
    GENRE_OPTIONS.forEach((g) => {
      const id = `g_${g.replace(/\W+/g, "_")}`;
      const row = document.createElement("label");
      row.className = "checkRow";
      row.setAttribute("for", id);

      row.innerHTML = `
        <input id="${escapeHtml(id)}" type="checkbox" ${selectedGenres.includes(g) ? "checked" : ""}/>
        <span>${escapeHtml(g)}</span>
      `;

      const cb = row.querySelector("input");
      cb.addEventListener("change", () => {
        if (cb.checked) {
          if (!selectedGenres.includes(g)) selectedGenres.push(g);
        } else {
          selectedGenres = selectedGenres.filter(x => x !== g);
        }
        updateGenresBtnText();
      });

      genresList.appendChild(row);
    });
  }

  function renderGenresUI() {
    renderGenresOptions();
    updateGenresBtnText();
  }

  genresBtn.addEventListener("click", () => toggleGenresPanel());
  document.addEventListener("click", (e) => {
    const inside = genresPanel.contains(e.target) || genresBtn.contains(e.target);
    if (!inside) toggleGenresPanel(false);
  });

  // ====== ARTISTI (Spotify come register.js) ======
  const MAX_ARTISTS = 8;
  let lastResults = [];
  let artistDebounce = null;

  const SPOTIFY_CLIENT_ID = "YOUR_SPOTIFY_CLIENT_ID";
  const SPOTIFY_CLIENT_SECRET = "YOUR_SPOTIFY_CLIENT_SECRET";
  const SPOTIFY_TOKEN_KEY = "sn4m_spotify_token";
  const SPOTIFY_TOKEN_EXP_KEY = "sn4m_spotify_token_exp";

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

    const data = await res.json();
    const expMs = Date.now() + data.expires_in * 1000;
    localStorage.setItem(SPOTIFY_TOKEN_KEY, data.access_token);
    localStorage.setItem(SPOTIFY_TOKEN_EXP_KEY, String(expMs));
    return data.access_token;
  }

  async function getSpotifyToken() {
    const cached = getStoredSpotifyToken();
    if (cached) return cached;
    return fetchSpotifyToken();
  }

  function isSelectedArtist(name) {
    return selectedArtists.includes(name);
  }

  function toggleArtist(name) {
    if (isSelectedArtist(name)) {
      selectedArtists = selectedArtists.filter(x => x !== name);
    } else {
      if (selectedArtists.length >= MAX_ARTISTS) {
        alert(`Puoi selezionare al massimo ${MAX_ARTISTS} artisti.`);
        return;
      }
      selectedArtists.push(name);
    }
    renderArtistResults(lastResults);
  }

  async function searchArtists(q) {
    const token = await getSpotifyToken();
    const url = `https://api.spotify.com/v1/search?type=artist&limit=12&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    const data = await res.json();
    return data?.artists?.items || [];
  }

  function renderArtistResults(items) {
    const arr = Array.isArray(items) ? items : [];
    lastResults = arr;

    const list = arr.length ? arr : selectedArtists.map(n => ({
      name: n, images: [], followers: { total: 0 }
    }));

    artistResults.innerHTML = list.map((a) => {
      const name = a?.name || "";
      const imgUrl = a?.images?.[2]?.url || a?.images?.[1]?.url || a?.images?.[0]?.url || "";
      const followers = a?.followers?.total
        ? `${a.followers.total.toLocaleString("it-IT")} follower`
        : "Follower: —";

      const selected = isSelectedArtist(name);
      const disabled = !selected && selectedArtists.length >= MAX_ARTISTS;

      const initial = (name || "?").trim().charAt(0).toUpperCase();

      return `
        <li class="artistItem ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}" data-artist="${escapeHtml(name)}">
          <div class="artistLeft">
            ${
              imgUrl
                ? `<img class="artistAvatar" alt="${escapeHtml(name)}" src="${escapeHtml(imgUrl)}"/>`
                : `<div class="artistAvatar" aria-hidden="true">${escapeHtml(initial)}</div>`
            }
            <div class="artistMeta">
              <div class="artistName">${escapeHtml(name)}</div>
              <div class="artistSub">${escapeHtml(followers)}</div>
            </div>
          </div>
          <div class="artistTick" aria-hidden="true">${selected ? "✓" : ""}</div>
        </li>
      `;
    }).join("");

    artistResults.querySelectorAll(".artistItem[data-artist]").forEach(li => {
      li.addEventListener("click", () => {
        if (li.classList.contains("disabled")) return;
        toggleArtist(li.getAttribute("data-artist"));
      });
    });
  }

  function renderArtistListFromSelected() {
    renderArtistResults([]);
  }

  async function doArtistSearch() {
    const q = (artistSearch.value || "").trim();
    if (q.length < 2) {
      renderArtistListFromSelected();
      return;
    }
    const items = await searchArtists(q);
    renderArtistResults(items);
  }

  artistSearch.addEventListener("input", () => {
    clearTimeout(artistDebounce);
    artistDebounce = setTimeout(doArtistSearch, 300);
  });
  artistSearchBtn.addEventListener("click", doArtistSearch);

  renderArtistListFromSelected();

  // ====== MODAL ======
  backBtn.addEventListener("click", () => (window.location.href = "homepage.html"));

  function openConfirmModal() {
    confirmModal.classList.add("open");
    confirmModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeConfirmModal() {
    confirmModal.classList.remove("open");
    confirmModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  deleteBtn.addEventListener("click", openConfirmModal);
  cancelDeleteBtn.addEventListener("click", closeConfirmModal);
  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) closeConfirmModal();
  });

  // ====== DELETE ACCOUNT (VERO) ======
  confirmDeleteBtn.addEventListener("click", () => {
    const cu = getCurrentUser();
    if (!cu) {
      closeConfirmModal();
      window.location.href = "landing_page.html";
      return;
    }

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const updatedUsers = Array.isArray(users) ? users.filter(u => u?.email !== cu?.email) : [];
    localStorage.setItem("users", JSON.stringify(updatedUsers));

    localStorage.removeItem("currentUser");

    const userId = cu?.id || cu?.email || cu?.username || "";
    if (userId) {
      localStorage.removeItem(`sn4m_playlists_${userId}`);
      localStorage.removeItem(`sn4m_playlists_${String(userId).replaceAll("@", "_")}`);
    }

    localStorage.removeItem("sn4m_spotify_token");
    localStorage.removeItem("sn4m_spotify_token_exp");

    closeConfirmModal();
    alert("Account eliminato correttamente.");
    window.location.href = "landing_page.html";
  });

  // ====== RESET ======
  resetBtn.addEventListener("click", () => fillFormFromUser(getCurrentUser()));

  // ====== SAVE (aggiorna currentUser + users[]) ======
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const u = getCurrentUser() || {};
    const newUsername = (inputUsername.value || "").trim();
    const newEmail = (inputEmail.value || "").trim();

    if (!newUsername) return alert("Username non valido.");
    if (!newEmail || !newEmail.includes("@")) return alert("Email non valida.");

    const updated = {
      ...u,
      username: newUsername,
      email: newEmail,
      genres: [...selectedGenres],
      favoriteArtists: [...selectedArtists]
    };

    setCurrentUser(updated);

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    if (Array.isArray(users)) {
      const idx = users.findIndex(x => (x?.id && updated.id && x.id === updated.id) || (x?.email && x.email === (u.email || updated.email)));
      if (idx !== -1) users[idx] = { ...users[idx], ...updated };
      else users.push(updated);
      localStorage.setItem("users", JSON.stringify(users));
    }

    loadAvatar();
    fillFormFromUser(updated);
    alert("Dati profilo salvati!");
  });

  // INIT
  fillFormFromUser(getCurrentUser());
})();