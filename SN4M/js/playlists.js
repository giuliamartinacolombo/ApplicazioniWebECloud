(() => {
  
  const profileImg = document.getElementById("profileImg");
  const profileBox = document.querySelector(".profile");
  const logoBtn = document.getElementById("logoBtn");

  const DEFAULT_AVATAR = "media/default-avatar.jpg";

  function ensureDemoUser() {
    if (localStorage.getItem("currentUser")) return;
    const demoUser = { id: "demo_user", username: "demo_user", email: "demo@sn4m.local" };
    localStorage.setItem("currentUser", JSON.stringify(demoUser));
  }

  function loadAvatar() {
    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser"));
      profileImg.src = (currentUser && currentUser.avatar) ? currentUser.avatar : DEFAULT_AVATAR;
    } catch {
      profileImg.src = DEFAULT_AVATAR;
    }
  }

  profileImg?.addEventListener("error", () => (profileImg.src = DEFAULT_AVATAR));
  profileBox?.addEventListener("click", () => (window.location.href = "user_profile.html"));
  logoBtn?.addEventListener("click", () => (window.location.href = "landing_page.html"));

  ensureDemoUser();
  loadAvatar();

  
  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function displayPlaylistTitle(pl){
  const t = String(pl?.title || "Playlist");
  return t.replace(/\s*\(importata\)\s*$/i, "").trim();
  }

  function msToMinSec(ms = 0) {
    const tot = Math.floor((ms || 0) / 1000);
    const m = Math.floor(tot / 60);
    const s = tot % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function parseTags(txt) {
    return String(txt || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }

  function ensureId(prefix = "pl") {
    return (crypto?.randomUUID?.() || `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`);
  }

  function safeUrl(url) {
    const u = String(url || "").trim();
    if (!u) return "";
    try { return new URL(u).href; } catch { return ""; }
  }

  function defaultCoverDataUri(seedText = "SN4M") {
  // testo "pulito" (niente %20)
  const raw = String(seedText || "SN4M").slice(0, 14);

  // escape minimo per XML (per non rompere l'SVG)
  const txt = raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#7c3aed"/>
          <stop offset="0.55" stop-color="#22c55e"/>
          <stop offset="1" stop-color="#06b6d4"/>
        </linearGradient>
      </defs>
      <rect width="800" height="800" rx="80" fill="url(#g)"/>
      <circle cx="560" cy="300" r="180" fill="rgba(0,0,0,0.18)"/>
      <text x="80" y="690" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
            font-size="84" font-weight="800" fill="rgba(255,255,255,0.88)">${txt}</text>
    </svg>`;

  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

  

  function getCurrentUserId() {
    try {
      const u = JSON.parse(localStorage.getItem("currentUser") || "null");
      return (u && (u.id || u.username || u.email)) ? String(u.id || u.username || u.email) : "guest";
    } catch {
      return "guest";
    }
  }

  function getPlaylistsKey() {
    return `sn4m_playlists_${getCurrentUserId()}`;
  }

  // NORMALIZZA TRACK (supporta formato HOME + formato PLAYLIST)
  function normalizeTrack(t) {
    const title = t?.title ?? t?.name ?? "—";

    const artist =
      t?.artist ??
      (Array.isArray(t?.artists) ? t.artists.join(", ") : "") ??
      "—";

    const album = t?.album ?? t?.albumName ?? "";

    const durationMs =
      Number.isFinite(t?.durationMs) ? t.durationMs :
      Number.isFinite(t?.duration_ms) ? t.duration_ms :
      0;

    const year =
      Number.isFinite(t?.year) ? t.year :
      (t?.album?.release_date ? parseInt(String(t.album.release_date).slice(0, 4), 10) : null);

    const cover =
      safeUrl(t?.cover) ||
      safeUrl(t?.image) ||
      safeUrl(t?.album?.images?.[0]?.url) ||
      safeUrl(t?.album?.images?.[1]?.url) ||
      safeUrl(t?.album?.images?.[2]?.url) ||
      "";

    const spotifyUrl =
      safeUrl(t?.spotifyUrl) ||
      safeUrl(t?.spotify_url) ||
      safeUrl(t?.external_urls?.spotify) ||
      "";

    return {
      id: t?.id || ensureId("trk"),
      title,
      artist,
      album,
      durationMs,
      year: Number.isFinite(year) ? year : null,
      cover: cover || defaultCoverDataUri(title),
      spotifyUrl,
    };
  }

  function normalizePlaylists(list) {
    const arr = Array.isArray(list) ? list : [];
    const now = Date.now();

   return arr.map(p => {
      const tracks = Array.isArray(p.tracks) ? p.tracks : [];

      return {
        id: p.id || ensureId("pl"),
        ownerId: String(p.ownerId || p.owner || ""),
        title: p.title || "Playlist",
        desc: p.desc || "Descrizione non inserita.",
        tags: Array.isArray(p.tags) ? p.tags : [],
        tracks,
          tracksCount: Number.isFinite(p.tracksCount)
          ? p.tracksCount
          : tracks.length,
        createdAt: p.createdAt || now,
        updatedAt: p.updatedAt || now,
        sharedCommunityIds: Array.isArray(p.sharedCommunityIds)
          ? p.sharedCommunityIds.map(String)
          : []
    };
  });
}

  function loadFromKey(key) {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "null");
      return Array.isArray(raw) ? raw : null;
    } catch {
      return null;
    }
  }

  function loadPlaylists() {
  //  SOLO per-utente
  const perUser = loadFromKey(getPlaylistsKey());
  if (perUser) return normalizePlaylists(perUser);

  // niente fallback globale: altrimenti vedi roba di altri
  return [];
  }

  //  salva SEMPRE su entrambe le chiavi + evento per la stessa tab
  function savePlaylists(list) {
  const normalized = normalizePlaylists(list);

  //  salva SOLO per-utente
  localStorage.setItem(getPlaylistsKey(), JSON.stringify(normalized));

  // stessa tab: aggiorna home / badge / ecc
  window.dispatchEvent(new CustomEvent("sn4m:playlists-changed"));

  return normalized;
}

    
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

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Token Spotify fallito (${res.status}). ${text}`);
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

  async function spotifySearchTracks(query, limit = 12) {
    const token = await getSpotifyToken();
    const url = `https://api.spotify.com/v1/search?type=track&limit=${limit}&q=${encodeURIComponent(query)}`;

    const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ricerca Spotify fallita (${res.status}). ${text}`);
    }

    const data = await res.json();
    return data?.tracks?.items || [];
  }

  function normalizeTrackItemFromSpotify(t) {
    // Questo è il formato "playlist.js"
    const cover =
      t.album?.images?.[0]?.url ||
      t.album?.images?.[1]?.url ||
      t.album?.images?.[2]?.url ||
      "";

    const release = t.album?.release_date || "";
    const year = release ? parseInt(String(release).slice(0, 4), 10) : null;

    return {
      id: t.id,
      title: t.name,
      artist: (t.artists || []).map(a => a.name).join(", "),
      album: t.album?.name || "",
      durationMs: t.duration_ms || 0,
      year: Number.isFinite(year) ? year : null,
      cover: safeUrl(cover) || defaultCoverDataUri(t.name),
      spotifyUrl: safeUrl(t.external_urls?.spotify || "")
    };
  }

  
  const TOP50_ITALY_PLAYLIST_ID = "37i9dQZEVXbIQnj7RRhdSX";

  async function spotifyGetTopItalyTracks(limit = 5) {
    const token = await getSpotifyToken();
    const url =
      `https://api.spotify.com/v1/playlists/${TOP50_ITALY_PLAYLIST_ID}/tracks` +
      `?market=IT&limit=${limit}` +
      `&fields=items(track(id,name,duration_ms,artists(name),album(name,images,release_date),external_urls(spotify)))`;

    const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Top IT fallita (${res.status}). ${text}`);
    }

    const data = await res.json();
    const items = (data?.items || []).map(x => x?.track).filter(Boolean);
    return items.map(normalizeTrackItemFromSpotify);
  }

 
  function makeEmptySeedPlaylists(now = Date.now()) {
  const ownerId = getCurrentUserId();

  return [
    {
      id: ensureId("pl"),
      ownerId,
      title: "Chill Vibes",
      desc: "Musica soft per studiare o rilassarsi.",
      tags: ["relax", "study"],
      tracks: [],
      tracksCount: 0,
      createdAt: now,
      updatedAt: now,
      sharedCommunityIds: []
    },
    {
      id: ensureId("pl"),
      ownerId,
      title: "Workout",
      desc: "Energia pura. Bass e ritmi veloci.",
      tags: ["gym", "energy"],
      tracks: [],
      tracksCount: 0,
      createdAt: now,
      updatedAt: now,
      sharedCommunityIds: []
    },
    {
      id: ensureId("pl"),
      ownerId,
      title: "Party Time",
      desc: "Hit perfette per feste e serate.",
      tags: ["party", "dance"],
      tracks: [],
      tracksCount: 0,
      createdAt: now,
      updatedAt: now,
      sharedCommunityIds: []
    }
  ];
}

  async function ensureInitialPlaylists() {
  const existing = loadPlaylists();
  if (Array.isArray(existing) && existing.length > 0) return existing;

  const fallback = makeEmptySeedPlaylists(Date.now());
  return savePlaylists(fallback);
  }

  
  const grid = document.getElementById("allPlaylistGrid");
  const empty = document.getElementById("allPlaylistEmpty");
  const filter = document.getElementById("filterAllPlaylists");
  const createPlaylistBtn = document.getElementById("createPlaylistBtn");

  // Imported playlists section
  const importedGrid = document.getElementById("importedPlaylistGrid");
  const importedEmpty = document.getElementById("importedPlaylistEmpty");
  const importedSection = document.getElementById("importedPlaylistsSection");

  // Top tracks
  const topTracksGrid = document.getElementById("topTracksGrid");
  const topTracksEmpty = document.getElementById("topTracksEmpty");
  const refreshTopTracksBtn = document.getElementById("refreshTopTracksBtn");

  // Modal playlist create/edit
  const modal = document.getElementById("playlistModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const form = document.getElementById("playlistForm");

  const modalTitle = document.getElementById("modalTitle");
  const submitBtn = document.getElementById("submitPlaylistBtn");

  const inputTitle = document.getElementById("plTitle");
  const inputDesc = document.getElementById("plDesc");
  const inputTags = document.getElementById("plTags");

  const trackQuery = document.getElementById("trackQuery");
  const trackSearchBtn = document.getElementById("trackSearchBtn");
  const trackResults = document.getElementById("trackResults");
  const selectedTracksBox = document.getElementById("selectedTracks");

  // View modal
  const viewModal = document.getElementById("playlistViewModal");
  const closeViewBtn = document.getElementById("closeViewBtn");
  const closeViewBtn2 = document.getElementById("closeViewBtn2");
  const viewCover = document.getElementById("viewCover");
  const viewTitle = document.getElementById("viewTitle");
  const viewDesc = document.getElementById("viewDesc");
  const viewTracks = document.getElementById("viewTracks");

  // Add-to-playlist modal (top tracks)
  const addModal = document.getElementById("addToPlaylistModal");
  const closeAddModalBtn = document.getElementById("closeAddModalBtn");
  const cancelAddBtn = document.getElementById("cancelAddBtn");
  const confirmAddBtn = document.getElementById("confirmAddBtn");
  const addToPlaylistSelect = document.getElementById("addToPlaylistSelect");
  const addToPlaylistHint = document.getElementById("addToPlaylistHint");

  let playlists = [];
  let editingId = null;
  let draftTracks = [];

  // top tracks state
  let topTracks = [];
  let pendingAddTrack = null;

    
  function resolvePlaylistCover(pl) {
    const first = safeUrl(pl?.tracks?.[0]?.cover || "");
    if (first) return first;
    return defaultCoverDataUri(pl?.title || "SN4M");
  }

 
  function validateCoreFields({ title, desc, tags }) {
    if (!title) return "Inserisci un titolo.";
    if (!desc) return "Inserisci una descrizione.";
    if (!tags || tags.length === 0) return "Inserisci almeno un tag (separati da virgole).";
    return "";
  }

  
  function renderTopTracks(items) {
    if (!topTracksGrid || !topTracksEmpty) return;

    topTracksGrid.innerHTML = "";

    if (!items.length) {
      topTracksEmpty.hidden = false;
      return;
    }
    topTracksEmpty.hidden = true;

    items.forEach((t) => {
      const cover = t.cover || defaultCoverDataUri(t.title);
      const tile = document.createElement("div");
      tile.className = "plTile";

      // puoi tenere il link a spotify qui se vuoi
      const coverBtn = t.spotifyUrl ? "a" : "button";
      const coverAttr = t.spotifyUrl
        ? `href="${escapeHtml(t.spotifyUrl)}" target="_blank" rel="noopener"`
        : `type="button"`;

      tile.innerHTML = `
        <${coverBtn} class="plTile__coverBtn" ${coverAttr} aria-label="Apri brano ${escapeHtml(t.title)}">
          <div class="plTile__cover">
            <img src="${escapeHtml(cover)}" alt="">
          </div>
        </${coverBtn}>

        <div class="plTile__bottom">
          <div class="plTile__meta" style="min-width:0;">
            <p class="plTile__title" title="${escapeHtml(t.title)}">
              ${escapeHtml(t.title)}
            </p>
            <p class="plTile__sub" title="${escapeHtml(t.artist)}">
              ${escapeHtml(t.artist)} • ${msToMinSec(t.durationMs || 0)}
            </p>
          </div>

          <div class="plTile__actions">
            <button class="iconMini" type="button" title="Aggiungi a playlist" data-top-add="${escapeHtml(t.id)}">＋</button>
          </div>
        </div>
      `;

      topTracksGrid.appendChild(tile);
    });

    topTracksGrid.querySelectorAll("[data-top-add]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-top-add");
        const tr = topTracks.find(x => x.id === id);
        if (!tr) return;
        openAddToPlaylistModal(tr);
      });
    });
  }

  async function loadTopTracks() {
    if (!topTracksGrid || !topTracksEmpty) return;

    topTracksGrid.innerHTML = `
      <div class="plTile"><div class="plTile__cover" style="width:75%;margin:0 auto;opacity:.5;"></div></div>
      <div class="plTile"><div class="plTile__cover" style="width:75%;margin:0 auto;opacity:.5;"></div></div>
      <div class="plTile"><div class="plTile__cover" style="width:75%;margin:0 auto;opacity:.5;"></div></div>
    `;
    topTracksEmpty.hidden = true;

    try {
      topTracks = await spotifyGetTopItalyTracks(5);
      renderTopTracks(topTracks);
    } catch (e) {
      console.error(e);
      topTracks = [];
      renderTopTracks([]);
    }
  }

 
  function openAddModal() {
    addModal?.classList.add("isOpen");
    addModal?.setAttribute("aria-hidden", "false");
  }

  function closeAddModal() {
    addModal?.classList.remove("isOpen");
    addModal?.setAttribute("aria-hidden", "true");
    pendingAddTrack = null;
    if (addToPlaylistHint) addToPlaylistHint.textContent = "";
  }

  closeAddModalBtn?.addEventListener("click", closeAddModal);
  cancelAddBtn?.addEventListener("click", closeAddModal);
  addModal?.addEventListener("click", (e) => { if (e.target === addModal) closeAddModal(); });

  function openAddToPlaylistModal(track) {
    // ricarico SEMPRE prima (così non mostra playlist eliminate)
    playlists = loadPlaylists() || [];
    playlists = normalizePlaylists(playlists);
    playlists = savePlaylists(playlists);

    if (!Array.isArray(playlists) || playlists.length === 0) {
      alert("Crea prima almeno una playlist, poi potrai aggiungere i brani della Top 5.");
      return;
    }

    pendingAddTrack = track;

    if (addToPlaylistSelect) {
      addToPlaylistSelect.innerHTML = playlists.map(p =>
        `<option value="${escapeHtml(p.id)}">${escapeHtml(p.title)}</option>`
      ).join("");
    }

    if (addToPlaylistHint) {
      addToPlaylistHint.textContent = `Stai aggiungendo: "${track.title}" — ${track.artist}`;
    }

    openAddModal();
  }

  function addTrackToUserPlaylist(playlistId, track) {
    // rilegge dallo storage prima di aggiungere
    playlists = loadPlaylists() || [];
    playlists = normalizePlaylists(playlists);

    const idx = playlists.findIndex(p => p.id === playlistId);
    if (idx === -1) return { ok: false, msg: "Playlist non trovata (forse eliminata)." };

    const pl = playlists[idx];
    const tracks = Array.isArray(pl.tracks) ? [...pl.tracks] : [];

    const normalizedTrack = normalizeTrack(track); // track già in formato playlist.js

    if (tracks.some(t => t.id === normalizedTrack.id)) {
      return { ok: false, msg: "Questo brano è già presente in questa playlist." };
    }

    tracks.push(normalizedTrack);

    playlists[idx] = {
      ...pl,
      tracks,
      tracksCount: tracks.length,
      updatedAt: Date.now()
    };

    playlists = savePlaylists(playlists);
    renderBothSections();
    return { ok: true, msg: "Brano aggiunto!" };
  }

  confirmAddBtn?.addEventListener("click", () => {
    if (!pendingAddTrack) return;

    const playlistId = addToPlaylistSelect?.value;
    if (!playlistId) return;

    const res = addTrackToUserPlaylist(playlistId, pendingAddTrack);
    alert(res.msg);

    if (res.ok) closeAddModal();
  });

    
  function applyFilter(list) {
    const q = (filter?.value || "").trim().toLowerCase();
    if (!q) return list;

    return list.filter(p => {
      const t = (p.title || "").toLowerCase();
      const d = (p.desc || "").toLowerCase();
      const tags = (p.tags || []).join(",").toLowerCase();
      return t.includes(q) || d.includes(q) || tags.includes(q);
    });
  }

  function isImportedPlaylist(pl){
  const title = String(pl?.title || "").toLowerCase();

  // riconosce quelle importate dalla Home: "Titolo (importata)"
  if (title.includes("(importata)")) return true;

  // opzionale: se in futuro vuoi salvare un flag vero
  if (pl?.isImported === true) return true;

  return false;
}

function splitPlaylists(list){
  const imported = [];
  const normal = [];

  for (const pl of (Array.isArray(list) ? list : [])){
    if (isImportedPlaylist(pl)) imported.push(pl);
    else normal.push(pl);
  }
  return { normal, imported };
}

function renderImported(list){
  if (!importedGrid || !importedEmpty) return;

  importedGrid.innerHTML = "";

  if (!list.length){
    importedEmpty.hidden = false;
    if (importedSection) importedSection.hidden = false; // se vuoi nasconderla: true
    return;
  }

  importedEmpty.hidden = true;
  if (importedSection) importedSection.hidden = false;

  for (const pl of list){
    const cover = resolvePlaylistCover(pl);
    const tracksCount = Number.isFinite(pl.tracksCount) ? pl.tracksCount : (pl.tracks?.length || 0);

    const tile = document.createElement("div");
    tile.className = "plTile";

    tile.innerHTML = `
      <button class="plTile__coverBtn" type="button"
              data-open="${escapeHtml(pl.id)}"
              aria-label="Apri playlist ${escapeHtml(pl.title)}">
        <div class="plTile__cover">
          <img src="${escapeHtml(cover)}" alt="">
        </div>
      </button>

      <div class="plTile__bottom">
        <div class="plTile__meta" style="min-width:0;">
          <p class="plTile__title" title="${escapeHtml(displayPlaylistTitle(pl))}">
          ${escapeHtml(displayPlaylistTitle(pl))}
          </p>
          <p class="plTile__sub">${tracksCount} brani</p>
        </div>

        <div class="plTile__actions">
          <div class="plTile__actions">
            <button class="iconMini" type="button" title="Apri" data-open="${escapeHtml(pl.id)}">ℹ</button>
            <button class="iconMini" type="button" title="Elimina" data-del="${escapeHtml(pl.id)}">🗑</button>
        </div>
      </div>
    `;

    importedGrid.appendChild(tile);
  }

  // listeners (uguali a quelli della griglia normale)
  importedGrid.querySelectorAll("[data-open]").forEach(btn => {
    btn.addEventListener("click", () => openPlaylistView(btn.getAttribute("data-open")));
  });

  importedGrid.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-edit");
      const pl = playlists.find(p => p.id === id);
      if (pl) openModal("edit", pl);
    });
  });

  importedGrid.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-del");
      const pl = playlists.find(p => p.id === id);
      if (!pl) return;

      if (!confirm(`Eliminare la playlist "${pl.title}"?`)) return;

      playlists = playlists.filter(p => p.id !== id);
      playlists = savePlaylists(playlists);

      renderBothSections();
    });
  });
}

function renderBothSections(){
  const filtered = applyFilter(playlists);
  const { normal, imported } = splitPlaylists(filtered);

  render(normal);          // la tua render() già esistente
  renderImported(imported);
}

  function render(list) {
    if (!grid || !empty) return;

    grid.innerHTML = "";

    if (!list.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    for (const pl of list) {
      const cover = resolvePlaylistCover(pl);
      const tracksCount = Number.isFinite(pl.tracksCount) ? pl.tracksCount : (pl.tracks?.length || 0);

      const tile = document.createElement("div");
      tile.className = "plTile";

      tile.innerHTML = `
        <button class="plTile__coverBtn" type="button"
                data-open="${escapeHtml(pl.id)}"
                aria-label="Apri playlist ${escapeHtml(pl.title)}">
          <div class="plTile__cover">
            <img src="${escapeHtml(cover)}" alt="">
          </div>
        </button>

        <div class="plTile__bottom">
          <div class="plTile__meta" style="min-width:0;">
            <p class="plTile__title" title="${escapeHtml(displayPlaylistTitle(pl))}">
            ${escapeHtml(displayPlaylistTitle(pl))}
            </p>
            <p class="plTile__sub">${tracksCount} brani</p>
          </div>

          <div class="plTile__actions">
            <button class="iconMini" type="button" title="Condividi" data-share="${escapeHtml(pl.id)}">📤</button>
            <button class="iconMini" type="button" title="Modifica" data-edit="${escapeHtml(pl.id)}">✎</button>
            <button class="iconMini" type="button" title="Elimina" data-del="${escapeHtml(pl.id)}">🗑</button>
          </div>
        </div>
      `;

      grid.appendChild(tile);
    }

    // Apri
    grid.querySelectorAll("[data-open]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-open");
        openPlaylistView(id);
      });
    });

    // Modifica
    grid.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-edit");
        const pl = playlists.find(p => p.id === id);
        if (pl) openModal("edit", pl);
      });
    });

    // Elimina playlist
    grid.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-del");
        const pl = playlists.find(p => p.id === id);
        if (!pl) return;

        if (!confirm(`Eliminare la playlist "${pl.title}"?`)) return;

        playlists = playlists.filter(p => p.id !== id);
        playlists = savePlaylists(playlists);
        renderBothSections();
      });
    });
  }

 
  function openViewModal() {
    viewModal?.classList.add("isOpen");
    viewModal?.setAttribute("aria-hidden", "false");
  }

  function closeViewModal() {
    viewModal?.classList.remove("isOpen");
    viewModal?.setAttribute("aria-hidden", "true");
    if (viewTracks) viewTracks.innerHTML = "";
  }

  closeViewBtn?.addEventListener("click", closeViewModal);
  closeViewBtn2?.addEventListener("click", closeViewModal);
  viewModal?.addEventListener("click", (e) => { if (e.target === viewModal) closeViewModal(); });

  function openPlaylistView(id) {
    //rileggo (così se home ha cambiato qualcosa si vede subito)
    playlists = loadPlaylists() || playlists;
    playlists = normalizePlaylists(playlists);

    const pl = playlists.find(p => p.id === id);
    if (!pl) return;

    if (!viewModal || !viewTracks) {
      const list = (pl.tracks || []).map(t => `• ${t.title} — ${t.artist} (${msToMinSec(t.durationMs)})`).join("\n");
      alert(list ? `Brani in "${pl.title}":\n\n${list}` : `La playlist "${pl.title}" è vuota.`);
      return;
    }

    const cover = resolvePlaylistCover(pl);
    const tracks = Array.isArray(pl.tracks) ? pl.tracks : [];

    if (viewCover) viewCover.innerHTML = `<img src="${escapeHtml(cover)}" alt="">`;
    if (viewTitle) viewTitle.textContent = displayPlaylistTitle(pl);
    if (viewDesc) viewDesc.textContent = pl.desc || "";

    viewTracks.innerHTML = tracks.length
      ? tracks.map(t => `
          <div class="trackRow">
            <div class="trackLeft">
              <div class="trackCover">${t.cover ? `<img src="${escapeHtml(t.cover)}" alt="">` : ""}</div>
              <div class="trackTxt">
                <div class="trackTitle">${escapeHtml(t.title || "")}</div>
                <div class="trackMeta">
                  ${escapeHtml(t.artist || "—")}
                  ${t.album ? ` • ${escapeHtml(t.album)}` : ""}
                </div>
              </div>
            </div>
            <div class="trackDur">${msToMinSec(t.durationMs || 0)}</div>
          </div>
        `).join("")
      : `<div class="trackRow" style="opacity:.8;">Nessun brano nella playlist.</div>`;

    openViewModal();
  }

   
  function renderSelectedTracks() {
    if (!selectedTracksBox) return;

    if (!draftTracks.length) {
      selectedTracksBox.innerHTML = `<div class="resultRow" style="opacity:.7;">Nessun brano selezionato.</div>`;
      return;
    }

    selectedTracksBox.innerHTML = draftTracks.map(t => `
      <div class="resultRow" style="display:flex; gap:10px; align-items:center; justify-content:space-between;">
        <div style="display:flex; gap:10px; align-items:center; min-width:0;">
          <img src="${escapeHtml(t.cover || defaultCoverDataUri(t.title))}" alt=""
               style="width:38px;height:38px;border-radius:8px;object-fit:cover;flex:0 0 auto;" />
          <div style="min-width:0;">
            <div style="font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(t.title)}
            </div>
            <div style="opacity:.8; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(t.artist)}${t.album ? ` • ${escapeHtml(t.album)}` : ""} • ${msToMinSec(t.durationMs)}
            </div>
          </div>
        </div>
        <button class="linkBtn" type="button" data-remove-track="${escapeHtml(t.id)}">Rimuovi</button>
      </div>
    `).join("");

    selectedTracksBox.querySelectorAll("[data-remove-track]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-remove-track");
        draftTracks = draftTracks.filter(x => x.id !== id);
        renderSelectedTracks();
        refreshAddButtonsState();
      });
    });
  }

  function clearSearchUI() {
    if (trackResults) trackResults.innerHTML = "";
    if (trackQuery) trackQuery.value = "";
  }

  
  function openModal(mode, playlist) {
    modal?.classList.add("isOpen");
    modal?.setAttribute("aria-hidden", "false");
    clearSearchUI();

    if (mode === "edit") {
      editingId = playlist.id;
      if (modalTitle) modalTitle.textContent = "Modifica playlist";
      if (submitBtn) submitBtn.textContent = "Salva";

      if (inputTitle) inputTitle.value = playlist.title || "";
      if (inputDesc) inputDesc.value = playlist.desc || "";
      if (inputTags) inputTags.value = (playlist.tags || []).join(", ");

      //normalizzo anche le track in edit
      draftTracks = Array.isArray(playlist.tracks) ? playlist.tracks.map(normalizeTrack) : [];
    } else {
      editingId = null;
      if (modalTitle) modalTitle.textContent = "Crea playlist";
      if (submitBtn) submitBtn.textContent = "Crea";

      form?.reset();
      draftTracks = [];
    }

    renderSelectedTracks();
  }

  function closeModal() {
    modal?.classList.remove("isOpen");
    modal?.setAttribute("aria-hidden", "true");
    form?.reset();
    editingId = null;
    draftTracks = [];
    clearSearchUI();
    renderSelectedTracks();
  }

  closeModalBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  
  let lastSearchItems = [];

  function refreshAddButtonsState() {
    if (!trackResults) return;
    trackResults.querySelectorAll("[data-add-track]").forEach(btn => {
      const id = btn.getAttribute("data-add-track");
      const already = draftTracks.some(x => x.id === id);
      btn.disabled = already;
      btn.textContent = already ? "Aggiunto" : "Aggiungi";
      btn.classList.toggle("secondary", !already);
      btn.classList.toggle("ghost", !!already);
    });
  }

  function renderSearchResults(items) {
    if (!trackResults) return;
    lastSearchItems = items;

    if (!items.length) {
      trackResults.innerHTML = `<div class="resultRow">Nessun risultato.</div>`;
      return;
    }

    trackResults.innerHTML = items.map((t) => {
      const item = normalizeTrackItemFromSpotify(t);
      const already = draftTracks.some(x => x.id === item.id);

      return `
        <div class="resultRow" style="display:flex; gap:10px; align-items:center; justify-content:space-between;">
          <div style="display:flex; gap:10px; align-items:center; min-width:0;">
            <img src="${escapeHtml(item.cover || defaultCoverDataUri(item.title))}" alt=""
                 style="width:42px;height:42px;border-radius:10px;object-fit:cover;flex:0 0 auto;" />
            <div style="min-width:0;">
              <div style="font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${escapeHtml(item.title)}
              </div>
              <div style="opacity:.8; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${escapeHtml(item.artist)} • ${escapeHtml(item.album)} • ${msToMinSec(item.durationMs)}
              </div>
            </div>
          </div>

          <button class="btn ${already ? "ghost" : "secondary"}"
                  type="button"
                  data-add-track="${escapeHtml(item.id)}"
                  ${already ? "disabled" : ""}>
            ${already ? "Aggiunto" : "Aggiungi"}
          </button>
        </div>
      `;
    }).join("");

    trackResults.querySelectorAll("[data-add-track]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-add-track");
        const found = lastSearchItems.find(x => x.id === id);
        if (!found) return;

        const item = normalizeTrackItemFromSpotify(found);
        if (draftTracks.some(x => x.id === item.id)) return;

        draftTracks.push(item);
        renderSelectedTracks();
        refreshAddButtonsState();
      });
    });
  }

  async function doTrackSearch() {
    const q = (trackQuery?.value || "").trim();
    if (!q) return;

    if (trackResults) {
      trackResults.innerHTML = `
        <div class="resultRow skeleton"></div>
        <div class="resultRow skeleton"></div>
        <div class="resultRow skeleton"></div>
      `;
    }

    try {
      const tracks = await spotifySearchTracks(q, 12);
      renderSearchResults(tracks);
    } catch (e) {
      console.error(e);
      if (trackResults) trackResults.innerHTML = `<div class="resultRow">Errore: ${escapeHtml(e.message)}</div>`;
    }
  }

  trackSearchBtn?.addEventListener("click", doTrackSearch);
  trackQuery?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doTrackSearch();
    }
  });

    
  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = (inputTitle?.value || "").trim();
    const desc  = (inputDesc?.value || "").trim();
    const tags  = parseTags(inputTags?.value || "");

    const errorMsg = validateCoreFields({ title, desc, tags });
    if (errorMsg) {
      alert(errorMsg);
      return;
    }

    const now = Date.now();

    //ricarico prima (evito conflitti se home ha cambiato)
    playlists = loadPlaylists() || playlists;
    playlists = normalizePlaylists(playlists);

    if (editingId) {
      const idx = playlists.findIndex(p => p.id === editingId);
      if (idx !== -1) {
        playlists[idx] = {
          ...playlists[idx],
          title,
          desc,
          tags,
          tracks: draftTracks.map(normalizeTrack),
          tracksCount: draftTracks.length,
          updatedAt: now
        };
      }
    } else {
      playlists.unshift({
        id: ensureId("pl"),
        ownerId: getCurrentUserId(),
        title,
        desc,
        tags,
        tracks: draftTracks.map(normalizeTrack),
        tracksCount: draftTracks.length,
        createdAt: now,
        updatedAt: now
      });
    }

    playlists = savePlaylists(playlists);
    renderBothSections();
    closeModal();
  });

  
  function refreshFromStorage() {
    const fresh = loadPlaylists();
    if (!fresh) return;
    playlists = normalizePlaylists(fresh);
    // non risalvo sempre per evitare loop, ma se vuoi “ripulire” dati corrotti:
    // playlists = savePlaylists(playlists);
    renderBothSections();
  }

  window.addEventListener("sn4m:playlists-changed", refreshFromStorage);

  window.addEventListener("storage", (e) => {
    if (e.key === HOME_PLAYLISTS_KEY || e.key === getPlaylistsKey()) {
      refreshFromStorage();
    }
  });


const COMMUNITIES_KEY = "sn4m_communities";

const sharePlModal = document.getElementById("sharePlModal");
const sharePlClose = document.getElementById("sharePlClose");
const sharePlInfo = document.getElementById("sharePlInfo");
const sharePlCommunities = document.getElementById("sharePlCommunities");
const sharePlSaveBtn = document.getElementById("sharePlSaveBtn");
const sharePlClearBtn = document.getElementById("sharePlClearBtn");

let sharingPlaylistId = null;

function loadCommunities() {
  try {
    const arr = JSON.parse(localStorage.getItem(COMMUNITIES_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function myCommunities() {
  const uid = String(getCurrentUserId());
  return loadCommunities().filter(c =>
    Array.isArray(c.members) && c.members.map(String).includes(uid)
  );
}

function openShareModal() {
  sharePlModal?.classList.remove("hidden");
  sharePlModal?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeShareModal() {
  sharePlModal?.classList.add("hidden");
  sharePlModal?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  sharingPlaylistId = null;
  if (sharePlCommunities) sharePlCommunities.innerHTML = "";
}

sharePlClose?.addEventListener("click", closeShareModal);
sharePlModal?.addEventListener("click", (e) => { if (e.target === sharePlModal) closeShareModal(); });

function renderShareModal(playlist) {
  const mine = myCommunities();
  const selected = new Set((playlist.sharedCommunityIds || []).map(String));

  if (sharePlInfo) sharePlInfo.textContent = `Playlist: ${playlist.title || "—"}`;
  if (!sharePlCommunities) return;
  sharePlCommunities.innerHTML = "";

  if (!mine.length) {
    sharePlCommunities.innerHTML = `<div class="empty"><p>Non fai parte di nessuna community.</p></div>`;
    return;
  }

  mine.forEach(c => {
    const row = document.createElement("div");
    row.className = "sharePlRow";
    row.innerHTML = `
      <div class="sharePlRow__left">
        <p class="sharePlRow__title">${escapeHtml(c.title || "Community")}</p>
        <p class="sharePlRow__sub">${(c.members || []).length} membri</p>
      </div>
      <label class="sharePlToggle">
        <input type="checkbox">
        visibile
      </label>
    `;

    const cb = row.querySelector("input[type=checkbox]");
    cb.checked = selected.has(String(c.id));
    cb.addEventListener("change", () => {
      cb.checked ? selected.add(String(c.id)) : selected.delete(String(c.id));
    });

    sharePlCommunities.appendChild(row);
  });

  sharePlClearBtn?.addEventListener("click", () => {
    selected.clear();
    sharePlCommunities.querySelectorAll("input[type=checkbox]").forEach(x => x.checked = false);
  }, { once: true });

  sharePlSaveBtn?.addEventListener("click", () => {
    playlists = loadPlaylists() || playlists;
    playlists = normalizePlaylists(playlists);

    const idx = playlists.findIndex(p => String(p.id) === String(sharingPlaylistId));
    if (idx === -1) return;

    playlists[idx] = {
      ...playlists[idx],
      sharedCommunityIds: [...selected],
      updatedAt: Date.now()
    };

    playlists = savePlaylists(playlists);
    renderBothSections();
    closeShareModal();
    alert(selected.size ? "Condivisione salvata!" : "Playlist resa privata.");
  }, { once: true });
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-share]");
  if (!btn) return;

  const pid = btn.getAttribute("data-share");
  playlists = loadPlaylists() || playlists;
  playlists = normalizePlaylists(playlists);

  const pl = playlists.find(p => String(p.id) === String(pid));
  if (!pl) return;

  sharingPlaylistId = pid;
  renderShareModal(pl);
  openShareModal();
});

  
  async function init() {
    playlists = await ensureInitialPlaylists();
    renderBothSections();
    await loadTopTracks();
  }

  filter?.addEventListener("input", renderBothSections);
  createPlaylistBtn?.addEventListener("click", () => openModal("create"));
  refreshTopTracksBtn?.addEventListener("click", loadTopTracks);

  init();
})();
